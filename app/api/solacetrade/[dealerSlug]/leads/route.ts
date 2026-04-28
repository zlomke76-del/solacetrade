import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getDealerBySlug,
  SOLACETRADE_SCHEMA,
  formatMoney,
  formatDistance,
  normalizeCurrency,
  normalizeDistanceUnit,
} from "@/lib/solacetrade";

type RouteContext = {
  params: {
    dealerSlug: string;
  };
};

type TradeLeadRow = {
  id: string;
  dealer_id: string;
  status: string;
  mode: string;
  customer_name: string | null;
  customer_contact: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_intent: string | null;
  salesperson: string | null;
  vin: string | null;
  mileage: number | null;
  mileage_unit: string | null;
  offer_amount: number | null;
  offer_range_low: number | null;
  offer_range_high: number | null;
  offer_currency: string | null;
  valuation_market: string | null;
  confidence: string | null;
  admissibility: string | null;
  photo_count: number | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  value_payload: Record<string, unknown> | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getVehicleLabel(payload: Record<string, unknown>) {
  const vehicle = asObject(payload.vehicle);

  const year =
    payload.vehicleYear ||
    payload.year ||
    vehicle.year ||
    null;
  const make =
    payload.vehicleMake ||
    payload.make ||
    vehicle.make ||
    null;
  const model =
    payload.vehicleModel ||
    payload.model ||
    vehicle.model ||
    null;
  const trim =
    payload.vehicleTrim ||
    payload.trim ||
    vehicle.trim ||
    null;

  return [year, make, model, trim]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatLead(row: TradeLeadRow) {
  const payload = asObject(row.value_payload);
  const currency = normalizeCurrency(
    row.offer_currency || payload.offerCurrency,
    undefined
  );
  const unit = normalizeDistanceUnit(row.mileage_unit || payload.mileageUnit);
  const market = String(
    row.valuation_market ||
      payload.valuationMarket ||
      asObject(payload.marketContext).valuationMarket ||
      ""
  ).trim();

  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    customer: {
      name: row.customer_name,
      contact: row.customer_contact,
      email: row.customer_email,
      phone: row.customer_phone,
      intent: row.customer_intent,
    },
    salesperson: row.salesperson,
    vehicle: {
      label: getVehicleLabel(payload) || "Vehicle pending decode",
      vin: row.vin || String(payload.detectedVin || payload.vin || ""),
      mileage: row.mileage,
      mileageUnit: unit,
      mileageDisplay: formatDistance(row.mileage, unit),
    },
    offer: {
      amount: row.offer_amount,
      rangeLow: row.offer_range_low,
      rangeHigh: row.offer_range_high,
      currency,
      amountDisplay: formatMoney(row.offer_amount, currency),
      rangeDisplay:
        row.offer_range_low && row.offer_range_high
          ? `${formatMoney(row.offer_range_low, currency)} - ${formatMoney(
              row.offer_range_high,
              currency
            )}`
          : null,
    },
    valuation: {
      market,
      confidence: row.confidence,
      admissibility: row.admissibility,
    },
    photos: {
      count: row.photo_count || 0,
    },
    timestamps: {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      submittedAt: row.submitted_at,
    },
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const dealer = await getDealerBySlug(context.params.dealerSlug);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status")?.trim();
    const query = searchParams.get("q")?.trim();
    const limitParam = Number(searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.round(limitParam), 1), 100)
      : 50;

    let builder = supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .select(
        [
          "id",
          "dealer_id",
          "status",
          "mode",
          "customer_name",
          "customer_contact",
          "customer_email",
          "customer_phone",
          "customer_intent",
          "salesperson",
          "vin",
          "mileage",
          "mileage_unit",
          "offer_amount",
          "offer_range_low",
          "offer_range_high",
          "offer_currency",
          "valuation_market",
          "confidence",
          "admissibility",
          "photo_count",
          "submitted_at",
          "created_at",
          "updated_at",
          "value_payload",
        ].join(", ")
      )
      .eq("dealer_id", dealer.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      builder = builder.eq("status", status);
    }

    if (query) {
      builder = builder.or(
        [
          `customer_name.ilike.%${query}%`,
          `customer_contact.ilike.%${query}%`,
          `customer_email.ilike.%${query}%`,
          `customer_phone.ilike.%${query}%`,
          `vin.ilike.%${query}%`,
          `salesperson.ilike.%${query}%`,
        ].join(",")
      );
    }

    const { data, error } = await builder.returns<TradeLeadRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    const rows = data || [];

    return NextResponse.json({
      dealer: {
        id: dealer.id,
        slug: dealer.slug,
        name: dealer.name,
      },
      count: rows.length,
      leads: rows.map(formatLead),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown leads lookup error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
