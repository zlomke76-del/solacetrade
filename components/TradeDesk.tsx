"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type TradeDeskMode = "customer" | "internal";

type DistanceUnit = "mi" | "km";
type OfferCurrency = "USD" | "CAD";

type MarketContext = {
  country: string;
  currency: OfferCurrency;
  locale: string;
  distanceUnit: DistanceUnit;
  valuationMarket: string;
  dealerLocation?: {
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string;
  };
};

type TradeDeskProps = {
  dealerSlug: string;
  mode?: TradeDeskMode;
  dealerName?: string;
  brandColor?: string;
  managerEmail?: string;
  routingCcEmails?: string[];
};

type CaptureStep = {
  key: "front" | "driverSide" | "rear" | "odometer" | "vin";
  label: string;
  shortLabel: string;
  help: string;
  coaching: string;
  image: string;
};

type PhotoMap = Record<CaptureStep["key"], File | null>;

type SolaceValue = {
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
  detectedVin?: string | null;
  detectedMileage?: string | number | null;
  detectedMileageUnit?: DistanceUnit | null;
  vin?: string | null;
  mileage?: string | number | null;
  mileageUnit?: DistanceUnit | null;
  offerCurrency?: OfferCurrency;
  locale?: string;
  valuationMarket?: string | null;
  marketContext?: MarketContext;
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
  vehicle?: {
    vin?: string | null;
    mileage?: string | number | null;
    mileageUnit?: DistanceUnit | null;
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
  } | null;
};

type IntakeErrorBody = {
  error?: string;
  missingPhotoSteps?: string[];
  receivedPhotoSteps?: string[];
  receivedKeys?: string[];
};

const captureSteps: CaptureStep[] = [
  {
    key: "front",
    label: "Front of vehicle",
    shortLabel: "Front",
    help: "Center the full front of the vehicle.",
    coaching: "Stand 6–10 feet back. Keep the bumper and headlights visible.",
    image: "/images/vehicle_scan_01.png",
  },
  {
    key: "driverSide",
    label: "Driver side",
    shortLabel: "Side",
    help: "Capture the entire driver side.",
    coaching: "Move far enough back to see both wheels, doors, and bumpers.",
    image: "/images/vehicle_scan_02.png",
  },
  {
    key: "rear",
    label: "Rear of vehicle",
    shortLabel: "Rear",
    help: "Center the full rear view.",
    coaching: "Include the bumper, tailgate or trunk, and both rear corners.",
    image: "/images/vehicle_scan_03.png",
  },
  {
    key: "odometer",
    label: "Odometer",
    shortLabel: "Odo.",
    help: "Capture the mileage clearly.",
    coaching: "Turn the vehicle on if needed and avoid glare on the dash display.",
    image: "/images/vehicle_scan_04.png",
  },
  {
    key: "vin",
    label: "VIN",
    shortLabel: "VIN",
    help: "Capture the VIN plate or door jamb sticker.",
    coaching: "Use the windshield VIN plate or driver door jamb label if clearer.",
    image: "/images/vehicle_scan_05.png",
  },
];

const dark = "#0f172a";
const muted = "#64748b";

function getValueCurrency(value: SolaceValue | null): OfferCurrency {
  return value?.marketContext?.currency || value?.offerCurrency || "USD";
}

function getValueLocale(value: SolaceValue | null) {
  return value?.marketContext?.locale || value?.locale || (getValueCurrency(value) === "CAD" ? "en-CA" : "en-US");
}

function getValueMileageUnit(value: SolaceValue | null): DistanceUnit {
  return (
    value?.marketContext?.distanceUnit ||
    value?.detectedMileageUnit ||
    value?.mileageUnit ||
    value?.vehicle?.mileageUnit ||
    "mi"
  );
}

function getValueMarket(value: SolaceValue | null) {
  return value?.marketContext?.valuationMarket || value?.valuationMarket || "";
}

function formatMoney(value: number | null | undefined, solaceValue?: SolaceValue | null) {
  if (!value) return "Pending dealer review";

  const currency = getValueCurrency(solaceValue || null);
  const locale = getValueLocale(solaceValue || null);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function cleanMileage(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

function displayMileage(value: string, unit: DistanceUnit = "mi", locale = "en-US") {
  const cleaned = cleanMileage(value);
  if (!cleaned) return value;

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(cleaned)} ${unit}`;
}

function emptyPhotos(): PhotoMap {
  return {
    front: null,
    driverSide: null,
    rear: null,
    odometer: null,
    vin: null,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    background: "white",
    color: dark,
    fontSize: 15,
    outline: "none",
  };
}

function getValueVin(value: SolaceValue | null) {
  return value?.detectedVin || value?.vin || value?.vehicle?.vin || "";
}

function getValueMileage(value: SolaceValue | null) {
  const raw =
    value?.detectedMileage ??
    value?.mileage ??
    value?.vehicle?.mileage ??
    "";

  return raw ? String(raw) : "";
}

function cleanVehiclePart(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function uniqueDisplayItems(values: Array<string | number | null | undefined>) {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    const cleaned = cleanVehiclePart(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      items.push(cleaned);
    }
  }

  return items;
}

function getValueVehicle(value: SolaceValue | null) {
  const year = cleanVehiclePart(value?.vehicleYear ?? value?.year ?? value?.vehicle?.year);
  const make = cleanVehiclePart(value?.vehicleMake ?? value?.make ?? value?.vehicle?.make);
  const model = cleanVehiclePart(value?.vehicleModel ?? value?.model ?? value?.vehicle?.model);
  const trim = cleanVehiclePart(value?.vehicleTrim ?? value?.trim ?? value?.vehicle?.trim);
  const bodyClass = cleanVehiclePart(value?.vehicleBodyClass ?? value?.vehicle?.bodyClass);
  const driveType = cleanVehiclePart(value?.vehicleDriveType ?? value?.vehicle?.driveType);
  const engine = cleanVehiclePart(value?.vehicleEngine ?? value?.vehicle?.engine);
  const fuelType = cleanVehiclePart(value?.vehicleFuelType ?? value?.vehicle?.fuelType);
  const doors = cleanVehiclePart(value?.vehicleDoors ?? value?.vehicle?.doors);
  const transmission = cleanVehiclePart(
    value?.vehicleTransmission ?? value?.vehicle?.transmission
  );
  const series = cleanVehiclePart(value?.vehicleSeries ?? value?.vehicle?.series);
  const options = uniqueDisplayItems([
    ...(value?.vehicleOptions || []),
    ...(value?.vehicle?.options || []),
    ...(value?.optionSignals || []),
  ]);

  return {
    year,
    make,
    model,
    trim,
    bodyClass,
    driveType,
    engine,
    fuelType,
    doors,
    transmission,
    series,
    options,
  };
}

function getValueVehicleLabel(value: SolaceValue | null) {
  const vehicle = getValueVehicle(value);
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatIntakeError(errorBody: IntakeErrorBody) {
  if (!errorBody.missingPhotoSteps?.length) {
    return errorBody.error || "Could not save vehicle scan.";
  }

  return [
    errorBody.error || "All five vehicle scan photos are required.",
    `Missing: ${errorBody.missingPhotoSteps.join(", ")}.`,
    errorBody.receivedPhotoSteps?.length
      ? `Received: ${errorBody.receivedPhotoSteps.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function TradeDesk({
  dealerSlug,
  mode = "customer",
  dealerName = "your dealer",
  brandColor = "#b91c1c",
  managerEmail = "",
  routingCcEmails = [],
}: TradeDeskProps) {
  const isInternal = mode === "internal";
  const red = brandColor || "#b91c1c";

  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [photos, setPhotos] = useState<PhotoMap>(() => emptyPhotos());
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [contact, setContact] = useState(managerEmail || "");
  const [salesperson, setSalesperson] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [dealNumber, setDealNumber] = useState("");
  const [managerNotes, setManagerNotes] = useState("");
  const [customerIntent, setCustomerIntent] = useState("");
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [value, setValue] = useState<SolaceValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentStep = captureSteps[stepIndex];
  const capturedCount = Object.values(photos).filter(Boolean).length;
  const photoProgress = Math.round((capturedCount / captureSteps.length) * 100);
  const scanComplete = captureSteps.every((step) => photos[step.key]);
  const showDetails = scanComplete;
  const detectedVin = vin.trim() || getValueVin(value);
  const detectedMileage = mileage.trim() || getValueMileage(value);
  const detectedMileageUnit = getValueMileageUnit(value);
  const detectedLocale = getValueLocale(value);
  const detectedCurrency = getValueCurrency(value);
  const detectedMarket = getValueMarket(value);
  const detectedVehicle = getValueVehicle(value);
  const detectedVehicleLabel = getValueVehicleLabel(value);
  const canRequestOffer = isInternal
    ? scanComplete &&
      !value &&
      customerName.trim().length > 0 &&
      dealNumber.trim().length > 0
    : scanComplete && !value;
  const canSubmitVehicleFile = isInternal
    ? Boolean(value) &&
      customerName.trim().length > 0 &&
      dealNumber.trim().length > 0 &&
      isValidEmail(contact)
    : Boolean(value) &&
      customerName.trim().length > 0 &&
      isValidEmail(contact) &&
      customerIntent.trim().length > 0;

  const missingPhotoLabels = useMemo(() => {
    return captureSteps
      .filter((step) => !photos[step.key])
      .map((step) => step.shortLabel);
  }, [photos]);

  const nextMissing = missingPhotoLabels[0]
    ? `${missingPhotoLabels[0]} photo`
    : "";

  function openCameraOrFilePicker() {
    setStarted(true);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setStarted(true);
    setPhotos((previous) => ({ ...previous, [currentStep.key]: file }));
    setValue(null);
    setCustomerIntent("");
    setIntakeId(null);
    setErrorMessage("");
    setStatusMessage("");
    setVin("");
    setMileage("");

    if (stepIndex < captureSteps.length - 1) {
      setStepIndex((index) => index + 1);
    }

    event.target.value = "";
  }

  function appendEvidencePhotos(formData: FormData) {
    for (const step of captureSteps) {
      const file = photos[step.key];

      if (!file) {
        throw new Error(`Missing ${step.shortLabel} photo.`);
      }

      // Exact backend contract:
      // front, driverSide, rear, odometer, vin
      formData.append(step.key, file, file.name || `${step.key}.jpg`);
    }
  }

  async function createIntakeAndValue() {
    setErrorMessage("");
    setStatusMessage("");

    if (!scanComplete) {
      setErrorMessage(
        `Finish the vehicle scan first. Next needed: ${nextMissing}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("mode", mode);

      // Do not send manual VIN or mileage. The value route must derive them
      // from the uploaded VIN and odometer evidence.
      formData.append("customerName", isInternal ? customerName : "");
      formData.append("contact", "");
      formData.append("dealNumber", isInternal ? dealNumber : "");
      formData.append("salesperson", isInternal ? salesperson : "");
      formData.append(
        "managerNotes",
        isInternal
          ? [dealNumber ? `Deal #: ${dealNumber}` : "", managerNotes]
              .filter(Boolean)
              .join("\n")
          : ""
      );

      appendEvidencePhotos(formData);

      setStatusMessage("Saving vehicle scan...");
      const intakeResponse = await fetch(
        `/api/solacetrade/${dealerSlug}/intake`,
        {
          method: "POST",
          body: formData,
        }
      );

      const intakeJson = (await intakeResponse.json().catch(() => ({}))) as
        | IntakeErrorBody
        | { intakeId?: string };

      if (!intakeResponse.ok || !("intakeId" in intakeJson) || !intakeJson.intakeId) {
        throw new Error(formatIntakeError(intakeJson as IntakeErrorBody));
      }

      setIntakeId(intakeJson.intakeId);
      setStatusMessage(
        isInternal
          ? "Solace is reading the scan evidence and building the manager review packet..."
          : "Solace is reading the scan evidence and producing the instant cash offer..."
      );

      const valueResponse = await fetch(
        `/api/solacetrade/${dealerSlug}/value`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intakeId: intakeJson.intakeId }),
        }
      );

      const valueJson = await valueResponse.json().catch(() => ({}));
      if (!valueResponse.ok) {
        throw new Error(valueJson.error || "Could not produce cash offer.");
      }

      const nextValue = valueJson.value as SolaceValue;
      const nextVin = getValueVin(nextValue);
      const nextMileage = getValueMileage(nextValue);

      if (nextVin) setVin(nextVin.toUpperCase());
      if (nextMileage) setMileage(nextMileage);

      setValue(nextValue);
      setStatusMessage(isInternal ? "Manager review packet ready." : "Instant cash offer ready.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
      setStatusMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitVehicleFile() {
    setErrorMessage("");
    setStatusMessage("");

    if (!intakeId) {
      setErrorMessage(
        isInternal
          ? "Create the manager review packet before routing it."
          : "Create the instant cash offer before sending the vehicle file."
      );
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage(
        isInternal
          ? "Enter the customer name before routing the packet."
          : "Enter your name before sending the vehicle file."
      );
      return;
    }

    if (isInternal && !dealNumber.trim()) {
      setErrorMessage("Enter the deal number before routing the packet.");
      return;
    }

    if (!isValidEmail(contact)) {
      setErrorMessage(
        isInternal
          ? "Enter a valid used car manager email."
          : "Enter a valid email to receive your trade certificate."
      );
      return;
    }

    if (!isInternal && !customerIntent.trim()) {
      setErrorMessage("Choose what you want to do next before sending the vehicle file.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/solacetrade/${dealerSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeId,
          customerIntent: isInternal ? "manager_review" : customerIntent,
          contact,
          customerName,
          dealNumber: isInternal ? dealNumber : undefined,
          salesperson: isInternal ? salesperson : undefined,
          managerNotes: isInternal ? managerNotes : undefined,
          mode,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || "Could not send vehicle file.");
      }

      setStatusMessage(
        isInternal
          ? json.emailed
            ? `Manager review packet routed to ${contact.trim()}.`
            : "Manager review packet saved. Email is disabled until RESEND_API_KEY is active."
          : json.emailed
            ? `Trade certificate sent to ${contact.trim()}.`
            : "Trade certificate saved. Email is disabled until RESEND_API_KEY is active."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetScan() {
    setStarted(false);
    setStepIndex(0);
    setPhotos(emptyPhotos());
    setVin("");
    setMileage("");
    setContact(managerEmail || "");
    setSalesperson("");
    setCustomerName("");
    setDealNumber("");
    setManagerNotes("");
    setCustomerIntent("");
    setIntakeId(null);
    setValue(null);
    setStatusMessage("");
    setErrorMessage("");
  }

  return (
    <section
      style={{
        width: "100%",
        border: "1px solid rgba(148,163,184,0.28)",
        borderRadius: 22,
        background: "rgba(255,255,255,0.98)",
        boxShadow: "0 18px 52px rgba(15,23,42,0.11)",
        overflow: "hidden",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhoto}
        style={{ display: "none" }}
      />

      <div
        style={{
          padding: "10px 12px 9px",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.09)",
              border: "1px solid rgba(255,255,255,0.13)",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: isInternal ? "#38bdf8" : red,
              }}
            />
            {isInternal ? "Manager Packet" : "Instant Offer Scan"}
          </div>
          <strong style={{ fontSize: 11, opacity: 0.86 }}>
            {capturedCount > 0 ? "Building offer…" : "Ready"}
          </strong>
        </div>

        <h2
          style={{
            margin: "8px 0 4px",
            fontSize: "clamp(19px, 3vw, 24px)",
            lineHeight: 1.04,
            letterSpacing: "-0.045em",
          }}
        >
          {started ? currentStep.label : "Scan your vehicle to get your real offer."}
        </h2>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.76)",
            fontSize: 12,
            lineHeight: 1.32,
          }}
        >
          {started
            ? currentStep.coaching
            : "Takes about 30 seconds. Your offer builds as you scan."}
        </p>

        <div
          style={{
            height: 5,
            marginTop: 9,
            borderRadius: 999,
            background: "rgba(255,255,255,0.14)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${photoProgress}%`,
              height: "100%",
              borderRadius: 999,
              background: isInternal ? "#38bdf8" : red,
              transition: "width 220ms ease",
            }}
          />
        </div>
      </div>

      <div style={{ padding: "10px 12px 8px" }}>
        <button
          type="button"
          onClick={openCameraOrFilePicker}
          style={{
            position: "relative",
            width: "100%",
            minHeight: 154,
            border: "none",
            borderRadius: 22,
            overflow: "hidden",
            cursor: "pointer",
            background: "#020617",
            padding: 0,
            textAlign: "left",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          <img
            src={currentStep.image}
            alt={`${currentStep.label} guide`}
            style={{
              width: "100%",
              height: 154,
              display: "block",
              objectFit: "cover",
              filter: "brightness(0.66) saturate(1.05)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(2,6,23,0.48), rgba(2,6,23,0.04) 44%, rgba(2,6,23,0.72))",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "12% 10% 18%",
              border: "2px dashed rgba(255,255,255,0.50)",
              borderRadius: 22,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 42,
              height: 42,
              marginLeft: -21,
              marginTop: -21,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.94)",
              display: "grid",
              placeItems: "center",
              color: dark,
              fontSize: 24,
              fontWeight: 900,
              boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
            }}
          >
            +
          </div>
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 10,
              color: "white",
            }}
          >
            <strong style={{ display: "block", fontSize: 14 }}>
              {currentStep.help}
            </strong>
            <span
              style={{
                display: "block",
                marginTop: 2,
                fontSize: 11,
                opacity: 0.84,
              }}
            >
              Tap to scan this view.
            </span>
          </div>
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 6,
            marginTop: 8,
          }}
        >
          {captureSteps.map((step, index) => {
            const active = stepIndex === index;
            const done = Boolean(photos[step.key]);
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => {
                  setStarted(true);
                  setStepIndex(index);
                }}
                style={{
                  minHeight: 32,
                  borderRadius: 11,
                  border: active
                    ? `2px solid ${isInternal ? "#0284c7" : red}`
                    : "1px solid #e2e8f0",
                  background: done ? "#ecfdf5" : "white",
                  color: done ? "#047857" : dark,
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {done ? "✓ " : ""}
                {step.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "0 12px 12px" }}>
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 12,
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "flex-start",
              marginBottom: showDetails ? 12 : 0,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {showDetails
                  ? "Ready to get your real offer"
                  : "Start your scan"}
              </h3>
              <p
                style={{
                  margin: "4px 0 0",
                  color: muted,
                  fontSize: 13,
                  lineHeight: 1.35,
                }}
              >
                {showDetails
                  ? "Your scan is complete. Get the offer now."
                  : capturedCount === 0
                    ? "Tap below to begin."
                    : "Keep scanning — your offer is updating."}
              </p>
            </div>
            <div
              style={{
                minWidth: 68,
                textAlign: "right",
                color: scanComplete ? "#047857" : red,
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              {scanComplete
                ? "Ready"
                : capturedCount === 0
                  ? "Start"
                  : `${captureSteps.length - capturedCount} left`}
            </div>
          </div>

          {showDetails && (
            <div
              style={{
                padding: 12,
                borderRadius: 16,
                background: "white",
                border: "1px solid #e2e8f0",
              }}
            >
              <strong style={{ display: "block", fontSize: 13, color: dark }}>
                Vehicle details from the scan
              </strong>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: muted }}>
                VIN and mileage are read from the VIN and odometer photos.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    padding: 10,
                    borderRadius: 13,
                    background: "#f8fafc",
                    fontSize: 13,
                  }}
                >
                  <strong>VIN</strong>
                  <br />
                  <span style={{ color: detectedVin ? dark : muted }}>
                    {detectedVin || "Will be detected from scan"}
                  </span>
                </div>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 13,
                    background: "#f8fafc",
                    fontSize: 13,
                  }}
                >
                  <strong>Mileage</strong>
                  <br />
                  <span style={{ color: detectedMileage ? dark : muted }}>
                    {detectedMileage
                      ? displayMileage(detectedMileage, detectedMileageUnit, detectedLocale)
                      : "Will be detected from scan"}
                  </span>
                </div>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 13,
                    background: "#f8fafc",
                    fontSize: 13,
                  }}
                >
                  <strong>Vehicle</strong>
                  <br />
                  <span style={{ color: detectedVehicleLabel ? dark : muted }}>
                    {detectedVehicleLabel || "Will be decoded after VIN scan"}
                  </span>
                </div>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 13,
                    background: "#f8fafc",
                    fontSize: 13,
                  }}
                >
                  <strong>Trim / options</strong>
                  <br />
                  <span
                    style={{
                      color:
                        detectedVehicle.trim || detectedVehicle.options.length
                          ? dark
                          : muted,
                    }}
                  >
                    {detectedVehicle.trim ||
                      detectedVehicle.options.slice(0, 3).join(" · ") ||
                      "Will be refined from VIN and visible option signals"}
                  </span>
                </div>
                <div
                  style={{
                    padding: 10,
                    borderRadius: 13,
                    background: "#f8fafc",
                    fontSize: 13,
                  }}
                >
                  <strong>Market</strong>
                  <br />
                  <span style={{ color: detectedMarket ? dark : muted }}>
                    {detectedMarket || `Local ${detectedCurrency} market`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isInternal && showDetails && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 9,
                  marginTop: 10,
                }}
              >
                <input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  style={inputStyle()}
                />
                <input
                  placeholder="Deal number"
                  value={dealNumber}
                  onChange={(event) => setDealNumber(event.target.value)}
                  style={inputStyle()}
                />
                <input
                  placeholder="Salesperson"
                  value={salesperson}
                  onChange={(event) => setSalesperson(event.target.value)}
                  style={inputStyle()}
                />
              </div>
              <textarea
                placeholder="Internal notes for used car manager"
                value={managerNotes}
                onChange={(event) => setManagerNotes(event.target.value)}
                rows={4}
                style={{ ...inputStyle(), marginTop: 9, resize: "vertical" }}
              />
            </>
          )}

          {!value && (
            <button
              type="button"
              disabled={submitting || !canRequestOffer}
              onClick={createIntakeAndValue}
              style={{
                width: "100%",
                marginTop: showDetails ? 10 : 11,
                padding: 13,
                border: "none",
                borderRadius: 16,
                background: isInternal ? dark : red,
                color: "white",
                fontSize: 15,
                fontWeight: 900,
                cursor: submitting
                  ? "wait"
                  : !canRequestOffer
                    ? "not-allowed"
                    : "pointer",
                opacity: submitting ? 0.72 : !canRequestOffer ? 0.62 : 1,
                boxShadow: isInternal
                  ? "0 16px 32px rgba(15,23,42,0.18)"
                  : "0 16px 32px rgba(185,28,28,0.22)",
              }}
            >
              {submitting
                ? "Working..."
                : canRequestOffer
                  ? isInternal
                    ? "Create Manager Review Packet"
                    : "Get My Real Offer"
                  : isInternal && scanComplete && (!customerName.trim() || !dealNumber.trim())
                    ? "Add customer name and deal number"
                    : capturedCount === 0
                      ? "Start Scan"
                      : "Continue Scan"}
            </button>
          )}
        </div>

        {(statusMessage || errorMessage) && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 16,
              background: errorMessage ? "#fef2f2" : "#f0fdf4",
              color: errorMessage ? "#991b1b" : "#166534",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {errorMessage || statusMessage}
          </div>
        )}

        {value && (
          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: 22,
              border: "1px solid #e2e8f0",
              background: "white",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 999,
                background: "#f1f5f9",
                color: dark,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: red,
                }}
              />
              {isInternal ? "Manager Packet" : "Solace Response"}
            </div>

            <strong
              style={{
                display: "block",
                fontSize: 24,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
              }}
            >
              {isInternal
                ? "Used Car Manager Review Packet"
                : value.title ||
                  `Instant cash offer: ${formatMoney(value.offerAmount, value)}`}
            </strong>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isInternal
                  ? "repeat(5, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 8,
                marginTop: 12,
              }}
            >
              {!isInternal && (
                <span
                  style={{
                    padding: 10,
                    borderRadius: 13,
                    background: "#f8fafc",
                    fontSize: 12,
                  }}
                >
                  <strong>Offer</strong>
                  <br />
                  {formatMoney(value.offerAmount, value)}
                </span>
              )}
              {isInternal && (
                <>
                  <span
                    style={{
                      padding: 10,
                      borderRadius: 13,
                      background: "#f8fafc",
                      fontSize: 12,
                    }}
                  >
                    <strong>Customer</strong>
                    <br />
                    {customerName || "Required"}
                  </span>
                  <span
                    style={{
                      padding: 10,
                      borderRadius: 13,
                      background: "#f8fafc",
                      fontSize: 12,
                    }}
                  >
                    <strong>Deal #</strong>
                    <br />
                    {dealNumber || "Required"}
                  </span>
                </>
              )}
              <span
                style={{
                  padding: 10,
                  borderRadius: 13,
                  background: "#f8fafc",
                  fontSize: 12,
                }}
              >
                <strong>State</strong>
                <br />
                {value.admissibility}
              </span>
              <span
                style={{
                  padding: 10,
                  borderRadius: 13,
                  background: "#f8fafc",
                  fontSize: 12,
                }}
              >
                <strong>Market</strong>
                <br />
                {getValueCurrency(value)} / {getValueMileageUnit(value)}
              </span>
              <span
                style={{
                  padding: 10,
                  borderRadius: 13,
                  background: "#f8fafc",
                  fontSize: 12,
                }}
              >
                <strong>Photos</strong>
                <br />
                {capturedCount}/5
              </span>
            </div>

            {detectedVehicleLabel && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 16,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              >
                <strong style={{ display: "block", marginBottom: 6 }}>
                  Vehicle decoded from VIN
                </strong>
                <div style={{ color: dark, fontWeight: 900 }}>
                  {detectedVehicleLabel}
                </div>
                <div style={{ marginTop: 7, color: muted, lineHeight: 1.45 }}>
                  Year: {detectedVehicle.year || "Pending"} · Make:{" "}
                  {detectedVehicle.make || "Pending"} · Model:{" "}
                  {detectedVehicle.model || "Pending"}
                  {detectedVehicle.trim ? ` · Trim: ${detectedVehicle.trim}` : ""}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {[
                    ["Body", detectedVehicle.bodyClass],
                    ["Drive", detectedVehicle.driveType],
                    ["Engine", detectedVehicle.engine],
                    ["Fuel", detectedVehicle.fuelType],
                    ["Doors", detectedVehicle.doors],
                    ["Trans.", detectedVehicle.transmission],
                  ]
                    .filter(([, item]) => Boolean(item))
                    .map(([label, item]) => (
                      <span
                        key={label}
                        style={{
                          padding: 8,
                          borderRadius: 12,
                          background: "white",
                          border: "1px solid #e2e8f0",
                          color: "#334155",
                        }}
                      >
                        <strong>{label}</strong>
                        <br />
                        {item}
                      </span>
                    ))}
                </div>

                {detectedVehicle.options.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      Configuration / option signals
                    </strong>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 7,
                      }}
                    >
                      {detectedVehicle.options.slice(0, 10).map((option) => (
                        <span
                          key={option}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 999,
                            background: "white",
                            border: "1px solid #e2e8f0",
                            color: "#334155",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {option}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(value.summaryLines || []).map((line) => (
              <p
                key={line}
                style={{
                  margin: "10px 0 0",
                  color: "#334155",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {line}
              </p>
            ))}

            {!isInternal && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 18,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong style={{ display: "block", fontSize: 15, marginBottom: 9 }}>
                  What would you like to do next?
                </strong>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  ["trade", "Trade it"],
                  ["sell", "Sell it"],
                  ["talk", "Talk to someone"],
                ].map(([intentValue, label]) => (
                  <button
                    key={intentValue}
                    type="button"
                    onClick={() => setCustomerIntent(intentValue)}
                    style={{
                      padding: "11px 8px",
                      borderRadius: 14,
                      border:
                        customerIntent === intentValue
                          ? `2px solid ${red}`
                          : "1px solid #cbd5e1",
                      background:
                        customerIntent === intentValue ? "#fee2e2" : "white",
                      color:
                        customerIntent === intentValue ? "#991b1b" : dark,
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            )}

            {!isInternal && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 18,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong style={{ display: "block", fontSize: 15 }}>
                  Where should we send your offer certificate?
                </strong>
                <p style={{ margin: "4px 0 10px", color: muted, fontSize: 13 }}>
                  We’ll send your certificate and keep it tied to this vehicle file.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 9,
                  }}
                >
                  <input
                    placeholder="Name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    style={inputStyle()}
                  />
                  <input
                    placeholder="Email address"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    style={inputStyle()}
                  />
                </div>
              </div>
            )}

            {isInternal && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 18,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong style={{ display: "block", fontSize: 15 }}>
                  Route packet for manager approval
                </strong>
                <p style={{ margin: "4px 0 10px", color: muted, fontSize: 13 }}>
                  Confirm the customer and deal number. Manager routing is loaded from the dealer admin record.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 9,
                  }}
                >
                  <input
                    placeholder="Customer name"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    style={inputStyle()}
                  />
                  <input
                    placeholder="Deal number"
                    value={dealNumber}
                    onChange={(event) => setDealNumber(event.target.value)}
                    style={inputStyle()}
                  />
                  {managerEmail ? (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 15,
                        background: "white",
                        border: "1px solid #e2e8f0",
                        color: dark,
                        fontSize: 13,
                      }}
                    >
                      <strong style={{ display: "block" }}>Used car manager routing</strong>
                      <span style={{ display: "block", marginTop: 4, color: muted }}>
                        Primary: {managerEmail}
                      </span>
                      {routingCcEmails.length > 0 ? (
                        <span style={{ display: "block", marginTop: 4, color: muted }}>
                          CC: {routingCcEmails.join(", ")}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <input
                      placeholder="Used car manager email"
                      value={contact}
                      onChange={(event) => setContact(event.target.value)}
                      style={inputStyle()}
                    />
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={submitting || !canSubmitVehicleFile}
              onClick={submitVehicleFile}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 14,
                borderRadius: 15,
                border: "none",
                background: dark,
                color: "white",
                fontSize: 15,
                fontWeight: 900,
                cursor:
                  submitting || !canSubmitVehicleFile
                    ? "not-allowed"
                    : "pointer",
                opacity: submitting || !canSubmitVehicleFile ? 0.62 : 1,
              }}
            >
              {isInternal
                ? canSubmitVehicleFile
                  ? "Route to Used Car Manager"
                  : "Add customer, deal #, and manager email"
                : canSubmitVehicleFile
                  ? "Send my offer certificate"
                  : "Add name, email, and next step"}
            </button>

            <button
              type="button"
              onClick={resetScan}
              style={{
                width: "100%",
                marginTop: 8,
                padding: 12,
                borderRadius: 15,
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#334155",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
