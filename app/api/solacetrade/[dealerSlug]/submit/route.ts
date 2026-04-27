"use server";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cleanText,
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

    const intakeId = cleanText(body.intakeId, 80);
    const customerName = cleanText(body.customerName, 160);
    const email = cleanText(body.contact, 180);
    const intent = cleanText(body.customerIntent, 80);

    if (!intakeId) {
      return NextResponse.json({ error: "Missing intakeId." }, { status: 400 });
    }

    if (!customerName) {
      return NextResponse.json({ error: "Name required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Valid email required." },
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
      return NextResponse.json({ error: "Intake not found." }, { status: 404 });
    }

    const certificateId = generateCertificateId();

    const offer =
      intake.offer_amount ||
      intake.value_payload?.offerAmount ||
      null;

    const vehicleLabel = [
      intake.value_payload?.vehicleYear,
      intake.value_payload?.vehicleMake,
      intake.value_payload?.vehicleModel,
      intake.value_payload?.vehicleTrim,
    ]
      .filter(Boolean)
      .join(" ");

    const html = `
      <div style="font-family:Arial;padding:24px;background:#f4f6f8;">
        <div style="max-width:520px;margin:auto;background:#fff;padding:24px;border-radius:16px;">
          
          <div style="font-size:12px;text-transform:uppercase;color:#64748b;font-weight:700;">
            Trade Certificate
          </div>

          <h2 style="margin:8px 0;">${formatMoney(offer)}</h2>

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
        from: "SolaceTrade <offers@yourdomain.com>",
        to: [email, dealer.lead_email],
        subject: `Your Trade Certificate – ${formatMoney(offer)}`,
        html,
      });

      emailed = true;
    }

    await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .update({
        status: "submitted",
        customer_name: customerName,
        customer_contact: email,
        customer_intent: intent,
        certificate_id: certificateId,
      })
      .eq("id", intakeId);

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId,
      eventType: "certificate_sent",
      payload: { email, certificateId },
    });

    return NextResponse.json({
      ok: true,
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
