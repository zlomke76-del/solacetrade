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

    const valuePayload = {
      ...parsed,
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
      vehicle: {
        vin: detectedVin || null,
        mileage: detectedMileage,
        year: vehicleYear,
        make: vehicleMake,
        model: vehicleModel,
        trim: vehicleTrim,
      },
      title:
        parsed.title ||
        `Instant cash offer: ${formatMoney(parsed.offerAmount)}`,
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
