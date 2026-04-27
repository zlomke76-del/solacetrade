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
  coaching: string;
  image: string;
};

type PhotoMap = Record<string, File | null>;

type ResultState = {
  title: string;
  confidence: "Low" | "Medium" | "High";
  admissibility: "PASS" | "PARTIAL";
  lines: string[];
};

const captureSteps: CaptureStep[] = [
  {
    key: "front",
    label: "Front of vehicle",
    shortLabel: "Front",
    help: "Center the full front of the vehicle.",
    coaching: "Stand 6–10 feet back. Keep the full bumper and headlights visible.",
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

const red = "#b91c1c";
const dark = "#0f172a";
const muted = "#64748b";

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
  const photoProgress = Math.round((capturedCount / captureSteps.length) * 100);
  const mileageNumber = cleanMileage(mileage);
  const scanComplete = capturedCount === captureSteps.length;

  const missingItems = useMemo(() => {
    const missing: string[] = [];
    captureSteps.forEach((step) => {
      if (!photos[step.key]) missing.push(`${step.shortLabel} photo`);
    });
    if (!vin.trim()) missing.push("VIN");
    if (!mileageNumber) missing.push("mileage");
    return missing;
  }, [vin, mileageNumber, photos]);

  const readyForOffer = missingItems.length === 0;
  const nextMissing = missingItems[0];

  function openCameraOrFilePicker() {
    setStarted(true);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setStarted(true);
    setPhotos((previous) => ({ ...previous, [currentStep.key]: file }));
    setResult(null);

    if (stepIndex < captureSteps.length - 1) {
      setStepIndex((index) => index + 1);
    }

    event.target.value = "";
  }

  function buildOfferFile() {
    if (!readyForOffer) {
      setResult({
        title: "A stronger offer needs a little more state.",
        confidence: scanComplete ? "Medium" : "Low",
        admissibility: "PARTIAL",
        lines: [
          `Next needed: ${nextMissing}.`,
          `${capturedCount} of ${captureSteps.length} required photos captured.`,
          "Recall check will run after VIN is verified.",
        ],
      });
      return;
    }

    if (isInternal) {
      setResult({
        title: "Manager packet ready.",
        confidence: "High",
        admissibility: "PASS",
        lines: [
          "Core appraisal state is present.",
          "Photo sequence, VIN, mileage, condition, and customer intent are ready for review.",
          "Recall check is queued for VIN verification.",
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
      title: `Preliminary cash offer: ${formatMoney(Math.max(7500, Math.round(base)))}`,
      confidence: "High",
      admissibility: "PASS",
      lines: [
        "Vehicle file is complete enough for Brenham CDJR review.",
        "Open recall check is queued pending VIN verification.",
        "Final number remains subject to inspection, payoff, title, and condition match.",
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
    <section
      style={{
        width: "100%",
        border: "1px solid rgba(148,163,184,0.28)",
        borderRadius: 28,
        background: "rgba(255,255,255,0.96)",
        boxShadow: "0 30px 90px rgba(15,23,42,0.14)",
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
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 0,
        }}
      >
        <div
          style={{
            padding: "18px 18px 14px",
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))",
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
              <span style={{ width: 7, height: 7, borderRadius: 999, background: isInternal ? "#38bdf8" : "#ef4444" }} />
              {isInternal ? "Manager Packet" : "Guided Vehicle Scan"}
            </div>
            <strong style={{ fontSize: 12, opacity: 0.86 }}>{capturedCount}/5 photos</strong>
          </div>

          <h2 style={{ margin: "14px 0 6px", fontSize: "clamp(22px, 4vw, 32px)", lineHeight: 1.02, letterSpacing: "-0.045em" }}>
            {started ? currentStep.label : "Capture 5 guided photos. Get a cleaner offer."}
          </h2>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 1.45 }}>
            {started ? currentStep.coaching : "Camera opens on mobile. Desktop users can upload the same five views."}
          </p>

          <div style={{ height: 8, marginTop: 15, borderRadius: 999, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
            <div
              style={{
                width: `${photoProgress}%`,
                height: "100%",
                borderRadius: 999,
                background: isInternal ? "#38bdf8" : "#ef4444",
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
              minHeight: 260,
              border: "none",
              borderRadius: 24,
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
              style={{ width: "100%", height: 260, display: "block", objectFit: "cover", filter: "brightness(0.66) saturate(1.05)" }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,6,23,0.50), rgba(2,6,23,0.02) 42%, rgba(2,6,23,0.72))" }} />
            <div style={{ position: "absolute", inset: "14% 10% 18%", border: "2px dashed rgba(255,255,255,0.56)", borderRadius: 22 }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", width: 54, height: 54, marginLeft: -27, marginTop: -27, borderRadius: "50%", background: "rgba(255,255,255,0.94)", display: "grid", placeItems: "center", color: dark, fontSize: 30, fontWeight: 900, boxShadow: "0 18px 40px rgba(0,0,0,0.34)" }}>
              +
            </div>
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 14, color: "white" }}>
              <strong style={{ display: "block", fontSize: 17 }}>{currentStep.help}</strong>
              <span style={{ display: "block", marginTop: 4, fontSize: 12, opacity: 0.84 }}>
                Tap to capture or upload this view.
              </span>
            </div>
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 7, marginTop: 11 }}>
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
                    minHeight: 42,
                    borderRadius: 14,
                    border: active ? `2px solid ${isInternal ? "#0284c7" : red}` : "1px solid #e2e8f0",
                    background: done ? "#ecfdf5" : "white",
                    color: done ? "#047857" : dark,
                    fontSize: 11,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {done ? "✓ " : ""}{step.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "0 14px 16px" }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 22, padding: 14, background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>{scanComplete ? "Finish the offer file" : "Complete the scan"}</h3>
                <p style={{ margin: "4px 0 0", color: muted, fontSize: 13 }}>
                  {readyForOffer ? "Ready for review." : nextMissing ? `Next needed: ${nextMissing}.` : "Keep going."}
                </p>
              </div>
              <div style={{ minWidth: 72, textAlign: "right", color: readyForOffer ? "#047857" : red, fontWeight: 900, fontSize: 13 }}>
                {readyForOffer ? "Ready" : `${missingItems.length} left`}
              </div>
            </div>

            {isInternal && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9, marginBottom: 9 }}>
                <input placeholder="Salesperson" value={salesperson} onChange={(event) => setSalesperson(event.target.value)} style={inputStyle()} />
                <input placeholder="Customer" value={customerName} onChange={(event) => setCustomerName(event.target.value)} style={inputStyle()} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9 }}>
              <input placeholder="VIN" value={vin} onChange={(event) => setVin(event.target.value.toUpperCase())} style={inputStyle()} />
              <input placeholder="Mileage" value={mileage} onChange={(event) => setMileage(event.target.value)} inputMode="numeric" style={inputStyle()} />
              <select value={condition} onChange={(event) => setCondition(event.target.value)} style={inputStyle()}>
                <option value="excellent">Excellent condition</option>
                <option value="good">Good condition</option>
                <option value="fair">Fair condition</option>
                <option value="needs_work">Needs work</option>
              </select>
              <select value={intent} onChange={(event) => setIntent(event.target.value)} style={inputStyle()}>
                <option value="trade">Trade toward another vehicle</option>
                <option value="sell">Sell my vehicle</option>
                <option value="checking">Just checking value</option>
              </select>
            </div>

            {isInternal && (
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
              onClick={buildOfferFile}
              style={{
                width: "100%",
                marginTop: 11,
                padding: 15,
                border: "none",
                borderRadius: 16,
                background: isInternal ? dark : red,
                color: "white",
                fontSize: 15,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: isInternal ? "0 16px 32px rgba(15,23,42,0.18)" : "0 16px 32px rgba(185,28,28,0.22)",
              }}
            >
              {isInternal ? "Build Manager Packet" : readyForOffer ? "Get My Real Offer" : "Continue My Offer File"}
            </button>
          </div>

          {result && (
            <div style={{ marginTop: 14, padding: 16, borderRadius: 22, border: "1px solid #e2e8f0", background: "white" }}>
              <strong style={{ display: "block", fontSize: 20, letterSpacing: "-0.03em" }}>{result.title}</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}><strong>Confidence</strong><br />{result.confidence}</span>
                <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}><strong>State</strong><br />{result.admissibility}</span>
                <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}><strong>Photos</strong><br />{capturedCount}/5</span>
              </div>
              {result.lines.map((line) => (
                <p key={line} style={{ margin: "10px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.45 }}>{line}</p>
              ))}
              {isInternal && (
                <p style={{ margin: "10px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.45 }}>
                  Salesperson: {salesperson || "Not entered"} · Customer: {customerName || "Not entered"}
                </p>
              )}
              <input
                placeholder={isInternal ? "Manager email or routing contact" : "Phone or email"}
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                style={{ ...inputStyle(), marginTop: 12 }}
              />
              <button type="button" style={{ width: "100%", marginTop: 9, padding: 14, borderRadius: 15, border: "none", background: dark, color: "white", fontSize: 15, fontWeight: 900, cursor: "pointer" }}>
                {isInternal ? "Route to Used Car Manager" : "Send to Brenham CDJR"}
              </button>
              <button type="button" onClick={resetScan} style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 15, border: "1px solid #cbd5e1", background: "white", color: "#334155", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                Start over
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
