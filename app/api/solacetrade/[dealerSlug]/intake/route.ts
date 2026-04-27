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

const photoAliases: Record<RequiredPhotoStep, string[]> = {
  front: ["front"],
  driverSide: ["driverSide", "side", "driver_side"],
  rear: ["rear"],
  odometer: ["odometer", "mileage", "miles"],
  vin: ["vin", "vinPhoto", "vin_photo"],
};

function isUploadFile(value: FormDataEntryValue | null): value is UploadFile {
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

function findPhotoFile(formData: FormData, stepKey: RequiredPhotoStep) {
  for (const key of photoAliases[stepKey]) {
    const candidate = formData.get(key);

    if (isUploadFile(candidate)) {
      return {
        stepKey,
        submittedKey: key,
        file: candidate,
      };
    }
  }

  return null;
}

export async function POST(
  request: NextRequest,
  context: { params: { dealerSlug: string } },
) {
  try {
    const { dealerSlug } = context.params;
    const dealer = await getDealerBySlug(dealerSlug);
    const formData = await request.formData();

    const mode =
      cleanText(formData.get("mode"), 20) === "internal"
        ? "internal"
        : "customer";

    const customerName = cleanText(formData.get("customerName"), 160);
    const customerContact = cleanText(formData.get("contact"), 180);
    const salesperson = cleanText(formData.get("salesperson"), 160);
    const managerNotes = cleanText(formData.get("managerNotes"), 2500);

    const photoEntries = requiredPhotoSteps
      .map((stepKey) => findPhotoFile(formData, stepKey))
      .filter(
        (
          entry,
        ): entry is {
          stepKey: RequiredPhotoStep;
          submittedKey: string;
          file: UploadFile;
        } => Boolean(entry),
      );

    const receivedKeys = Array.from(formData.keys());
    const receivedPhotoSteps = photoEntries.map((entry) => entry.stepKey);
    const missingPhotoSteps = requiredPhotoSteps.filter(
      (stepKey) => !receivedPhotoSteps.includes(stepKey),
    );

    if (missingPhotoSteps.length > 0) {
      return NextResponse.json(
        {
          error:
            "All five guided vehicle photos are required before intake can be created.",
          missingPhotoSteps,
          receivedPhotoSteps,
          receivedKeys,
        },
        { status: 400 },
      );
    }

    const { data: intake, error: intakeError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("trade_intakes")
      .insert({
        dealer_id: dealer.id,
        status: "uploaded",
        mode,
        customer_name: customerName || null,
        customer_contact: customerContact || null,
        salesperson: salesperson || null,
        vin: null,
        mileage: null,
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
        throw new Error(
          `Photo upload failed for ${stepKey}: ${uploadError.message}`,
        );
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
      .update({
        photo_paths: uploadedPaths,
        photo_count: uploadedPaths.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake.id)
      .eq("dealer_id", dealer.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await logTradeEvent({
      dealerId: dealer.id,
      intakeId: intake.id,
      eventType: "intake_created",
      payload: {
        photoCount: uploadedPaths.length,
        mode,
        evidenceOnly: true,
        hasManualVin: false,
        hasManualMileage: false,
        receivedPhotoSteps,
        receivedKeys,
      },
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
    const message =
      error instanceof Error ? error.message : "Unknown intake error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
