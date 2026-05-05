import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SendPayload = {
  contactId?: string;
  campaignId?: string;
  stepNumber?: number;
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function appendComplianceFooter(body: string, email: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const unsubscribeUrl = baseUrl
    ? `${baseUrl}/api/marketing/unsubscribe?email=${encodeURIComponent(email)}`
    : "";

  const address = process.env.MARKETING_PHYSICAL_ADDRESS || "";

  return [
    body.trim(),
    "",
    "—",
    unsubscribeUrl
      ? `If this is not relevant, you can unsubscribe here: ${unsubscribeUrl}`
      : `If this is not relevant, reply “no” and I will not follow up.`,
    address ? address : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    if (!resend) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const payload = (await req.json().catch(() => null)) as SendPayload | null;
    const contactId = payload?.contactId;
    const campaignId = payload?.campaignId;
    const stepNumber = payload?.stepNumber;

    if (!contactId || !campaignId || !stepNumber) {
      return NextResponse.json(
        { error: "Missing contactId, campaignId, or stepNumber" },
        { status: 400 }
      );
    }

    const { data: contact, error: contactError } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_contacts")
      .select("id,email,name,status,last_contacted_at,contact_count")
      .eq("id", contactId)
      .maybeSingle();

    if (contactError || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const email = normalizeEmail(contact.email);

    if (contact.status !== "active") {
      return NextResponse.json({ ok: true, skipped: true, reason: "contact_not_active" });
    }

    const { data: suppression } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_contact_suppression")
      .select("email,reason")
      .eq("email", email)
      .maybeSingle();

    if (suppression) {
      return NextResponse.json({ ok: true, skipped: true, reason: "suppressed" });
    }

    if (contact.last_contacted_at) {
      const last = new Date(contact.last_contacted_at).getTime();
      const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
      if (hoursSince < 48) {
        return NextResponse.json({ ok: true, skipped: true, reason: "recently_contacted" });
      }
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_campaigns")
      .select("id,name,status")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError || !campaign || campaign.status !== "active") {
      return NextResponse.json({ ok: true, skipped: true, reason: "campaign_not_active" });
    }

    const { data: step, error: stepError } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_steps")
      .select("id,subject,body,is_active")
      .eq("campaign_id", campaignId)
      .eq("step_number", stepNumber)
      .maybeSingle();

    if (stepError || !step || !step.is_active) {
      return NextResponse.json({ error: "Campaign step not found or inactive" }, { status: 404 });
    }

    const { data: existingReply } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_sends")
      .select("id")
      .eq("contact_id", contactId)
      .eq("campaign_id", campaignId)
      .eq("status", "replied")
      .limit(1);

    if (existingReply?.length) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_replied" });
    }

    const from = process.env.TRADEDESK_MARKETING_FROM_EMAIL;
    if (!from) {
      return NextResponse.json(
        { error: "Missing TRADEDESK_MARKETING_FROM_EMAIL" },
        { status: 500 }
      );
    }

    const finalBody = appendComplianceFooter(step.body, email);

    const result = await resend.emails.send({
      from,
      to: email,
      subject: step.subject,
      text: finalBody,
      replyTo: process.env.TRADEDESK_MARKETING_REPLY_TO || undefined,
      headers: {
        "X-SolaceTrade-Campaign-Id": campaignId,
        "X-SolaceTrade-Contact-Id": contactId,
        "X-SolaceTrade-Step": String(stepNumber),
      },
    });

    if (result.error) {
      await supabaseAdmin.schema("solacetrade").from("dealer_marketing_sends").insert({
        campaign_id: campaignId,
        contact_id: contactId,
        email,
        step_number: stepNumber,
        status: "failed",
      });

      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const { data: send } = await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_sends")
      .insert({
        campaign_id: campaignId,
        contact_id: contactId,
        email,
        step_number: stepNumber,
        status: "sent",
        message_id: result.data?.id || null,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    await supabaseAdmin
      .schema("solacetrade")
      .from("dealer_marketing_contacts")
      .update({
        last_contacted_at: new Date().toISOString(),
        contact_count: (contact.contact_count || 0) + 1,
      })
      .eq("id", contactId);

    if (send?.id) {
      await supabaseAdmin.schema("solacetrade").from("dealer_marketing_events").insert({
        send_id: send.id,
        event_type: "sent",
        payload: { message_id: result.data?.id || null },
      });
    }

    return NextResponse.json({ ok: true, messageId: result.data?.id || null });
  } catch (err) {
    console.error("marketing send failed:", err);
    return NextResponse.json({ error: "Marketing send failed" }, { status: 500 });
  }
}
