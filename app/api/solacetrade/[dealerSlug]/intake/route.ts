import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildMarketContext,
  cleanText,
  getDealerBySlug,
  logTradeEvent,
  SOLACETRADE_SCHEMA,
} from "@/lib/solacetrade";

type TradeDeskMode = "customer" | "internal";

function normalizeMode(value: unknown): TradeDeskMode {
  return cleanText(value, 20) === "internal" ? "internal" : "customer";
}

export async function POST(
  request: NextRequest,
  context: { params: { dealerSlug: string } }
) {
  try {
    const { dealerSlug } = context.params;
    const dealer = await getDealerBySlug(dealerSlug);
    const marketContext = buildMarketContext(dealer);

    const body = await request.json().catch(() => ({}));
    const mode = normalizeMode(body.mode);

    const customerName = cleanText(body.customerName, 160);
    const customerContact = cleanText(body.contact || body.customerContact, 180);
    const salesperson = cleanText(body.salesperson, 160);
    const managerNotes = cleanText(body.managerNotes, 2500);

    const { data: intake, error: intakeError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .insert({
        dealer_id: dealer.id,
        status: "new",
        mode,
        customer_name: customerName || null,
        customer_contact: customerContact || null,
        salesperson: salesperson || null,
        vin: null,
        mileage: null,
        mileage_unit: marketContext.distanceUnit,
        offer_currency: marketContext.currency,
        valuation_market: marketContext.valuationMarket,
        manager_notes: managerNotes || null,
        photo_paths: [],
        photo_count: 0,
      })
      .select("id")
      .single();

    if (intakeError || !intake) {
      throw new Error(intakeError?.message || "Failed to create trade intake.");
    }

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: intake.id,
      eventType: "intake_started",
      payload: {
        mode,
        streamingUpload: true,
        requiredPhotos: ["front", "driverSide", "rear", "odometer", "vin"],
        marketContext,
      },
    });

    return NextResponse.json({
      intakeId: intake.id,
      dealer: {
        id: dealer.id,
        slug: dealer.slug,
        name: dealer.name,
        marketContext,
      },
      photoCount: 0,
      uploadedSteps: [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown intake error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
