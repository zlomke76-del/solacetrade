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
  key: string;
  label: string;
  shortLabel: string;
  help: string;
  coaching: string;
  image: string;
};

type PhotoMap = Record<string, File | null>;

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
  vehicle?: {
    vin?: string | null;
    mileage?: string | number | null;
  } | null;
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
  if (!cleaned) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(cleaned);
}

function emptyPhotos(): PhotoMap {
  return Object.fromEntries(captureSteps.map((step) => [step.key, null]));
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
  const raw = value?.detectedMileage ?? value?.mileage ?? value?.vehicle?.mileage ?? "";
  return raw ? String(raw) : "";
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
  const capturedCount = Object.values(photos).filter((file) => file instanceof File && file.size > 0).length;
  const photoProgress = Math.round((capturedCount / captureSteps.length) * 100);
  const scanComplete = capturedCount === captureSteps.length;
  const showDetails = scanComplete;
  const canRequestOffer = scanComplete && customerName.trim().length > 0;

  const missingItems = useMemo(() => {
    const missing: string[] = [];
    captureSteps.forEach((step) => {
      const file = photos[step.key];
      if (!(file instanceof File) || file.size <= 0) missing.push(`${step.shortLabel} photo`);
    });
    if (scanComplete && !customerName.trim()) missing.push("name");
    return missing;
  }, [scanComplete, customerName, photos]);

  const nextMissingPhoto = captureSteps.find((step) => {
    const file = photos[step.key];
    return !(file instanceof File) || file.size <= 0;
  });
  const nextMissing = scanComplete ? missingItems[0] : `${nextMissingPhoto?.shortLabel || "next"} photo`;
  const detectedVin = vin.trim() || getValueVin(value);
  const detectedMileage = mileage.trim() || getValueMileage(value);

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

    if (stepIndex < captureSteps.length - 1) {
      setStepIndex((index) => index + 1);
    }

    event.target.value = "";
  }

  async function createIntakeAndValue() {
    setErrorMessage("");
    setStatusMessage("");

    if (!scanComplete) {
      setErrorMessage(`Finish the five guided photos first. Next needed: ${nextMissing}.`);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Enter your name so Solace can prepare the offer file.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("contact", contact);
      formData.append("customerName", customerName);
      formData.append("salesperson", salesperson);
      formData.append("managerNotes", managerNotes);

      for (const step of captureSteps) {
        const file = photos[step.key];
        if (file instanceof File && file.size > 0) {
          formData.append(step.key, file, file.name || `${step.key}.jpg`);
        }
      }

      setStatusMessage("Saving vehicle scan...");
      const intakeResponse = await fetch(`/api/solacetrade/${dealerSlug}/intake`, {
        method: "POST",
        body: formData,
      });

      const intakeJson = await intakeResponse.json();
      if (!intakeResponse.ok) {
        throw new Error(intakeJson.error || "Could not save vehicle scan.");
      }

      setIntakeId(intakeJson.intakeId);
      setStatusMessage("Solace is reading the scan and producing the instant cash offer...");

      const valueResponse = await fetch(`/api/solacetrade/${dealerSlug}/value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId: intakeJson.intakeId }),
      });

      const valueJson = await valueResponse.json();
      if (!valueResponse.ok) {
        throw new Error(valueJson.error || "Could not produce cash offer.");
      }

      const nextValue = valueJson.value as SolaceValue;
      const nextVin = getValueVin(nextValue);
      const nextMileage = getValueMileage(nextValue);

      setVin(nextVin ? nextVin.toUpperCase() : "");
      setMileage(nextMileage || "");
      setValue(nextValue);
      setStatusMessage("Instant cash offer ready.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
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
          vin,
          mileage,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not send vehicle file.");

      setStatusMessage(
        json.emailed
          ? `Vehicle file sent to ${json.dealer.name}.`
          : "Vehicle file saved. Email is disabled until RESEND_API_KEY is active."
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
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
          background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))",
          color: "white",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
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
          <strong style={{ fontSize: 12, opacity: 0.86 }}>{capturedCount}/5 photos</strong>
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
        <p style={{ margin: 0, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 1.42 }}>
          {started
            ? currentStep.coaching
            : "Five guided photos first. Solace reads VIN and mileage from image evidence."}
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
              background: "linear-gradient(180deg, rgba(2,6,23,0.48), rgba(2,6,23,0.04) 44%, rgba(2,6,23,0.72))",
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
          <div style={{ position: "absolute", left: 15, right: 15, bottom: 13, color: "white" }}>
            <strong style={{ display: "block", fontSize: 16 }}>{currentStep.help}</strong>
            <span style={{ display: "block", marginTop: 4, fontSize: 12, opacity: 0.84 }}>
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
            const done = photos[step.key] instanceof File && (photos[step.key]?.size || 0) > 0;
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
                  border: active ? `2px solid ${isInternal ? "#0284c7" : red}` : "1px solid #e2e8f0",
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
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 21, padding: 14, background: "#f8fafc" }}>
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
                {showDetails ? "Tell us where to send the offer" : "Finish the photo sequence"}
              </h3>
              <p style={{ margin: "4px 0 0", color: muted, fontSize: 13, lineHeight: 1.35 }}>
                {showDetails
                  ? "VIN and mileage are read from the scan evidence. You only enter identity and contact."
                  : nextMissing
                    ? `Next needed: ${nextMissing}.`
                    : "Keep going."}
              </p>
            </div>
            <div
              style={{
                minWidth: 68,
                textAlign: "right",
                color: canRequestOffer ? "#047857" : red,
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              {canRequestOffer ? "Ready" : showDetails ? `${missingItems.length} left` : `${captureSteps.length - capturedCount} left`}
            </div>
          </div>

          {showDetails && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 9 }}>
              {isInternal && (
                <input
                  placeholder="Salesperson"
                  value={salesperson}
                  onChange={(event) => setSalesperson(event.target.value)}
                  style={inputStyle()}
                />
              )}
              <input
                placeholder={isInternal ? "Customer" : "Name"}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                style={inputStyle()}
              />
              <input
                placeholder="Phone or email"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                style={inputStyle()}
              />
            </div>
          )}

          {showDetails && (
            <div
              style={{
                marginTop: 10,
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
                VIN and mileage are read from the uploaded VIN and odometer photos. They cannot be manually entered.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 10 }}>
                <div style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 13 }}>
                  <strong>VIN</strong>
                  <br />
                  <span style={{ color: detectedVin ? dark : muted }}>{detectedVin || "Will be detected from scan"}</span>
                </div>
                <div style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 13 }}>
                  <strong>Mileage</strong>
                  <br />
                  <span style={{ color: detectedMileage ? dark : muted }}>
                    {detectedMileage ? displayMileage(detectedMileage) || detectedMileage : "Will be detected from scan"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isInternal && showDetails && (
            <textarea
              placeholder="Internal notes for used car manager"
              value={managerNotes}
              onChange={(event) => setManagerNotes(event.target.value)}
              rows={4}
              style={{ ...inputStyle(), marginTop: 9, resize: "vertical" }}
            />
          )}

          <button
            type="button"
            disabled={submitting}
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
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.72 : 1,
              boxShadow: isInternal ? "0 16px 32px rgba(15,23,42,0.18)" : "0 16px 32px rgba(185,28,28,0.22)",
            }}
          >
            {submitting
              ? "Working..."
              : canRequestOffer
                ? "Get My Instant Cash Offer"
                : showDetails
                  ? "Enter Name to Continue"
                  : "Continue Photo Scan"}
          </button>
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
              <span style={{ width: 7, height: 7, borderRadius: 999, background: red }} />
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
              {value.title || `Instant cash offer: ${formatMoney(value.offerAmount)}`}
            </strong>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
              <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}>
                <strong>Offer</strong>
                <br />
                {formatMoney(value.offerAmount)}
              </span>
              <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}>
                <strong>State</strong>
                <br />
                {value.admissibility}
              </span>
              <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}>
                <strong>Photos</strong>
                <br />
                {capturedCount}/5
              </span>
            </div>

            {(value.summaryLines || []).map((line) => (
              <p key={line} style={{ margin: "10px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.45 }}>
                {line}
              </p>
            ))}

            {(value.missingItems || []).length > 0 && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 16, background: "#fff7ed", color: "#9a3412", fontSize: 13, fontWeight: 800 }}>
                {value.missingItems.join(" · ")}
              </div>
            )}

            <div style={{ marginTop: 14, padding: 12, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <strong style={{ display: "block", fontSize: 15, marginBottom: 9 }}>What would you like to do next?</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
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
                      border: customerIntent === intentValue ? `2px solid ${red}` : "1px solid #cbd5e1",
                      background: customerIntent === intentValue ? "#fee2e2" : "white",
                      color: customerIntent === intentValue ? "#991b1b" : dark,
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

            <button
              type="button"
              disabled={submitting}
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
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.72 : 1,
              }}
            >
              {isInternal ? "Route to Used Car Manager" : customerIntent ? "Send My Vehicle File" : `Send to ${dealerName}`}
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
