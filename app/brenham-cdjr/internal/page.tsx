"use client";

import TradeDesk from "../../../components/TradeDesk";

export default function InternalTradeDeskPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#0f172a",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "18px",
      }}
    >
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto 18px",
          color: "white",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "7px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Internal Dealer Mode
        </div>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(34px, 6vw, 58px)",
            lineHeight: 0.95,
            letterSpacing: "-0.055em",
          }}
        >
          Sales-floor vehicle evaluation packet.
        </h1>
        <p style={{ margin: 0, maxWidth: 760, color: "#cbd5e1", lineHeight: 1.6 }}>
          Capture the vehicle, flag missing state, and route a structured evaluation file
          to the used car manager. Internal mode allows submission with incomplete state,
          but clearly marks the packet as incomplete.
        </p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 36 }}>
        <TradeDesk mode="internal" />
      </section>
    </main>
  );
}
