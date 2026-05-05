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
  const dashboardLink = `${appUrl}/dealer/${dealerSlug}/dashboard`;

  const buttonSnippet = `<a href="${customerLink}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;justify-content:center;padding:14px 20px;border-radius:14px;background:#b91c1c;color:#fff;font-weight:800;text-decoration:none;">Get Your Trade Value</a>`;

  const iframeSnippet = `<iframe src="${customerLink}" style="width:100%;min-height:920px;border:0;border-radius:16px;" loading="lazy"></iframe>`;

  return {
    customerLink,
    internalLink,
    dashboardLink,
    buttonSnippet,
    iframeSnippet,
  };
}

export async function sendDealerOnboardingEmail(
  input: DealerOnboardingEmailInput
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey)
    return { skipped: true, reason: "RESEND_API_KEY is not configured." };

  const to = [input.billingEmail, input.managerEmail]
    .filter(Boolean)
    .filter((email, index, array) => array.indexOf(email) === index) as string[];

  if (!to.length)
    return { skipped: true, reason: "No onboarding email recipient." };

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM_EMAIL ||
    "SolaceTrade <onboarding@solacetrade.ai>";

  const snippets = buildDealerInstallSnippets(input.dealerSlug);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.55;max-width:760px;margin:0 auto;padding:24px;">
    
    <div style="display:inline-block;padding:7px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">
      SolaceTrade Active
    </div>

    <h1 style="font-size:32px;line-height:1;margin:16px 0 8px;letter-spacing:-.04em;">
      ${escapeHtml(input.dealerName)} is live.
    </h1>

    <p style="font-size:15px;">
      Your trade intake system is now active. Customers can scan their vehicle, receive an instant offer response, and your team receives a structured, manager-ready deal packet.
    </p>

    <!-- LINKS -->
    <h2 style="font-size:18px;margin-top:26px;">Your system links</h2>

    <p><strong>Customer trade page:</strong><br>
    <a href="${snippets.customerLink}">${snippets.customerLink}</a></p>

    <p><strong>Internal sales intake (for your team):</strong><br>
    <a href="${snippets.internalLink}">${snippets.internalLink}</a></p>

    <p><strong>Dealer dashboard:</strong><br>
    <a href="${snippets.dashboardLink}">${snippets.dashboardLink}</a></p>

    <!-- INSTALL -->
    <h2 style="font-size:18px;margin-top:26px;">Install on your website (2 options)</h2>

    <p><strong>Option 1 — Button (recommended):</strong></p>
    <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;font-size:13px;">
${escapeHtml(snippets.buttonSnippet)}
    </pre>

    <p>Add this button to:</p>
    <ul>
      <li>Homepage hero</li>
      <li>Sell/Trade page</li>
      <li>Used inventory page</li>
      <li>Vehicle detail pages (VDPs)</li>
    </ul>

    <p><strong>Option 2 — Full embed (advanced):</strong></p>
    <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;font-size:13px;">
${escapeHtml(snippets.iframeSnippet)}
    </pre>

    <p>This embeds the full experience directly into your website.</p>

    <!-- HOW IT WORKS -->
    <h2 style="font-size:18px;margin-top:26px;">What happens now</h2>

    <ul>
      <li>Customer scans vehicle (5 photos)</li>
      <li>System extracts VIN, mileage, and condition</li>
      <li>Offer is generated instantly</li>
      <li>Your team receives a structured trade packet</li>
      <li>You control final value after inspection</li>
    </ul>

    <!-- INTERNAL -->
    <h2 style="font-size:18px;margin-top:26px;">How your team uses it</h2>

    <ul>
      <li>Sales uses the internal link for walk-ins</li>
      <li>Manager reviews incoming trade packets</li>
      <li>Dashboard shows all opportunities in real time</li>
    </ul>

    <!-- PACKET -->
    <h2 style="font-size:18px;margin-top:26px;">What every trade includes</h2>

    <ul>
      <li>VIN (image extracted)</li>
      <li>Mileage (image extracted)</li>
      <li>Vehicle photos (required)</li>
      <li>Condition signals</li>
      <li>Offer + confidence range</li>
      <li>Customer contact (when provided)</li>
    </ul>

    <!-- CONTROL -->
    <div style="margin-top:22px;padding:14px;border-radius:16px;background:#fef3c7;border:1px solid #fde68a;font-size:14px;">
      <strong>Important:</strong> You always control the final offer.  
      The system creates speed and structure — your desk keeps authority.
    </div>

    <p style="margin-top:22px;color:#64748b;font-size:13px;">
      If you need help placing this on your website, reply to this email and we’ll assist directly.
    </p>

  </div>
  `;

  const text = [
    `${input.dealerName} is live in SolaceTrade.`,
    "",
    `Customer trade page: ${snippets.customerLink}`,
    `Internal intake: ${snippets.internalLink}`,
    `Dashboard: ${snippets.dashboardLink}`,
    "",
    "INSTALL (RECOMMENDED):",
    snippets.buttonSnippet,
    "",
    "EMBED OPTION:",
    snippets.iframeSnippet,
    "",
    "FLOW:",
    "Customer scans → offer generated → dealer receives structured packet → dealer controls final offer",
  ].join("\n");

  return resend.emails.send({
    from,
    to,
    subject: `${input.dealerName} is now live on SolaceTrade`,
    html,
    text,
  });
}
