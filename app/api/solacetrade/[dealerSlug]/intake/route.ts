import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  cleanMileage,
  cleanText,
  cleanVin,
  getDealerBySlug,
  logTradeEvent,
  SOLACETRADE_SCHEMA,
  TRADE_SCAN_BUCKET,
} from "../../../../../lib/solacetrade";

const photoSteps = ["front", "driverSide", "rear", "odometer", "vin"];

function extensionFor(file: File) {
  const fallback = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const source = file.name || "";
  const match = source.match(/\.([a-zA-Z0-9]+)$/);
  return (match?.[1] || fallback).toLowerCase().replace(/[^a-z0-9]/g, "") || fallback;
}

export async function POST(request: NextRequest, context: { params: Promise<{ dealerSlug: string }> }) {
  try {
    const { dealerSlug } = await context.params;
    const dealer = await getDealerBySlug(dealerSlug);
    const formData = await request.formData();

    const mode = cleanText(formData.get("mode"), 20) === "internal" ? "internal" : "customer";
    const vin = cleanVin(formData.get("vin"));
    const mileage = cleanMileage(formData.get("mileage"));
    const customerName = cleanText(formData.get("customerName"), 160);
    const customerContact = cleanText(formData.get("contact"), 180);
    const salesperson = cleanText(formData.get("salesperson"), 160);
    const managerNotes = cleanText(formData.get("managerNotes"), 2500);

    const photoEntries = photoSteps
      .map((stepKey) => ({ stepKey, file: formData.get(stepKey) }))
      .filter((entry): entry is { stepKey: string; file: File } => entry.file instanceof File && entry.file.size > 0);

    if (photoEntries.length !== photoSteps.length) {
      return NextResponse.json(
        { error: "All five guided vehicle photos are required before intake can be created." },
        { status: 400 }
      );
    }

    if (!vin || vin.length < 11) {
      return NextResponse.json({ error: "A valid VIN is required." }, { status: 400 });
    }

    if (!mileage) {
      return NextResponse.json({ error: "Mileage is required." }, { status: 400 });
    }

    const { data: intake, error: intakeError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .insert({
        dealer_id: dealer.id,
        status: "scanned",
        mode,
        customer_name: customerName || null,
        customer_contact: customerContact || null,
        salesperson: salesperson || null,
        vin,
        mileage,
        manager_notes: managerNotes || null,
        photo_count: photoEntries.length,
      })
      .select("id")
      .single();

    if (intakeError || !intake) {
      throw new Error(intakeError?.message || "Failed to create trade intake.");
    }

    const uploadedPaths: string[] = [];
    const photoRows = [];

    for (const { stepKey, file } of photoEntries) {
      const ext = extensionFor(file);
      const storagePath = `${dealer.slug}/${intake.id}/${stepKey}.${ext}`;
      const bytes = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from(TRADE_SCAN_BUCKET)
        .upload(storagePath, bytes, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Photo upload failed for ${stepKey}: ${uploadError.message}`);
      }

      uploadedPaths.push(storagePath);
      photoRows.push({
        dealer_id: dealer.id,
        intake_id: intake.id,
        step_key: stepKey,
        storage_bucket: TRADE_SCAN_BUCKET,
        storage_path: storagePath,
        original_filename: file.name || null,
        content_type: file.type || null,
        size_bytes: file.size,
      });
    }

    const { error: photoError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_photos")
      .insert(photoRows);

    if (photoError) {
      throw new Error(photoError.message);
    }

    const { error: updateError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .update({ photo_paths: uploadedPaths, photo_count: uploadedPaths.length })
      .eq("id", intake.id)
      .eq("dealer_id", dealer.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: intake.id,
      eventType: "intake_created",
      payload: { photoCount: uploadedPaths.length, mode },
    });

    return NextResponse.json({
      intakeId: intake.id,
      dealer: {
        id: dealer.id,
        slug: dealer.slug,
        name: dealer.name,
      },
      photoPaths: uploadedPaths,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown intake error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
