import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cleanText,
  getDealerBySlug,
  logTradeEvent,
  SOLACETRADE_SCHEMA,
  TRADE_SCAN_BUCKET,
} from "@/lib/solacetrade";

const requiredPhotoSteps = ["front", "driverSide", "rear", "odometer", "vin"] as const;

type RequiredPhotoStep = (typeof requiredPhotoSteps)[number];

type UploadFile = {
  name?: string;
  type?: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function isRequiredPhotoStep(value: string): value is RequiredPhotoStep {
  return (requiredPhotoSteps as readonly string[]).includes(value);
}

function isUploadFile(value: unknown): value is UploadFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "size" in value &&
    "arrayBuffer" in value &&
    typeof (value as UploadFile).arrayBuffer === "function" &&
    typeof (value as UploadFile).size === "number" &&
    (value as UploadFile).size > 0
  );
}

function extensionFor(file: UploadFile) {
  const fallback =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  const source = file.name || "";
  const match = source.match(/\.([a-zA-Z0-9]+)$/);

  return (
    (match?.[1] || fallback).toLowerCase().replace(/[^a-z0-9]/g, "") ||
    fallback
  );
}

async function getUploadedSteps(input: { dealerId: string; intakeId: string }) {
  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("trade_photos")
    .select("step_key, storage_path")
    .eq("dealer_id", input.dealerId)
    .eq("intake_id", input.intakeId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as Array<{ step_key: string; storage_path: string }>;
  const uploadedSteps = Array.from(new Set(rows.map((row) => row.step_key)));
  const photoPaths = rows.map((row) => row.storage_path);

  return {
    rows,
    uploadedSteps,
    photoPaths,
    photoCount: uploadedSteps.length,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: { dealerSlug: string; intakeId: string } }
) {
  try {
    const { dealerSlug, intakeId } = context.params;
    const dealer = await getDealerBySlug(dealerSlug);
    const cleanIntakeId = cleanText(intakeId, 80);

    if (!cleanIntakeId) {
      return NextResponse.json({ error: "intakeId is required." }, { status: 400 });
    }

    const { data: intake, error: intakeError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .select("id, dealer_id")
      .eq("id", cleanIntakeId)
      .eq("dealer_id", dealer.id)
      .single();

    if (intakeError || !intake) {
      return NextResponse.json(
        { error: intakeError?.message || "Trade intake not found." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const stepKey = cleanText(formData.get("stepKey"), 40);
    const candidate = formData.get("photo");

    if (!isRequiredPhotoStep(stepKey)) {
      return NextResponse.json(
        {
          error: "Valid stepKey is required.",
          allowedSteps: requiredPhotoSteps,
        },
        { status: 400 }
      );
    }

    if (!isUploadFile(candidate)) {
      return NextResponse.json(
        { error: "A non-empty photo file is required." },
        { status: 400 }
      );
    }

    const ext = extensionFor(candidate);
    const storagePath = `${dealer.slug}/${cleanIntakeId}/${stepKey}.${ext}`;
    const bytes = Buffer.from(await candidate.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(TRADE_SCAN_BUCKET)
      .upload(storagePath, bytes, {
        contentType: candidate.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Photo upload failed for ${stepKey}: ${uploadError.message}`);
    }

    await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_photos")
      .delete()
      .eq("dealer_id", dealer.id)
      .eq("intake_id", cleanIntakeId)
      .eq("step_key", stepKey);

    const { error: photoError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_photos")
      .insert({
        dealer_id: dealer.id,
        intake_id: cleanIntakeId,
        step_key: stepKey,
        storage_bucket: TRADE_SCAN_BUCKET,
        storage_path: storagePath,
        original_filename: candidate.name || null,
        content_type: candidate.type || null,
        size_bytes: candidate.size,
      });

    if (photoError) {
      throw new Error(photoError.message);
    }

    const uploaded = await getUploadedSteps({
      dealerId: dealer.id,
      intakeId: cleanIntakeId,
    });

    const nextStatus = uploaded.photoCount >= requiredPhotoSteps.length ? "scanned" : "new";

    const { error: updateError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .update({
        status: nextStatus,
        photo_paths: uploaded.photoPaths,
        photo_count: uploaded.photoCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanIntakeId)
      .eq("dealer_id", dealer.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: cleanIntakeId,
      eventType: "photo_uploaded",
      payload: {
        stepKey,
        storagePath,
        photoCount: uploaded.photoCount,
        uploadedSteps: uploaded.uploadedSteps,
        streamingUpload: true,
      },
    });

    return NextResponse.json({
      intakeId: cleanIntakeId,
      stepKey,
      storagePath,
      photoCount: uploaded.photoCount,
      uploadedSteps: uploaded.uploadedSteps,
      scanComplete: uploaded.photoCount >= requiredPhotoSteps.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown photo upload error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
