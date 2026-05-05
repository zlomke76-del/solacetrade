import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AnyObject = Record<string, unknown>;

type ExistingOutbound = {
  id: string;
  dealer_id: string | null;
  dealer_slug: string | null;
  dealer_name: string | null;
  to_email: string;
  from_email: string;
  subject: string;
  marketing_stage: string | null;
  created_at: string | null;
  sent_at: string | null;
};

const SOLACETRADE_SCHEMA = "solacetrade";
const RESEND_RECEIVING_BASE_URL = "https://api.resend.com/emails/receiving";

function asObject(value: unknown): AnyObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyObject)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }

  const text = asString(value);
  return text ? [text] : [];
}

function makeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rdquo;/g, "”")
    .replace(/&ldquo;/g, "“")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractEmail(value: unknown): string {
  const text = asString(value).toLowerCase();
  if (!text) return "";

  const angleMatch = text.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (angleMatch?.[1]) return angleMatch[1].trim();

  const emailMatch = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return emailMatch?.[0]?.toLowerCase() || "";
}

function extractFirstEmail(value: unknown): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const email = extractEmail(item);
      if (email) return email;
    }
    return "";
  }

  return extractEmail(value);
}

function getPayloadRoot(raw: AnyObject) {
  const data = asObject(raw.data);
  return Object.keys(data).length ? data : raw;
}

function getInboundEmailId(raw: AnyObject, root: AnyObject) {
  return (
    asString(root.email_id) ||
    asString(root.emailId) ||
    asString(root.id) ||
    asString(raw.email_id) ||
    asString(raw.emailId) ||
    asString(raw.id) ||
    ""
  );
}

function getProviderMessageId(raw: AnyObject, root: AnyObject) {
  return (
    asString(root.message_id) ||
    asString(root.messageId) ||
    asString(asObject(root.headers)["message-id"]) ||
    asString(asObject(raw.headers)["message-id"]) ||
    getInboundEmailId(raw, root) ||
    null
  );
}

function getSubject(root: AnyObject) {
  return asString(root.subject) || "No subject";
}

function getBody(root: AnyObject) {
  const text =
    asString(root.text) ||
    asString(root.text_body) ||
    asString(root.plain) ||
    asString(root.body_text);

  if (text) return text;

  const html =
    asString(root.html) ||
    asString(root.html_body) ||
    asString(root.body_html);

  return html ? stripHtml(html) : "";
}

function getAddresses(raw: AnyObject, root: AnyObject) {
  const envelope = asObject(root.envelope);
  const rawEnvelope = asObject(raw.envelope);

  const fromEmail =
    extractEmail(root.from) ||
    extractEmail(envelope.from) ||
    extractEmail(rawEnvelope.from) ||
    extractEmail(raw.from);

  const toEmail =
    extractFirstEmail(root.to) ||
    extractFirstEmail(envelope.to) ||
    extractFirstEmail(rawEnvelope.to) ||
    extractFirstEmail(raw.to) ||
    "reply@solacetrade.ai";

  const ccEmails = [
    ...asStringArray(root.cc),
    ...asStringArray(envelope.cc),
    ...asStringArray(raw.cc),
  ]
    .map((item) => extractEmail(item))
    .filter(Boolean);

  return { fromEmail, toEmail, ccEmails };
}

async function retrieveReceivedEmail(emailId: string) {
  if (!emailId) return null;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to retrieve received email content.");
  }

  const response = await fetch(`${RESEND_RECEIVING_BASE_URL}/${encodeURIComponent(emailId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const json = (await response.json().catch(() => ({}))) as AnyObject;

  if (!response.ok) {
    const message =
      asString(json.message) ||
      asString(json.error) ||
      `Resend received-email retrieval failed with status ${response.status}.`;
    throw new Error(message);
  }

  const data = asObject(json.data);
  return Object.keys(data).length ? data : json;
}

function mergeWebhookWithRetrievedEmail(root: AnyObject, retrieved: AnyObject | null) {
  if (!retrieved) return root;

  return {
    ...root,
    ...retrieved,
    subject: asString(retrieved.subject) || asString(root.subject),
    from: asString(retrieved.from) || asString(root.from),
    to: Array.isArray(retrieved.to) && retrieved.to.length ? retrieved.to : root.to,
    cc: Array.isArray(retrieved.cc) && retrieved.cc.length ? retrieved.cc : root.cc,
    bcc: Array.isArray(retrieved.bcc) && retrieved.bcc.length ? retrieved.bcc : root.bcc,
    message_id: asString(retrieved.message_id) || asString(root.message_id),
    text: asString(retrieved.text) || asString(root.text),
    html: asString(retrieved.html) || asString(root.html),
    headers: Object.keys(asObject(retrieved.headers)).length
      ? asObject(retrieved.headers)
      : asObject(root.headers),
  };
}

async function ensureContact(email: string) {
  const normalizedEmail = email.toLowerCase();

  const { data: existing, error: lookupError } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_marketing_contacts")
    .select("id,email,status,contact_count,last_contacted_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  if (existing) return existing;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_marketing_contacts")
    .insert({
      email: normalizedEmail,
      source: "inbound_reply",
      status: "active",
    })
    .select("id,email,status,contact_count,last_contacted_at")
    .single();

  if (insertError) throw new Error(insertError.message);
  return inserted;
}

async function findLatestOutboundForContact(email: string) {
  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_communications")
    .select(
      "id,dealer_id,dealer_slug,dealer_name,to_email,from_email,subject,marketing_stage,created_at,sent_at",
    )
    .eq("direction", "outbound")
    .eq("to_email", email.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ExistingOutbound>();

  if (error) throw new Error(error.message);
  return data || null;
}

async function markMatchingMarketingSendsReplied(email: string) {
  const { data: sends, error: sendsError } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_marketing_sends")
    .select("id")
    .eq("email", email.toLowerCase())
    .neq("status", "replied")
    .order("created_at", { ascending: false })
    .limit(10);

  if (sendsError) throw new Error(sendsError.message);

  const sendIds = (sends || [])
    .map((send) => String(send.id || ""))
    .filter(Boolean);

  if (!sendIds.length) return [];

  const { error: updateError } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealer_marketing_sends")
    .update({ status: "replied" })
    .in("id", sendIds);

  if (updateError) throw new Error(updateError.message);

  return sendIds;
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => ({}))) as AnyObject;
    const webhookRoot = getPayloadRoot(raw);
    const eventType = asString(raw.type) || asString(raw.event) || "email.received";
    const inboundEmailId = getInboundEmailId(raw, webhookRoot);
    const retrievedEmail = await retrieveReceivedEmail(inboundEmailId);
    const root = mergeWebhookWithRetrievedEmail(webhookRoot, retrievedEmail);

    const { fromEmail, toEmail, ccEmails } = getAddresses(raw, root);
    const subject = getSubject(root);
    const body = getBody(root);
    const providerMessageId = getProviderMessageId(raw, root);
    const now = new Date().toISOString();

    if (!fromEmail || !fromEmail.includes("@")) {
      return NextResponse.json(
        { error: "Inbound email is missing a valid from address." },
        { status: 400 },
      );
    }

    const contact = await ensureContact(fromEmail);
    const latestOutbound = await findLatestOutboundForContact(fromEmail);
    const repliedSendIds = await markMatchingMarketingSendsReplied(fromEmail);

    const { data: inserted, error: insertError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealer_communications")
      .insert({
        dealer_id: latestOutbound?.dealer_id || null,
        dealer_slug: latestOutbound?.dealer_slug || null,
        dealer_name: latestOutbound?.dealer_name || "Direct Outreach",
        direction: "inbound",
        status: "received",
        from_email: fromEmail,
        to_email: toEmail,
        cc_emails: ccEmails,
        subject,
        body: body || "No body captured.",
        marketing_stage: latestOutbound?.marketing_stage || "reply",
        provider: "resend",
        provider_message_id: providerMessageId,
        received_at: now,
        metadata: {
          event_type: eventType,
          contact_id: contact?.id || null,
          matched_by: "from_email_to_prior_outbound_or_contact_email",
          matched_outbound_id: latestOutbound?.id || null,
          replied_marketing_send_ids: repliedSendIds,
          inbound_to: toEmail,
          inbound_email_id: inboundEmailId || null,
          body_source: body ? (asString(root.text) ? "received_email_text" : "received_email_html") : "missing",
          raw_event_type: eventType,
        },
      })
      .select("*")
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({
      ok: true,
      message: inserted,
      contact,
      matchedOutboundId: latestOutbound?.id || null,
      repliedSendIds,
      inboundEmailId,
      bodyCaptured: Boolean(body),
    });
  } catch (error) {
    return NextResponse.json(
      { error: makeError(error, "Could not process inbound dealer communication.") },
      { status: 500 },
    );
  }
}
