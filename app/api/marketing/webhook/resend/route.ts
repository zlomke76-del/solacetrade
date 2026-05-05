import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ResendWebhookPayload = {
  type?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    from?: string;
    subject?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function extractEmail(payload: ResendWebhookPayload) {
  const to = payload.data?.to;
  if (Array.isArray(to) && to[0]) return normalizeEmail(to[0]);
  if (typeof to === "string") return normalizeEmail(to);
  return "";
}

async function suppress(email: string, reason: string) {
  if (!email) return;

  await supabaseAdmin
    .schema("solacetrade")
    .from("dealer_contact_suppression")
    .upsert({ email, reason }, { onConflict: "email" });

  await supabaseAdmin
    .schema("solacetrade")
    .from("dealer_marketing_contacts")
    .update({ status: reason === "bounce" ? "bounced" : "suppressed" })
    .eq("email", email);
}

export async function POST(req: Request) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.headers.get("x-webhook-secret");
      if (provided !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload = (await req.json().catch(() => null)) as ResendWebhookPayload | null;
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const eventType = payload.type || "unknown";
    const messageId = payload.data?.email_id || null;
    const email = extractEmail(payload);

    let sendId: string | null = null;

    if (messageId) {
      const { data: send } = await supabaseAdmin
        .schema("solacetrade")
        .from("dealer_marketing_sends")
        .select("id")
        .eq("message_id", messageId)
        .maybeSingle();

      sendId = send?.id || null;
    }

    const normalizedEvent = eventType.replace("email.", "");

    if (sendId) {
      await supabaseAdmin.schema("solacetrade").from("dealer_marketing_events").insert({
        send_id: sendId,
        event_type: normalizedEvent,
        payload,
      });
    }

    if (sendId && ["delivered", "opened", "clicked"].includes(normalizedEvent)) {
      await supabaseAdmin
        .schema("solacetrade")
        .from("dealer_marketing_sends")
        .update({ status: normalizedEvent })
        .eq("id", sendId);
    }

    if (["bounced", "bounce", "complained", "complaint"].includes(normalizedEvent)) {
      if (sendId) {
        await supabaseAdmin
          .schema("solacetrade")
          .from("dealer_marketing_sends")
          .update({ status: "bounced" })
          .eq("id", sendId);
      }
      await suppress(email, normalizedEvent.includes("complaint") ? "complaint" : "bounce");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resend webhook failed:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
