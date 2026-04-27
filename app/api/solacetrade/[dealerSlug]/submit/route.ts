import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cleanText,
  createSignedPhotoUrls,
  formatMoney,
  getDealerBySlug,
  logTradeEvent,
  SOLACETRADE_SCHEMA,
} from "@/lib/solacetrade";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generateCertificateId() {
  return `TC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function POST(
  request: NextRequest,
  context: { params: { dealerSlug: string } }
) {
  try {
    const { dealerSlug } = context.params;
    const dealer = await getDealerBySlug(dealerSlug);
    const body = await request.json().catch(() => ({}));

    const intakeId = cleanText(body?.intakeId, 80);
    const customerName = cleanText(body?.customerName, 160);
    const email = cleanText(body?.contact, 180);
    const customerIntent = cleanText(body?.customerIntent, 80);

    if (!intakeId) {
      return NextResponse.json({ error: "Missing intakeId." }, { status: 400 });
    }

    if (!customerName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email to receive your trade certificate." },
        { status: 400 }
      );
    }

    const { data: intake } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .select("*")
      .eq("id", intakeId)
      .eq("dealer_id", dealer.id)
      .single();

    if (!intake) {
      return NextResponse.json(
        { error: "Trade intake not found." },
        { status: 404 }
      );
    }

    const certificateId = generateCertificateId();

    const valuePayload =
      intake.value_payload && typeof intake.value_payload === "object"
        ? intake.value_payload
        : {};

    const offerAmount =
      intake.offer_amount ?? valuePayload.offerAmount ?? null;

    const vehicleLabel = [
      valuePayload.vehicleYear,
      valuePayload.vehicleMake,
      valuePayload.vehicleModel,
      valuePayload.vehicleTrim,
    ]
      .filter(Boolean)
      .join(" ");

    const html = `
      <div style="font-family:Arial;padding:24px;background:#f4f6f8;">
        <div style="max-width:520px;margin:auto;background:#fff;padding:24px;border-radius:16px;">
          
          <div style="font-size:12px;text-transform:uppercase;color:#64748b;font-weight:700;">
            Trade Certificate
          </div>

          <h2 style="margin:8px 0;">${formatMoney(offerAmount)}</h2>

          <p style="color:#334155;">
            ${escapeHtml(vehicleLabel || "Vehicle")}
          </p>

          <hr style="margin:16px 0;" />

          <p><strong>Certificate ID:</strong> ${certificateId}</p>
          <p><strong>Status:</strong> Pending dealer verification</p>
          <p><strong>Valid for:</strong> 72 hours</p>

          <div style="margin-top:20px;font-size:13px;color:#475569;">
            This is a preliminary trade offer based on your submission.
          </div>

        </div>
      </div>
    `;

    let emailed = false;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "SolaceTrade <onboarding@resend.dev>",
        to: [email, dealer.lead_email],
        subject: `Your Trade Certificate – ${formatMoney(offerAmount)}`,
        html,
      });

      emailed = true;
    }

    await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .update({
        status: "submitted",
        customer_intent: customerIntent || intake.customer_intent || null,
        customer_contact: email,
        customer_name: customerName,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake.id);

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: intake.id,
      eventType: "certificate_sent",
      payload: {
        certificateId,
        emailedTo: email,
      },
    });

    return NextResponse.json({
      ok: true,
      intakeId: intake.id,
      emailed,
      certificateId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Submit failed." },
      { status: 500 }
    );
  }
}
