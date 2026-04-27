import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createSignedPhotoUrls,
  formatMoney,
  getDealerBySlug,
  logTradeEvent,
  parseSolaceValue,
  SOLACETRADE_SCHEMA,
} from "@/lib/solacetrade";

const model = process.env.SOLACETRADE_AI_GATEWAY_MODEL || "openai/gpt-4o-mini";
const gatewayBaseUrl = process.env.VERCEL_AI_GATEWAY_BASE_URL || "https://ai-gateway.vercel.sh/v1";

type GatewayTextPart = {
  type: "text";
  text: string;
};

type GatewayImagePart = {
  type: "image_url";
  image_url: {
    url: string;
  };
};

type GatewayContentPart = GatewayTextPart | GatewayImagePart;

function fallbackOffer(mileage: number | null) {
  const miles = mileage || 90000;
  const estimated = Math.max(6500, Math.round(28000 - miles * 0.055));

  return {
    offerAmount: estimated,
    offerRangeLow: Math.max(5000, estimated - 1200),
    offerRangeHigh: estimated + 1200,
    title: `Instant cash offer: ${formatMoney(estimated)}`,
    confidence: "Medium" as const,
    admissibility: "PARTIAL" as const,
    summaryLines: [
      "The five-photo scan, VIN, and mileage are present.",
      "This instant cash offer is ready for dealer verification of condition, title, payoff, and recall status.",
    ],
    conditionNotes: [],
    missingItems: ["Manager verification before final purchase paperwork."],
    dealerReviewNotes: ["Fallback value used because no Vercel AI Gateway response was available."],
  };
}

async function callVercelAiGateway(input: {
  dealerName: string;
  dealerLocation: string;
  vin: string | null;
  mileage: number | null;
  managerNotes: string | null;
  signedPhotoUrls: string[];
}) {
  const apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return null;
  }

  const content: GatewayContentPart[] = [
    {
      type: "text",
      text: `You are SolaceTrade, a dealer intake valuation assistant. Produce a structured instant cash offer response for a dealer trade acquisition workflow. This is not final purchase paperwork. Output JSON only with these keys: offerAmount, offerRangeLow, offerRangeHigh, title, confidence, admissibility, summaryLines, conditionNotes, missingItems, dealerReviewNotes. Use integer USD values only. Dealer: ${input.dealerName}, ${input.dealerLocation}. VIN: ${input.vin || "not provided"}. Mileage: ${input.mileage || "not provided"}. Notes: ${input.managerNotes || "none"}. Keep customer-facing language confident: instant cash offer, no preliminary value phrasing. Flag items requiring dealer verification.`,
    },
  ];

  for (const signedPhotoUrl of input.signedPhotoUrls) {
    content.push({
      type: "image_url",
      image_url: { url: signedPhotoUrl },
    });
  }

  const response = await fetch(`${gatewayBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You produce conservative, dealer-safe vehicle intake valuation JSON. You never call the value preliminary. You make clear that final paperwork requires dealer verification.",
        },
        {
          role: "user",
          content,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Vercel AI Gateway error ${response.status}: ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || "");
}

export async function POST(request: NextRequest, context: { params: { dealerSlug: string } }) {
  try {
    const { dealerSlug } = context.params;
    const dealer = await getDealerBySlug(dealerSlug);
    const body = await request.json();
    const intakeId = String(body?.intakeId || "").trim();

    if (!intakeId) {
      return NextResponse.json({ error: "Missing intakeId." }, { status: 400 });
    }

    const { data: intake, error: intakeError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .select("*")
      .eq("id", intakeId)
      .eq("dealer_id", dealer.id)
      .single();

    if (intakeError || !intake) {
      return NextResponse.json({ error: "Trade intake not found." }, { status: 404 });
    }

    const photoPaths = Array.isArray(intake.photo_paths) ? intake.photo_paths : [];
    const signedPhotos = await createSignedPhotoUrls(photoPaths);
    const signedPhotoUrls = signedPhotos
      .map((photo) => photo.signedUrl)
      .filter((signedUrl): signedUrl is string => Boolean(signedUrl));

    let valuePayload = fallbackOffer(intake.mileage);
    let usedModel = "fallback";

    if (process.env.VERCEL_AI_GATEWAY_API_KEY) {
      const rawText = await callVercelAiGateway({
        dealerName: dealer.name,
        dealerLocation: `${dealer.city || ""} ${dealer.state || ""}`.trim(),
        vin: intake.vin,
        mileage: intake.mileage,
        managerNotes: intake.manager_notes,
        signedPhotoUrls,
      });

      if (rawText) {
        valuePayload = parseSolaceValue(rawText);
        usedModel = model;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .update({
        status: "valued",
        llm_model: usedModel,
        llm_summary: valuePayload,
        offer_amount: valuePayload.offerAmount,
        offer_range_low: valuePayload.offerRangeLow,
        offer_range_high: valuePayload.offerRangeHigh,
        confidence: valuePayload.confidence,
        admissibility: valuePayload.admissibility,
      })
      .eq("id", intake.id)
      .eq("dealer_id", dealer.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: intake.id,
      eventType: "value_generated",
      payload: { model: usedModel, offerAmount: valuePayload.offerAmount },
    });

    return NextResponse.json({
      intakeId: intake.id,
      model: usedModel,
      value: valuePayload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown valuation error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
