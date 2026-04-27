"use client";

import { ChangeEvent, useMemo, useState } from "react";

type TradeDeskMode = "customer" | "internal";

type TradeDeskProps = {
  mode?: TradeDeskMode;
};

type CaptureStep = {
  key: string;
  label: string;
  help: string;
  requiredForOffer: boolean;
};

const captureSteps: CaptureStep[] = [
  {
    key: "front",
    label: "Front of vehicle",
    help: "Stand a few steps back and capture the full front view.",
    requiredForOffer: true,
  },
  {
    key: "driverSide",
    label: "Driver side",
    help: "Capture the full driver side from bumper to bumper.",
    requiredForOffer: false,
  },
  {
    key: "rear",
    label: "Rear of vehicle",
    help: "Capture the full rear view including bumper and tailgate/trunk.",
    requiredForOffer: false,
  },
  {
    key: "interior",
    label: "Interior",
    help: "Capture the driver seat, dash, and general interior condition.",
    requiredForOffer: false,
  },
  {
    key: "odometer",
    label: "Odometer",
    help: "Capture the mileage clearly on the dash display.",
    requiredForOffer: true,
  },
  {
    key: "vin",
    label: "VIN",
    help: "Capture the VIN plate through the windshield or door jamb.",
    requiredForOffer: true,
  },
];

type PhotoMap = Record<string, File | null>;

type ResultState = {
  kind: "range" | "offer" | "packet";
  title: string;
  confidence: "Low" | "Medium" | "High";
  admissibility: "PASS" | "PARTIAL" | "FAIL";
  lines: string[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function cleanMileage(value: string) {
  return Number(value.replace(/[^\d]/g, ""));
}

function emptyPhotos(): PhotoMap {
  return Object.fromEntries(captureSteps.map((step) => [step.key, null]));
}

const fieldStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 10,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 15,
};

export default function TradeDesk({ mode = "customer" }: TradeDeskProps) {
  const isInternal = mode === "internal";
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [photos, setPhotos] = useState<PhotoMap>(() => emptyPhotos());
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("good");
  const [intent, setIntent] = useState("trade");
  const [contact, setContact] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [managerNotes, setManagerNotes] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);

  const currentStep = captureSteps[stepIndex];
  const capturedCount = Object.values(photos).filter(Boolean).length;
  const progress = Math.round((capturedCount / captureSteps.length) * 100);
  const mileageNumber = cleanMileage(mileage);
  const hasCorePhotos = Boolean(photos.front && photos.odometer && photos.vin);
  const scanComplete = capturedCount >= captureSteps.length;

  const missingItems = useMemo(() => {
    const missing: string[] = [];
    if (!vin.trim()) missing.push("VIN");
    if (!mileageNumber) missing.push("mileage");
    if (!photos.front) missing.push("front photo");
    if (!photos.odometer) missing.push("odometer photo");
    if (!photos.vin) missing.push("VIN photo");
    return missing;
  }, [vin, mileageNumber, photos]);

  const offerAdmissible = missingItems.length === 0;

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file || !currentStep) return;

    setPhotos((previous) => ({
      ...previous,
      [currentStep.key]: file,
    }));

    if (stepIndex < captureSteps.length - 1) {
      setStepIndex((index) => index + 1);
    }

    event.target.value = "";
  }

  function buildOfferFile() {
    if (isInternal) {
      setResult({
        kind: "packet",
        title: offerAdmissible
          ? "Manager Evaluation Packet Ready"
          : "Incomplete Evaluation Packet",
        confidence: offerAdmissible && scanComplete ? "High" : offerAdmissible ? "Medium" : "Low",
        admissibility: offerAdmissible ? "PASS" : "PARTIAL",
        lines: [
          offerAdmissible
            ? "Core offer state is present: VIN, mileage, front photo, odometer photo, and VIN photo."
            : `Missing state: ${missingItems.join(", ")}. Manager review can proceed, but the packet must be treated as incomplete.`,
          `Captured photos: ${capturedCount} of ${captureSteps.length}.`,
          `Intent: ${intent === "trade" ? "Trade toward purchase" : intent === "sell" ? "Sell vehicle" : "Value exploration"}.`,
          "Recall check: pending real NHTSA integration.",
          "Route target: Used Car Manager.",
        ],
      });
      return;
    }

    if (!offerAdmissible) {
      setResult({
        kind: "range",
        title: "Estimated Range: $17,000 – $22,500",
        confidence: "Low",
        admissibility: "PARTIAL",
        lines: [
          `Missing: ${missingItems.join(", ")}.`,
          "Add the missing items to unlock a stronger preliminary cash offer.",
          "Open recall check: pending VIN verification.",
        ],
      });
      return;
    }

    let base = 26500;
    base -= mileageNumber * 0.045;

    if (condition === "excellent") base += 1250;
    if (condition === "fair") base -= 2000;
    if (condition === "needs_work") base -= 4500;
    if (intent === "sell") base -= 500;
    if (scanComplete) base += 750;

    const offer = Math.max(7500, Math.round(base));

    setResult({
      kind: "offer",
      title: `Preliminary Cash Offer: ${formatMoney(offer)}`,
      confidence: scanComplete ? "High" : "Medium",
      admissibility: "PASS",
      lines: [
        "Core offer state verified: VIN, mileage, front photo, odometer photo, and VIN photo are present.",
        "Open recall check: pending real NHTSA integration.",
        "Vehicle file ready for Brenham CDJR review.",
      ],
    });
  }

  function resetScan() {
    setStarted(false);
    setStepIndex(0);
    setPhotos(emptyPhotos());
    setVin("");
    setMileage("");
    setCondition("good");
    setIntent("trade");
    setContact("");
    setSalesperson("");
    setCustomerName("");
    setManagerNotes("");
    setResult(null);
  }

  return (
    <div
      style={{
        border: isInternal ? "1px solid rgba(255,255,255,0.16)" : "1px solid #ddd",
        borderRadius: 22,
        padding: 24,
        background: "white",
        boxShadow: isInternal
          ? "0 28px 80px rgba(0,0,0,0.34)"
          : "0 24px 70px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            borderRadius: 999,
            background: isInternal ? "#e0f2fe" : "#fee2e2",
            color: isInternal ? "#075985" : "#991b1b",
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: isInternal ? "#0284c7" : "#dc2626",
            }}
          />
          {isInternal ? "Internal Manager Routing" : "Vehicle Scan Active"}
        </div>

        <h2 style={{ margin: "14px 0 8px", fontSize: 30, letterSpacing: "-0.035em" }}>
          {isInternal ? "Build the manager evaluation packet." : "Your car is the application."}
        </h2>

        <p style={{ margin: 0, color: "#475569", fontSize: 16, lineHeight: 1.55 }}>
          {isInternal
            ? "Capture the vehicle once, preserve the state, and route a clean packet to the used car manager."
            : "Stand near your vehicle. Take a few guided photos. TradeDesk by Solace builds the offer file for Brenham CDJR."}
        </p>
      </div>

      {!started ? (
        <div
          style={{
            padding: 24,
            border: "1px dashed #cbd5e1",
            borderRadius: 16,
            background: "#f8fafc",
            textAlign: "center",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            {isInternal ? "Start sales-floor evaluation" : "Start a 60-second vehicle scan"}
          </h3>
          <p style={{ color: "#475569", lineHeight: 1.55 }}>
            {isInternal
              ? "Designed for consultants capturing a trade while the customer is at the dealership."
              : "We’ll guide you through front, side, rear, interior, odometer, and VIN photos."}
          </p>

          <button
            type="button"
            onClick={() => setStarted(true)}
            style={{
              width: "100%",
              padding: 15,
              background: isInternal ? "#0f172a" : "#b91c1c",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {isInternal ? "Start Internal Evaluation" : "Start Vehicle Scan"}
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              height: 10,
              background: "#e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: isInternal ? "#0f172a" : "#b91c1c",
                transition: "width 250ms ease",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: 20,
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                background: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Step {stepIndex + 1} of {captureSteps.length}
                {currentStep.requiredForOffer ? " • Required for offer" : ""}
              </div>

              <h3 style={{ margin: "8px 0 6px", fontSize: 22 }}>{currentStep.label}</h3>

              <p style={{ margin: "0 0 16px", color: "#475569" }}>{currentStep.help}</p>

              <label
                style={{
                  display: "block",
                  padding: 28,
                  border: "2px dashed #cbd5e1",
                  borderRadius: 16,
                  background: "#f8fafc",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                  style={{ display: "none" }}
                />

                <div
                  style={{
                    width: 52,
                    height: 52,
                    margin: "0 auto 12px",
                    borderRadius: 999,
                    background: isInternal ? "#0f172a" : "#b91c1c",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 26,
                    fontWeight: 900,
                  }}
                >
                  +
                </div>

                <strong>Open camera</strong>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
                  Tap to take the {currentStep.label.toLowerCase()} photo.
                </p>
              </label>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {captureSteps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border:
                      stepIndex === index
                        ? `2px solid ${isInternal ? "#0f172a" : "#b91c1c"}`
                        : "1px solid #e2e8f0",
                    background: photos[step.key] ? "#ecfdf5" : "#ffffff",
                    color: photos[step.key] ? "#065f46" : "#0f172a",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <strong style={{ display: "block", fontSize: 13 }}>
                    {photos[step.key] ? "✓ " : ""}
                    {step.label}
                  </strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {photos[step.key]
                      ? "Captured"
                      : step.requiredForOffer
                        ? "Required"
                        : "Recommended"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: 18,
              marginTop: 10,
            }}
          >
            <h3 style={{ margin: "0 0 12px" }}>
              {isInternal ? "Complete evaluation packet" : "Finish vehicle file"}
            </h3>

            {isInternal && (
              <>
                <input
                  placeholder="Salesperson name"
                  value={salesperson}
                  onChange={(event) => setSalesperson(event.target.value)}
                  style={fieldStyle}
                />

                <input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  style={fieldStyle}
                />
              </>
            )}

            <input
              placeholder="VIN"
              value={vin}
              onChange={(event) => setVin(event.target.value.toUpperCase())}
              style={fieldStyle}
            />

            <input
              placeholder="Mileage"
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
              inputMode="numeric"
              style={fieldStyle}
            />

            <select
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              style={fieldStyle}
            >
              <option value="excellent">Excellent condition</option>
              <option value="good">Good condition</option>
              <option value="fair">Fair condition</option>
              <option value="needs_work">Needs work</option>
            </select>

            <select
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              style={fieldStyle}
            >
              <option value="trade">Trade toward another vehicle</option>
              <option value="sell">Sell my vehicle</option>
              <option value="checking">Just checking value</option>
            </select>

            {isInternal && (
              <textarea
                placeholder="Internal notes for used car manager"
                value={managerNotes}
                onChange={(event) => setManagerNotes(event.target.value)}
                rows={4}
                style={{ ...fieldStyle, resize: "vertical" }}
              />
            )}

            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: offerAdmissible ? "#ecfdf5" : "#fff7ed",
                border: offerAdmissible ? "1px solid #bbf7d0" : "1px solid #fed7aa",
                color: offerAdmissible ? "#065f46" : "#9a3412",
                marginBottom: 12,
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.45,
              }}
            >
              {offerAdmissible
                ? "Admissibility PASS: offer state is complete."
                : `Range only until complete. Missing: ${missingItems.join(", ")}.`}
            </div>

            <button
              type="button"
              onClick={buildOfferFile}
              style={{
                width: "100%",
                padding: 14,
                background: isInternal ? "#0f172a" : "#b91c1c",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {isInternal ? "Build Manager Packet" : "Build My Offer File"}
            </button>
          </div>

          {result && (
            <div
              style={{
                marginTop: 20,
                padding: 20,
                background: "#f8fafc",
                borderRadius: 16,
                border: "1px solid #e2e8f0",
              }}
            >
              <strong style={{ fontSize: 20, display: "block" }}>{result.title}</strong>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <span style={{ padding: 10, borderRadius: 10, background: "white", fontSize: 12 }}>
                  <strong>Confidence</strong>
                  <br />
                  {result.confidence}
                </span>
                <span style={{ padding: 10, borderRadius: 10, background: "white", fontSize: 12 }}>
                  <strong>Admissibility</strong>
                  <br />
                  {result.admissibility}
                </span>
                <span style={{ padding: 10, borderRadius: 10, background: "white", fontSize: 12 }}>
                  <strong>Photos</strong>
                  <br />
                  {capturedCount}/{captureSteps.length}
                </span>
              </div>

              {result.lines.map((line) => (
                <p key={line} style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.5 }}>
                  {line}
                </p>
              ))}

              {isInternal && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "white",
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    color: "#334155",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Internal packet context</strong>
                  <br />
                  Salesperson: {salesperson || "Not entered"}
                  <br />
                  Customer: {customerName || "Not entered"}
                  <br />
                  Notes: {managerNotes || "None"}
                </div>
              )}

              <p style={{ fontSize: 13, marginTop: 12, color: "#64748b", lineHeight: 1.5 }}>
                Subject to final inspection, title verification, recall status, payoff
                confirmation, market conditions, and condition match.
              </p>

              <input
                placeholder={isInternal ? "Manager email or routing contact" : "Phone or email"}
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                style={fieldStyle}
              />

              <button
                type="button"
                style={{
                  width: "100%",
                  marginTop: 2,
                  padding: 14,
                  background: "#111827",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {isInternal ? "Route to Used Car Manager" : "Send to Brenham CDJR"}
              </button>

              <button
                type="button"
                onClick={resetScan}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: 12,
                  background: "transparent",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Start over
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
