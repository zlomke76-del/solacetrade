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

function generateCertificateId() {
  return `TC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function formatMileage(value: unknown) {
  const raw = String(value || "").replace(/[^\d]/g, "");
  const number = Number(raw);

  if (!number) return "Not detected";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(number);
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

function getExecutionAdmissibility(valuePayload: Record<string, unknown>, input: {
  offerAmount: number | null;
  vin: string;
  mileage: unknown;
  confidence: unknown;
  admissibility: unknown;
  isInternal: boolean;
}) {
  const provided = valuePayload.executionAdmissibility;

  if (provided && typeof provided === "object") {
    const gate = provided as {
      allowed?: unknown;
      customerCertificatePermitted?: unknown;
      managerReviewPermitted?: unknown;
      reasons?: unknown;
    };

    return {
      allowed: gate.allowed === true,
      customerCertificatePermitted: gate.customerCertificatePermitted === true,
      managerReviewPermitted: gate.managerReviewPermitted !== false,
      reasons: getStringArray(gate.reasons),
    };
  }

  const reasons: string[] = [];

  if (!input.vin || input.vin === "Not detected" || input.vin.length !== 17) {
    reasons.push("VIN was not detected with sufficient confidence.");
  }

  if (!String(input.mileage || "").replace(/[^0-9]/g, "")) {
    reasons.push("Mileage was not detected with sufficient confidence.");
  }

  if (!input.offerAmount || !Number.isFinite(input.offerAmount)) {
    reasons.push("Offer amount was not produced from sufficient state.");
  }

  if (input.confidence === "Low") {
    reasons.push("Solace confidence is low.");
  }

  if (input.admissibility !== "PASS") {
    reasons.push("Solace did not mark the valuation state as PASS.");
  }

  if (valuePayload.inspectionRequired === true) {
    reasons.push("Dealer inspection is required before a certificate can be executed.");
  }

  for (const item of getStringArray(valuePayload.missingItems)) {
    if (item && !reasons.includes(item)) reasons.push(item);
  }

  const allowed = reasons.length === 0;

  return {
    allowed,
    customerCertificatePermitted: allowed && !input.isInternal,
    managerReviewPermitted: true,
    reasons,
  };
}

function cleanVehicleLookupPart(value: unknown) {
  const text = String(value || "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

type NhtsaRecall = {
  Manufacturer?: string;
  NHTSACampaignNumber?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  ReportReceivedDate?: string;
};

async function fetchNhtsaRecalls({
  year,
  make,
  model,
}: {
  year: unknown;
  make: unknown;
  model: unknown;
}) {
  const safeYear = cleanVehicleLookupPart(year);
  const safeMake = cleanVehicleLookupPart(make);
  const safeModel = cleanVehicleLookupPart(model);

  if (!safeYear || !safeMake || !safeModel) {
    return {
      checked: false,
      recalls: [] as NhtsaRecall[],
      error: "Vehicle year, make, or model was unavailable for recall lookup.",
    };
  }

  try {
    const params = new URLSearchParams({
      make: safeMake,
      model: safeModel,
      modelYear: safeYear,
    });

    const response = await fetch(
      `https://api.nhtsa.gov/recalls/recallsByVehicle?${params.toString()}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return {
        checked: false,
        recalls: [] as NhtsaRecall[],
        error: `NHTSA recall lookup failed with status ${response.status}.`,
      };
    }

    const json = (await response.json().catch(() => ({}))) as {
      results?: NhtsaRecall[];
      Results?: NhtsaRecall[];
    };

    const recalls = Array.isArray(json.results)
      ? json.results
      : Array.isArray(json.Results)
        ? json.Results
        : [];

    return { checked: true, recalls, error: null as string | null };
  } catch (error) {
    return {
      checked: false,
      recalls: [] as NhtsaRecall[],
      error:
        error instanceof Error
          ? error.message
          : "Unknown NHTSA recall lookup error.",
    };
  }
}

function getCustomerRecallSummary({
  checked,
}: {
  checked: boolean;
  error: string | null;
}) {
  if (!checked) {
    return "Recall check could not be completed automatically. The dealer will verify recall status by VIN.";
  }

  return "Dealer will verify any open or unrepaired recalls by VIN.";
}

function getDealerRecallSummary({
  checked,
  recallCount,
  error,
}: {
  checked: boolean;
  recallCount: number;
  error: string | null;
}) {
  if (!checked) {
    return error
      ? `Recall lookup unavailable: ${error}`
      : "Recall lookup unavailable for this vehicle configuration.";
  }

  if (recallCount === 0) {
    return "No NHTSA year/make/model recall records returned. Dealer should still verify open/unrepaired status by VIN.";
  }

  return `${recallCount} NHTSA year/make/model recall record(s) returned. This is not VIN-specific open recall status; verify open/unrepaired status by VIN.`;
}

function renderRecallItems(recalls: NhtsaRecall[]) {
  if (!recalls.length) return "";

  return recalls
    .slice(0, 5)
    .map((recall) => {
      const campaign = recall.NHTSACampaignNumber
        ? `Campaign ${escapeHtml(recall.NHTSACampaignNumber)}`
        : "Recall";
      const component = recall.Component
        ? ` · ${escapeHtml(recall.Component)}`
        : "";
      const summary = recall.Summary
        ? `<div style="margin-top:4px;color:#475569;">${escapeHtml(recall.Summary)}</div>`
        : "";

      return `<li style="margin-bottom:10px;"><strong>${campaign}${component}</strong>${summary}</li>`;
    })
    .join("");
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
    const customerIntent = cleanText(body?.customerIntent, 80);
    const customerContact = cleanText(body?.contact, 180);
    const customerName = cleanText(body?.customerName, 160);

    if (!intakeId) {
      return NextResponse.json({ error: "Missing intakeId." }, { status: 400 });
    }

    if (!customerName) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    if (!isValidEmail(customerContact)) {
      return NextResponse.json(
        { error: "Enter a valid email to receive your trade certificate." },
        { status: 400 }
      );
    }

    const { data: intake, error: intakeError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .select("*")
      .eq("id", intakeId)
      .eq("dealer_id", dealer.id)
      .single();

    if (intakeError || !intake) {
      return NextResponse.json(
        { error: intakeError?.message || "Trade intake not found." },
        { status: 404 }
      );
    }

    const valuePayload =
      intake.value_payload && typeof intake.value_payload === "object"
        ? intake.value_payload
        : {};

    const summaryLines = getArray(valuePayload.summaryLines);
    const reviewNotes = getArray(valuePayload.dealerReviewNotes);
    const conditionNotes = getArray(valuePayload.conditionNotes);

    const signedPhotos = await createSignedPhotoUrls(
      Array.isArray(intake.photo_paths) ? intake.photo_paths : []
    );

    const photoLinks = signedPhotos
      .map((photo, index) =>
        photo.signedUrl
          ? `<li><a href="${escapeHtml(photo.signedUrl)}">Photo ${index + 1}</a></li>`
          : `<li>${escapeHtml(photo.path)}</li>`
      )
      .join("");

    const offerAmount = intake.offer_amount ?? valuePayload.offerAmount ?? null;
    const confidence = valuePayload.confidence || "Pending";
    const admissibility = valuePayload.admissibility || "Pending";
    const certificateId = generateCertificateId();
    const vehicleYear =
      valuePayload.vehicleYear ?? valuePayload.year ?? valuePayload.vehicle?.year;
    const vehicleMake =
      valuePayload.vehicleMake ?? valuePayload.make ?? valuePayload.vehicle?.make;
    const vehicleModel =
      valuePayload.vehicleModel ?? valuePayload.model ?? valuePayload.vehicle?.model;
    const vehicleTrim =
      valuePayload.vehicleTrim ?? valuePayload.trim ?? valuePayload.vehicle?.trim;

    const vehicleLabel = [vehicleYear, vehicleMake, vehicleModel, vehicleTrim]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const mileage =
      intake.mileage ??
      valuePayload.detectedMileage ??
      valuePayload.mileage ??
      valuePayload.vehicle?.mileage ??
      null;
    const vin =
      intake.vin || valuePayload.detectedVin || valuePayload.vin || "Not detected";
    const intentLabel = customerIntent || intake.customer_intent || "Not selected";
    const isInternal = intake.mode === "internal";
    const executionAdmissibility = getExecutionAdmissibility(valuePayload, {
      offerAmount,
      vin,
      mileage,
      confidence,
      admissibility,
      isInternal,
    });

    if (!isInternal && !executionAdmissibility.customerCertificatePermitted) {
      await logTradeEvent({
        dealerId: dealer.id,
        intakeId: intake.id,
        eventType: "certificate_blocked",
        payload: {
          reasons: executionAdmissibility.reasons,
          confidence,
          admissibility,
          vin,
          mileage,
        },
      });

      return NextResponse.json(
        {
          error:
            "Trade certificate cannot be sent yet because the valuation state is incomplete. Dealer review is required.",
          blocked: true,
          reasons: executionAdmissibility.reasons,
        },
        { status: 409 }
      );
    }

    const recallResult = await fetchNhtsaRecalls({
      year: vehicleYear,
      make: vehicleMake,
      model: vehicleModel,
    });
    const recallCount = recallResult.recalls.length;
    const customerRecallSummary = getCustomerRecallSummary({
      checked: recallResult.checked,
      error: recallResult.error,
    });
    const dealerRecallSummary = getDealerRecallSummary({
      checked: recallResult.checked,
      recallCount,
      error: recallResult.error,
    });
    const recallItemsHtml = renderRecallItems(recallResult.recalls);

    const updatePayload = {
      status: "submitted",
      customer_intent: customerIntent || intake.customer_intent || null,
      customer_contact: customerContact,
      customer_name: customerName,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    const from =
      process.env.RESEND_FROM_EMAIL || "SolaceTrade <onboarding@resend.dev>";
    const customerSubject = `Your Trade Certificate – ${formatMoney(offerAmount)}`;
    const dealerSubject = `New Trade Opportunity – ${vehicleLabel || "Vehicle"}`;

    const customerHtml = `
      <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <div style="max-width:620px;margin:0 auto;padding:24px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.12);">
            <div style="background:linear-gradient(135deg,#0f172a,#334155);color:#ffffff;padding:22px 24px;">
              <div style="font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#cbd5e1;">SolaceTrade Certificate</div>
              <h1 style="margin:8px 0 0;font-size:30px;line-height:1.05;letter-spacing:-0.04em;">${escapeHtml(formatMoney(offerAmount))}</h1>
              <div style="margin-top:8px;font-size:14px;color:#e2e8f0;">Preliminary trade certificate pending dealer verification</div>
            </div>

            <div style="padding:22px 24px;">
              <div style="font-size:12px;font-weight:900;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">Certificate ID</div>
              <div style="margin-top:4px;font-size:20px;font-weight:900;letter-spacing:0.06em;color:#0f172a;">${escapeHtml(certificateId)}</div>

              <div style="margin-top:18px;padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:900;color:#64748b;text-transform:uppercase;">Vehicle</div>
                <div style="margin-top:4px;font-size:18px;font-weight:900;color:#0f172a;">${escapeHtml(vehicleLabel || "Vehicle pending verification")}</div>
                <div style="margin-top:6px;font-size:13px;color:#475569;">
                  VIN: ${escapeHtml(vin)}<br />
                  Mileage: ${escapeHtml(formatMileage(mileage))}
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
                <div style="padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <div style="font-size:12px;font-weight:900;color:#64748b;">Status</div>
                  <div style="margin-top:3px;font-size:14px;font-weight:800;">Pending verification</div>
                </div>
                <div style="padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <div style="font-size:12px;font-weight:900;color:#64748b;">Valid for</div>
                  <div style="margin-top:3px;font-size:14px;font-weight:800;">72 hours</div>
                </div>
              </div>

              <div style="margin-top:16px;font-size:14px;color:#334155;">
                ${escapeHtml(customerName)}, your trade certificate has been created and routed to ${escapeHtml(dealer.name)} for verification.
              </div>

              <div style="margin-top:16px;padding:12px;border-radius:14px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:13px;">
                <strong>Recall check</strong><br />
                ${escapeHtml(customerRecallSummary)}
              </div>

              <div style="margin-top:16px;padding:12px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;">
                Final value may adjust after dealer inspection, title/payoff review, mileage verification, and condition confirmation.
              </div>

              <div style="margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                Confidence: ${escapeHtml(confidence)} · State: ${escapeHtml(admissibility)} · Intent: ${escapeHtml(intentLabel)} · Execution: ${executionAdmissibility.allowed ? "Permitted" : "Review required"}
              </div>
            </div>
          </div>

          <div style="margin-top:12px;text-align:center;font-size:12px;color:#64748b;">
            ${escapeHtml(dealer.name)} · Trade certificate generated by SolaceTrade
          </div>
        </div>
      </div>
    `;

    const dealerHtml = `
      <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <div style="max-width:680px;margin:0 auto;padding:24px;">
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.12);">
            <div style="background:#0f172a;color:#ffffff;padding:20px 22px;">
              <div style="font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#cbd5e1;">New Trade Opportunity</div>
              <h1 style="margin:8px 0 0;font-size:26px;line-height:1.1;letter-spacing:-0.04em;">${escapeHtml(vehicleLabel || "Vehicle submitted")}</h1>
              <div style="margin-top:8px;font-size:14px;color:#e2e8f0;">Customer generated a trade certificate and is ready for follow-up.</div>
            </div>

            <div style="padding:22px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div style="padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <div style="font-size:12px;font-weight:900;color:#64748b;">Customer</div>
                  <div style="margin-top:3px;font-size:14px;font-weight:900;">${escapeHtml(customerName)}</div>
                  <div style="margin-top:3px;font-size:13px;color:#475569;">${escapeHtml(customerContact)}</div>
                </div>
                <div style="padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                  <div style="font-size:12px;font-weight:900;color:#64748b;">Intent</div>
                  <div style="margin-top:3px;font-size:14px;font-weight:900;">${escapeHtml(intentLabel)}</div>
                  <div style="margin-top:3px;font-size:13px;color:#475569;">Certificate ${escapeHtml(certificateId)}</div>
                </div>
              </div>

              <div style="margin-top:14px;padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:900;color:#64748b;text-transform:uppercase;">Vehicle / Offer</div>
                <div style="margin-top:4px;font-size:18px;font-weight:900;color:#0f172a;">${escapeHtml(vehicleLabel || "Vehicle pending verification")}</div>
                <div style="margin-top:6px;font-size:13px;color:#475569;">
                  Offer: <strong>${escapeHtml(formatMoney(offerAmount))}</strong><br />
                  VIN: ${escapeHtml(vin)}<br />
                  Mileage: ${escapeHtml(formatMileage(mileage))}<br />
                  Confidence: ${escapeHtml(confidence)} · State: ${escapeHtml(admissibility)}
                </div>
              </div>

              <div style="margin-top:18px;text-align:center;">
                <a href="mailto:${escapeHtml(customerContact)}?subject=${encodeURIComponent(`Your trade certificate from ${dealer.name}`)}" style="display:inline-block;padding:12px 18px;background:#0f172a;color:#ffffff;border-radius:12px;text-decoration:none;font-weight:900;">Email Customer</a>
              </div>

              <div style="margin-top:18px;padding:14px;border-radius:16px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;">
                <h3 style="margin:0 0 8px;font-size:15px;">Recall check</h3>
                <p style="margin:0;color:#1e3a8a;font-size:13px;">${escapeHtml(dealerRecallSummary)}</p>
                ${recallItemsHtml ? `<ul style="margin:10px 0 0;padding-left:18px;color:#334155;font-size:12px;">${recallItemsHtml}</ul>` : ""}
              </div>

              <div style="margin-top:18px;padding:14px;border-radius:16px;background:${executionAdmissibility.allowed ? "#f0fdf4" : "#fff7ed"};border:1px solid ${executionAdmissibility.allowed ? "#bbf7d0" : "#fed7aa"};color:${executionAdmissibility.allowed ? "#166534" : "#9a3412"};">
                <h3 style="margin:0 0 8px;font-size:15px;">Execution gate</h3>
                <p style="margin:0;font-size:13px;">${executionAdmissibility.allowed ? "Certificate execution permitted." : "Customer certificate execution blocked until dealer review resolves missing state."}</p>
                ${executionAdmissibility.reasons.length ? `<ul style="margin:10px 0 0;padding-left:18px;font-size:12px;">${executionAdmissibility.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>` : ""}
              </div>

              <div style="margin-top:18px;">
                <h3 style="margin:0 0 8px;font-size:15px;">Solace summary</h3>
                <ul style="margin:0;padding-left:18px;color:#334155;font-size:13px;">${summaryLines.length ? summaryLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("") : "<li>No summary recorded.</li>"}</ul>
              </div>

              <div style="margin-top:18px;">
                <h3 style="margin:0 0 8px;font-size:15px;">Condition notes</h3>
                <ul style="margin:0;padding-left:18px;color:#334155;font-size:13px;">${conditionNotes.length ? conditionNotes.map((line) => `<li>${escapeHtml(line)}</li>`).join("") : "<li>No condition notes recorded.</li>"}</ul>
              </div>

              <div style="margin-top:18px;">
                <h3 style="margin:0 0 8px;font-size:15px;">Dealer review notes</h3>
                <ul style="margin:0;padding-left:18px;color:#334155;font-size:13px;">${reviewNotes.length ? reviewNotes.map((line) => `<li>${escapeHtml(line)}</li>`).join("") : "<li>Verify title, payoff, condition, VIN, mileage, and recall status before final paperwork.</li>"}</ul>
              </div>

              <div style="margin-top:18px;">
                <h3 style="margin:0 0 8px;font-size:15px;">Photos</h3>
                <ul style="margin:0;padding-left:18px;color:#334155;font-size:13px;">${photoLinks || "<li>No photo links available.</li>"}</ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    let customerEmailId: string | null = null;
    let dealerEmailId: string | null = null;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const customerEmail = await resend.emails.send({
        from,
        to: [customerContact],
        subject: customerSubject,
        html: customerHtml,
      });

      if (customerEmail.error) {
        throw new Error(customerEmail.error.message);
      }

      customerEmailId = customerEmail.data?.id || null;

      const dealerEmail = await resend.emails.send({
        from,
        to: [dealer.lead_email],
        subject: dealerSubject,
        html: dealerHtml,
      });

      if (dealerEmail.error) {
        throw new Error(dealerEmail.error.message);
      }

      dealerEmailId = dealerEmail.data?.id || null;
    }

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: intake.id,
      eventType: "certificate_sent",
      payload: {
        customerIntent,
        certificateId,
        emailedTo: {
          customer: customerContact,
          dealer: dealer.lead_email,
        },
        customerEmailId,
        dealerEmailId,
        recall: {
          checked: recallResult.checked,
          count: recallCount,
          error: recallResult.error,
        },
        executionAdmissibility,
        resendEnabled: Boolean(process.env.RESEND_API_KEY),
      },
    });

    return NextResponse.json({
      ok: true,
      intakeId: intake.id,
      emailed: Boolean(customerEmailId || dealerEmailId),
      customerEmailId,
      dealerEmailId,
      certificateId,
      recall: {
        checked: recallResult.checked,
        count: recallCount,
      },
      executionAdmissibility,
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
