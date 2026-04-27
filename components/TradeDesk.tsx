"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type TradeDeskMode = "customer" | "internal";

type TradeDeskProps = {
  dealerSlug: string;
  mode?: TradeDeskMode;
  dealerName?: string;
  brandColor?: string;
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
  vin?: string | null;
  mileage?: string | number | null;
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
    shortLabel: "Miles",
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

function formatMoney(value: number | null | undefined) {
  if (!value) return "Pending dealer review";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function cleanMileage(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

function displayMileage(value: string) {
  const cleaned = cleanMileage(value);
  if (!cleaned) return value;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(cleaned);
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

function hasContact(value: string) {
  return value.trim().length >= 7;
}

function formatIntakeError(errorBody: IntakeErrorBody) {
  if (!errorBody.missingPhotoSteps?.length) {
    return errorBody.error || "Could not save vehicle scan.";
  }

  return [
    errorBody.error || "All five guided vehicle photos are required.",
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
}: TradeDeskProps) {
  const isInternal = mode === "internal";
  const red = brandColor || "#b91c1c";

  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [photos, setPhotos] = useState<PhotoMap>(() => emptyPhotos());
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [contact, setContact] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [customerName, setCustomerName] = useState("");
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
  const detectedVehicle = getValueVehicle(value);
  const detectedVehicleLabel = getValueVehicleLabel(value);
  const canRequestOffer = scanComplete && !value;
  const canSubmitVehicleFile =
    Boolean(value) &&
    customerName.trim().length > 0 &&
    hasContact(contact) &&
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
        `Finish the five guided photos first. Next needed: ${nextMissing}.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("mode", mode);

      // Do not send manual VIN or mileage. The value route must derive them
      // from the uploaded VIN and odometer evidence.
      formData.append("customerName", "");
      formData.append("contact", "");
      formData.append("salesperson", isInternal ? salesperson : "");
      formData.append("managerNotes", isInternal ? managerNotes : "");

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
        "Solace is reading the scan evidence and producing the instant cash offer..."
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
      setStatusMessage("Instant cash offer ready.");
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
      setErrorMessage("Create the instant cash offer before sending the vehicle file.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Enter your name before sending the vehicle file.");
      return;
    }

    if (!hasContact(contact)) {
      setErrorMessage("Enter a phone number or email before sending the vehicle file.");
      return;
    }

    if (!customerIntent.trim()) {
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
          customerIntent,
          contact,
          customerName,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || "Could not send vehicle file.");
      }

      setStatusMessage(
        json.emailed
          ? `Vehicle file sent to ${json.dealer.name}.`
          : "Vehicle file saved. Email is disabled until RESEND_API_KEY is active."
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
    setContact("");
    setSalesperson("");
    setCustomerName("");
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
        borderRadius: 26,
        background: "rgba(255,255,255,0.98)",
        boxShadow: "0 24px 70px rgba(15,23,42,0.12)",
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
          padding: "16px 16px 13px",
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
            {isInternal ? "Manager Packet" : "Guided Vehicle Scan"}
          </div>
          <strong style={{ fontSize: 12, opacity: 0.86 }}>
            {capturedCount}/5 photos
          </strong>
        </div>

        <h2
          style={{
            margin: "12px 0 6px",
            fontSize: "clamp(21px, 4vw, 30px)",
            lineHeight: 1.04,
            letterSpacing: "-0.045em",
          }}
        >
          {started ? currentStep.label : "Capture the vehicle first."}
        </h2>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.76)",
            fontSize: 14,
            lineHeight: 1.42,
          }}
        >
          {started
            ? currentStep.coaching
            : "Five guided photos first. Solace reads the VIN and mileage from the scan evidence."}
        </p>

        <div
          style={{
            height: 7,
            marginTop: 14,
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

      <div style={{ padding: 14 }}>
        <button
          type="button"
          onClick={openCameraOrFilePicker}
          style={{
            position: "relative",
            width: "100%",
            minHeight: 236,
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
              height: 236,
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
              inset: "14% 10% 18%",
              border: "2px dashed rgba(255,255,255,0.50)",
              borderRadius: 22,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 52,
              height: 52,
              marginLeft: -26,
              marginTop: -26,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.94)",
              display: "grid",
              placeItems: "center",
              color: dark,
              fontSize: 29,
              fontWeight: 900,
              boxShadow: "0 18px 40px rgba(0,0,0,0.34)",
            }}
          >
            +
          </div>
          <div
            style={{
              position: "absolute",
              left: 15,
              right: 15,
              bottom: 13,
              color: "white",
            }}
          >
            <strong style={{ display: "block", fontSize: 16 }}>
              {currentStep.help}
            </strong>
            <span
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 12,
                opacity: 0.84,
              }}
            >
              Tap to capture or upload this view.
            </span>
          </div>
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 7,
            marginTop: 10,
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
                  minHeight: 40,
                  borderRadius: 13,
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

      <div style={{ padding: "0 14px 16px" }}>
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 21,
            padding: 14,
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
                  ? "Ready for Solace scan review"
                  : "Finish the photo sequence"}
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
                  ? "Solace will read the VIN and mileage from the photo evidence before asking what you want to do next."
                  : nextMissing
                    ? `Next needed: ${nextMissing}.`
                    : "Keep going."}
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
                Vehicle details from scan evidence
              </strong>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: muted }}>
                VIN and mileage are read from the uploaded VIN and odometer
                photos. They cannot be manually entered.
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
                      ? displayMileage(detectedMileage)
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
                marginTop: showDetails ? 11 : 13,
                padding: 15,
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
                  ? "Get My Instant Cash Offer"
                  : `Continue Photo Scan (${captureSteps.length - capturedCount} left)`}
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
              Solace Response
            </div>

            <strong
              style={{
                display: "block",
                fontSize: 24,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
              }}
            >
              {value.title ||
                `Instant cash offer: ${formatMoney(value.offerAmount)}`}
            </strong>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 8,
                marginTop: 12,
              }}
            >
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
                {formatMoney(value.offerAmount)}
              </span>
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
                  Where should we send your offer?
                </strong>
                <p style={{ margin: "4px 0 10px", color: muted, fontSize: 13 }}>
                  Enter your name and either a phone number or email.
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
                    placeholder="Phone number or email"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    style={inputStyle()}
                  />
                </div>
              </div>
            )}

            {isInternal && (
              <input
                placeholder="Manager email or routing contact"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                style={{ ...inputStyle(), marginTop: 12 }}
              />
            )}

            <button
              type="button"
              disabled={submitting || (!isInternal && !canSubmitVehicleFile)}
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
                  submitting || (!isInternal && !canSubmitVehicleFile)
                    ? "not-allowed"
                    : "pointer",
                opacity: submitting || (!isInternal && !canSubmitVehicleFile)
                  ? 0.62
                  : 1,
              }}
            >
              {isInternal
                ? "Route to Used Car Manager"
                : canSubmitVehicleFile
                  ? "Send to your dealer"
                  : "Add contact details to send"}
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
