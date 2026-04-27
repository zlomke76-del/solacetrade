"use client";

import TradeDesk from "../components/TradeDesk";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        color: "#0f172a",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          background: "#0b0b0b",
          color: "white",
          padding: "9px 18px",
          fontSize: 13,
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        Sales: (979) 451-6727 • 1880 US-290, Brenham, TX
      </div>

      {/* Header */}
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <strong style={{ fontSize: 15 }}>
          Brenham Chrysler Jeep Dodge Ram
        </strong>

        <nav
          style={{
            display: "flex",
            gap: 18,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span>New</span>
          <span>Used</span>
          <span>Service</span>
          <span style={{ color: "#b91c1c" }}>Trade</span>
        </nav>
      </header>

      {/* HERO */}
      <section
        style={{
          padding: "72px 20px 28px",
          textAlign: "center",
          background:
            "radial-gradient(circle at 50% 0%, rgba(185,28,28,0.10), transparent 36%), linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            padding: "6px 12px",
            borderRadius: 999,
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          TradeDesk by Solace
        </div>

        {/* Headline */}
        <h1
          style={{
            margin: "0 auto 10px",
            maxWidth: 880,
            fontSize: "clamp(36px, 6vw, 68px)",
            lineHeight: 0.95,
            letterSpacing: "-0.05em",
          }}
        >
          Get a real vehicle offer in minutes.
        </h1>

        {/* Subtitle */}
        <p
          style={{
            margin: "0 auto 18px",
            maxWidth: 620,
            fontSize: 18,
            color: "#475569",
          }}
        >
          Capture your vehicle. The rest is handled.
        </p>

        {/* CTA */}
        <a
          href="#vehicle-scan"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "15px 22px",
            borderRadius: 14,
            background: "#b91c1c",
            color: "white",
            fontSize: 16,
            fontWeight: 900,
            textDecoration: "none",
            boxShadow: "0 18px 40px rgba(185,28,28,0.22)",
          }}
        >
          Start Vehicle Scan
        </a>

        {/* Micro trust */}
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "#64748b",
          }}
        >
          Takes about 2 minutes • No appointment needed
        </div>
      </section>

      {/* SCAN — PULLED UP (important UX fix) */}
      <section
        id="vehicle-scan"
        style={{
          maxWidth: 820,
          margin: "-20px auto 40px",
          padding: "0 18px",
        }}
      >
        <TradeDesk mode="customer" />
      </section>

      {/* SUPPORT SECTION */}
      <section
        style={{
          padding: "36px 20px",
          background: "white",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 10px", fontSize: 28 }}>
          Built for real vehicle decisions.
        </h2>

        <p
          style={{
            margin: "0 auto",
            maxWidth: 700,
            color: "#475569",
            lineHeight: 1.6,
            fontSize: 16,
          }}
        >
          TradeDesk captures your vehicle as it is, checks recall readiness,
          and prepares a structured file for Brenham CDJR to review — without
          back-and-forth or guesswork.
        </p>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          padding: 22,
          background: "#0b0b0b",
          color: "white",
          textAlign: "center",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Brenham CDJR • Powered by TradeDesk by Solace
      </footer>
    </main>
  );
}
