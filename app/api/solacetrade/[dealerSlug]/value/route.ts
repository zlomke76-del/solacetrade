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
  "vehicle": {
    "vin": string | null,
    "mileage": number | null
  }
}

Rules:
- If VIN is not visible, detectedVin must be null.
- If mileage is not visible, detectedMileage must be null.
- Do not invent VIN or mileage.
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
    const parsed = parseSolaceValue(safeJsonText(rawText));

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

    const valuePayload = {
      ...parsed,
      detectedVin: detectedVin || null,
      detectedMileage,
      vin: detectedVin || null,
      mileage: detectedMileage,
      vehicle: {
        vin: detectedVin || null,
        mileage: detectedMileage,
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
