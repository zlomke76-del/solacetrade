import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Direction = "inbound" | "outbound";

type DealerCommunicationPayload = {
  dealer_id?: string | null;
  to_email?: string;
  from_email?: string;
  cc_emails?: string[] | string | null;
  subject?: string;
  body?: string;
  marketing_stage?: string;
  direction?: Direction;
  thread_key?: string | null;
  reply_to_message_id?: string | null;
};

const DEFAULT_FROM_EMAIL =
  process.env.TRADEDESK_MARKETING_FROM_EMAIL ||
  process.env.SOLACETRADE_MARKETING_FROM_EMAIL ||
  "SolaceTrade <team@solacetrade.ai>";

const DEFAULT_REPLY_TO_EMAIL =
  process.env.SOLACETRADE_MARKETING_REPLY_TO ||
  process.env.TRADEDESK_MARKETING_REPLY_TO ||
  "reply@solacetrade.ai";

function splitEmailList(value: string[] | string | null | undefined) {
  if (!value) return [];

  const source = Array.isArray(value) ? value.join(",") : value;

  return source
    .split(/[;,\n]/g)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeRequiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function makeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function normalizeThreadSubject(value: string) {
  return String(value || "No subject")
    .replace(/^\s*((re|fw|fwd):\s*)+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() || "no subject";
}

function buildThreadKey(input: { contactEmail: string; subject: string }) {
  return `${input.contactEmail.toLowerCase()}::${normalizeThreadSubject(input.subject)}`;
}

async function getDealer(dealerId: string) {
  const { data, error } = await supabaseAdmin
    .schema("solacetrade")
    .from("dealers")
    .select("id,slug,name,lead_email,crm_email,billing_email,routing_cc_emails")
    .eq("id", dealerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Dealer not found.");

  return data;
}

async function findMessageById(messageId: string | null | undefined) {
  if (!messageId) return null;

  const { data, error } = await supabaseAdmin
    .schema("solacetrade")
    .from("dealer_communications")
    .select("id,thread_key,contact_email,dealer_id,dealer_slug,dealer_name,subject,marketing_stage")
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data || null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dealerId = url.searchParams.get("dealerId");
    const direction = url.searchParams.get("direction");

    let query = supabaseAdmin
      .schema("solacetrade")
      .from("dealer_communications")
      .select(
        `
          id,
          dealer_id,
          dealer_slug,
          dealer_name,
          direction,
          status,
          from_email,
          to_email,
          cc_emails,
          subject,
          body,
          marketing_stage,
          provider,
          provider_message_id,
          thread_key,
          contact_email,
          reply_to_message_id,
          created_at,
          sent_at,
          received_at,
          opened_at,
          failed_at,
          failure_reason,
          metadata
        `,
      )
      .order("created_at", { ascending: false })
      .limit(250);

    if (dealerId) query = query.eq("dealer_id", dealerId);
    if (direction === "inbound" || direction === "outbound") {
      query = query.eq("direction", direction);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: makeError(error, "Could not load dealer communications.") },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => null)) as
      | DealerCommunicationPayload
      | null;

    if (!payload) {
      return NextResponse.json({ error: "Missing request body." }, { status: 400 });
    }

    const dealerId = normalizeRequiredText(payload.dealer_id);
    const direction: Direction = payload.direction === "inbound" ? "inbound" : "outbound";
    const subject = normalizeRequiredText(payload.subject);
    const body = normalizeRequiredText(payload.body);
    const toEmail = normalizeRequiredText(payload.to_email).toLowerCase();
    const fromEmail = normalizeRequiredText(payload.from_email).toLowerCase() || DEFAULT_FROM_EMAIL;
    const ccEmails = splitEmailList(payload.cc_emails);
    const marketingStage = normalizeOptionalText(payload.marketing_stage) || "general";
    const replyToMessageId = normalizeOptionalText(payload.reply_to_message_id);

    if (!subject) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    if (!body) {
      return NextResponse.json({ error: "Message body is required." }, { status: 400 });
    }

    if (direction === "outbound" && !toEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid to_email is required for outbound email." },
        { status: 400 },
      );
    }

    if (direction === "inbound" && !fromEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid from_email is required for inbound email." },
        { status: 400 },
      );
    }

    const parentMessage = await findMessageById(replyToMessageId);
    const dealer = dealerId ? await getDealer(dealerId) : null;
    const now = new Date().toISOString();
    const replyToEmail = DEFAULT_REPLY_TO_EMAIL;
    const contactEmail = direction === "outbound" ? toEmail : fromEmail;
    const threadKey =
      normalizeOptionalText(payload.thread_key) ||
      parentMessage?.thread_key ||
      buildThreadKey({ contactEmail, subject });

    let providerMessageId: string | null = null;
    let status: "sent" | "received" | "failed" = direction === "inbound" ? "received" : "sent";
    let failedAt: string | null = null;
    let failureReason: string | null = null;

    if (direction === "outbound") {
      const apiKey = process.env.RESEND_API_KEY;

      if (!apiKey) {
        status = "failed";
        failedAt = now;
        failureReason = "RESEND_API_KEY is not configured.";
      } else {
        const resend = new Resend(apiKey);
        const result = await resend.emails.send({
          from: DEFAULT_FROM_EMAIL,
          to: [toEmail],
          cc: ccEmails.length ? ccEmails : undefined,
          subject,
          text: body,
          replyTo: replyToEmail,
        });

        if (result.error) {
          status = "failed";
          failedAt = now;
          failureReason = result.error.message || "Resend email send failed.";
        } else {
          providerMessageId = result.data?.id || null;
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_communications")
      .insert({
        dealer_id: dealer?.id || parentMessage?.dealer_id || null,
        dealer_slug: dealer?.slug || parentMessage?.dealer_slug || null,
        dealer_name: dealer?.name || parentMessage?.dealer_name || "Direct Outreach",
        direction,
        status,
        from_email: direction === "outbound" ? DEFAULT_FROM_EMAIL : fromEmail,
        to_email: direction === "outbound" ? toEmail : DEFAULT_FROM_EMAIL,
        cc_emails: ccEmails,
        subject,
        body,
        marketing_stage: marketingStage,
        provider: direction === "outbound" ? "resend" : "manual",
        provider_message_id: providerMessageId,
        thread_key: threadKey,
        contact_email: contactEmail,
        reply_to_message_id: replyToMessageId || null,
        sent_at: direction === "outbound" && status === "sent" ? now : null,
        received_at: direction === "inbound" ? now : null,
        failed_at: failedAt,
        failure_reason: failureReason,
        metadata: {
          sender: DEFAULT_FROM_EMAIL,
          reply_to: replyToEmail,
          sender_policy: "solacetrade_verified_domain_only",
          conversation: {
            thread_key: threadKey,
            contact_email: contactEmail,
            reply_to_message_id: replyToMessageId || null,
          },
        },
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: status !== "failed", message: data, error: failureReason });
  } catch (error) {
    return NextResponse.json(
      { error: makeError(error, "Could not send or log dealer communication.") },
      { status: 500 },
    );
  }
}
