import { Resend } from "resend";
import { formatMoney } from "@/lib/solacetrade";

export type TradeEmailMessage = {
  from: string;
  to: string[];
  replyTo?: string[];
  subject: string;
  html: string;
  text: string;
};

export type SendTradeEmailResult = {
  id: string | null;
};

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPlatformFromEmail() {
  return (
    process.env.SOLACETRADE_OFFERS_FROM_EMAIL ||
    process.env.RESEND_OFFERS_FROM_EMAIL ||
    "offers@solacetrade.ai"
  );
}

function cleanHeaderName(value: unknown) {
  return String(value || "SolaceTrade")
    .replace(/[\r\n<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "SolaceTrade";
}

function cleanEmail(value: unknown) {
  const text = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

export function buildDealerFollowupEmail(input: {
  dealerName: string;
  dealerLeadEmail: string;
  customerEmail: string;
  customerName: string;
  vehicleLabel: string;
  offerAmount: number | null;
  offerCurrency?: unknown;
  locale?: string;
  customerIntent?: string;
}) : TradeEmailMessage {
  const dealerName = cleanHeaderName(input.dealerName);
  const fromEmail = getPlatformFromEmail();
  const replyTo = cleanEmail(input.dealerLeadEmail);
  const customerEmail = cleanEmail(input.customerEmail);
  const customerName = String(input.customerName || "there").trim() || "there";
  const vehicleLabel = String(input.vehicleLabel || "your vehicle").trim() || "your vehicle";
  const formattedOffer = input.offerAmount
    ? formatMoney(input.offerAmount, input.offerCurrency === "CAD" ? "CAD" : "USD", input.locale)
    : null;
  const intent = String(input.customerIntent || "").trim().toLowerCase();
  const intentLine = intent.includes("sell")
    ? "We can move quickly if you are looking to sell it outright."
    : intent.includes("talk")
      ? "We can walk through your options and help you decide the best next step."
      : "We can help with the trade path and your next vehicle when you are ready.";

  if (!customerEmail) {
    throw new Error("A valid customer email is required for dealer follow-up.");
  }

  const subject = "We reviewed your vehicle — next step";
  const from = `${dealerName} <${fromEmail}>`;
  const text = [
    `Hi ${customerName},`,
    "",
    `We just reviewed ${vehicleLabel} from your trade submission.`,
    formattedOffer ? `Current offer: ${formattedOffer}` : null,
    "Final value is confirmed once we see it in person and verify condition, mileage, title, and payoff details.",
    intentLine,
    "",
    "What is easiest for you — stop by or set a quick time?",
    "",
    `— ${dealerName}`,
    "",
    "Powered by SolaceTrade",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const html = `
    <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
      <div style="max-width:620px;margin:0 auto;padding:24px;">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.12);">
          <div style="background:#0f172a;color:#ffffff;padding:22px 24px;">
            <div style="font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#cbd5e1;">${escapeHtml(dealerName)}</div>
            <h1 style="margin:8px 0 0;font-size:28px;line-height:1.08;letter-spacing:-0.04em;">We reviewed your vehicle</h1>
            <div style="margin-top:8px;font-size:14px;color:#e2e8f0;">Next step on your trade submission</div>
          </div>

          <div style="padding:22px 24px;">
            <p style="margin:0 0 14px;color:#334155;">Hi ${escapeHtml(customerName)},</p>
            <p style="margin:0 0 14px;color:#334155;">We just reviewed <strong>${escapeHtml(vehicleLabel)}</strong> from your trade submission.</p>

            ${formattedOffer ? `
              <div style="margin:16px 0;padding:15px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Current offer</div>
                <div style="margin-top:4px;font-size:26px;font-weight:900;color:#0f172a;letter-spacing:-0.04em;">${escapeHtml(formattedOffer)}</div>
              </div>
            ` : ""}

            <p style="margin:0 0 14px;color:#334155;">Final value is confirmed once we see it in person and verify condition, mileage, title, and payoff details.</p>
            <p style="margin:0 0 14px;color:#334155;">${escapeHtml(intentLine)}</p>
            <p style="margin:0;color:#334155;"><strong>What is easiest for you — stop by or set a quick time?</strong></p>

            <div style="margin-top:20px;color:#0f172a;font-weight:900;">— ${escapeHtml(dealerName)}</div>
          </div>
        </div>

        <div style="margin-top:12px;text-align:center;font-size:12px;color:#64748b;">
          Powered by SolaceTrade
        </div>
      </div>
    </div>
  `;

  return {
    from,
    to: [customerEmail],
    replyTo: replyTo ? [replyTo] : undefined,
    subject,
    html,
    text,
  };
}

export async function sendTradeEmail(message: TradeEmailMessage): Promise<SendTradeEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { id: null };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const response = await resend.emails.send({
    from: message.from,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return { id: response.data?.id || null };
}
