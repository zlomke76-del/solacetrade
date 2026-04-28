import { supabaseAdmin } from "./supabaseAdmin";

export const SOLACETRADE_SCHEMA = "solacetrade";
export const TRADE_SCAN_BUCKET = "trade-scans";

export type DistanceUnit = "mi" | "km";
export type OfferCurrency = "USD" | "CAD";
export type VinConfidence = "Low" | "Medium" | "High" | null;

export type DealerRecord = {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  sales_phone: string | null;
  lead_email: string;
  routing_cc_emails?: string[] | null;
  billing_contact_name?: string | null;
  billing_email?: string | null;
  billing_phone?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  billing_status?: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  brand_color: string | null;
  is_active: boolean;
  settings?: Record<string, unknown> | null;
  country?: string | null;
  currency?: string | null;
  locale?: string | null;
  distance_unit?: string | null;
  valuation_market?: string | null;
};

export type MarketContext = {
  country: string;
  currency: OfferCurrency;
  locale: string;
  distanceUnit: DistanceUnit;
  valuationMarket: string;
  dealerLocation: {
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string;
  };
};

export type SolaceValuePayload = {
  offerAmount: number | null;
  offerRangeLow: number | null;
  offerRangeHigh: number | null;
  title: string;
  confidence: "Low" | "Medium" | "High";
  admissibility: "PASS" | "PARTIAL" | "DENY";
  summaryLines: string[];
  conditionNotes: string[];
  missingItems: string[];
  dealerReviewNotes: string[];
  marketContext?: MarketContext;
  detectedVin?: string | null;
  detectedVinConfidence?: VinConfidence;
  vinConfidence?: VinConfidence;
  detectedMileage?: string | number | null;
  detectedMileageUnit?: DistanceUnit | null;
  vin?: string | null;
  mileage?: string | number | null;
  mileageUnit?: DistanceUnit | null;
  vehicle?: {
    vin?: string | null;
    vinConfidence?: VinConfidence;
    mileage?: string | number | null;
    mileageUnit?: DistanceUnit | null;
  } | null;
};

export function normalizeDealerSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function cleanVin(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, "")
    .slice(0, 17);
}

function normalizeVinConfidence(value: unknown): VinConfidence {
  const text = String(value || "").trim().toLowerCase();

  if (text === "high") return "High";
  if (text === "medium" || text === "med") return "Medium";
  if (text === "low") return "Low";

  return null;
}

function extractVinFromRawText(rawText: string) {
  const normalized = String(rawText || "").toUpperCase();
  const strictMatch = normalized.match(/[A-HJ-NPR-Z0-9]{17}/);

  if (strictMatch) {
    return cleanVin(strictMatch[0]) || null;
  }

  const labeledMatch = normalized.match(
    /VIN[^A-HJ-NPR-Z0-9]{0,12}([A-HJ-NPR-Z0-9][\s\-.]*){17}/
  );

  if (!labeledMatch) {
    return null;
  }

  const vin = cleanVin(labeledMatch[0].replace(/^VIN/i, ""));
  return vin.length === 17 ? vin : null;
}

export function cleanMileage(value: unknown) {
  const parsed = Number(String(value || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeDistanceUnit(value: unknown): DistanceUnit {
  const text = String(value || "").trim().toLowerCase();

  if (text === "km" || text === "kilometer" || text === "kilometers") return "km";

  return "mi";
}

export function normalizeCurrency(value: unknown, country?: unknown): OfferCurrency {
  const text = String(value || "").trim().toUpperCase();
  const countryText = String(country || "").trim().toUpperCase();

  if (text === "CAD" || countryText === "CA" || countryText === "CANADA") return "CAD";

  return "USD";
}

export function normalizeLocale(value: unknown, country?: unknown) {
  const text = String(value || "").trim();
  const countryText = String(country || "").trim().toUpperCase();

  if (text) return text;
  if (countryText === "CA" || countryText === "CANADA") return "en-CA";

  return "en-US";
}

export function cleanText(value: unknown, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

export function convertDistance(value: number | null | undefined, fromUnit: DistanceUnit, toUnit: DistanceUnit) {
  if (!value || !Number.isFinite(value)) return null;
  if (fromUnit === toUnit) return Math.round(value);

  if (fromUnit === "km" && toUnit === "mi") {
    return Math.round(value * 0.621371);
  }

  return Math.round(value * 1.609344);
}

export function formatDistance(value: number | null | undefined, unit: DistanceUnit = "mi", locale = "en-US") {
  if (!value || !Number.isFinite(value)) return "Pending scan";

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);

  return `${formatted} ${unit}`;
}

export function formatMoney(
  value: number | null | undefined,
  currency: OfferCurrency = "USD",
  locale = currency === "CAD" ? "en-CA" : "en-US"
) {
  if (!value || !Number.isFinite(value)) return "Pending manager review";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildMarketContext(dealer: DealerRecord): MarketContext {
  const country = cleanText(dealer.country, 12).toUpperCase() || "US";
  const currency = normalizeCurrency(dealer.currency, country);
  const locale = normalizeLocale(dealer.locale, country);
  const distanceUnit = normalizeDistanceUnit(dealer.distance_unit || (country === "CA" ? "km" : "mi"));
  const configuredMarket = cleanText(dealer.valuation_market, 160);
  const cityStatePostal = [dealer.city, dealer.state, dealer.postal_code].filter(Boolean).join(", ");
  const valuationMarket = configuredMarket || [cityStatePostal, country].filter(Boolean).join(" | ");

  return {
    country,
    currency,
    locale,
    distanceUnit,
    valuationMarket,
    dealerLocation: {
      city: dealer.city || null,
      state: dealer.state || null,
      postalCode: dealer.postal_code || null,
      country,
    },
  };
}

export async function getDealerBySlug(dealerSlug: string): Promise<DealerRecord> {
  const slug = normalizeDealerSlug(dealerSlug);

  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .select(
      "id, slug, name, legal_name, sales_phone, lead_email, routing_cc_emails, billing_contact_name, billing_email, billing_phone, stripe_customer_id, stripe_subscription_id, billing_status, address_line, city, state, postal_code, brand_color, is_active, settings, country, currency, locale, distance_unit, valuation_market"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Dealer lookup failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Dealer not found or inactive: ${slug}`);
  }

  return data as DealerRecord;
}

export function formatDealerPhoneLine(dealer: DealerRecord) {
  const phone = cleanText(dealer.sales_phone, 80) || "Sales team";
  const cityState = [dealer.city, dealer.state].filter(Boolean).join(", ");
  const address = [dealer.address_line, cityState].filter(Boolean).join(" • ");

  return address ? `Sales: ${phone} • ${address}` : `Sales: ${phone}`;
}

export async function createSignedPhotoUrls(photoPaths: string[]) {
  return Promise.all(
    photoPaths.map(async (path) => {
      const { data, error } = await supabaseAdmin.storage
        .from(TRADE_SCAN_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      return {
        path,
        signedUrl: error ? null : data?.signedUrl || null,
      };
    })
  );
}

export function parseSolaceValue(rawText: string, marketContext?: MarketContext): SolaceValuePayload {
  const fallbackVin = extractVinFromRawText(rawText);

  try {
    const parsed = JSON.parse(rawText) as Partial<SolaceValuePayload>;

    const mileageUnit = normalizeDistanceUnit(
      parsed.detectedMileageUnit || parsed.mileageUnit || parsed.vehicle?.mileageUnit || marketContext?.distanceUnit
    );

    const structuredVin =
      typeof parsed.detectedVin === "string"
        ? cleanVin(parsed.detectedVin)
        : typeof parsed.vin === "string"
          ? cleanVin(parsed.vin)
          : typeof parsed.vehicle?.vin === "string"
            ? cleanVin(parsed.vehicle.vin)
            : null;

    const detectedVin = structuredVin || fallbackVin;
    const vinConfidence =
      normalizeVinConfidence(parsed.detectedVinConfidence) ||
      normalizeVinConfidence(parsed.vinConfidence) ||
      normalizeVinConfidence(parsed.vehicle?.vinConfidence) ||
      (structuredVin ? "High" : fallbackVin ? "Medium" : null);

    const detectedMileage =
      cleanMileage(parsed.detectedMileage) ||
      cleanMileage(parsed.mileage) ||
      cleanMileage(parsed.vehicle?.mileage);

    return {
      offerAmount: typeof parsed.offerAmount === "number" ? parsed.offerAmount : null,
      offerRangeLow: typeof parsed.offerRangeLow === "number" ? parsed.offerRangeLow : null,
      offerRangeHigh: typeof parsed.offerRangeHigh === "number" ? parsed.offerRangeHigh : null,
      title: cleanText(parsed.title, 160) || "Instant cash offer ready for dealer review.",
      confidence:
        parsed.confidence === "High" || parsed.confidence === "Medium" || parsed.confidence === "Low"
          ? parsed.confidence
          : "Medium",
      admissibility:
        parsed.admissibility === "PASS" || parsed.admissibility === "PARTIAL" || parsed.admissibility === "DENY"
          ? parsed.admissibility
          : "PARTIAL",
      summaryLines: Array.isArray(parsed.summaryLines)
        ? parsed.summaryLines.map((line) => cleanText(line, 220)).filter(Boolean).slice(0, 4)
        : [],
      conditionNotes: Array.isArray(parsed.conditionNotes)
        ? parsed.conditionNotes.map((line) => cleanText(line, 220)).filter(Boolean).slice(0, 6)
        : [],
      missingItems: Array.isArray(parsed.missingItems)
        ? parsed.missingItems.map((line) => cleanText(line, 160)).filter(Boolean).slice(0, 6)
        : [],
      dealerReviewNotes: Array.isArray(parsed.dealerReviewNotes)
        ? parsed.dealerReviewNotes.map((line) => cleanText(line, 220)).filter(Boolean).slice(0, 6)
        : [],
      marketContext,
      detectedVin: detectedVin || null,
      detectedVinConfidence: vinConfidence,
      vinConfidence,
      detectedMileage: detectedMileage || null,
      detectedMileageUnit: mileageUnit,
      vin: detectedVin || null,
      mileage: detectedMileage || null,
      mileageUnit,
      vehicle: {
        vin: detectedVin || null,
        vinConfidence,
        mileage: detectedMileage || null,
        mileageUnit,
      },
    };
  } catch {
    return {
      offerAmount: null,
      offerRangeLow: null,
      offerRangeHigh: null,
      title: "Instant cash offer ready for dealer review.",
      confidence: "Medium",
      admissibility: "PARTIAL",
      summaryLines: [
        "Solace produced a response, but it could not be parsed as structured JSON.",
        rawText.slice(0, 240),
      ],
      conditionNotes: [],
      missingItems: [],
      dealerReviewNotes: ["Review the raw LLM output in intake metadata before quoting a final number."],
      marketContext,
      detectedVin: fallbackVin || null,
      detectedVinConfidence: fallbackVin ? "Medium" : null,
      vinConfidence: fallbackVin ? "Medium" : null,
      detectedMileage: null,
      detectedMileageUnit: marketContext?.distanceUnit || "mi",
      vin: fallbackVin || null,
      mileage: null,
      mileageUnit: marketContext?.distanceUnit || "mi",
      vehicle: {
        vin: fallbackVin || null,
        vinConfidence: fallbackVin ? "Medium" : null,
        mileage: null,
        mileageUnit: marketContext?.distanceUnit || "mi",
      },
    };
  }
}

export async function logTradeEvent(input: {
  dealerId: string;
  intakeId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  await supabaseAdmin.schema(SOLACETRADE_SCHEMA).from("trade_events").insert({
    dealer_id: input.dealerId,
    intake_id: input.intakeId || null,
    event_type: input.eventType,
    payload: input.payload || {},
  });
}
