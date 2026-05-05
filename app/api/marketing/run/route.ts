import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MarketingContact = {
  id: string;
  email: string;
  status: string;
};

type MarketingStep = {
  step_number: number;
  delay_days: number;
};

function daysBetween(later: Date, earlier: Date) {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24);
}

async function callSendRoute(req: Request, contactId: string, campaignId: string, stepNumber: number) {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;

  const res = await fetch(`${origin}/api/marketing/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-marketing-runner": "true",
    },
    body: JSON.stringify({ contactId, campaignId, stepNumber }),
  });

  return res.json().catch(() => ({ ok: false }));
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const expected = process.env.MARKETING_RUN_SECRET;

    if (expected && auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dailyLimit = Number(process.env.MARKETING_DAILY_SEND_LIMIT || "100");
    const batchLimit = Number(process.env.MARKETING_BATCH_LIMIT || "25");

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const { count: sentToday } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_sends")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString())
      .in("status", ["sent", "delivered", "opened", "clicked", "replied"]);

    const remaining = Math.max(0, dailyLimit - (sentToday || 0));
    const allowed = Math.min(batchLimit, remaining);

    if (allowed <= 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: "daily_limit_reached" });
    }

    const { data: campaign } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_campaigns")
      .select("id,name,status")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json({ ok: true, sent: 0, reason: "no_active_campaign" });
    }

    const { data: stepsRaw } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_steps")
      .select("step_number,delay_days")
      .eq("campaign_id", campaign.id)
      .eq("is_active", true)
      .order("step_number", { ascending: true });

    const steps = (stepsRaw || []) as MarketingStep[];
    if (!steps.length) {
      return NextResponse.json({ ok: true, sent: 0, reason: "no_active_steps" });
    }

    const { data: contactsRaw } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_contacts")
      .select("id,email,status")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(250);

    const contacts = (contactsRaw || []) as MarketingContact[];
    const results: unknown[] = [];

    for (const contact of contacts) {
      if (results.length >= allowed) break;

      const email = contact.email.trim().toLowerCase();

      const { data: suppressed } = await supabaseAdmin
        .schema("solacetrade")
        .from("dealer_contact_suppression")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      if (suppressed) continue;

      const { data: sendsRaw } = await supabaseAdmin
        .schema("solacetrade")
        .from("dealer_marketing_sends")
        .select("id,step_number,status,sent_at,created_at")
        .eq("contact_id", contact.id)
        .eq("campaign_id", campaign.id)
        .order("step_number", { ascending: false })
        .limit(5);

      const sends = sendsRaw || [];

      if (sends.some((send) => send.status === "replied" || send.status === "bounced")) {
        continue;
      }

      const completedStepNumbers = new Set(sends.map((send) => send.step_number));
      const nextStep = steps.find((step) => !completedStepNumbers.has(step.step_number));

      if (!nextStep) continue;

      if (nextStep.step_number > 1) {
        const previousStep = [...sends]
          .filter((send) => send.step_number === nextStep.step_number - 1)
          .sort((a, b) => String(b.sent_at || b.created_at).localeCompare(String(a.sent_at || a.created_at)))[0];

        if (!previousStep) continue;

        const previousDate = new Date(previousStep.sent_at || previousStep.created_at);
        if (daysBetween(new Date(), previousDate) < nextStep.delay_days) {
          continue;
        }
      }

      const sendResult = await callSendRoute(req, contact.id, campaign.id, nextStep.step_number);
      results.push({ contactId: contact.id, stepNumber: nextStep.step_number, result: sendResult });
    }

    return NextResponse.json({ ok: true, sent: results.length, results });
  } catch (err) {
    console.error("marketing runner failed:", err);
    return NextResponse.json({ error: "Marketing runner failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
