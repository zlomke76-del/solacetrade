import { Resend } from "resend";
import { getAppBaseUrl } from "./stripe";

type DealerOnboardingEmailInput = {
  dealerName: string;
  dealerSlug: string;
  billingEmail: string | null;
  managerEmail: string | null;
  dealerWebsite?: string | null;
};

type DealerFollowUpEmailInput = DealerOnboardingEmailInput & {
  recipientEmail?: string | null;
};

type EmailRecipientResult =
  | { ok: true; to: string[] }
  | { ok: false; skipped: true; reason: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uniqueRecipients(values: Array<string | null | undefined>): EmailRecipientResult {
  const to = values
    .filter(Boolean)
    .map((email) => String(email).trim().toLowerCase())
    .filter(Boolean)
    .filter((email, index, array) => array.indexOf(email) === index);

  if (!to.length) {
    return { ok: false, skipped: true, reason: "No onboarding email recipient." };
  }

  return { ok: true, to };
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || "SolaceTrade <onboarding@solacetrade.ai>";
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

export async function sendDealerOnboardingEmail(input: DealerOnboardingEmailInput) {
  const resend = getResendClient();
  if (!resend) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured." };
  }

  const recipients = uniqueRecipients([input.billingEmail, input.managerEmail]);
  if (!recipients.ok) return recipients;

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

    <h2 style="font-size:18px;margin-top:26px;">Your system links</h2>

    <p><strong>Customer trade page:</strong><br>
    <a href="${snippets.customerLink}">${snippets.customerLink}</a></p>

    <p><strong>Internal sales intake:</strong><br>
    <a href="${snippets.internalLink}">${snippets.internalLink}</a></p>

    <p><strong>Dealer dashboard:</strong><br>
    <a href="${snippets.dashboardLink}">${snippets.dashboardLink}</a></p>

    <h2 style="font-size:18px;margin-top:26px;">Install on your website</h2>

    <div style="padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:14px;">
      <strong style="display:block;font-size:15px;margin-bottom:6px;">Option 1 — Button link (recommended)</strong>
      <p style="margin:0 0 10px;color:#475569;font-size:14px;">
        Ask your website provider to place this button anywhere shoppers ask about trade value.
      </p>
      <pre style="white-space:pre-wrap;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;font-size:13px;margin:0;">${escapeHtml(snippets.buttonSnippet)}</pre>
    </div>

    <div style="padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
      <strong style="display:block;font-size:15px;margin-bottom:6px;">Option 2 — Full embed</strong>
      <p style="margin:0 0 10px;color:#475569;font-size:14px;">
        Use this if you want the full scan experience embedded directly on a Sell/Trade page.
      </p>
      <pre style="white-space:pre-wrap;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;font-size:13px;margin:0;">${escapeHtml(snippets.iframeSnippet)}</pre>
    </div>

    <h2 style="font-size:18px;margin-top:26px;">Where to install it</h2>
    <ul>
      <li>Homepage hero or main call-to-action area</li>
      <li>Sell/Trade page</li>
      <li>Used inventory page</li>
      <li>Vehicle detail pages</li>
      <li>Finance page</li>
      <li>Follow-up emails and SMS campaigns</li>
    </ul>

    <h2 style="font-size:18px;margin-top:26px;">What happens now</h2>
    <ul>
      <li>Customer scans vehicle with guided photos</li>
      <li>System extracts VIN, mileage, and condition signals</li>
      <li>Customer receives an instant offer response</li>
      <li>Your team receives a structured trade packet</li>
      <li>Your desk controls the final value after inspection</li>
    </ul>

    <h2 style="font-size:18px;margin-top:26px;">How your team uses it</h2>
    <ul>
      <li>Sales uses the internal link for walk-ins and phone-ups</li>
      <li>Managers review incoming trade packets from the dashboard</li>
      <li>CRM/routing emails receive trade opportunities as configured</li>
    </ul>

    <h2 style="font-size:18px;margin-top:26px;">What every trade packet includes</h2>
    <ul>
      <li>VIN, when readable from vehicle evidence</li>
      <li>Mileage, when readable from odometer evidence</li>
      <li>Required vehicle photos</li>
      <li>Condition signals</li>
      <li>Offer amount or offer range</li>
      <li>Confidence/admissibility context</li>
      <li>Customer contact information, when provided</li>
    </ul>

    <div style="margin-top:22px;padding:14px;border-radius:16px;background:#fef3c7;border:1px solid #fde68a;font-size:14px;">
      <strong>Important:</strong> You always control the final offer. SolaceTrade creates speed and structure — your desk keeps authority.
    </div>

    <p style="margin-top:22px;color:#64748b;font-size:13px;">
      Need help placing this on your site? Reply to this email with your website provider or marketing contact and we’ll help with the install details.
    </p>
  </div>
  `;

  const text = [
    `${input.dealerName} is live in SolaceTrade.`,
    "",
    `Customer trade page: ${snippets.customerLink}`,
    `Internal sales intake: ${snippets.internalLink}`,
    `Dealer dashboard: ${snippets.dashboardLink}`,
    "",
    "INSTALL OPTION 1 — BUTTON LINK (RECOMMENDED):",
    snippets.buttonSnippet,
    "",
    "INSTALL OPTION 2 — FULL EMBED:",
    snippets.iframeSnippet,
    "",
    "BEST PLACEMENTS:",
    "Homepage hero, Sell/Trade page, used inventory page, VDP pages, finance page, follow-up emails, and SMS campaigns.",
    "",
    "WHAT HAPPENS NOW:",
    "Customer scans vehicle -> offer generated -> dealer receives structured packet -> dealer controls final offer after inspection.",
  ].join("\n");

  return resend.emails.send({
    from: getFromEmail(),
    to: recipients.to,
    subject: `${input.dealerName} is now live on SolaceTrade`,
    html,
    text,
  });
}

export async function sendDealerInstallFollowUpEmail(input: DealerFollowUpEmailInput) {
  const resend = getResendClient();
  if (!resend) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured." };
  }

  const recipients = uniqueRecipients([
    input.recipientEmail,
    input.managerEmail,
    input.billingEmail,
  ]);
  if (!recipients.ok) return recipients;

  const snippets = buildDealerInstallSnippets(input.dealerSlug);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.55;max-width:720px;margin:0 auto;padding:24px;">
    <div style="display:inline-block;padding:7px 10px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">
      Install check
    </div>

    <h1 style="font-size:28px;line-height:1.05;margin:16px 0 8px;letter-spacing:-.04em;">
      Is SolaceTrade installed on ${escapeHtml(input.dealerName)}’s website yet?
    </h1>

    <p>
      The fastest path is to add the customer trade page as a button on the places where shoppers already think about their current vehicle.
    </p>

    <h2 style="font-size:18px;margin-top:24px;">Recommended install</h2>
    <p><strong>Customer trade page:</strong><br><a href="${snippets.customerLink}">${snippets.customerLink}</a></p>

    <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;font-size:13px;">${escapeHtml(snippets.buttonSnippet)}</pre>

    <h2 style="font-size:18px;margin-top:24px;">Place it here first</h2>
    <ol>
      <li>Homepage hero or top CTA area</li>
      <li>Sell/Trade page</li>
      <li>Used inventory page</li>
      <li>Vehicle detail pages</li>
    </ol>

    <h2 style="font-size:18px;margin-top:24px;">Staff link</h2>
    <p>
      Give this to your sales team for walk-ins and phone-ups:<br>
      <a href="${snippets.internalLink}">${snippets.internalLink}</a>
    </p>

    <h2 style="font-size:18px;margin-top:24px;">Dashboard</h2>
    <p>
      Watch incoming opportunities here:<br>
      <a href="${snippets.dashboardLink}">${snippets.dashboardLink}</a>
    </p>

    <div style="margin-top:22px;padding:14px;border-radius:16px;background:#ecfdf5;border:1px solid #bbf7d0;color:#065f46;font-size:14px;">
      <strong>Simple instruction for your website provider:</strong><br>
      “Please add this Trade Value button to our homepage, Sell/Trade page, used inventory page, and VDP pages.”
    </div>
  </div>
  `;

  const text = [
    `Install check for ${input.dealerName}`,
    "",
    `Customer trade page: ${snippets.customerLink}`,
    "",
    "Recommended button snippet:",
    snippets.buttonSnippet,
    "",
    `Internal staff link: ${snippets.internalLink}`,
    `Dashboard: ${snippets.dashboardLink}`,
    "",
    "Website provider instruction:",
    "Please add this Trade Value button to our homepage, Sell/Trade page, used inventory page, and VDP pages.",
  ].join("\n");

  return resend.emails.send({
    from: getFromEmail(),
    to: recipients.to,
    subject: `Install check: ${input.dealerName} SolaceTrade setup`,
    html,
    text,
  });
}

export async function sendDealerFirstDealWalkthroughEmail(input: DealerFollowUpEmailInput) {
  const resend = getResendClient();
  if (!resend) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured." };
  }

  const recipients = uniqueRecipients([
    input.recipientEmail,
    input.managerEmail,
    input.billingEmail,
  ]);
  if (!recipients.ok) return recipients;

  const snippets = buildDealerInstallSnippets(input.dealerSlug);

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.55;max-width:720px;margin:0 auto;padding:24px;">
    <div style="display:inline-block;padding:7px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">
      First deal walkthrough
    </div>

    <h1 style="font-size:28px;line-height:1.05;margin:16px 0 8px;letter-spacing:-.04em;">
      How to work your first SolaceTrade opportunity.
    </h1>

    <p>
      Once the first customer scan or staff intake comes in, treat it like a manager-ready trade file — not a generic web lead.
    </p>

    <h2 style="font-size:18px;margin-top:24px;">Step 1 — Open the dashboard</h2>
    <p><a href="${snippets.dashboardLink}">${snippets.dashboardLink}</a></p>

    <h2 style="font-size:18px;margin-top:24px;">Step 2 — Review the packet</h2>
    <ul>
      <li>Confirm vehicle identity and visible condition</li>
      <li>Review VIN and mileage confidence</li>
      <li>Check offer amount or offer range</li>
      <li>Look for photos or details that require manager judgment</li>
    </ul>

    <h2 style="font-size:18px;margin-top:24px;">Step 3 — Contact the customer quickly</h2>
    <p>
      The customer has already shown trade intent. The best follow-up is specific, direct, and tied to the scan they just completed.
    </p>

    <div style="padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
      <strong>Suggested first response:</strong>
      <p style="margin:8px 0 0;">
        “Thanks for sending your trade details. We received the vehicle scan and have enough information to start the review. The offer is subject to final inspection, but we can move quickly from here. When is a good time to bring it by?”
      </p>
    </div>

    <h2 style="font-size:18px;margin-top:24px;">Step 4 — Keep desk authority</h2>
    <p>
      SolaceTrade speeds up intake and structures the evidence. Your team still controls final value, inspection, and deal terms.
    </p>

    <h2 style="font-size:18px;margin-top:24px;">Staff intake reminder</h2>
    <p>
      For walk-ins, have sales start here:<br>
      <a href="${snippets.internalLink}">${snippets.internalLink}</a>
    </p>
  </div>
  `;

  const text = [
    `How to work your first SolaceTrade opportunity for ${input.dealerName}.`,
    "",
    `Dashboard: ${snippets.dashboardLink}`,
    "",
    "Step 1: Open the dashboard.",
    "Step 2: Review vehicle identity, VIN, mileage, photos, condition, offer, and confidence.",
    "Step 3: Contact the customer quickly.",
    "Step 4: Keep desk authority. Final value remains subject to inspection.",
    "",
    "Suggested first response:",
    "Thanks for sending your trade details. We received the vehicle scan and have enough information to start the review. The offer is subject to final inspection, but we can move quickly from here. When is a good time to bring it by?",
    "",
    `Staff intake link: ${snippets.internalLink}`,
  ].join("\n");

  return resend.emails.send({
    from: getFromEmail(),
    to: recipients.to,
    subject: `Working your first SolaceTrade opportunity`,
    html,
    text,
  });
}
