"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type TradeDeskMode = "customer" | "internal";

type TradeDeskProps = {
  mode?: TradeDeskMode;
};

type CaptureStep = {
  key: string;
  label: string;
  help: string;
  requiredForOffer: boolean;
  image: string;
  shortLabel: string;
};

const captureSteps: CaptureStep[] = [
  {
    key: "front",
    label: "Front of vehicle",
    shortLabel: "Front",
    help: "Stand a few steps back. Capture the full front view, including bumper, grille, and headlights.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_01.png",
  },
  {
    key: "driverSide",
    label: "Driver side",
    shortLabel: "Driver side",
    help: "Capture the full driver side from bumper to bumper. Keep both wheels visible.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_02.png",
  },
  {
    key: "rear",
    label: "Rear of vehicle",
    shortLabel: "Rear",
    help: "Stand a few steps back. Capture the full rear view, including bumper and taillights.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_03.png",
  },
  {
    key: "odometer",
    label: "Odometer",
    shortLabel: "Odometer",
    help: "Capture the mileage clearly. Keep the display straight, sharp, and free of glare.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_04.png",
  },
  {
    key: "vin",
    label: "VIN",
    shortLabel: "VIN",
    help: "Capture the VIN clearly through the windshield or inside the door jamb. All characters should be readable.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_05.png",
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentStep = captureSteps[stepIndex];
  const capturedCount = Object.values(photos).filter(Boolean).length;
  const progress = Math.round((capturedCount / captureSteps.length) * 100);
  const mileageNumber = cleanMileage(mileage);
  const scanComplete = capturedCount >= captureSteps.length;

  const missingItems = useMemo(() => {
    const missing: string[] = [];
    if (!vin.trim()) missing.push("VIN");
    if (!mileageNumber) missing.push("mileage");
    for (const step of captureSteps) {
      if (!photos[step.key]) missing.push(`${step.shortLabel} photo`);
    }
    return missing;
  }, [vin, mileageNumber, photos]);

  const offerAdmissible = missingItems.length === 0;

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file || !currentStep) return;

    setStarted(true);
    setResult(null);

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
            ? "Core offer state is present: VIN, mileage, and all five guided photos."
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
          "Complete the guided capture to unlock a stronger preliminary cash offer.",
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
        "Core offer state verified: VIN, mileage, and all five guided photos are present.",
        "Open recall check: pending real NHTSA integration.",
        "Vehicle file ready for Brenham CDJR review.",
      ],
    });
  }

  function openCameraOrFilePicker() {
    if (!started) setStarted(true);

    window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
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

  function renderCapturePreview({ startMode = false }: { startMode?: boolean }) {
    const displayStep = startMode ? captureSteps[0] : currentStep;

    return (
      <label
        style={{
          position: "relative",
          display: "block",
          minHeight: startMode ? 230 : 250,
          borderRadius: 18,
          overflow: "hidden",
          cursor: "pointer",
          background: "#020617",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
        }}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handlePhoto}
          style={{ display: "none" }}
        />

        <img
          src={displayStep.image}
          alt={`${displayStep.label} capture reference`}
          style={{
            width: "100%",
            height: "100%",
            minHeight: startMode ? 230 : 250,
            display: "block",
            objectFit: "cover",
            filter: "brightness(0.72)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(2,6,23,0.36) 0%, rgba(2,6,23,0.08) 38%, rgba(2,6,23,0.60) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            color: "white",
          }}
        >
          <div
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.66)",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              backdropFilter: "blur(10px)",
            }}
          >
            {startMode ? "Guided vehicle scan" : `Step ${stepIndex + 1} of ${captureSteps.length}`}
          </div>

          <div
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.90)",
              color: "#0f172a",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {capturedCount}/{captureSteps.length} captured
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.93)",
              color: "#0f172a",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
              border: "1px solid rgba(255,255,255,0.75)",
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            +
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            bottom: 12,
            color: "white",
          }}
        >
          <strong style={{ display: "block", fontSize: 14 }}>
            {startMode ? "Start with the front photo" : displayStep.label}
          </strong>
          <span style={{ display: "block", marginTop: 4, fontSize: 12, opacity: 0.88 }}>
            {startMode
              ? "On desktop, this opens a file picker instead."
              : `Tap to capture the ${displayStep.label.toLowerCase()}.`}
          </span>
        </div>
      </label>
    );
  }

  return (
    <div
      style={{
        border: isInternal ? "1px solid rgba(255,255,255,0.16)" : "1px solid #ddd",
        borderRadius: 22,
        padding: 20,
        background: "white",
        boxShadow: isInternal
          ? "0 28px 80px rgba(0,0,0,0.34)"
          : "0 24px 70px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
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

        <h2 style={{ margin: "12px 0 7px", fontSize: 26, letterSpacing: "-0.035em" }}>
          {isInternal ? "Build the manager evaluation packet." : "Start your vehicle scan."}
        </h2>

        <p style={{ margin: 0, color: "#475569", fontSize: 15, lineHeight: 1.5 }}>
          {isInternal
            ? "Capture the vehicle once, preserve the state, and route a clean packet to the used car manager."
            : "Capture your vehicle. The rest is handled."}
        </p>
      </div>

      {!started ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            background: "#f8fafc",
          }}
        >
          {renderCapturePreview({ startMode: true })}

          <div style={{ padding: "12px 2px 0", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 5px", fontSize: 18 }}>
              {isInternal ? "Start sales-floor evaluation" : "Capture the first photo."}
            </h3>
            <p
              style={{
                margin: "0 auto 12px",
                maxWidth: 480,
                color: "#475569",
                lineHeight: 1.45,
                fontSize: 14,
              }}
            >
              {isInternal
                ? "Designed for consultants capturing a trade while the customer is at the dealership."
                : "Open the camera first. We’ll guide the vehicle file step by step."}
            </p>

            <button
              type="button"
              onClick={openCameraOrFilePicker}
              style={{
                width: "100%",
                padding: 13,
                background: isInternal ? "#0f172a" : "#b91c1c",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {isInternal ? "Start Internal Evaluation" : "Open Camera"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              height: 10,
              background: "#e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 16,
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
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                background: "#fff",
              }}
            >
              <div style={{ padding: "4px 4px 12px" }}>
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
                <p style={{ margin: 0, color: "#475569", lineHeight: 1.45 }}>{currentStep.help}</p>
              </div>

              {renderCapturePreview({ startMode: false })}
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
                    {step.shortLabel}
                  </strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {photos[step.key] ? "Captured" : "Required"}
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
