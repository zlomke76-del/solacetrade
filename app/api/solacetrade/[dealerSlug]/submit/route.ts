import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  cleanText,
  createSignedPhotoUrls,
  formatMoney,
  getDealerBySlug,
  logTradeEvent,
  SOLACETRADE_SCHEMA,
} from "../../../../../lib/solacetrade";

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: NextRequest, context: { params: Promise<{ dealerSlug: string }> }) {
  try {
    const { dealerSlug } = await context.params;
    const dealer = await getDealerBySlug(dealerSlug);
    const body = await request.json();
    const intakeId = cleanText(body?.intakeId, 80);
    const customerIntent = cleanText(body?.customerIntent, 80);
    const customerContact = cleanText(body?.contact, 180);
    const customerName = cleanText(body?.customerName, 160);

    if (!intakeId) {
      return NextResponse.json({ error: "Missing intakeId." }, { status: 400 });
    }

    const { data: intake, error: intakeError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .select("*")
      .eq("id", intakeId)
      .eq("dealer_id", dealer.id)
      .single();

    if (intakeError || !intake) {
      return NextResponse.json({ error: "Trade intake not found." }, { status: 404 });
    }

    const updatePayload = {
      status: "submitted",
      customer_intent: customerIntent || intake.customer_intent || null,
      customer_contact: customerContact || intake.customer_contact || null,
      customer_name: customerName || intake.customer_name || null,
      submitted_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .update(updatePayload)
      .eq("id", intake.id)
      .eq("dealer_id", dealer.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const signedPhotos = await createSignedPhotoUrls(Array.isArray(intake.photo_paths) ? intake.photo_paths : []);
    const photoLinks = signedPhotos
      .map((photo, index) => photo.signedUrl ? `<li><a href="${escapeHtml(photo.signedUrl)}">Photo ${index + 1}</a></li>` : `<li>${escapeHtml(photo.path)}</li>`)
      .join("");

    const summary = intake.llm_summary || {};
    const summaryLines = Array.isArray(summary.summaryLines) ? summary.summaryLines : [];
    const reviewNotes = Array.isArray(summary.dealerReviewNotes) ? summary.dealerReviewNotes : [];

    const subject = `SolaceTrade lead: ${dealer.name} ${intake.vin || "vehicle"}`;
    const html = `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h2>New SolaceTrade vehicle file</h2>
        <p><strong>Dealer:</strong> ${escapeHtml(dealer.name)}</p>
        <p><strong>Customer:</strong> ${escapeHtml(customerName || intake.customer_name || "Not provided")}</p>
        <p><strong>Contact:</strong> ${escapeHtml(customerContact || intake.customer_contact || "Not provided")}</p>
        <p><strong>Intent:</strong> ${escapeHtml(customerIntent || intake.customer_intent || "Not selected")}</p>
        <hr />
        <p><strong>VIN:</strong> ${escapeHtml(intake.vin)}</p>
        <p><strong>Mileage:</strong> ${escapeHtml(intake.mileage)}</p>
        <p><strong>Offer:</strong> ${escapeHtml(formatMoney(intake.offer_amount))}</p>
        <p><strong>Confidence:</strong> ${escapeHtml(intake.confidence || "Pending")}</p>
        <p><strong>State:</strong> ${escapeHtml(intake.admissibility || "Pending")}</p>
        <h3>Solace summary</h3>
        <ul>${summaryLines.map((line: string) => `<li>${escapeHtml(line)}</li>`).join("") || "<li>No summary recorded.</li>"}</ul>
        <h3>Dealer review notes</h3>
        <ul>${reviewNotes.map((line: string) => `<li>${escapeHtml(line)}</li>`).join("") || "<li>Verify title, payoff, condition, and recall status before final paperwork.</li>"}</ul>
        <h3>Photos</h3>
        <ul>${photoLinks || "<li>No photo links available.</li>"}</ul>
      </div>
    `;

    let emailId: string | null = null;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM_EMAIL || "SolaceTrade <onboarding@resend.dev>";
      const { data, error } = await resend.emails.send({
        from,
        to: [dealer.lead_email],
        subject,
        html,
      });

      if (error) {
        throw new Error(error.message);
      }

      emailId = data?.id || null;
    }

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: intake.id,
      eventType: "intake_submitted",
      payload: { customerIntent, emailedTo: dealer.lead_email, emailId, resendEnabled: Boolean(process.env.RESEND_API_KEY) },
    });

    return NextResponse.json({
      ok: true,
      intakeId: intake.id,
      emailed: Boolean(emailId),
      emailId,
      dealer: {
        name: dealer.name,
        leadEmail: dealer.lead_email,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown submit error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
