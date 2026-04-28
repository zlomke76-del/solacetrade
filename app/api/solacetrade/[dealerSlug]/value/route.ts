import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildMarketContext,
  cleanMileage,
  cleanText,
  cleanVin,
  convertDistance,
  createSignedPhotoUrls,
  formatMoney,
  getDealerBySlug,
  logTradeEvent,
  normalizeDistanceUnit,
  parseSolaceValue,
  SOLACETRADE_SCHEMA,
} from "@/lib/solacetrade";
import type { DistanceUnit } from "@/lib/solacetrade";

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
  mileage_unit: string | null;
  mode: string | null;
  manager_notes: string | null;
  photo_paths: string[] | null;
};

type DecodedVehicle = {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  driveType: string | null;
  engine: string | null;
  fuelType: string | null;
  doors: string | null;
  transmission: string | null;
  series: string | null;
  options: string[];
};

type VehicleFieldConfidence = "low" | "medium" | "high";

type StructuredTrim = {
  value: string | null;
  confidence: VehicleFieldConfidence;
  source: "vin_decode" | "vision" | "inferred" | "unknown";
};

type VisualConditionConfidence = "Low" | "Medium" | "High";

type DamageFlag = {
  panel: string | null;
  type: string | null;
  severity: "minor" | "moderate" | "major" | "unknown";
  confidence: VisualConditionConfidence;
  note: string | null;
};

type PhotoReviewStepKey = "front" | "driverSide" | "rear" | "odometer" | "vin";

type PhotoReviewStepStatus = "ACCEPTED" | "REJECTED" | "UNCLEAR";

type PhotoVehicleMatch = "MATCH" | "MISMATCH" | "UNKNOWN" | "NOT_APPLICABLE";

type PhotoImageQuality = "GOOD" | "FAIR" | "POOR";

type PhotoDamageSeverity = "none" | "minor" | "moderate" | "major" | "unknown";

type PhotoDamageChecklistItem = {
  panel: string | null;
  checked: boolean;
  damageVisible: boolean;
  damageType: string | null;
  severity: PhotoDamageSeverity;
  confidence: VisualConditionConfidence;
  note: string | null;
};

type PhotoReviewStep = {
  stepKey: PhotoReviewStepKey;
  status: PhotoReviewStepStatus;
  expectedView: string | null;
  actualView: string | null;
  vehicleMatch: PhotoVehicleMatch;
  imageQuality: PhotoImageQuality;
  usableForCondition: boolean;
  visiblePanels: string[];
  damageChecklist: PhotoDamageChecklistItem[];
  inconsistencies: string[];
  retakeRequired: boolean;
  customerInstruction: string | null;
  dealerNote: string | null;
};

type PhotoReview = {
  overallStatus: "PASS" | "RETAKE_REQUIRED";
  finalApprovalAllowed: boolean;
  steps: PhotoReviewStep[];
  retakeSteps: PhotoReviewStep[];
};

type ExecutionAdmissibility = {
  allowed: boolean;
  customerCertificatePermitted: boolean;
  managerReviewPermitted: boolean;
  reasons: string[];
  checkedAt: string;
  enforcement: "fail_closed";
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
  conditionScore?: number | null;
  visualConditionConfidence?: VisualConditionConfidence;
  damageFlags?: DamageFlag[];
  inspectionRequired?: boolean;
  executionAdmissibility?: ExecutionAdmissibility;
  missingItems?: string[];
  dealerReviewNotes?: string[];
  photoReview?: PhotoReview | null;
  detectedVin?: string | null;
  detectedMileage?: string | number | null;
  detectedMileageUnit?: string | null;
  vin?: string | null;
  mileage?: string | number | null;
  mileageUnit?: string | null;
  vehicleYear?: string | number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleTrim?: string | null;
  vehicleBodyClass?: string | null;
  vehicleDriveType?: string | null;
  vehicleEngine?: string | null;
  vehicleFuelType?: string | null;
  vehicleDoors?: string | null;
  vehicleTransmission?: string | null;
  vehicleSeries?: string | null;
  vehicleOptions?: string[];
  optionSignals?: string[];
  year?: string | number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  marketContext?: unknown;
  vehicle?: {
    vin?: string | null;
    mileage?: string | number | null;
    mileageUnit?: string | null;
    year?: string | number | null;
    make?: string | null;
    model?: string | null;
    trim?: string | null;
    bodyClass?: string | null;
    driveType?: string | null;
    engine?: string | null;
    fuelType?: string | null;
    doors?: string | null;
    transmission?: string | null;
    series?: string | null;
    options?: string[];
    configuration?: string[];
    signals?: string[];
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

function compactVehicleParts(parts: Array<unknown>, separator = " ") {
  return (
    parts
      .map((part) => cleanVehicleText(part))
      .filter(Boolean)
      .join(separator)
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

function uniqueVehicleOptions(values: Array<unknown>) {
  const seen = new Set<string>();
  const options: string[] = [];

  for (const value of values) {
    if (Array.isArray(value)) {
      for (const nested of value) {
        const cleaned = cleanVehicleText(nested);
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          options.push(cleaned);
        }
      }
      continue;
    }

    const cleaned = cleanVehicleText(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      options.push(cleaned);
    }
  }

  return options;
}

function isValueRelevantOption(option: string) {
  const text = option.toLowerCase();

  return (
    text.includes("4x4") ||
    text.includes("4wd") ||
    text.includes("awd") ||
    text.includes("all wheel") ||
    text.includes("four wheel") ||
    text.includes("tow") ||
    text.includes("trailer") ||
    text.includes("roof") ||
    text.includes("sunroof") ||
    text.includes("moonroof") ||
    text.includes("pano") ||
    text.includes("leather") ||
    text.includes("navigation") ||
    text.includes("nav") ||
    text.includes("premium") ||
    text.includes("audio") ||
    text.includes("speaker") ||
    text.includes("heated") ||
    text.includes("cooled") ||
    text.includes("ventilated") ||
    text.includes("adaptive") ||
    text.includes("camera") ||
    text.includes("blind spot") ||
    text.includes("driver assist") ||
    text.includes("safety") ||
    text.includes("limited") ||
    text.includes("overland") ||
    text.includes("summit") ||
    text.includes("trailhawk") ||
    text.includes("altitude") ||
    text.includes("high altitude") ||
    text.includes("luxury") ||
    text.includes("package")
  );
}

function buildStructuredTrim(
  decodedVehicle: DecodedVehicle | null,
  parsedTrim: string | null
): StructuredTrim {
  if (decodedVehicle?.trim) {
    return {
      value: decodedVehicle.trim,
      confidence: "high",
      source: "vin_decode",
    };
  }

  if (parsedTrim) {
    return {
      value: parsedTrim,
      confidence: "medium",
      source: "vision",
    };
  }

  return {
    value: null,
    confidence: "low",
    source: "unknown",
  };
}

function cleanConditionScore(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  return Math.min(5, Math.max(1, Math.round(number)));
}

function normalizeConditionConfidence(value: unknown): VisualConditionConfidence {
  const text = String(value || "").trim().toLowerCase();

  if (text === "high") return "High";
  if (text === "low") return "Low";

  return "Medium";
}

function normalizeDamageSeverity(value: unknown): DamageFlag["severity"] {
  const text = String(value || "").trim().toLowerCase();

  if (text === "minor") return "minor";
  if (text === "moderate") return "moderate";
  if (text === "major") return "major";

  return "unknown";
}

function normalizeDamageFlags(value: unknown): DamageFlag[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const flag = item as Record<string, unknown>;
      const panel = cleanVehicleText(flag.panel);
      const type = cleanVehicleText(flag.type);
      const note = cleanVehicleText(flag.note);
      const severity = normalizeDamageSeverity(flag.severity);
      const confidence = normalizeConditionConfidence(flag.confidence);

      if (!panel && !type && !note) return null;

      return { panel, type, severity, confidence, note };
    })
    .filter((flag): flag is DamageFlag => Boolean(flag));
}

function normalizePhotoStepKey(value: unknown): PhotoReviewStepKey | null {
  const text = String(value || "").trim();

  if (text === "front") return "front";
  if (text === "driverSide") return "driverSide";
  if (text === "rear") return "rear";
  if (text === "odometer") return "odometer";
  if (text === "vin") return "vin";

  return null;
}

function normalizePhotoReviewStatus(value: unknown): PhotoReviewStepStatus {
  const text = String(value || "").trim().toUpperCase();

  if (text === "ACCEPTED") return "ACCEPTED";
  if (text === "REJECTED") return "REJECTED";

  return "UNCLEAR";
}

function normalizePhotoVehicleMatch(value: unknown): PhotoVehicleMatch {
  const text = String(value || "").trim().toUpperCase();

  if (text === "MATCH") return "MATCH";
  if (text === "MISMATCH") return "MISMATCH";
  if (text === "NOT_APPLICABLE") return "NOT_APPLICABLE";

  return "UNKNOWN";
}

function normalizePhotoImageQuality(value: unknown): PhotoImageQuality {
  const text = String(value || "").trim().toUpperCase();

  if (text === "GOOD") return "GOOD";
  if (text === "POOR") return "POOR";

  return "FAIR";
}

function normalizePhotoDamageSeverity(value: unknown): PhotoDamageSeverity {
  const text = String(value || "").trim().toLowerCase();

  if (text === "none") return "none";
  if (text === "minor") return "minor";
  if (text === "moderate") return "moderate";
  if (text === "major") return "major";

  return "unknown";
}

function normalizePhotoDamageChecklist(value: unknown): PhotoDamageChecklistItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const entry = item as Record<string, unknown>;
      const panel = cleanVehicleText(entry.panel);
      const damageType = cleanVehicleText(entry.damageType);
      const note = cleanVehicleText(entry.note);

      if (!panel && !damageType && !note) return null;

      return {
        panel,
        checked: Boolean(entry.checked),
        damageVisible: Boolean(entry.damageVisible),
        damageType,
        severity: normalizePhotoDamageSeverity(entry.severity),
        confidence: normalizeConditionConfidence(entry.confidence),
        note,
      };
    })
    .filter((entry): entry is PhotoDamageChecklistItem => Boolean(entry));
}

function normalizePhotoReview(value: unknown): PhotoReview | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  const steps = rawSteps
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const rawStep = item as Record<string, unknown>;
      const stepKey = normalizePhotoStepKey(rawStep.stepKey);

      if (!stepKey) return null;

      const status = normalizePhotoReviewStatus(rawStep.status);
      const vehicleMatch = normalizePhotoVehicleMatch(rawStep.vehicleMatch);
      const imageQuality = normalizePhotoImageQuality(rawStep.imageQuality);
      const visiblePanels = getCleanStringArray(rawStep.visiblePanels, 20);
      const inconsistencies = getCleanStringArray(rawStep.inconsistencies, 12);
      const damageChecklist = normalizePhotoDamageChecklist(rawStep.damageChecklist);
      const usableForCondition = Boolean(rawStep.usableForCondition);
      const retakeRequired =
        Boolean(rawStep.retakeRequired) ||
        status === "REJECTED" ||
        vehicleMatch === "MISMATCH" ||
        imageQuality === "POOR" ||
        !usableForCondition;

      return {
        stepKey,
        status,
        expectedView: cleanVehicleText(rawStep.expectedView),
        actualView: cleanVehicleText(rawStep.actualView),
        vehicleMatch,
        imageQuality,
        usableForCondition,
        visiblePanels,
        damageChecklist,
        inconsistencies,
        retakeRequired,
        customerInstruction: cleanVehicleText(rawStep.customerInstruction),
        dealerNote: cleanVehicleText(rawStep.dealerNote),
      };
    })
    .filter((step): step is PhotoReviewStep => Boolean(step));

  if (!steps.length) return null;

  const retakeSteps = steps.filter((step) => step.retakeRequired);
  const finalApprovalAllowed =
    raw.finalApprovalAllowed === true && retakeSteps.length === 0;

  return {
    overallStatus:
      raw.overallStatus === "PASS" && finalApprovalAllowed
        ? "PASS"
        : "RETAKE_REQUIRED",
    finalApprovalAllowed,
    steps,
    retakeSteps,
  };
}

function photoReviewRequiresRetake(photoReview: PhotoReview | null) {
  return Boolean(
    photoReview &&
      (!photoReview.finalApprovalAllowed ||
        photoReview.overallStatus === "RETAKE_REQUIRED" ||
        photoReview.retakeSteps.length > 0)
  );
}

function photoReviewRetakeSummary(photoReview: PhotoReview | null) {
  if (!photoReview?.retakeSteps.length) return [];

  return photoReview.retakeSteps.map((step) => {
    const reason =
      step.customerInstruction ||
      step.dealerNote ||
      step.inconsistencies.join(" ") ||
      "Photo must be retaken before final approval.";

    return `${step.stepKey}: ${reason}`;
  });
}

function flattenPhotoDamageFlags(photoReview: PhotoReview | null): DamageFlag[] {
  if (!photoReview) return [];

  return photoReview.steps.flatMap((step) =>
    step.damageChecklist
      .filter((item) => item.damageVisible)
      .map((item) => ({
        panel: item.panel || step.expectedView || step.stepKey,
        type: item.damageType,
        severity: item.severity === "none" ? "unknown" : item.severity,
        confidence: item.confidence,
        note: item.note || step.dealerNote,
      }))
  );
}

function requiresInspection({
  conditionScore,
  visualConditionConfidence,
  damageFlags,
}: {
  conditionScore: number | null;
  visualConditionConfidence: VisualConditionConfidence;
  damageFlags: DamageFlag[];
}) {
  const hasModerateOrMajorDamage = damageFlags.some(
    (flag) => flag.severity === "moderate" || flag.severity === "major"
  );

  return (
    visualConditionConfidence === "Low" ||
    (conditionScore !== null && conditionScore <= 2) ||
    hasModerateOrMajorDamage
  );
}

function getCleanStringArray(value: unknown, maxItems = 12) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanVehicleText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

function buildExecutionAdmissibility(input: {
  mode: string | null;
  photoCount: number;
  detectedVin: string;
  detectedMileage: number | null;
  offerAmount: number | null;
  confidence?: "Low" | "Medium" | "High";
  admissibility?: "PASS" | "PARTIAL" | "DENY";
  missingItems?: string[];
  inspectionRequired: boolean;
  visualConditionConfidence: VisualConditionConfidence;
}): ExecutionAdmissibility {
  const reasons: string[] = [];

  if (input.photoCount < 5) {
    reasons.push("All five guided photos are required.");
  }

  if (!input.detectedVin || input.detectedVin.length !== 17) {
    reasons.push("VIN was not detected with sufficient confidence.");
  }

  if (!input.detectedMileage) {
    reasons.push("Mileage was not detected with sufficient confidence.");
  }

  if (!input.offerAmount || !Number.isFinite(input.offerAmount)) {
    reasons.push("Offer amount was not produced from sufficient state.");
  }

  if (input.confidence === "Low") {
    reasons.push("Solace confidence is low.");
  }

  if (input.admissibility !== "PASS") {
    reasons.push("Solace did not mark the valuation state as PASS.");
  }

  if (input.visualConditionConfidence === "Low") {
    reasons.push("Visual condition confidence is low.");
  }

  if (input.inspectionRequired) {
    reasons.push("Dealer inspection is required before a certificate can be executed.");
  }

  for (const item of input.missingItems || []) {
    if (item && !reasons.includes(item)) reasons.push(item);
  }

  const allowed = reasons.length === 0;

  return {
    allowed,
    customerCertificatePermitted: allowed && input.mode !== "internal",
    managerReviewPermitted: true,
    reasons,
    checkedAt: new Date().toISOString(),
    enforcement: "fail_closed",
  };
}

function buildDamageConditionNotes(
  existingNotes: string[] | undefined,
  damageFlags: DamageFlag[]
) {
  const notes = Array.isArray(existingNotes) ? [...existingNotes] : [];

  for (const flag of damageFlags) {
    const parts = [
      flag.severity !== "unknown" ? flag.severity : null,
      flag.type,
      flag.panel,
    ]
      .filter(Boolean)
      .join(" ");
    const note = flag.note ? `${parts ? `${parts}: ` : ""}${flag.note}` : parts;

    if (note && !notes.some((item) => item.toLowerCase() === note.toLowerCase())) {
      notes.push(note);
    }
  }

  return notes;
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

    const series = compactVehicleParts([result.Series, result.Series2], " ");
    const engine = compactVehicleParts(
      [
        result.EngineConfiguration,
        result.DisplacementL ? `${result.DisplacementL}L` : null,
        result.EngineModel,
        result.EngineNumberofCylinders
          ? `${result.EngineNumberofCylinders} cyl`
          : null,
      ],
      " "
    );
    const bodyClass = cleanVehicleText(result.BodyClass);
    const driveType = cleanVehicleText(result.DriveType);
    const fuelType = cleanVehicleText(result.FuelTypePrimary);
    const doors = cleanVehicleText(result.Doors);
    const transmission = cleanVehicleText(result.TransmissionStyle);
    const trim =
      cleanVehicleText(result.Trim) ||
      cleanVehicleText(result.Trim2) ||
      series;

    return {
      year: Number.isFinite(year) ? year : null,
      make: cleanVehicleText(result.Make),
      model: cleanVehicleText(result.Model),
      trim,
      bodyClass,
      driveType,
      engine,
      fuelType,
      doors,
      transmission,
      series,
      options: uniqueVehicleOptions([
        trim,
        series,
        driveType,
        engine,
        transmission,
        result.OtherEngineInfo,
        result.OtherRestraintSystemInfo,
      ]).filter(isValueRelevantOption),
    };
  } catch (error) {
    console.error("SolaceTrade VIN decode failed", {
      vin: clean,
      error: error instanceof Error ? error.message : "Unknown VIN decode error",
    });

    return null;
  }
}

function normalizeDetectedMileage(input: {
  rawMileage: unknown;
  rawUnit: unknown;
  dealerDistanceUnit: DistanceUnit;
}) {
  const rawMileage = cleanMileage(input.rawMileage);
  const rawUnit = normalizeDistanceUnit(input.rawUnit || input.dealerDistanceUnit);

  return {
    sourceMileage: rawMileage,
    sourceMileageUnit: rawUnit,
    displayMileage: convertDistance(rawMileage, rawUnit, input.dealerDistanceUnit),
    displayMileageUnit: input.dealerDistanceUnit,
  };
}

function isUsDealerWithLikelyCanadianMarketVehicle(input: {
  dealerCountry: string;
  sourceMileage: number | null;
  sourceMileageUnit: DistanceUnit;
}) {
  return (
    input.dealerCountry.toUpperCase() === "US" &&
    Boolean(input.sourceMileage) &&
    input.sourceMileageUnit === "km"
  );
}

function applyCrossBorderMarketAdjustment(input: {
  amount: number | null | undefined;
  shouldAdjust: boolean;
}) {
  if (!input.amount || !Number.isFinite(input.amount)) return null;

  if (!input.shouldAdjust) return Math.round(input.amount);

  return Math.round(input.amount * 0.92);
}

async function reviewPhotosAgainstDecodedVehicle(input: {
  apiKey: string;
  model: string;
  dealerName: string;
  decodedVehicleLabel: string;
  detectedVin: string;
  photoManifest: Array<{ stepKey: string; hasSignedUrl: boolean }>;
  frontUrl: string | null;
  driverSideUrl: string | null;
  rearUrl: string | null;
  odometerUrl: string | null;
  vinUrl: string | null;
}): Promise<PhotoReview | null> {
  if (!input.detectedVin || !input.decodedVehicleLabel) return null;

  const prompt = `
You are SolaceTrade's final photo admissibility reviewer.

The customer uploaded five photos in this exact order:
1. front: full front exterior
2. driverSide: full driver-side exterior
3. rear: full rear exterior
4. odometer: odometer display
5. vin: VIN plate/label

Decoded VIN vehicle:
- VIN: ${input.detectedVin}
- Vehicle: ${input.decodedVehicleLabel}
- Dealer: ${input.dealerName}

Your job is NOT to produce a value. Your job is only to determine whether each photo is acceptable for final approval and to document visible damage or inconsistencies per picture.

Return ONLY valid JSON with this exact shape:
{
  "photoReview": {
    "overallStatus": "PASS" | "RETAKE_REQUIRED",
    "finalApprovalAllowed": boolean,
    "steps": [
      {
        "stepKey": "front" | "driverSide" | "rear" | "odometer" | "vin",
        "status": "ACCEPTED" | "REJECTED" | "UNCLEAR",
        "expectedView": string | null,
        "actualView": string | null,
        "vehicleMatch": "MATCH" | "MISMATCH" | "UNKNOWN" | "NOT_APPLICABLE",
        "imageQuality": "GOOD" | "FAIR" | "POOR",
        "usableForCondition": boolean,
        "visiblePanels": string[],
        "damageChecklist": [
          {
            "panel": string | null,
            "checked": boolean,
            "damageVisible": boolean,
            "damageType": string | null,
            "severity": "none" | "minor" | "moderate" | "major" | "unknown",
            "confidence": "Low" | "Medium" | "High",
            "note": string | null
          }
        ],
        "inconsistencies": string[],
        "retakeRequired": boolean,
        "customerInstruction": string | null,
        "dealerNote": string | null
      }
    ],
    "retakeSteps": []
  }
}

Rules:
- Each of the five step keys must appear exactly once in steps.
- For front, driverSide, and rear: compare the visible vehicle against the decoded VIN vehicle. If the photo appears to show a different vehicle, set vehicleMatch = "MISMATCH", status = "REJECTED", usableForCondition = false, retakeRequired = true.
- For odometer and vin: vehicleMatch may be "NOT_APPLICABLE" unless there is an obvious mismatch.
- If the angle is wrong, image is blurry, too dark, too cropped, or not useful, set status = "REJECTED", imageQuality = "POOR", usableForCondition = false, retakeRequired = true.
- If you are uncertain, use status = "UNCLEAR" and explain why.
- For each exterior photo, list the visible panels and a damageChecklist for the panels actually visible.
- If no damage is visible on a visible panel, include a checklist item with damageVisible = false and severity = "none".
- Do not say a panel is clean unless the image makes that panel reasonably visible.
- No visible damage does not mean no damage. If visibility is limited, say so and mark confidence Low or Medium.
- If any retakeRequired is true, overallStatus must be "RETAKE_REQUIRED" and finalApprovalAllowed must be false.
- If all steps are acceptable, overallStatus must be "PASS" and finalApprovalAllowed must be true.
- retakeSteps must contain the same rejected/retake step objects from steps.
- Customer instructions should be short and specific.
- Dealer notes should be operational and direct.
- Do not include markdown.
- Do not include text outside JSON.

Photo manifest: ${JSON.stringify(input.photoManifest)}
`.trim();

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: prompt },
  ];

  for (const url of [
    input.frontUrl,
    input.driverSideUrl,
    input.rearUrl,
    input.odometerUrl,
    input.vinUrl,
  ]) {
    if (url) {
      content.push({
        type: "image_url",
        image_url: { url },
      });
    }
  }

  try {
    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages: [
          {
            role: "user",
            content,
          },
        ],
        temperature: 0.1,
        max_tokens: 2600,
      }),
    });

    const gatewayJson = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("SolaceTrade photo review gateway error", {
        status: response.status,
        payload: gatewayJson,
      });
      return null;
    }

    const rawText = extractMessageText(gatewayJson);
    const jsonText = safeJsonText(rawText);
    const parsed = JSON.parse(jsonText) as { photoReview?: unknown };

    return normalizePhotoReview(parsed.photoReview);
  } catch (error) {
    console.error("SolaceTrade photo review failed", {
      error: error instanceof Error ? error.message : "Unknown photo review error",
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
    const marketContext = buildMarketContext(dealer);
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
        "id, dealer_id, customer_name, customer_contact, vin, mileage, mileage_unit, mode, manager_notes, photo_paths"
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
2. Read the odometer value from the odometer image if visible.
3. Detect whether the odometer is in miles or kilometers if the unit is visible.
4. Review the exterior photos for visible damage and condition signals.
5. Identify visible value-relevant option signals only.
6. Produce a structured visual condition assessment for dealer review.
7. Produce a conservative instant cash offer payload for dealer review using the dealer's local valuation market.
8. Perform a first-pass photo inspection for visible damage, poor image quality, wrong angle, or obvious inconsistencies.

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
  "conditionScore": number | null,
  "visualConditionConfidence": "Low" | "Medium" | "High",
  "damageFlags": [
    {
      "panel": string | null,
      "type": string | null,
      "severity": "minor" | "moderate" | "major" | "unknown",
      "confidence": "Low" | "Medium" | "High",
      "note": string | null
    }
  ],
  "inspectionRequired": boolean,
  "missingItems": string[],
  "dealerReviewNotes": string[],
  "photoReview": {
    "overallStatus": "PASS" | "RETAKE_REQUIRED",
    "finalApprovalAllowed": boolean,
    "steps": [
      {
        "stepKey": "front" | "driverSide" | "rear" | "odometer" | "vin",
        "status": "ACCEPTED" | "REJECTED" | "UNCLEAR",
        "expectedView": string | null,
        "actualView": string | null,
        "vehicleMatch": "MATCH" | "MISMATCH" | "UNKNOWN" | "NOT_APPLICABLE",
        "imageQuality": "GOOD" | "FAIR" | "POOR",
        "usableForCondition": boolean,
        "visiblePanels": string[],
        "damageChecklist": [
          {
            "panel": string | null,
            "checked": boolean,
            "damageVisible": boolean,
            "damageType": string | null,
            "severity": "none" | "minor" | "moderate" | "major" | "unknown",
            "confidence": "Low" | "Medium" | "High",
            "note": string | null
          }
        ],
        "inconsistencies": string[],
        "retakeRequired": boolean,
        "customerInstruction": string | null,
        "dealerNote": string | null
      }
    ],
    "retakeSteps": []
  },
  "detectedVin": string | null,
  "detectedMileage": number | null,
  "detectedMileageUnit": "mi" | "km",
  "vehicleYear": number | null,
  "vehicleMake": string | null,
  "vehicleModel": string | null,
  "vehicleTrim": string | null,
  "vehicleBodyClass": string | null,
  "vehicleDriveType": string | null,
  "vehicleEngine": string | null,
  "vehicleFuelType": string | null,
  "vehicleDoors": string | null,
  "vehicleTransmission": string | null,
  "vehicleSeries": string | null,
  "vehicleOptions": string[],
  "optionSignals": string[],
  "vehicle": {
    "vin": string | null,
    "mileage": number | null,
    "mileageUnit": "mi" | "km",
    "year": number | null,
    "make": string | null,
    "model": string | null,
    "trim": string | null,
    "bodyClass": string | null,
    "driveType": string | null,
    "engine": string | null,
    "fuelType": string | null,
    "doors": string | null,
    "transmission": string | null,
    "series": string | null,
    "options": string[]
  }
}

Dealer market context:
- Dealer: ${dealer.name}
- Location: ${dealer.city || ""}, ${dealer.state || ""} ${dealer.postal_code || ""}, ${marketContext.country}
- Valuation market: ${marketContext.valuationMarket}
- Offer currency: ${marketContext.currency}
- Preferred odometer display unit: ${marketContext.distanceUnit}
- Locale: ${marketContext.locale}

Rules:
- Offer numbers must be in ${marketContext.currency}; do not output USD for Canadian dealers unless the dealer currency is USD.
- Adjust valuation reasoning for the dealer's local market. Alaska, Texas, Canada, and other regions should not be treated as the same market.
- US dealers must use US market pricing in USD. Canadian dealers must use Canadian market pricing in CAD unless the dealer record explicitly says otherwise.
- If the dealer is in the US and the odometer is visibly in kilometers, treat this as a likely Canadian-market unit and apply a conservative US resale friction adjustment. Do not assume full US market parity.
- detectedMileage should be the odometer number as read from the image.
- detectedMileageUnit must be "mi" or "km". If the image unit is unreadable, use the dealer preferred unit: ${marketContext.distanceUnit}.
- If VIN is not visible, detectedVin must be null.
- If mileage is not visible, detectedMileage must be null.
- If year, make, model, trim, body class, drivetrain, engine, fuel type, doors, transmission, series, or options are not visible from the image evidence, set them to null or [] as appropriate. The server will decode stable fields from the detected VIN when possible.
- conditionScore must be 1-5 where 5 means clean/excellent visible condition and 1 means major visible damage or severe uncertainty.
- visualConditionConfidence must reflect photo quality, angle coverage, lighting, and whether damage can be inspected clearly.
- damageFlags must identify only visible damage or visible concern signals. Do not invent damage. Use [] if no damage is visible.
- photoReview must inspect every photo step individually. Each step must state expectedView, actualView, vehicleMatch, imageQuality, usableForCondition, visiblePanels, damageChecklist, inconsistencies, retakeRequired, customerInstruction, and dealerNote.
- For every visible exterior panel, include a damageChecklist item. If damage is not visible, set damageVisible = false and severity = "none". If a panel is not visible or not checkable, do not claim it is clean.
- If an exterior photo appears to show a different vehicle than the other exterior photos or the VIN evidence, mark that step REJECTED and retakeRequired.
- If any photo is rejected, blurry, dark, cropped, wrong angle, or unusable for condition, photoReview.overallStatus must be RETAKE_REQUIRED and photoReview.finalApprovalAllowed must be false.
- inspectionRequired should be true if photo quality is low, conditionScore <= 2, moderate/major damage is visible, or the images do not support a confident condition read.
- Use optionSignals for visible price-impacting equipment clues from photos only, such as badging, wheel style, sunroof, panoramic roof, tow package, 4x4/AWD badge, leather, premium audio, navigation, roof rails, or driver-assist sensors.
- Do not use optionSignals for generic facts like doors, fuel type, body class, brake type, vehicle class, hydraulic brakes, GVWR, or MPV/SUV classification.
- Do not invent VIN, mileage, year, make, model, trim, drivetrain, engine, packages, or options.
- If VIN or mileage cannot be read, admissibility should be PARTIAL.
- Keep summaryLines customer-friendly and mention that the final value is confirmed upon inspection.
- Keep dealerReviewNotes operational and concise.
- The offer may be conservative and preliminary, but should be framed as an instant cash offer pending dealer verification.
- Do not include markdown.
- Do not include text outside JSON.

Existing intake data:
Customer name: ${intake.customer_name || "not provided"}
Customer contact: ${intake.customer_contact || "not provided"}
Manual VIN: ${intake.vin || "not provided"}
Manual mileage: ${intake.mileage || "not provided"} ${intake.mileage_unit || marketContext.distanceUnit}
Mode: ${intake.mode || "customer"}
Photo manifest: ${JSON.stringify(photoManifest)}
`.trim();

    const content: Array<Record<string, unknown>> = [
      { type: "text", text: prompt },
    ];

    for (const url of [frontUrl, driverSideUrl, rearUrl, odometerUrl, vinUrl]) {
      if (url) {
        content.push({
          type: "image_url",
          image_url: { url },
        });
      }
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
        max_tokens: 1800,
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
    const jsonText = safeJsonText(rawText);
    const baseParsed = parseSolaceValue(jsonText, marketContext);
    let rawParsed: Partial<ExtendedSolaceValuePayload> = {};

    try {
      rawParsed = JSON.parse(jsonText) as Partial<ExtendedSolaceValuePayload>;
    } catch {
      rawParsed = {};
    }

    const parsed = {
      ...rawParsed,
      ...baseParsed,
      vehicle: {
        ...(rawParsed.vehicle || {}),
        ...(baseParsed.vehicle || {}),
      },
    } as ExtendedSolaceValuePayload;

    const detectedVin = cleanVin(
      parsed.detectedVin || parsed.vin || parsed.vehicle?.vin || intake.vin
    );

    const mileageState = normalizeDetectedMileage({
      rawMileage:
        parsed.detectedMileage ||
        parsed.mileage ||
        parsed.vehicle?.mileage ||
        intake.mileage,
      rawUnit:
        parsed.detectedMileageUnit ||
        parsed.mileageUnit ||
        parsed.vehicle?.mileageUnit ||
        intake.mileage_unit ||
        marketContext.distanceUnit,
      dealerDistanceUnit: marketContext.distanceUnit,
    });

    const detectedMileage = mileageState.displayMileage;
    const sourceMileage = mileageState.sourceMileage;
    const sourceMileageUnit = mileageState.sourceMileageUnit;
    const mileageUnit = mileageState.displayMileageUnit;
    const dealerCountry = marketContext.country.toUpperCase();
    const crossBorderAdjusted = isUsDealerWithLikelyCanadianMarketVehicle({
      dealerCountry,
      sourceMileage,
      sourceMileageUnit,
    });
    const crossBorderAdjustmentRate = crossBorderAdjusted ? 0.92 : 1;

    const decodedVehicle = detectedVin
      ? await decodeVehicleFromVin(detectedVin)
      : null;

    const parsedTrim = cleanVehicleText(
      parsed.vehicleTrim || parsed.trim || parsed.vehicle?.trim
    );

    const vehicleYear =
      decodedVehicle?.year ||
      cleanVehicleText(parsed.vehicleYear || parsed.year || parsed.vehicle?.year);
    const vehicleMake =
      decodedVehicle?.make ||
      cleanVehicleText(parsed.vehicleMake || parsed.make || parsed.vehicle?.make);
    const vehicleModel =
      decodedVehicle?.model ||
      cleanVehicleText(parsed.vehicleModel || parsed.model || parsed.vehicle?.model);
    const vehicleTrim = decodedVehicle?.trim || parsedTrim;
    const vehicleTrimDetail = buildStructuredTrim(decodedVehicle, parsedTrim);
    const vehicleBodyClass =
      decodedVehicle?.bodyClass ||
      cleanVehicleText(parsed.vehicleBodyClass || parsed.vehicle?.bodyClass);
    const vehicleDriveType =
      decodedVehicle?.driveType ||
      cleanVehicleText(parsed.vehicleDriveType || parsed.vehicle?.driveType);
    const vehicleEngine =
      decodedVehicle?.engine ||
      cleanVehicleText(parsed.vehicleEngine || parsed.vehicle?.engine);
    const vehicleFuelType =
      decodedVehicle?.fuelType ||
      cleanVehicleText(parsed.vehicleFuelType || parsed.vehicle?.fuelType);
    const vehicleDoors =
      decodedVehicle?.doors ||
      cleanVehicleText(parsed.vehicleDoors || parsed.vehicle?.doors);
    const vehicleTransmission =
      decodedVehicle?.transmission ||
      cleanVehicleText(parsed.vehicleTransmission || parsed.vehicle?.transmission);
    const vehicleSeries =
      decodedVehicle?.series ||
      cleanVehicleText(parsed.vehicleSeries || parsed.vehicle?.series);

    const optionSignals = uniqueVehicleOptions(parsed.optionSignals || []).filter(
      isValueRelevantOption
    );

    const vehicleConfiguration = uniqueVehicleOptions([
      vehicleDriveType,
      vehicleEngine,
      vehicleTransmission,
    ]);

    const vehicleOptions = uniqueVehicleOptions([
      decodedVehicle?.options || [],
      parsed.vehicleOptions || [],
      parsed.vehicle?.options || [],
      optionSignals,
      vehicleTrim,
    ]).filter(isValueRelevantOption);

    const vehicleSignals = uniqueVehicleOptions([
      vehicleBodyClass,
      vehicleFuelType,
      vehicleDoors ? `${vehicleDoors} doors` : null,
      vehicleSeries,
    ]);

    const decodedVehicleLabel = compactVehicleParts([
      vehicleYear,
      vehicleMake,
      vehicleModel,
      vehicleTrim,
    ]);

    const decodedPhotoReview = await reviewPhotosAgainstDecodedVehicle({
      apiKey,
      model: getModel(),
      dealerName: dealer.name,
      decodedVehicleLabel: decodedVehicleLabel || "",
      detectedVin,
      photoManifest,
      frontUrl,
      driverSideUrl,
      rearUrl,
      odometerUrl,
      vinUrl,
    });

    const photoReview =
      decodedPhotoReview || normalizePhotoReview(parsed.photoReview);
    const photoRetakeRequired = photoReviewRequiresRetake(photoReview);

    const damageFlags = [
      ...normalizeDamageFlags(parsed.damageFlags),
      ...flattenPhotoDamageFlags(photoReview),
    ];
    const conditionScore = cleanConditionScore(parsed.conditionScore);
    const baseVisualConditionConfidence = normalizeConditionConfidence(
      parsed.visualConditionConfidence
    );
    const visualConditionConfidence =
      photoRetakeRequired && baseVisualConditionConfidence === "High"
        ? "Medium"
        : baseVisualConditionConfidence;
    const inspectionRequired =
      Boolean(parsed.inspectionRequired) ||
      photoRetakeRequired ||
      requiresInspection({
        conditionScore,
        visualConditionConfidence,
        damageFlags,
      });
    const conditionNotes = buildDamageConditionNotes(
      parsed.conditionNotes,
      damageFlags
    );
    const dealerReviewNotes = Array.isArray(parsed.dealerReviewNotes)
      ? [...parsed.dealerReviewNotes]
      : [];

    dealerReviewNotes.unshift(
      `Valuation market: ${marketContext.valuationMarket}. Currency: ${marketContext.currency}. Odometer display: ${marketContext.distanceUnit}.`
    );

    if (sourceMileage && sourceMileageUnit !== mileageUnit) {
      dealerReviewNotes.push(
        `Odometer was read as ${sourceMileage} ${sourceMileageUnit} and normalized to ${detectedMileage} ${mileageUnit} for this dealer.`
      );
    }

    if (crossBorderAdjusted) {
      dealerReviewNotes.push(
        "Likely Canadian-market unit detected from kilometer odometer. Offer adjusted for US resale friction."
      );
    }

    if (inspectionRequired) {
      dealerReviewNotes.push(
        "Visual condition requires dealer inspection before finalizing the offer."
      );
    }

    if (photoRetakeRequired) {
      dealerReviewNotes.push(
        `Photo validation requires retake before final approval: ${photoReviewRetakeSummary(photoReview).join(" ")}`
      );
    }

    const adjustedOfferAmount = applyCrossBorderMarketAdjustment({
      amount: parsed.offerAmount,
      shouldAdjust: crossBorderAdjusted,
    });
    const adjustedOfferRangeLow = applyCrossBorderMarketAdjustment({
      amount: parsed.offerRangeLow,
      shouldAdjust: crossBorderAdjusted,
    });
    const adjustedOfferRangeHigh = applyCrossBorderMarketAdjustment({
      amount: parsed.offerRangeHigh,
      shouldAdjust: crossBorderAdjusted,
    });

    const finalConfidence =
      photoRetakeRequired && parsed.confidence === "High"
        ? "Medium"
        : parsed.confidence;
    const finalAdmissibility = photoRetakeRequired
      ? "PARTIAL"
      : parsed.admissibility;

    const missingItems = getCleanStringArray(parsed.missingItems);
    const executionAdmissibility = buildExecutionAdmissibility({
      mode: intake.mode,
      photoCount: photos.length,
      detectedVin,
      detectedMileage,
      confidence: finalConfidence,
      admissibility: finalAdmissibility,
      offerAmount: adjustedOfferAmount,
      missingItems,
      inspectionRequired,
      visualConditionConfidence,
    });

    if (photoRetakeRequired) {
      executionAdmissibility.allowed = false;
      executionAdmissibility.customerCertificatePermitted = false;
      if (
        !executionAdmissibility.reasons.includes(
          "One or more required photos must be retaken before final approval."
        )
      ) {
        executionAdmissibility.reasons.push(
          "One or more required photos must be retaken before final approval."
        );
      }
    }

    if (!executionAdmissibility.allowed) {
      dealerReviewNotes.push(
        `Execution blocked until state is sufficient: ${executionAdmissibility.reasons.join(" ")}`
      );
    }

    const valuePayload = {
      ...parsed,
      marketContext,
      marketAdjustment: {
        crossBorderAdjusted,
        reason: crossBorderAdjusted
          ? "Likely Canadian-market vehicle submitted to a US dealer; kilometer odometer detected."
          : null,
        multiplier: crossBorderAdjustmentRate,
        dealerCountry,
        sourceMileageUnit,
        dealerMileageUnit: mileageUnit,
      },
      offerAmount: adjustedOfferAmount,
      offerRangeLow: adjustedOfferRangeLow,
      offerRangeHigh: adjustedOfferRangeHigh,
      detectedVin: detectedVin || null,
      detectedMileage,
      detectedMileageUnit: mileageUnit,
      sourceMileage,
      sourceMileageUnit,
      conditionScore,
      visualConditionConfidence,
      damageFlags,
      inspectionRequired,
      executionAdmissibility,
      missingItems,
      conditionNotes,
      dealerReviewNotes,
      photoReview,
      vin: detectedVin || null,
      mileage: detectedMileage,
      mileageUnit,
      offerCurrency: marketContext.currency,
      locale: marketContext.locale,
      valuationMarket: marketContext.valuationMarket,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      vehicleTrim,
      vehicleTrimDetail,
      vehicleBodyClass,
      vehicleDriveType,
      vehicleEngine,
      vehicleFuelType,
      vehicleDoors,
      vehicleTransmission,
      vehicleSeries,
      vehicleConfiguration,
      vehicleOptions,
      vehicleSignals,
      optionSignals,
      configuration: vehicleConfiguration,
      options: vehicleOptions,
      signals: vehicleSignals,
      year: vehicleYear,
      make: vehicleMake,
      model: vehicleModel,
      trim: vehicleTrim,
      vehicle: {
        vin: detectedVin || null,
        mileage: detectedMileage,
        mileageUnit,
        year: vehicleYear,
        make: vehicleMake,
        model: vehicleModel,
        trim: vehicleTrim,
        trimDetail: vehicleTrimDetail,
        bodyClass: vehicleBodyClass,
        driveType: vehicleDriveType,
        engine: vehicleEngine,
        fuelType: vehicleFuelType,
        doors: vehicleDoors,
        transmission: vehicleTransmission,
        series: vehicleSeries,
        configuration: vehicleConfiguration,
        options: vehicleOptions,
        signals: vehicleSignals,
      },
      title:
        crossBorderAdjusted && adjustedOfferAmount
          ? `Instant cash offer: ${formatMoney(
              adjustedOfferAmount,
              marketContext.currency,
              marketContext.locale
            )}`
          : parsed.title ||
            `Instant cash offer: ${formatMoney(
              adjustedOfferAmount,
              marketContext.currency,
              marketContext.locale
            )}`,
    };

    const updatePayload = {
      status: "valued",
      vin: detectedVin || intake.vin || null,
      mileage: detectedMileage || intake.mileage || null,
      mileage_unit: mileageUnit,
      offer_currency: marketContext.currency,
      valuation_market: marketContext.valuationMarket,
      llm_model: getModel(),
      llm_summary: valuePayload.summaryLines || [],
      offer_amount: valuePayload.offerAmount,
      offer_range_low: valuePayload.offerRangeLow,
      offer_range_high: valuePayload.offerRangeHigh,
      confidence: valuePayload.confidence,
      admissibility: valuePayload.admissibility,
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
        marketContext,
        marketAdjustment: {
          crossBorderAdjusted,
          multiplier: crossBorderAdjustmentRate,
          dealerCountry,
          sourceMileageUnit,
          dealerMileageUnit: mileageUnit,
        },
        hasDetectedVin: Boolean(detectedVin),
        hasDetectedMileage: Boolean(detectedMileage),
        mileage: {
          sourceMileage,
          sourceMileageUnit,
          displayMileage: detectedMileage,
          displayMileageUnit: mileageUnit,
        },
        decodedVehicle: {
          year: vehicleYear,
          make: vehicleMake,
          model: vehicleModel,
          trim: vehicleTrim,
          trimDetail: vehicleTrimDetail,
          configuration: vehicleConfiguration,
          options: vehicleOptions,
          signals: vehicleSignals,
        },
        visualCondition: {
          conditionScore,
          visualConditionConfidence,
          inspectionRequired,
          damageFlagCount: damageFlags.length,
          photoReviewStatus: photoReview?.overallStatus || null,
          retakeRequired: photoRetakeRequired,
          retakeSteps: photoReview?.retakeSteps.map((step) => step.stepKey) || [],
        },
        executionAdmissibility,
        offerAmount: valuePayload.offerAmount,
        offerCurrency: marketContext.currency,
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
        marketContext,
      },
      value: valuePayload,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown value error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
