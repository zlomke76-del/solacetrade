
"use client";
import { useState } from "react";

export default function TradeDesk() {
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState("");

  function calculateOffer() {
    if (!vin || !mileage) {
      setResult("Estimated Range: $15,000 - $20,000 (add VIN + mileage for real offer)");
      return;
    }

    const base = 20000;
    const mileagePenalty = Number(mileage) * 0.05;
    const offer = Math.max(5000, base - mileagePenalty);

    setResult("Preliminary Cash Offer: $" + Math.round(offer));
  }

  return (
    <div style={{ padding: 40, borderTop: "1px solid #ddd" }}>
      <h3>TradeDesk Intake</h3>

      <input
        placeholder="VIN"
        value={vin}
        onChange={(e) => setVin(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <input
        placeholder="Mileage"
        value={mileage}
        onChange={(e) => setMileage(e.target.value)}
        style={{ display: "block", marginBottom: 10 }}
      />

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0])}
        style={{ marginBottom: 10 }}
      />

      <button onClick={calculateOffer}>Get Offer</button>

      <p style={{ marginTop: 20 }}>{result}</p>
    </div>
  );
}
