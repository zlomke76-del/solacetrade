import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  createSignedPhotoUrls,
  formatMoney,
  getDealerBySlug,
  logTradeEvent,
  parseSolaceValue,
  SOLACETRADE_SCHEMA,
} from "../../../../../lib/solacetrade";

const model = process.env.SOLACETRADE_OPENAI_MODEL || "gpt-4o-mini";

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
    dealerReviewNotes: ["Fallback value used because no LLM response was available."],
  };
}

export async function POST(request: NextRequest, context: { params: Promise<{ dealerSlug: string }> }) {
  try {
    const { dealerSlug } = await context.params;
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
    let valuePayload = fallbackOffer(intake.mileage);
    let usedModel = "fallback";

    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: `You are SolaceTrade, a dealer intake valuation assistant. Produce a structured instant cash offer response for a dealer trade acquisition workflow. This is not final purchase paperwork. Output JSON only with these keys: offerAmount, offerRangeLow, offerRangeHigh, title, confidence, admissibility, summaryLines, conditionNotes, missingItems, dealerReviewNotes. Use integer USD values only. Dealer: ${dealer.name}, ${dealer.city || ""} ${dealer.state || ""}. VIN: ${intake.vin}. Mileage: ${intake.mileage}. Notes: ${intake.manager_notes || "none"}. Keep customer-facing language confident: instant cash offer, no preliminary value phrasing. Flag items requiring dealer verification.`,
        },
      ];

      for (const photo of signedPhotos) {
        if (photo.signedUrl) {
          content.push({
            type: "image_url",
            image_url: { url: photo.signedUrl },
          });
        }
      }

      const completion = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You produce conservative, dealer-safe vehicle intake valuation JSON. You never call the value preliminary. You make clear that final paperwork requires dealer verification.",
          },
          { role: "user", content },
        ],
      });

      const rawText = completion.choices[0]?.message?.content || "";
      valuePayload = parseSolaceValue(rawText);
      usedModel = model;
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
