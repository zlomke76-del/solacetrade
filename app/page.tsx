"use client";

import TradeDesk from "@/components/TradeDesk";

export default function Page() {
  return (
    <main>
      {/* TOP BAR */}
      <div style={{
        background: "#111",
        color: "white",
        padding: "10px 20px",
        fontSize: 14
      }}>
        Sales: (979) 451-6727 | 1880 US-290, Brenham, TX
      </div>

      {/* NAV */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid #eee"
      }}>
        <strong>Brenham Chrysler Jeep Dodge Ram</strong>
        <div style={{ display: "flex", gap: 20 }}>
          <span>New</span>
          <span>Used</span>
          <span>Service</span>
          <span style={{ fontWeight: "bold" }}>Trade</span>
        </div>
      </div>

      {/* HERO */}
      <section style={{
        padding: "60px 20px",
        background: "#f7f7f7",
        textAlign: "center"
      }}>
        <h1 style={{ fontSize: 36, marginBottom: 10 }}>
          Get a Real Cash Offer for Your Vehicle
        </h1>

        <p style={{ fontSize: 18, marginBottom: 20 }}>
          Take a few photos. Enter VIN & mileage. Get your offer instantly.
        </p>

        <button style={{
          padding: "14px 28px",
          background: "#b91c1c",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 16
        }}>
          Start Trade-In
        </button>
      </section>

      {/* TRADEDESK */}
      <section style={{
        maxWidth: 800,
        margin: "40px auto",
        padding: 20
      }}>
        <TradeDesk />
      </section>

      {/* TRUST */}
      <section style={{
        padding: 40,
        background: "#fafafa",
        textAlign: "center"
      }}>
        <h2>Why Trade with Brenham CDJR?</h2>
        <p>Fast offers. Local experts. No guessing.</p>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: 20,
        background: "#111",
        color: "white",
        textAlign: "center"
      }}>
        Brenham CDJR • Powered by TradeDesk by Solace
      </footer>
    </main>
  );
}
