import { Resend } from "resend";
import { getAppBaseUrl } from "./stripe";

type DealerOnboardingEmailInput = {
  dealerName: string;
  dealerSlug: string;
  billingEmail: string | null;
  managerEmail: string | null;
  dealerWebsite?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildDealerInstallSnippets(dealerSlug: string) {
  const appUrl = getAppBaseUrl();
  const customerLink = `${appUrl}/${dealerSlug}`;
  const internalLink = `${appUrl}/${dealerSlug}/internal`;
  const buttonSnippet = `<a href="${customerLink}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 20px;border-radius:14px;background:#b91c1c;color:#fff;font-weight:800;text-decoration:none;">Get Your Trade Value</a>`;
  const iframeSnippet = `<iframe src="${customerLink}" style="width:100%;min-height:920px;border:0;border-radius:16px;" loading="lazy"></iframe>`;

  return {
    customerLink,
    internalLink,
    buttonSnippet,
    iframeSnippet,
  };
}

export async function sendDealerOnboardingEmail(input: DealerOnboardingEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: true, reason: "RESEND_API_KEY is not configured." };

  const to = [input.billingEmail, input.managerEmail]
    .filter(Boolean)
    .filter((email, index, array) => array.indexOf(email) === index) as string[];

  if (!to.length) return { skipped: true, reason: "No onboarding email recipient." };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "SolaceTrade <onboarding@solacetrade.ai>";
  const snippets = buildDealerInstallSnippets(input.dealerSlug);

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.55;max-width:720px;margin:0 auto;padding:24px;">
      <div style="display:inline-block;padding:7px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">SolaceTrade active</div>
      <h1 style="font-size:32px;line-height:1;margin:16px 0 8px;letter-spacing:-.04em;">${escapeHtml(input.dealerName)} is ready.</h1>
      <p>Your dealer page and internal intake route have been created. Add the customer link to the dealership website and share the internal link with your sales team.</p>

      <h2 style="font-size:18px;margin-top:24px;">Dealer links</h2>
      <p><strong>Customer trade page:</strong><br><a href="${snippets.customerLink}">${snippets.customerLink}</a></p>
      <p><strong>Internal sales intake:</strong><br><a href="${snippets.internalLink}">${snippets.internalLink}</a></p>

      <h2 style="font-size:18px;margin-top:24px;">Website button snippet</h2>
      <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;font-size:13px;">${escapeHtml(snippets.buttonSnippet)}</pre>

      <h2 style="font-size:18px;margin-top:24px;">Optional iframe embed</h2>
      <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;font-size:13px;">${escapeHtml(snippets.iframeSnippet)}</pre>

      <p style="margin-top:22px;color:#64748b;font-size:13px;">Recommended placement: homepage hero, Sell/Trade page, used inventory page, VDP pages, and finance page.</p>
    </div>
  `;

  const text = [
    `${input.dealerName} is ready in SolaceTrade.`,
    "",
    `Customer trade page: ${snippets.customerLink}`,
    `Internal sales intake: ${snippets.internalLink}`,
    "",
    "Website button snippet:",
    snippets.buttonSnippet,
    "",
    "Optional iframe embed:",
    snippets.iframeSnippet,
  ].join("\n");

  return resend.emails.send({
    from,
    to,
    subject: `SolaceTrade setup is ready for ${input.dealerName}`,
    html,
    text,
  });
}
