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
  const [contact, setContact] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [managerNotes, setManagerNotes] = useState("");
  const [customerIntent, setCustomerIntent] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentStep = captureSteps[stepIndex];
  const capturedCount = Object.values(photos).filter(Boolean).length;
  const photoProgress = Math.round((capturedCount / captureSteps.length) * 100);
  const mileageNumber = cleanMileage(mileage);
  const scanComplete = capturedCount === captureSteps.length;
  const showDetails = scanComplete;

  const missingItems = useMemo(() => {
    const missing: string[] = [];
    captureSteps.forEach((step) => {
      if (!photos[step.key]) missing.push(`${step.shortLabel} photo`);
    });
    if (scanComplete && !vin.trim()) missing.push("VIN");
    if (scanComplete && !mileageNumber) missing.push("mileage");
    return missing;
  }, [scanComplete, vin, mileageNumber, photos]);

  const readyForValue = scanComplete && vin.trim().length > 0 && mileageNumber > 0;
  const nextMissingPhoto = captureSteps.find((step) => !photos[step.key]);
  const nextMissing = scanComplete ? missingItems[0] : nextMissingPhoto?.shortLabel + " photo";

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
    setCustomerIntent("");

    if (stepIndex < captureSteps.length - 1) {
      setStepIndex((index) => index + 1);
    }

    event.target.value = "";
  }

  function produceSolaceValue() {
    if (!readyForValue) {
      setResult({
        title: scanComplete ? "Solace needs VIN and mileage to produce a cleaner value." : "Finish the five guided photos first.",
        confidence: scanComplete ? "Medium" : "Low",
        admissibility: "PARTIAL",
        lines: [
          scanComplete ? `Next needed: ${nextMissing}.` : `Next needed: ${nextMissing}.`,
          `${capturedCount} of ${captureSteps.length} required photos captured.`,
          "Solace will produce the value response after the scan state is complete.",
        ],
      });
      return;
    }

    if (isInternal) {
      setResult({
        title: "Solace packet ready for manager review.",
        confidence: "High",
        admissibility: "PASS",
        lines: [
          "Photo sequence, VIN, and mileage are present.",
          "The customer intention can be captured after the value response.",
          "Recall check is queued for VIN verification.",
        ],
      });
      return;
    }

    let base = 26500;
    base -= mileageNumber * 0.045;
    if (scanComplete) base += 750;

    const offer = formatMoney(Math.max(7500, Math.round(base)));

    setResult({
      title: `Solace preliminary value: ${offer}`,
      confidence: "High",
      admissibility: "PASS",
      lines: [
        "Your photo sequence, VIN, and mileage are complete enough to produce a preliminary value.",
        "Brenham CDJR can now review the vehicle file and verify recall status, title, payoff, and condition match.",
        "Tell us what you want to do next so the right team can follow up.",
      ],
    });
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
    setResult(null);
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
            <span style={{ width: 7, height: 7, borderRadius: 999, background: isInternal ? "#38bdf8" : "#ef4444" }} />
            {isInternal ? "Manager Packet" : "Guided Vehicle Scan"}
          </div>
          <strong style={{ fontSize: 12, opacity: 0.86 }}>{capturedCount}/5 photos</strong>
        </div>

        <h2 style={{ margin: "12px 0 6px", fontSize: "clamp(21px, 4vw, 30px)", lineHeight: 1.04, letterSpacing: "-0.045em" }}>
          {started ? currentStep.label : "Capture the vehicle first."}
        </h2>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.76)", fontSize: 14, lineHeight: 1.42 }}>
          {started ? currentStep.coaching : "Five guided photos first. VIN and mileage appear after the image sequence is complete."}
        </p>

        <div style={{ height: 7, marginTop: 14, borderRadius: 999, background: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
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
            style={{ width: "100%", height: 236, display: "block", objectFit: "cover", filter: "brightness(0.66) saturate(1.05)" }}
          />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,6,23,0.48), rgba(2,6,23,0.04) 44%, rgba(2,6,23,0.72))" }} />
          <div style={{ position: "absolute", inset: "14% 10% 18%", border: "2px dashed rgba(255,255,255,0.50)", borderRadius: 22 }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", width: 52, height: 52, marginLeft: -26, marginTop: -26, borderRadius: "50%", background: "rgba(255,255,255,0.94)", display: "grid", placeItems: "center", color: dark, fontSize: 29, fontWeight: 900, boxShadow: "0 18px 40px rgba(0,0,0,0.34)" }}>
            +
          </div>
          <div style={{ position: "absolute", left: 15, right: 15, bottom: 13, color: "white" }}>
            <strong style={{ display: "block", fontSize: 16 }}>{currentStep.help}</strong>
            <span style={{ display: "block", marginTop: 4, fontSize: 12, opacity: 0.84 }}>
              Tap to capture or upload this view.
            </span>
          </div>
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 7, marginTop: 10 }}>
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
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 21, padding: 14, background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: showDetails ? 12 : 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>{showDetails ? "Add VIN and mileage" : "Finish the photo sequence"}</h3>
              <p style={{ margin: "4px 0 0", color: muted, fontSize: 13, lineHeight: 1.35 }}>
                {showDetails ? "Solace will produce the value after these two details." : nextMissing ? `Next needed: ${nextMissing}.` : "Keep going."}
              </p>
            </div>
            <div style={{ minWidth: 68, textAlign: "right", color: readyForValue ? "#047857" : red, fontWeight: 900, fontSize: 13 }}>
              {readyForValue ? "Ready" : showDetails ? `${missingItems.length} left` : `${captureSteps.length - capturedCount} left`}
            </div>
          </div>

          {isInternal && showDetails && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9, marginBottom: 9 }}>
              <input placeholder="Salesperson" value={salesperson} onChange={(event) => setSalesperson(event.target.value)} style={inputStyle()} />
              <input placeholder="Customer" value={customerName} onChange={(event) => setCustomerName(event.target.value)} style={inputStyle()} />
            </div>
          )}

          {showDetails && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 9 }}>
              <input placeholder="VIN" value={vin} onChange={(event) => setVin(event.target.value.toUpperCase())} style={inputStyle()} />
              <input placeholder="Mileage" value={mileage} onChange={(event) => setMileage(event.target.value)} inputMode="numeric" style={inputStyle()} />
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
            onClick={produceSolaceValue}
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
              cursor: "pointer",
              boxShadow: isInternal ? "0 16px 32px rgba(15,23,42,0.18)" : "0 16px 32px rgba(185,28,28,0.22)",
            }}
          >
            {readyForValue ? "Have Solace Produce My Value" : showDetails ? "Continue to Value" : "Continue Photo Scan"}
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 14, padding: 16, borderRadius: 22, border: "1px solid #e2e8f0", background: "white" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, background: "#f1f5f9", color: dark, fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: red }} />
              Solace Response
            </div>
            <strong style={{ display: "block", fontSize: 20, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{result.title}</strong>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
              <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}><strong>Confidence</strong><br />{result.confidence}</span>
              <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}><strong>State</strong><br />{result.admissibility}</span>
              <span style={{ padding: 10, borderRadius: 13, background: "#f8fafc", fontSize: 12 }}><strong>Photos</strong><br />{capturedCount}/5</span>
            </div>
            {result.lines.map((line) => (
              <p key={line} style={{ margin: "10px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.45 }}>{line}</p>
            ))}

            {readyForValue && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 18, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <strong style={{ display: "block", fontSize: 15, marginBottom: 9 }}>What would you like to do next?</strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {[
                    ["trade", "Trade it"],
                    ["sell", "Sell it"],
                    ["talk", "Talk to someone"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCustomerIntent(value)}
                      style={{
                        padding: "11px 8px",
                        borderRadius: 14,
                        border: customerIntent === value ? `2px solid ${red}` : "1px solid #cbd5e1",
                        background: customerIntent === value ? "#fee2e2" : "white",
                        color: customerIntent === value ? "#991b1b" : dark,
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
              {isInternal ? "Route to Used Car Manager" : customerIntent ? "Send My Vehicle File" : "Send to Brenham CDJR"}
            </button>
            <button type="button" onClick={resetScan} style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 15, border: "1px solid #cbd5e1", background: "white", color: "#334155", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              Start over
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
