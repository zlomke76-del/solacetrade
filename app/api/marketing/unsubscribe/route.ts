import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function suppress(email: string, reason = "unsubscribe") {
  const normalized = normalizeEmail(email);

  await supabaseAdmin
    .schema("solacetrade")
    .from("dealer_contact_suppression")
    .upsert({ email: normalized, reason }, { onConflict: "email" });

  await supabaseAdmin
    .schema("solacetrade")
    .from("dealer_marketing_contacts")
    .update({ status: "unsubscribed" })
    .eq("email", normalized);

  return normalized;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return new Response("Missing email.", { status: 400 });
    }

    await suppress(email);

    return new Response("You have been unsubscribed. You will not receive further marketing emails from SolaceTrade.", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("unsubscribe failed:", err);
    return new Response("Unsubscribe failed.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string; reason?: string } | null;

    if (!body?.email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const email = await suppress(body.email, body.reason || "unsubscribe");
    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error("unsubscribe failed:", err);
    return NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 });
  }
}
