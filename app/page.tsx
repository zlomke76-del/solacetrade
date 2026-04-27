"use client";

import TradeDesk from "../components/TradeDesk";

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
        padding: "70px 20px",
        background: "#f7f7f7",
        textAlign: "center"
      }}>
        <h1 style={{ fontSize: 38, marginBottom: 10 }}>
          Scan Your Vehicle for Recalls & Trade Value
        </h1>

        <p style={{ fontSize: 18, marginBottom: 20 }}>
          Take live photos. TradeDesk checks VIN, mileage, recall status, and condition.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={chip}>Live photo scan</span>
          <span style={chip}>Recall check</span>
          <span style={chip}>Instant value</span>
        </div>
      </section>

      {/* TRADEDESK */}
      <section style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 20
      }}>
        <TradeDesk />
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

const chip = {
  background: "#e5e7eb",
  padding: "6px 12px",
  borderRadius: 20,
  fontSize: 13
};
