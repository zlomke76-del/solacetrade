import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SOLACETRADE_SCHEMA = "solacetrade";

function getUnsubscribeSecret() {
  return (
    process.env.SOLACETRADE_UNSUBSCRIBE_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.RESEND_API_KEY ||
    "solacetrade-local-unsubscribe-secret"
  );
}

function signEmail(email: string) {
  return createHmac("sha256", getUnsubscribeSecret())
    .update(email.toLowerCase())
    .digest("base64url");
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function decodeEmail(encoded: string | null, fallback: string | null) {
  if (encoded) {
    try {
      return Buffer.from(encoded, "base64url").toString("utf8").trim().toLowerCase();
    } catch {
      return "";
    }
  }

  return String(fallback || "").trim().toLowerCase();
}

function htmlResponse(input: { title: string; message: string; tone: "success" | "error" }) {
  const color = input.tone === "success" ? "#166534" : "#991b1b";
  const bg = input.tone === "success" ? "#f0fdf4" : "#fef2f2";

  return new NextResponse(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${input.title}</title>
  </head>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <section style="max-width:560px;width:100%;background:white;border:1px solid #e2e8f0;border-radius:22px;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,0.08);">
        <div style="font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#ea580c;margin-bottom:8px;">SolaceTrade</div>
        <h1 style="margin:0;font-size:30px;letter-spacing:-0.04em;">${input.title}</h1>
        <div style="margin-top:18px;padding:14px 16px;border-radius:16px;background:${bg};color:${color};font-size:15px;line-height:1.5;font-weight:700;">${input.message}</div>
        <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.5;">You can close this window.</p>
      </section>
    </main>
  </body>
</html>`, {
    status: input.tone === "success" ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = decodeEmail(url.searchParams.get("e"), url.searchParams.get("email"));
  const signature = String(url.searchParams.get("s") || "");

  if (!email || !email.includes("@")) {
    return htmlResponse({
      title: "Unable to unsubscribe",
      message: "The unsubscribe link is missing a valid email address.",
      tone: "error",
    });
  }

  const expected = signEmail(email);
  if (signature && !safeCompare(signature, expected)) {
    return htmlResponse({
      title: "Unable to unsubscribe",
      message: "This unsubscribe link could not be verified.",
      tone: "error",
    });
  }


  const { data: existing, error: lookupError } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_marketing_contacts")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return htmlResponse({
      title: "Unable to unsubscribe",
      message: lookupError.message,
      tone: "error",
    });
  }

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealer_marketing_contacts")
      .update({ status: "unsubscribed" })
      .eq("id", existing.id);

    if (error) {
      return htmlResponse({
        title: "Unable to unsubscribe",
        message: error.message,
        tone: "error",
      });
    }
  } else {
    const { error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealer_marketing_contacts")
      .insert({
        email,
        source: "unsubscribe_link",
        status: "unsubscribed",
      });

    if (error) {
      return htmlResponse({
        title: "Unable to unsubscribe",
        message: error.message,
        tone: "error",
      });
    }
  }

  return htmlResponse({
    title: "You are unsubscribed",
    message: `${email} has been removed from SolaceTrade outreach.`,
    tone: "success",
  });
}
