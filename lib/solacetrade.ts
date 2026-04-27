import { supabaseAdmin } from "./supabaseAdmin";

export const SOLACETRADE_SCHEMA = "solacetrade";
export const TRADE_SCAN_BUCKET = "trade-scans";

export type DealerRecord = {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  sales_phone: string | null;
  lead_email: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  brand_color: string | null;
  is_active: boolean;
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
};

export function normalizeDealerSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function cleanVin(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "").slice(0, 17);
}

export function cleanMileage(value: unknown) {
  const parsed = Number(String(value || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function cleanText(value: unknown, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

export function formatMoney(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "Pending manager review";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getDealerBySlug(dealerSlug: string): Promise<DealerRecord> {
  const slug = normalizeDealerSlug(dealerSlug);

  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error(`Dealer not found or inactive: ${slug}`);
  }

  return data as DealerRecord;
}

export async function createSignedPhotoUrls(photoPaths: string[]) {
  const signed = await Promise.all(
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

  return signed;
}

export function parseSolaceValue(rawText: string): SolaceValuePayload {
  try {
    const parsed = JSON.parse(rawText) as Partial<SolaceValuePayload>;
    return {
      offerAmount: typeof parsed.offerAmount === "number" ? parsed.offerAmount : null,
      offerRangeLow: typeof parsed.offerRangeLow === "number" ? parsed.offerRangeLow : null,
      offerRangeHigh: typeof parsed.offerRangeHigh === "number" ? parsed.offerRangeHigh : null,
      title: cleanText(parsed.title, 160) || "Instant cash offer ready for dealer review.",
      confidence: parsed.confidence === "High" || parsed.confidence === "Medium" || parsed.confidence === "Low" ? parsed.confidence : "Medium",
      admissibility: parsed.admissibility === "PASS" || parsed.admissibility === "PARTIAL" || parsed.admissibility === "DENY" ? parsed.admissibility : "PARTIAL",
      summaryLines: Array.isArray(parsed.summaryLines) ? parsed.summaryLines.map((line) => cleanText(line, 220)).filter(Boolean).slice(0, 4) : [],
      conditionNotes: Array.isArray(parsed.conditionNotes) ? parsed.conditionNotes.map((line) => cleanText(line, 220)).filter(Boolean).slice(0, 6) : [],
      missingItems: Array.isArray(parsed.missingItems) ? parsed.missingItems.map((line) => cleanText(line, 160)).filter(Boolean).slice(0, 6) : [],
      dealerReviewNotes: Array.isArray(parsed.dealerReviewNotes) ? parsed.dealerReviewNotes.map((line) => cleanText(line, 220)).filter(Boolean).slice(0, 6) : [],
    };
  } catch {
    return {
      offerAmount: null,
      offerRangeLow: null,
      offerRangeHigh: null,
      title: "Instant cash offer ready for dealer review.",
      confidence: "Medium",
      admissibility: "PARTIAL",
      summaryLines: ["Solace produced a response, but it could not be parsed as structured JSON.", rawText.slice(0, 240)],
      conditionNotes: [],
      missingItems: [],
      dealerReviewNotes: ["Review the raw LLM output in intake metadata before quoting a final number."],
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
