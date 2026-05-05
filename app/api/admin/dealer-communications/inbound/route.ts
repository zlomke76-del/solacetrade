import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLACETRADE_SCHEMA } from "@/lib/solacetrade";

export const dynamic = "force-dynamic";

function getHeader(req: NextRequest, key: string) {
  return req.headers.get(key) || req.headers.get(key.toLowerCase());
}

function parseAddress(value: string | null) {
  if (!value) return null;
  const match = value.match(/<(.+?)>/);
  return match ? match[1].toLowerCase() : value.toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Resend payload (typical fields)
    const fromRaw = body.from || body.envelope?.from || null;
    const toRaw = body.to || body.envelope?.to || null;
    const subject = body.subject || "";
    const text = body.text || "";
    const html = body.html || "";
    const messageId = body.message_id || body.headers?.["message-id"] || null;

    const fromEmail = parseAddress(fromRaw);
    const toEmail = Array.isArray(toRaw)
      ? parseAddress(toRaw[0])
      : parseAddress(toRaw);

    // Optional: extract dealer slug from reply-to alias like:
    // reply+{dealerSlug}@solacetrade.ai
    let dealerSlug: string | null = null;
    if (toEmail && toEmail.includes("+")) {
      const local = toEmail.split("@")[0];
      const parts = local.split("+");
      dealerSlug = parts[1] || null;
    }

    // Find dealer if slug present
    let dealer: any = null;
    if (dealerSlug) {
      const { data } = await supabaseAdmin
        .schema(SOLACETRADE_SCHEMA)
        .from("dealers")
        .select("id, slug, name")
        .eq("slug", dealerSlug)
        .maybeSingle();

      dealer = data || null;
    }

    // Insert inbound email
    await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealer_communications")
      .insert({
        direction: "inbound",
        from_email: fromEmail,
        to_email: toEmail,
        subject,
        body: text || html,
        message_id: messageId,
        dealer_id: dealer?.id || null,
        dealer_slug: dealer?.slug || null,
        dealer_name: dealer?.name || "Unknown",
        status: "received",
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Inbound email error:", err);
    return NextResponse.json({ error: "Inbound processing failed" }, { status: 500 });
  }
}
