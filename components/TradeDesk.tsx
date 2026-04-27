"use client";

import { useState } from "react";

export default function TradeDesk() {
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("good");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");

  function calculateOffer() {
    if (!vin || !mileage) {
      setResult("Estimated Range: $15,000 – $20,000");
      return;
    }

    let base = 22000;

    const mileagePenalty = Number(mileage) * 0.05;
    base -= mileagePenalty;

    if (condition === "fair") base -= 2000;
    if (condition === "poor") base -= 4000;

    setResult(`Preliminary Cash Offer: $${Math.round(base)}`);
  }

  return (
    <div style={{
      border: "1px solid #ddd",
      borderRadius: 8,
      padding: 20,
      background: "white"
    }}>
      <h3 style={{ marginBottom: 20 }}>TradeDesk Intake</h3>

      <input
        placeholder="VIN"
        value={vin}
        onChange={(e) => setVin(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <input
        placeholder="Mileage"
        value={mileage}
        onChange={(e) => setMileage(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <select
        value={condition}
        onChange={(e) => setCondition(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      >
        <option value="excellent">Excellent</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Needs Work</option>
      </select>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: 10 }}
      />

      <button
        onClick={calculateOffer}
        style={{
          width: "100%",
          padding: 12,
          background: "#b91c1c",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 16
        }}
      >
        Get My Cash Offer
      </button>

      {result && (
        <div style={{
          marginTop: 20,
          padding: 15,
          background: "#f1f5f9",
          borderRadius: 6
        }}>
          <strong>{result}</strong>
          <p style={{ fontSize: 12, marginTop: 5 }}>
            Subject to inspection, title verification, and condition match.
          </p>
        </div>
      )}
    </div>
  );
}
