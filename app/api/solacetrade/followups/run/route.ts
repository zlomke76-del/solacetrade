import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logTradeEvent, SOLACETRADE_SCHEMA } from "@/lib/solacetrade";
import { sendTradeEmail, type TradeEmailMessage } from "@/lib/email";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type TradeEvent = {
  id: string;
  dealer_id: string;
  intake_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const SYSTEM_EVENTS = new Set([
  "certificate_flagged_for_review",
  "certificate_sent",
  "dealer_followup_pending",
  "dealer_followup_email_sent",
  "dealer_followup_cancelled",
  "dealer_followup_failed",
]);

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asEmailMessage(value: unknown): TradeEmailMessage | null {
  const email = asObject(value);
  const from = typeof email.from === "string" ? email.from : "";
  const subject = typeof email.subject === "string" ? email.subject : "";
  const html = typeof email.html === "string" ? email.html : "";
  const text = typeof email.text === "string" ? email.text : "";
  const to = Array.isArray(email.to)
    ? email.to.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
  const replyTo = Array.isArray(email.replyTo)
    ? email.replyTo.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : undefined;

  if (!from || !to.length || !subject || !html) return null;
  return { from, to, replyTo, subject, html, text };
}

function followupKey(event: TradeEvent) {
  const key = asObject(event.payload).followupKey;
  return typeof key === "string" ? key : null;
}

function dueTime(event: TradeEvent) {
  const dueAt = asObject(event.payload).dueAt;
  if (typeof dueAt !== "string") return null;
  const parsed = Date.parse(dueAt);
  return Number.isFinite(parsed) ? parsed : null;
}

function sameFollowup(event: TradeEvent, key: string) {
  return asObject(event.payload).followupKey === key;
}

function alreadyResolved(events: TradeEvent[], key: string) {
  return events.some(
    (event) =>
      (event.event_type === "dealer_followup_email_sent" ||
        event.event_type === "dealer_followup_cancelled") &&
      sameFollowup(event, key)
  );
}

function dealerTouched(events: TradeEvent[], pendingCreatedAt: string) {
  const pendingTime = Date.parse(pendingCreatedAt);
  return events.find((event) => {
    if (SYSTEM_EVENTS.has(event.event_type)) return false;
    const eventTime = Date.parse(event.created_at);
    return Number.isFinite(eventTime) && Number.isFinite(pendingTime) && eventTime > pendingTime;
  });
}

function authorized(request: NextRequest) {
  const secret = process.env.SOLACETRADE_FOLLOWUP_CRON_SECRET;
  if (!secret) return true;
  return (request.headers.get("authorization") || "") === `Bearer ${secret}`;
}

async function runFollowups(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: pendingRows, error: pendingError } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("trade_events")
    .select("id, dealer_id, intake_id, event_type, payload, created_at")
    .eq("event_type", "dealer_followup_pending")
    .order("created_at", { ascending: true })
    .limit(100)
    .returns<TradeEvent[]>();

  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 });
  }

  const now = Date.now();
  const due = (pendingRows || []).filter((event) => {
    const time = dueTime(event);
    return time !== null && time <= now;
  });
  const results: Array<Record<string, unknown>> = [];

  for (const pending of due) {
    if (!pending.intake_id) continue;

    const key = followupKey(pending);
    const email = asEmailMessage(asObject(pending.payload).email);

    if (!key || !email) {
      results.push({ pendingEventId: pending.id, skipped: true, reason: "Invalid pending payload." });
      continue;
    }

    const { data: intakeEvents, error: eventsError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_events")
      .select("id, dealer_id, intake_id, event_type, payload, created_at")
      .eq("dealer_id", pending.dealer_id)
      .eq("intake_id", pending.intake_id)
      .order("created_at", { ascending: true })
      .returns<TradeEvent[]>();

    if (eventsError) {
      results.push({ pendingEventId: pending.id, error: eventsError.message });
      continue;
    }

    const events = intakeEvents || [];
    if (alreadyResolved(events, key)) {
      results.push({ pendingEventId: pending.id, followupKey: key, skipped: true, reason: "Already resolved." });
      continue;
    }

    const touch = dealerTouched(events, pending.created_at);
    if (touch) {
      await logTradeEvent({
        dealerId: pending.dealer_id,
        intakeId: pending.intake_id,
        eventType: "dealer_followup_cancelled",
        payload: {
          followupKey: key,
          cancelledAt: new Date().toISOString(),
          reason: "Dealer activity occurred before the 120-second follow-up window closed.",
          cancellingEvent: {
            id: touch.id,
            eventType: touch.event_type,
            createdAt: touch.created_at,
          },
          pendingEventId: pending.id,
          retainedDraftEmail: email,
        },
      });
      results.push({ pendingEventId: pending.id, followupKey: key, cancelled: true });
      continue;
    }

    try {
      const sent = await sendTradeEmail(email);
      await logTradeEvent({
        dealerId: pending.dealer_id,
        intakeId: pending.intake_id,
        eventType: "dealer_followup_email_sent",
        payload: {
          followupKey: key,
          sentAt: new Date().toISOString(),
          pendingEventId: pending.id,
          resendEmailId: sent.id,
          email,
          retainedCopy: {
            from: email.from,
            to: email.to,
            replyTo: email.replyTo || [],
            subject: email.subject,
            html: email.html,
            text: email.text,
          },
          resendEnabled: Boolean(process.env.RESEND_API_KEY),
        },
      });
      results.push({ pendingEventId: pending.id, followupKey: key, sent: true, resendEmailId: sent.id });
    } catch (error) {
      await logTradeEvent({
        dealerId: pending.dealer_id,
        intakeId: pending.intake_id,
        eventType: "dealer_followup_failed",
        payload: {
          followupKey: key,
          failedAt: new Date().toISOString(),
          pendingEventId: pending.id,
          error: error instanceof Error ? error.message : "Unknown follow-up send error.",
          retainedDraftEmail: email,
        },
      });
      results.push({ pendingEventId: pending.id, followupKey: key, error: error instanceof Error ? error.message : "Unknown follow-up send error." });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: pendingRows?.length || 0,
    due: due.length,
    results,
  });
}

export async function GET(request: NextRequest) {
  return runFollowups(request);
}

export async function POST(request: NextRequest) {
  return runFollowups(request);
}
