"use client";

import { ChangeEvent, useMemo, useState } from "react";

type CaptureStep = {
  key: string;
  label: string;
  help: string;
};

const captureSteps: CaptureStep[] = [
  {
    key: "front",
    label: "Front of vehicle",
    help: "Stand a few steps back and capture the full front view.",
  },
  {
    key: "driverSide",
    label: "Driver side",
    help: "Capture the full driver side from bumper to bumper.",
  },
  {
    key: "rear",
    label: "Rear of vehicle",
    help: "Capture the full rear view including bumper and tailgate/trunk.",
  },
  {
    key: "interior",
    label: "Interior",
    help: "Capture the driver seat, dash, and general interior condition.",
  },
  {
    key: "odometer",
    label: "Odometer",
    help: "Capture the mileage clearly on the dash display.",
  },
  {
    key: "vin",
    label: "VIN",
    help: "Capture the VIN plate through the windshield or door jamb.",
  },
];

type PhotoMap = Record<string, File | null>;

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TradeDesk() {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [photos, setPhotos] = useState<PhotoMap>(() =>
    Object.fromEntries(captureSteps.map((step) => [step.key, null])),
  );
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("good");
  const [intent, setIntent] = useState("trade");
  const [contact, setContact] = useState("");
  const [result, setResult] = useState("");

  const currentStep = captureSteps[stepIndex];
  const capturedCount = Object.values(photos).filter(Boolean).length;
  const progress = Math.round((capturedCount / captureSteps.length) * 100);
  const hasCorePhotos = Boolean(photos.front && photos.odometer && photos.vin);
  const scanComplete = capturedCount >= captureSteps.length;

  const missingItems = useMemo(() => {
    const missing: string[] = [];
    if (!vin.trim()) missing.push("VIN");
    if (!mileage.trim()) missing.push("mileage");
    if (!photos.front) missing.push("front photo");
    if (!photos.odometer) missing.push("odometer photo");
    if (!photos.vin) missing.push("VIN photo");
    return missing;
  }, [vin, mileage, photos]);

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
  }

  function buildOffer() {
    const mileageNumber = Number(mileage.replace(/[^\d]/g, ""));

    if (!vin.trim() || !mileageNumber || !hasCorePhotos) {
      setResult(
        `Estimated Range: $17,000 – $22,500\n\nMissing: ${missingItems.join(", ")}.\n\nAdd the missing items to unlock a stronger cash offer.`,
      );
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

    setResult(
      `Preliminary Cash Offer: ${formatMoney(offer)}\n\nConfidence: ${
        scanComplete ? "High" : "Medium"
      }\n\nVehicle file ready for Brenham CDJR review.`,
    );
  }

  function resetScan() {
    setStarted(false);
    setStepIndex(0);
    setPhotos(Object.fromEntries(captureSteps.map((step) => [step.key, null])));
    setVin("");
    setMileage("");
    setCondition("good");
    setIntent("trade");
    setContact("");
    setResult("");
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 18,
        padding: 24,
        background: "white",
        boxShadow: "0 24px 70px rgba(0,0,0,0.12)",
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
            background: "#fee2e2",
            color: "#991b1b",
            fontWeight: 800,
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
              background: "#dc2626",
            }}
          />
          Vehicle Scan Active
        </div>

        <h2 style={{ margin: "14px 0 8px", fontSize: 30 }}>
          Your car is the application.
        </h2>

        <p style={{ margin: 0, color: "#475569", fontSize: 16 }}>
          Stand near your vehicle. Take a few guided photos. TradeDesk by Solace
          builds the offer file for Brenham CDJR.
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
          <h3 style={{ marginTop: 0 }}>Start a 60-second vehicle scan</h3>
          <p style={{ color: "#475569" }}>
            We’ll guide you through front, side, rear, interior, odometer, and
            VIN photos.
          </p>

          <button
            type="button"
            onClick={() => setStarted(true)}
            style={{
              width: "100%",
              padding: 15,
              background: "#b91c1c",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Start Vehicle Scan
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
                background: "#b91c1c",
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
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Step {stepIndex + 1} of {captureSteps.length}
              </div>

              <h3 style={{ margin: "8px 0 6px", fontSize: 22 }}>
                {currentStep.label}
              </h3>

              <p style={{ margin: "0 0 16px", color: "#475569" }}>
                {currentStep.help}
              </p>

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
                    background: "#b91c1c",
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
                        ? "2px solid #b91c1c"
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
                    {photos[step.key] ? "Captured" : "Needed"}
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
            <h3 style={{ margin: "0 0 12px" }}>Finish vehicle file</h3>

            <input
              placeholder="VIN"
              value={vin}
              onChange={(event) => setVin(event.target.value.toUpperCase())}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 10,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
              }}
            />

            <input
              placeholder="Mileage"
              value={mileage}
              onChange={(event) => setMileage(event.target.value)}
              inputMode="numeric"
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 10,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
              }}
            />

            <select
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 10,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="excellent">Excellent condition</option>
              <option value="good">Good condition</option>
              <option value="fair">Fair condition</option>
              <option value="needs_work">Needs work</option>
            </select>

            <select
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 10,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="trade">Trade toward another vehicle</option>
              <option value="sell">Sell my vehicle</option>
              <option value="checking">Just checking value</option>
            </select>

            <button
              type="button"
              onClick={buildOffer}
              style={{
                width: "100%",
                padding: 14,
                background: "#b91c1c",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Build My Offer File
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
              <strong style={{ fontSize: 20, display: "block" }}>
                {result.split("\n")[0]}
              </strong>

              {result
                .split("\n")
                .slice(1)
                .filter(Boolean)
                .map((line) => (
                  <p key={line} style={{ margin: "8px 0 0", color: "#334155" }}>
                    {line}
                  </p>
                ))}

              <p style={{ fontSize: 13, marginTop: 12, color: "#64748b" }}>
                Subject to final inspection, title verification, recall status,
                payoff confirmation, and condition match.
              </p>

              <input
                placeholder="Phone or email"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 12,
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                }}
              />

              <button
                type="button"
                style={{
                  width: "100%",
                  marginTop: 10,
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
                Send to Brenham CDJR
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
