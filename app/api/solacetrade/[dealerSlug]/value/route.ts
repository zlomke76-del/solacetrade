import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cleanMileage,
  cleanText,
  cleanVin,
  createSignedPhotoUrls,
  formatMoney,
  getDealerBySlug,
  logTradeEvent,
  parseSolaceValue,
  SOLACETRADE_SCHEMA,
} from "@/lib/solacetrade";

type TradePhoto = {
  step_key: string;
  storage_path: string;
};

type TradeIntake = {
  id: string;
  dealer_id: string;
  customer_name: string | null;
  customer_contact: string | null;
  vin: string | null;
  mileage: number | null;
  mode: string | null;
  manager_notes: string | null;
  photo_paths: string[] | null;
};

type DecodedVehicle = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
};


type MarketCompBand = {
  low: number | null;
  high: number | null;
};

type MarketCompSource = {
  source: "MMR" | "KBB" | "Market API" | "Auction Proxy";
  status: "live" | "estimated" | "not_configured" | "failed";
  trade: MarketCompBand;
  retail: MarketCompBand;
  privateParty: MarketCompBand;
  auction: MarketCompBand;
  note: string;
};

type MarketCompSnapshot = {
  generatedAt: string;
  vin: string | null;
  mileage: number | null;
  vehicleLabel: string | null;
  sources: MarketCompSource[];
  acquisitionTarget: number | null;
  tradeLow: number | null;
  tradeHigh: number | null;
  retailLow: number | null;
  retailHigh: number | null;
  privateLow: number | null;
  privateHigh: number | null;
  confidence: "Low" | "Medium" | "High";
  basis: string;
};

type ExtendedSolaceValuePayload = {
  offerAmount: number | null;
  offerRangeLow: number | null;
  offerRangeHigh: number | null;
  title?: string | null;
  confidence?: "Low" | "Medium" | "High";
  admissibility?: "PASS" | "PARTIAL" | "DENY";
  summaryLines?: string[];
  conditionNotes?: string[];
  missingItems?: string[];
  dealerReviewNotes?: string[];
  detectedVin?: string | null;
  detectedMileage?: string | number | null;
  vin?: string | null;
  mileage?: string | number | null;
  vehicleYear?: string | number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleTrim?: string | null;
  year?: string | number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  vehicle?: {
    vin?: string | null;
    mileage?: string | number | null;
    year?: string | number | null;
    make?: string | null;
    model?: string | null;
    trim?: string | null;
  } | null;
  marketComps?: MarketCompSnapshot | null;
};

const gatewayUrl = "https://ai-gateway.vercel.sh/v1/chat/completions";

function getGatewayKey() {
  return process.env.VERCEL_AI_GATEWAY_API_KEY || "";
}

function getModel() {
  return process.env.SOLACETRADE_VALUE_MODEL || "openai/gpt-4o-mini";
}

function extractMessageText(payload: unknown) {
  const data = payload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text || "" : ""))
      .join("")
      .trim();
  }

  return "";
}

function safeJsonText(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || trimmed;
}

function findSignedUrl(
  signedPhotos: Array<{ path: string; signedUrl: string | null }>,
  stepKey: string
) {
  return (
    signedPhotos.find((photo) => photo.path.includes(`/${stepKey}.`))
      ?.signedUrl || null
  );
}

function cleanVehicleText(value: unknown) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text || text.toLowerCase() === "not applicable") return null;

  return text;
}

async function decodeVehicleFromVin(vin: string): Promise<DecodedVehicle | null> {
  const clean = cleanVin(vin);

  if (!clean || clean.length !== 17) return null;

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${clean}?format=json`,
      { cache: "no-store" }
    );

    if (!response.ok) return null;

    const json = (await response.json().catch(() => ({}))) as {
      Results?: Array<Record<string, unknown>>;
    };

    const result = json.Results?.[0];
    if (!result) return null;

    const yearText = cleanVehicleText(result.ModelYear);
    const year = yearText ? Number(yearText) : null;

    return {
      year: Number.isFinite(year) ? year : null,
      make: cleanVehicleText(result.Make),
      model: cleanVehicleText(result.Model),
      trim:
        cleanVehicleText(result.Trim) ||
        cleanVehicleText(result.Series) ||
        cleanVehicleText(result.Series2),
    };
  } catch (error) {
    console.error("SolaceTrade VIN decode failed", {
      vin: clean,
      error: error instanceof Error ? error.message : "Unknown VIN decode error",
    });

    return null;
  }
}

function numericValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
}

function roundToNearest(value: number | null | undefined, nearest = 250) {
  if (!value || !Number.isFinite(value)) return null;
  return Math.round(value / nearest) * nearest;
}

function makeBand(low: unknown, high: unknown): MarketCompBand {
  const parsedLow = numericValue(low);
  const parsedHigh = numericValue(high);

  if (parsedLow && parsedHigh) {
    return {
      low: Math.min(parsedLow, parsedHigh),
      high: Math.max(parsedLow, parsedHigh),
    };
  }

  const center = parsedLow || parsedHigh;
  if (!center) return { low: null, high: null };

  return {
    low: roundToNearest(center * 0.97),
    high: roundToNearest(center * 1.03),
  };
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0
  );

  if (!valid.length) return null;

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function blendBand(sources: MarketCompSource[], selector: (source: MarketCompSource) => MarketCompBand) {
  return {
    low: roundToNearest(average(sources.map((source) => selector(source).low))),
    high: roundToNearest(average(sources.map((source) => selector(source).high))),
  };
}

function vehicleLabelFromParts(vehicle: DecodedVehicle | null) {
  if (!vehicle) return null;
  const label = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return label || null;
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 6500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        (json as { error?: string; message?: string })?.error ||
          (json as { error?: string; message?: string })?.message ||
          `HTTP ${response.status}`
      );
    }

    return json as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeMarketSource(
  source: MarketCompSource["source"],
  payload: Record<string, unknown>,
  fallbackNote: string
): MarketCompSource {
  const trade = makeBand(
    payload.tradeLow ?? payload.tradeInLow ?? payload.wholesaleLow ?? payload.lowTrade,
    payload.tradeHigh ?? payload.tradeInHigh ?? payload.wholesaleHigh ?? payload.highTrade
  );
  const retail = makeBand(
    payload.retailLow ?? payload.dealerRetailLow ?? payload.listLow,
    payload.retailHigh ?? payload.dealerRetailHigh ?? payload.listHigh
  );
  const privateParty = makeBand(
    payload.privateLow ?? payload.privatePartyLow,
    payload.privateHigh ?? payload.privatePartyHigh
  );
  const auction = makeBand(
    payload.auctionLow ?? payload.mmrLow ?? payload.wholesaleAuctionLow,
    payload.auctionHigh ?? payload.mmrHigh ?? payload.wholesaleAuctionHigh
  );

  return {
    source,
    status: "live",
    trade,
    retail,
    privateParty,
    auction,
    note: cleanVehicleText(payload.note) || fallbackNote,
  };
}

async function fetchOptionalMarketSource({
  source,
  endpoint,
  apiKey,
  body,
  fallbackNote,
}: {
  source: MarketCompSource["source"];
  endpoint: string | undefined;
  apiKey: string | undefined;
  body: Record<string, unknown>;
  fallbackNote: string;
}): Promise<MarketCompSource> {
  if (!endpoint) {
    return {
      source,
      status: "not_configured",
      trade: { low: null, high: null },
      retail: { low: null, high: null },
      privateParty: { low: null, high: null },
      auction: { low: null, high: null },
      note: `${source} endpoint not configured.`,
    };
  }

  try {
    const payload = await fetchJsonWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    return normalizeMarketSource(source, payload, fallbackNote);
  } catch (error) {
    return {
      source,
      status: "failed",
      trade: { low: null, high: null },
      retail: { low: null, high: null },
      privateParty: { low: null, high: null },
      auction: { low: null, high: null },
      note: error instanceof Error ? error.message : `${source} lookup failed.`,
    };
  }
}

function buildAuctionProxySource({
  offerAmount,
  offerRangeLow,
  offerRangeHigh,
  tradeBand,
  retailBand,
}: {
  offerAmount: number | null;
  offerRangeLow: number | null;
  offerRangeHigh: number | null;
  tradeBand: MarketCompBand;
  retailBand: MarketCompBand;
}): MarketCompSource {
  const tradeCenter = average([tradeBand.low, tradeBand.high]);
  const retailCenter = average([retailBand.low, retailBand.high]);
  const anchor = tradeCenter || offerAmount || average([offerRangeLow, offerRangeHigh]);

  if (!anchor) {
    return {
      source: "Auction Proxy",
      status: "not_configured",
      trade: { low: null, high: null },
      retail: { low: null, high: null },
      privateParty: { low: null, high: null },
      auction: { low: null, high: null },
      note: "No market source or offer anchor was available for an auction proxy.",
    };
  }

  const auctionCenter = tradeCenter || anchor;
  const retail = retailCenter
    ? { low: roundToNearest(retailCenter * 0.96), high: roundToNearest(retailCenter * 1.04) }
    : { low: roundToNearest(anchor * 1.18), high: roundToNearest(anchor * 1.34) };

  return {
    source: "Auction Proxy",
    status: "estimated",
    trade: {
      low: roundToNearest(anchor * 0.96),
      high: roundToNearest(anchor * 1.06),
    },
    retail,
    privateParty: {
      low: roundToNearest((retail.low || anchor * 1.16) * 0.92),
      high: roundToNearest((retail.high || anchor * 1.3) * 0.96),
    },
    auction: {
      low: roundToNearest(auctionCenter * 0.95),
      high: roundToNearest(auctionCenter * 1.05),
    },
    note: "Calculated fallback using available wholesale/retail anchors, mileage, and dealer acquisition buffer.",
  };
}

async function getMarketComps({
  vin,
  mileage,
  vehicle,
  offerAmount,
  offerRangeLow,
  offerRangeHigh,
  dealer,
}: {
  vin: string | null;
  mileage: number | null;
  vehicle: DecodedVehicle | null;
  offerAmount: number | null;
  offerRangeLow: number | null;
  offerRangeHigh: number | null;
  dealer: { city?: string | null; state?: string | null; name?: string | null };
}): Promise<MarketCompSnapshot> {
  const body = {
    vin,
    mileage,
    year: vehicle?.year || null,
    make: vehicle?.make || null,
    model: vehicle?.model || null,
    trim: vehicle?.trim || null,
    dealerCity: dealer.city || null,
    dealerState: dealer.state || null,
    dealerName: dealer.name || null,
  };

  const [mmr, kbb, marketApi] = await Promise.all([
    fetchOptionalMarketSource({
      source: "MMR",
      endpoint: process.env.SOLACETRADE_MMR_ENDPOINT,
      apiKey: process.env.SOLACETRADE_MMR_API_KEY,
      body,
      fallbackNote: "Live MMR/auction value returned from configured provider.",
    }),
    fetchOptionalMarketSource({
      source: "KBB",
      endpoint: process.env.SOLACETRADE_KBB_ENDPOINT,
      apiKey: process.env.SOLACETRADE_KBB_API_KEY,
      body,
      fallbackNote: "Live KBB-style trade/private/retail value returned from configured provider.",
    }),
    fetchOptionalMarketSource({
      source: "Market API",
      endpoint: process.env.SOLACETRADE_MARKET_COMP_ENDPOINT,
      apiKey: process.env.SOLACETRADE_MARKET_COMP_API_KEY,
      body,
      fallbackNote: "Live retail listing/market comp value returned from configured provider.",
    }),
  ]);

  const liveSources = [mmr, kbb, marketApi].filter((source) => source.status === "live");
  const tradeBand = blendBand(liveSources, (source) => source.trade);
  const retailBand = blendBand(liveSources, (source) => source.retail);
  const privateBand = blendBand(liveSources, (source) => source.privateParty);
  const auctionBand = blendBand(liveSources, (source) => source.auction);
  const proxy = buildAuctionProxySource({
    offerAmount,
    offerRangeLow,
    offerRangeHigh,
    tradeBand: tradeBand.low || tradeBand.high ? tradeBand : auctionBand,
    retailBand,
  });

  const effectiveSources = [...liveSources, proxy].filter(
    (source) => source.status === "live" || source.status === "estimated"
  );
  const finalTrade = blendBand(effectiveSources, (source) => source.trade);
  const finalRetail = blendBand(effectiveSources, (source) => source.retail);
  const finalPrivate = blendBand(effectiveSources, (source) => source.privateParty);
  const finalAuction = blendBand(effectiveSources, (source) => source.auction);
  const acquisitionAnchor =
    finalAuction.low || finalTrade.low || offerRangeLow || offerAmount || null;
  const acquisitionTarget = acquisitionAnchor
    ? roundToNearest(acquisitionAnchor * (liveSources.length ? 0.985 : 1))
    : null;

  return {
    generatedAt: new Date().toISOString(),
    vin,
    mileage,
    vehicleLabel: vehicleLabelFromParts(vehicle),
    sources: [mmr, kbb, marketApi, proxy],
    acquisitionTarget,
    tradeLow: finalTrade.low,
    tradeHigh: finalTrade.high,
    retailLow: finalRetail.low,
    retailHigh: finalRetail.high,
    privateLow: finalPrivate.low,
    privateHigh: finalPrivate.high,
    confidence: liveSources.length >= 2 ? "High" : liveSources.length === 1 ? "Medium" : "Low",
    basis: liveSources.length
      ? "Live configured market source(s) blended with auction-proxy acquisition guardrail."
      : "Auction-proxy fallback only. Configure MMR/KBB/market endpoints for live comps.",
  };
}

function marketRangeText(low: number | null, high: number | null) {
  if (low && high) return `${formatMoney(low)}-${formatMoney(high)}`;
  if (low || high) return formatMoney(low || high);
  return "not available";
}


export async function POST(
  request: NextRequest,
  context: { params: { dealerSlug: string } }
) {
  try {
    const apiKey = getGatewayKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: "VERCEL_AI_GATEWAY_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const { dealerSlug } = context.params;
    const dealer = await getDealerBySlug(dealerSlug);
    const body = await request.json().catch(() => ({}));
    const intakeId = cleanText(body.intakeId, 80);

    if (!intakeId) {
      return NextResponse.json(
        { error: "intakeId is required." },
        { status: 400 }
      );
    }

    const { data: intake, error: intakeError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .select(
        "id, dealer_id, customer_name, customer_contact, vin, mileage, mode, manager_notes, photo_paths"
      )
      .eq("id", intakeId)
      .eq("dealer_id", dealer.id)
      .single<TradeIntake>();

    if (intakeError || !intake) {
      return NextResponse.json(
        { error: intakeError?.message || "Trade intake not found." },
        { status: 404 }
      );
    }

    const { data: photoRows, error: photoError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_photos")
      .select("step_key, storage_path")
      .eq("intake_id", intake.id)
      .eq("dealer_id", dealer.id)
      .order("created_at", { ascending: true });

    if (photoError) {
      throw new Error(photoError.message);
    }

    const photos = (photoRows || []) as TradePhoto[];

    if (photos.length < 5) {
      return NextResponse.json(
        {
          error:
            "All five guided vehicle photos are required before Solace can produce an offer.",
        },
        { status: 400 }
      );
    }

    const signedPhotos = await createSignedPhotoUrls(
      photos.map((photo) => photo.storage_path)
    );

    const frontUrl = findSignedUrl(signedPhotos, "front");
    const driverSideUrl = findSignedUrl(signedPhotos, "driverSide");
    const rearUrl = findSignedUrl(signedPhotos, "rear");
    const odometerUrl = findSignedUrl(signedPhotos, "odometer");
    const vinUrl = findSignedUrl(signedPhotos, "vin");

    const photoManifest = photos.map((photo) => ({
      stepKey: photo.step_key,
      hasSignedUrl: Boolean(
        signedPhotos.find((signed) => signed.path === photo.storage_path)
          ?.signedUrl
      ),
    }));

    const prompt = `
You are SolaceTrade, a dealer trade-intake assistant.

Your task:
1. Read the VIN from the VIN image if visible.
2. Read the mileage from the odometer image if visible.
3. Review the exterior photos for visible condition signals.
4. Produce a conservative instant cash offer payload for dealer review.

Return ONLY valid JSON with this exact shape:
{
  "offerAmount": number | null,
  "offerRangeLow": number | null,
  "offerRangeHigh": number | null,
  "title": string,
  "confidence": "Low" | "Medium" | "High",
  "admissibility": "PASS" | "PARTIAL" | "DENY",
  "summaryLines": string[],
  "conditionNotes": string[],
  "missingItems": string[],
  "dealerReviewNotes": string[],
  "detectedVin": string | null,
  "detectedMileage": number | null,
  "vehicleYear": number | null,
  "vehicleMake": string | null,
  "vehicleModel": string | null,
  "vehicleTrim": string | null,
  "vehicle": {
    "vin": string | null,
    "mileage": number | null,
    "year": number | null,
    "make": string | null,
    "model": string | null,
    "trim": string | null
  }
}

Rules:
- If VIN is not visible, detectedVin must be null.
- If mileage is not visible, detectedMileage must be null.
- If year, make, model, or trim are not visible from the image evidence, set them to null. The server will decode those fields from the detected VIN when possible.
- Do not invent VIN, mileage, year, make, model, or trim.
- If VIN or mileage cannot be read, admissibility should be PARTIAL.
- Keep summaryLines customer-friendly.
- Keep dealerReviewNotes operational and concise.
- The offer may be conservative and preliminary, but should be framed as an instant cash offer pending dealer verification.
- Do not include markdown.
- Do not include text outside JSON.

Dealer:
${dealer.name}
${dealer.city || ""}, ${dealer.state || ""}

Existing intake data:
Customer name: ${intake.customer_name || "not provided"}
Customer contact: ${intake.customer_contact || "not provided"}
Manual VIN: ${intake.vin || "not provided"}
Manual mileage: ${intake.mileage || "not provided"}
Mode: ${intake.mode || "customer"}
Photo manifest: ${JSON.stringify(photoManifest)}
`.trim();

    const content: Array<Record<string, unknown>> = [
      { type: "text", text: prompt },
    ];

    if (frontUrl) {
      content.push({
        type: "image_url",
        image_url: { url: frontUrl },
      });
    }

    if (driverSideUrl) {
      content.push({
        type: "image_url",
        image_url: { url: driverSideUrl },
      });
    }

    if (rearUrl) {
      content.push({
        type: "image_url",
        image_url: { url: rearUrl },
      });
    }

    if (odometerUrl) {
      content.push({
        type: "image_url",
        image_url: { url: odometerUrl },
      });
    }

    if (vinUrl) {
      content.push({
        type: "image_url",
        image_url: { url: vinUrl },
      });
    }

    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getModel(),
        messages: [
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.2,
        max_tokens: 900,
      }),
    });

    const gatewayJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("SolaceTrade AI Gateway error", {
        status: response.status,
        payload: gatewayJson,
      });

      return NextResponse.json(
        {
          error:
            (gatewayJson as { error?: { message?: string } })?.error
              ?.message || "AI Gateway value request failed.",
        },
        { status: 500 }
      );
    }

    const rawText = extractMessageText(gatewayJson);
    const parsed = parseSolaceValue(safeJsonText(rawText)) as ExtendedSolaceValuePayload;

    const detectedVin = cleanVin(
      parsed.detectedVin || parsed.vin || parsed.vehicle?.vin || intake.vin
    );

    const detectedMileage =
      cleanMileage(
        parsed.detectedMileage ||
          parsed.mileage ||
          parsed.vehicle?.mileage ||
          intake.mileage
      ) || null;

    const decodedVehicle = detectedVin
      ? await decodeVehicleFromVin(detectedVin)
      : null;

    const vehicleYear =
      decodedVehicle?.year ||
      cleanVehicleText(parsed.vehicleYear || parsed.year || parsed.vehicle?.year);
    const vehicleMake =
      decodedVehicle?.make ||
      cleanVehicleText(parsed.vehicleMake || parsed.make || parsed.vehicle?.make);
    const vehicleModel =
      decodedVehicle?.model ||
      cleanVehicleText(parsed.vehicleModel || parsed.model || parsed.vehicle?.model);
    const vehicleTrim =
      decodedVehicle?.trim ||
      cleanVehicleText(parsed.vehicleTrim || parsed.trim || parsed.vehicle?.trim);

    const marketComps = await getMarketComps({
      vin: detectedVin || null,
      mileage: detectedMileage,
      vehicle: {
        year: typeof vehicleYear === "number" ? vehicleYear : numericValue(vehicleYear),
        make: vehicleMake,
        model: vehicleModel,
        trim: vehicleTrim,
      },
      offerAmount: parsed.offerAmount,
      offerRangeLow: parsed.offerRangeLow,
      offerRangeHigh: parsed.offerRangeHigh,
      dealer,
    });

    const marketBackedOffer =
      marketComps.acquisitionTarget ||
      parsed.offerAmount ||
      marketComps.tradeLow ||
      null;
    const marketBackedRangeLow =
      marketComps.tradeLow || parsed.offerRangeLow || marketBackedOffer;
    const marketBackedRangeHigh =
      marketComps.tradeHigh || parsed.offerRangeHigh || marketBackedOffer;

    const marketSummaryLines = [
      `Instant offer reflects dealer acquisition value, reconditioning risk, and mileage verification.`,
      `Market retail band: ${marketRangeText(marketComps.retailLow, marketComps.retailHigh)}.`,
      `Trade/acquisition band: ${marketRangeText(marketComps.tradeLow, marketComps.tradeHigh)}.`,
    ];

    const valuePayload = {
      ...parsed,
      offerAmount: marketBackedOffer,
      offerRangeLow: marketBackedRangeLow,
      offerRangeHigh: marketBackedRangeHigh,
      detectedVin: detectedVin || null,
      detectedMileage,
      vin: detectedVin || null,
      mileage: detectedMileage,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      vehicleTrim,
      year: vehicleYear,
      make: vehicleMake,
      model: vehicleModel,
      trim: vehicleTrim,
      marketComps,
      vehicle: {
        vin: detectedVin || null,
        mileage: detectedMileage,
        year: vehicleYear,
        make: vehicleMake,
        model: vehicleModel,
        trim: vehicleTrim,
      },
      summaryLines: [
        ...marketSummaryLines,
        ...(parsed.summaryLines || []).filter(
          (line) => !marketSummaryLines.includes(line)
        ),
      ].slice(0, 5),
      dealerReviewNotes: [
        ...(parsed.dealerReviewNotes || []),
        `Market comp basis: ${marketComps.basis}`,
      ],
      confidence: marketComps.confidence === "High" ? "High" : parsed.confidence || marketComps.confidence,
      title:
        parsed.title ||
        `Instant cash offer: ${formatMoney(marketBackedOffer)}`,
    };

    const updatePayload = {
      status: "valued",
      vin: detectedVin || intake.vin || null,
      mileage: detectedMileage || intake.mileage || null,
      llm_summary: valuePayload.summaryLines?.join("\n") || null,
      offer_amount: valuePayload.offerAmount,
      offer_range_low: valuePayload.offerRangeLow,
      offer_range_high: valuePayload.offerRangeHigh,
      value_payload: valuePayload,
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

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: intake.id,
      eventType: "value_created",
      payload: {
        model: getModel(),
        hasDetectedVin: Boolean(detectedVin),
        hasDetectedMileage: Boolean(detectedMileage),
        decodedVehicle: {
          year: vehicleYear,
          make: vehicleMake,
          model: vehicleModel,
          trim: vehicleTrim,
        },
        marketComps: {
          confidence: marketComps.confidence,
          acquisitionTarget: marketComps.acquisitionTarget,
          tradeLow: marketComps.tradeLow,
          tradeHigh: marketComps.tradeHigh,
          retailLow: marketComps.retailLow,
          retailHigh: marketComps.retailHigh,
          sourceStatuses: marketComps.sources.map((source) => ({
            source: source.source,
            status: source.status,
          })),
        },
        offerAmount: valuePayload.offerAmount,
        confidence: valuePayload.confidence,
        admissibility: valuePayload.admissibility,
      },
    });

    return NextResponse.json({
      intakeId: intake.id,
      dealer: {
        id: dealer.id,
        slug: dealer.slug,
        name: dealer.name,
      },
      value: valuePayload,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown value error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
