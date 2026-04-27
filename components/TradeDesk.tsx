"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type TradeDeskMode = "customer" | "internal";

type TradeDeskProps = {
  mode?: TradeDeskMode;
};

type CaptureStep = {
  key: string;
  label: string;
  shortLabel: string;
  help: string;
  requiredForOffer: boolean;
  image: string;
};

const captureSteps: CaptureStep[] = [
  {
    key: "front",
    label: "Front of vehicle",
    shortLabel: "Front",
    help: "Stand a few steps back. Capture the full front view.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_01.png",
  },
  {
    key: "driverSide",
    label: "Driver side",
    shortLabel: "Side",
    help: "Capture the full driver side from bumper to bumper.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_02.png",
  },
  {
    key: "rear",
    label: "Rear of vehicle",
    shortLabel: "Rear",
    help: "Capture the full rear view including bumper and tailgate/trunk.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_03.png",
  },
  {
    key: "odometer",
    label: "Odometer",
    shortLabel: "Miles",
    help: "Capture the mileage clearly on the dash display.",
    requiredForOffer: true,
    image: "/images/vehicle_scan_04.png",
  },
  {
    key: "vin",
    label: "VIN",
    shortLabel: "VIN",
    help: "Capture the VIN plate through the windshield or door jamb.",
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
  marginBottom: 9,
  borderRadius: 11,
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
    captureSteps.forEach((step) => {
      if (!photos[step.key]) missing.push(`${step.shortLabel} photo`);
    });
    return missing;
  }, [vin, mileageNumber, photos]);

  const offerAdmissible = missingItems.length === 0;

  function openCameraOrFilePicker() {
    setStarted(true);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file || !currentStep) return;

    setStarted(true);
    setPhotos((previous) => ({ ...previous, [currentStep.key]: file }));

    if (stepIndex < captureSteps.length - 1) {
      setStepIndex((index) => index + 1);
    }

    event.target.value = "";
  }

  function buildOfferFile() {
    if (isInternal) {
      setResult({
        kind: "packet",
        title: offerAdmissible ? "Manager Packet Ready" : "Packet Incomplete",
        confidence: offerAdmissible && scanComplete ? "High" : offerAdmissible ? "Medium" : "Low",
        admissibility: offerAdmissible ? "PASS" : "PARTIAL",
        lines: [
          offerAdmissible
            ? "Core offer state is present."
            : `Missing state: ${missingItems.join(", ")}.`,
          `Captured photos: ${capturedCount} of ${captureSteps.length}.`,
          `Intent: ${intent === "trade" ? "Trade" : intent === "sell" ? "Sell" : "Checking value"}.`,
          "Recall check: pending real NHTSA integration.",
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
          "Complete the file to unlock a stronger preliminary offer.",
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

    setResult({
      kind: "offer",
      title: `Preliminary Cash Offer: ${formatMoney(Math.max(7500, Math.round(base)))}`,
      confidence: scanComplete ? "High" : "Medium",
      admissibility: "PASS",
      lines: [
        "Core offer state verified.",
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

  function renderCaptureSurface() {
    return (
      <button
        type="button"
        onClick={openCameraOrFilePicker}
        style={{
          position: "relative",
          width: "100%",
          minHeight: 215,
          border: "none",
          borderRadius: 16,
          overflow: "hidden",
          cursor: "pointer",
          padding: 0,
          background: "#020617",
          textAlign: "left",
        }}
      >
        <img
          src={currentStep.image}
          alt={`${currentStep.label} guide`}
          style={{
            width: "100%",
            height: 215,
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
              "linear-gradient(180deg, rgba(2,6,23,0.40) 0%, rgba(2,6,23,0.08) 44%, rgba(2,6,23,0.62) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            color: "white",
          }}
        >
          <span
            style={{
              padding: "6px 9px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.65)",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Step {stepIndex + 1} of {captureSteps.length}
          </span>

          <span
            style={{
              padding: "6px 9px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.9)",
              color: "#0f172a",
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {capturedCount}/{captureSteps.length}
          </span>
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
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.94)",
              color: "#0f172a",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 16px 34px rgba(0,0,0,0.34)",
              fontSize: 28,
              fontWeight: 900,
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
          <strong style={{ display: "block", fontSize: 14 }}>{currentStep.shortLabel}</strong>
          <span style={{ display: "block", marginTop: 3, fontSize: 12, opacity: 0.86 }}>
            Tap to capture. Desktop opens file picker.
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      style={{
        border: isInternal ? "1px solid rgba(255,255,255,0.16)" : "1px solid #ddd",
        borderRadius: 20,
        padding: 16,
        background: "white",
        boxShadow: isInternal
          ? "0 28px 80px rgba(0,0,0,0.34)"
          : "0 20px 54px rgba(0,0,0,0.10)",
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

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 10px",
            borderRadius: 999,
            background: isInternal ? "#e0f2fe" : "#fee2e2",
            color: isInternal ? "#075985" : "#991b1b",
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: isInternal ? "#0284c7" : "#dc2626",
            }}
          />
          {isInternal ? "Manager Routing" : "Vehicle Scan"}
        </div>

        <h2 style={{ margin: "10px 0 5px", fontSize: 24, letterSpacing: "-0.035em" }}>
          {isInternal ? "Build manager packet." : "Start your vehicle scan."}
        </h2>

        <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.45 }}>
          {isInternal
            ? "Capture once and route a clean packet."
            : "Match each guide photo. Capture your vehicle. The rest is handled."}
        </p>
      </div>

      <div
        style={{
          height: 8,
          background: "#e5e7eb",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 12,
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
          padding: 12,
          border: "1px solid #e2e8f0",
          borderRadius: 17,
          background: "#fff",
          marginBottom: 12,
        }}
      >
        <div style={{ padding: "0 2px 10px" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Step {stepIndex + 1} of {captureSteps.length} • Required
          </div>

          <h3 style={{ margin: "6px 0 4px", fontSize: 19 }}>{currentStep.label}</h3>
          <p style={{ margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.35 }}>
            {currentStep.help}
          </p>
        </div>

        {renderCaptureSurface()}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 6,
          marginBottom: 14,
        }}
      >
        {captureSteps.map((step, index) => (
          <button
            key={step.key}
            type="button"
            onClick={() => {
              setStarted(true);
              setStepIndex(index);
            }}
            style={{
              padding: "8px 4px",
              borderRadius: 10,
              border:
                stepIndex === index
                  ? `2px solid ${isInternal ? "#0f172a" : "#b91c1c"}`
                  : "1px solid #e2e8f0",
              background: photos[step.key] ? "#ecfdf5" : "#ffffff",
              color: photos[step.key] ? "#065f46" : "#0f172a",
              textAlign: "center",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 900,
              lineHeight: 1.15,
            }}
          >
            {photos[step.key] ? "✓ " : ""}
            {step.shortLabel}
          </button>
        ))}
      </div>

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: 14,
        }}
      >
        <h3 style={{ margin: "0 0 9px", fontSize: 18 }}>
          {isInternal ? "Complete packet" : "Finish vehicle file"}
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

        <select value={intent} onChange={(event) => setIntent(event.target.value)} style={fieldStyle}>
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
            padding: 10,
            borderRadius: 12,
            background: offerAdmissible ? "#ecfdf5" : "#fff7ed",
            border: offerAdmissible ? "1px solid #bbf7d0" : "1px solid #fed7aa",
            color: offerAdmissible ? "#065f46" : "#9a3412",
            marginBottom: 10,
            fontSize: 12,
            fontWeight: 800,
            lineHeight: 1.35,
          }}
        >
          {offerAdmissible
            ? "Ready: offer state is complete."
            : `Missing: ${missingItems.slice(0, 4).join(", ")}${missingItems.length > 4 ? "…" : ""}.`}
        </div>

        <button
          type="button"
          onClick={buildOfferFile}
          style={{
            width: "100%",
            padding: 13,
            background: isInternal ? "#0f172a" : "#b91c1c",
            color: "white",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
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
            marginTop: 16,
            padding: 16,
            background: "#f8fafc",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
          }}
        >
          <strong style={{ fontSize: 18, display: "block" }}>{result.title}</strong>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 7,
              marginTop: 10,
            }}
          >
            <span style={{ padding: 9, borderRadius: 10, background: "white", fontSize: 11 }}>
              <strong>Confidence</strong>
              <br />
              {result.confidence}
            </span>
            <span style={{ padding: 9, borderRadius: 10, background: "white", fontSize: 11 }}>
              <strong>State</strong>
              <br />
              {result.admissibility}
            </span>
            <span style={{ padding: 9, borderRadius: 10, background: "white", fontSize: 11 }}>
              <strong>Photos</strong>
              <br />
              {capturedCount}/{captureSteps.length}
            </span>
          </div>

          {result.lines.map((line) => (
            <p key={line} style={{ margin: "9px 0 0", color: "#334155", lineHeight: 1.45, fontSize: 13 }}>
              {line}
            </p>
          ))}

          {isInternal && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                background: "white",
                border: "1px solid #e2e8f0",
                fontSize: 12,
                color: "#334155",
                lineHeight: 1.45,
              }}
            >
              <strong>Internal context</strong>
              <br />
              Salesperson: {salesperson || "Not entered"}
              <br />
              Customer: {customerName || "Not entered"}
              <br />
              Notes: {managerNotes || "None"}
            </div>
          )}

          <p style={{ fontSize: 12, marginTop: 10, color: "#64748b", lineHeight: 1.45 }}>
            Subject to final inspection, title verification, recall status, payoff confirmation, market conditions, and condition match.
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
              padding: 13,
              background: "#111827",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
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
              marginTop: 9,
              padding: 11,
              background: "transparent",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
