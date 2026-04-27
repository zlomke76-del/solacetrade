"use client";

import TradeDesk from "../components/TradeDesk";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#0f172a",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          background: "#0b0b0b",
          color: "white",
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 800,
          textAlign: "center",
        }}
      >
        Sales: (979) 451-6727 • 1880 US-290, Brenham, TX
      </div>

      <header
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #e5e7eb",
          padding: "13px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <strong style={{ fontSize: 14 }}>Brenham Chrysler Jeep Dodge Ram</strong>
        <nav style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 900 }}>
          <span>New</span>
          <span>Used</span>
          <span>Service</span>
          <span style={{ color: "#b91c1c" }}>Trade</span>
        </nav>
      </header>

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "44px 18px 24px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(185,28,28,0.13), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              borderRadius: 999,
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            TradeDesk by Solace
          </div>

          <h1
            style={{
              margin: "0 auto 10px",
              maxWidth: 840,
              fontSize: "clamp(38px, 7vw, 72px)",
              lineHeight: 0.92,
              letterSpacing: "-0.06em",
            }}
          >
            A cleaner way to value your trade.
          </h1>

          <p
            style={{
              margin: "0 auto 18px",
              maxWidth: 680,
              color: "#475569",
              fontSize: "clamp(16px, 2vw, 20px)",
              lineHeight: 1.45,
            }}
          >
            Take five guided photos, add your VIN and mileage, and send a stronger vehicle file to Brenham CDJR.
          </p>

          <a
            href="#vehicle-scan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "15px 22px",
              borderRadius: 16,
              background: "#b91c1c",
              color: "white",
              fontSize: 16,
              fontWeight: 900,
              textDecoration: "none",
              boxShadow: "0 18px 42px rgba(185,28,28,0.24)",
            }}
          >
            Start Vehicle Scan
          </a>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
              marginTop: 16,
              color: "#334155",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <span style={{ padding: "8px 10px", borderRadius: 999, background: "white", border: "1px solid #e2e8f0" }}>5 guided photos</span>
            <span style={{ padding: "8px 10px", borderRadius: 999, background: "white", border: "1px solid #e2e8f0" }}>No appointment needed</span>
            <span style={{ padding: "8px 10px", borderRadius: 999, background: "white", border: "1px solid #e2e8f0" }}>Recall-ready VIN check</span>
          </div>
        </div>
      </section>

      <section id="vehicle-scan" style={{ maxWidth: 760, margin: "0 auto", padding: "0 14px 36px" }}>
        <TradeDesk mode="customer" />
      </section>

      <section style={{ padding: "28px 18px 42px" }}>
        <div
          style={{
            maxWidth: 940,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            ["Guided capture", "The app tells the customer exactly which view to capture next."],
            ["Cleaner packet", "Photos, VIN, mileage, condition, and intent stay together."],
            ["Dealer-ready", "Designed to reduce back-and-forth before the used car manager reviews."],
          ].map(([title, body]) => (
            <div key={title} style={{ padding: 18, borderRadius: 22, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 14px 36px rgba(15,23,42,0.06)" }}>
              <strong style={{ display: "block", fontSize: 16 }}>{title}</strong>
              <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.45 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ padding: 22, background: "#0b0b0b", color: "white", textAlign: "center", fontSize: 13, fontWeight: 800 }}>
        Brenham CDJR • Powered by TradeDesk by Solace
      </footer>
    </main>
  );
}
