import { createHmac, timingSafeEqual } from "crypto";
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

type MarketingContact = {
  id: string;
  email: string;
  status: string | null;
  contact_count: number | null;
  last_contacted_at: string | null;
};

const SOLACETRADE_SCHEMA = "solacetrade";

const DEFAULT_FROM_EMAIL =
  process.env.TRADEDESK_MARKETING_FROM_EMAIL ||
  process.env.SOLACETRADE_MARKETING_FROM_EMAIL ||
  "SolaceTrade <team@solacetrade.ai>";

const DEFAULT_REPLY_TO_EMAIL =
  process.env.SOLACETRADE_MARKETING_REPLY_TO ||
  process.env.TRADEDESK_MARKETING_REPLY_TO ||
  "reply@solacetrade.ai";

const SUPPRESSED_CONTACT_STATUSES = new Set([
  "unsubscribed",
  "bounced",
  "suppressed",
]);

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

function getAppBaseUrl(req: Request) {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SOLACETRADE_APP_URL ||
    process.env.VERCEL_URL;

  if (configured) {
    const withProtocol = configured.startsWith("http")
      ? configured
      : `https://${configured}`;
    return withProtocol.replace(/\/$/, "");
  }

  return new URL(req.url).origin.replace(/\/$/, "");
}

function getUnsubscribeSecret() {
  return (
    process.env.SOLACETRADE_UNSUBSCRIBE_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.RESEND_API_KEY ||
    "solacetrade-local-unsubscribe-secret"
  );
}

function base64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signUnsubscribeEmail(email: string) {
  return createHmac("sha256", getUnsubscribeSecret())
    .update(email.toLowerCase())
    .digest("base64url");
}

function buildUnsubscribeUrl(baseUrl: string, email: string) {
  const normalized = email.toLowerCase();
  const encodedEmail = base64Url(normalized);
  const signature = signUnsubscribeEmail(normalized);
  return `${baseUrl}/api/solacetrade/unsubscribe?e=${encodeURIComponent(encodedEmail)}&s=${encodeURIComponent(signature)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPlainTextBody(body: string, unsubscribeUrl: string) {
  return `${body.trim()}\n\n--\nSolaceTrade\nReal offer in seconds. No games.\n\nTo stop receiving SolaceTrade outreach, unsubscribe here:\n${unsubscribeUrl}`;
}

function paragraphsFromBody(body: string) {
  return body
    .trim()
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function buildHtmlBody(input: {
  body: string;
  subject: string;
  unsubscribeUrl: string;
}) {
  const paragraphs = paragraphsFromBody(input.body);
  const htmlParagraphs = paragraphs
    .map((paragraph) => {
      const escaped = escapeHtml(paragraph).replace(/\n/g, "<br />");
      return `<p style="margin:0 0 16px;line-height:1.58;color:#1f2937;font-size:15px;">${escaped}</p>`;
    })
    .join("\n");

  const preview = escapeHtml(input.subject || "SolaceTrade outreach");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${preview}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">SolaceTrade turns trade intake into a guided, evidence-based acquisition flow.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#0f172a;padding:18px 22px;color:#ffffff;">
                <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:800;color:#fed7aa;">SolaceTrade</div>
                <div style="font-size:22px;line-height:1.12;font-weight:900;margin-top:5px;letter-spacing:-0.03em;">Real offer in seconds. No games.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 22px 10px;">
                ${htmlParagraphs}
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;">
                  <tr>
                    <td style="padding:14px 16px;">
                      <div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#9a3412;margin-bottom:6px;">What SolaceTrade does</div>
                      <div style="font-size:14px;line-height:1.5;color:#334155;">Customers scan the vehicle. The dealer receives VIN, mileage, photos, condition context, and a cleaner acquisition file before the first follow-up.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <div style="font-size:12px;line-height:1.5;color:#64748b;">
                  You are receiving this because SolaceTrade is contacting automotive retail professionals about trade-in acquisition workflow. To stop receiving SolaceTrade outreach, <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#9a3412;font-weight:800;text-decoration:underline;">unsubscribe here</a>.
                </div>
                <div style="font-size:11px;line-height:1.5;color:#94a3b8;margin-top:10px;">SolaceTrade · Houston, TX</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function getDealer(dealerId: string) {
  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
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
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_communications")
    .select("id,thread_key,contact_email,dealer_id,dealer_slug,dealer_name,subject,marketing_stage")
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data || null;
}

async function getMarketingContact(email: string): Promise<MarketingContact | null> {
  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_marketing_contacts")
    .select("id,email,status,contact_count,last_contacted_at")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data || null;
}

async function ensureOutboundContact(email: string, now: string) {
  const normalized = email.toLowerCase();
  const existing = await getMarketingContact(normalized);

  if (existing) {
    const status = String(existing.status || "active").toLowerCase();
    if (SUPPRESSED_CONTACT_STATUSES.has(status)) {
      throw new Error(`Send blocked: ${normalized} is ${status}.`);
    }

    await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealer_marketing_contacts")
      .update({
        contact_count: (existing.contact_count || 0) + 1,
        last_contacted_at: now,
      })
      .eq("id", existing.id);

    return existing;
  }

  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_marketing_contacts")
    .insert({
      email: normalized,
      source: "manual_outreach",
      status: "active",
      contact_count: 1,
      last_contacted_at: now,
    })
    .select("id,email,status,contact_count,last_contacted_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const dealerId = url.searchParams.get("dealerId");
    const direction = url.searchParams.get("direction");

    let query = supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
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
    const baseUrl = getAppBaseUrl(req);
    const unsubscribeUrl = buildUnsubscribeUrl(baseUrl, contactEmail);
    const textBody = formatPlainTextBody(body, unsubscribeUrl);
    const htmlBody = buildHtmlBody({ body, subject, unsubscribeUrl });

    let providerMessageId: string | null = null;
    let status: "sent" | "received" | "failed" = direction === "inbound" ? "received" : "sent";
    let failedAt: string | null = null;
    let failureReason: string | null = null;
    let outboundContact: MarketingContact | null = null;

    if (direction === "outbound") {
      const apiKey = process.env.RESEND_API_KEY;

      if (!apiKey) {
        status = "failed";
        failedAt = now;
        failureReason = "RESEND_API_KEY is not configured.";
      } else {
        outboundContact = await ensureOutboundContact(contactEmail, now);

        const resend = new Resend(apiKey);
        const result = await resend.emails.send({
          from: DEFAULT_FROM_EMAIL,
          to: [toEmail],
          cc: ccEmails.length ? ccEmails : undefined,
          subject,
          text: textBody,
          html: htmlBody,
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
      .schema(SOLACETRADE_SCHEMA)
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
          html_email: direction === "outbound",
          html_template_version: "solacetrade_outreach_v1",
          unsubscribe_url: direction === "outbound" ? unsubscribeUrl : null,
          contact: outboundContact
            ? {
                id: outboundContact.id,
                status: outboundContact.status || "active",
              }
            : null,
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
