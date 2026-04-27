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
      {/* TOP BAR */}
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

      {/* HEADER */}
      <header
        style={{
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <strong style={{ fontSize: 14 }}>
          Brenham Chrysler Jeep Dodge Ram
        </strong>
        <nav style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 900 }}>
          <span>New</span>
          <span>Used</span>
          <span>Service</span>
          <span style={{ color: "#b91c1c" }}>Trade</span>
        </nav>
      </header>

      {/* HERO */}
      <section style={{ padding: "34px 18px 16px", textAlign: "center" }}>
        <h1
          style={{
            fontSize: "clamp(34px, 6vw, 62px)",
            marginBottom: 10,
          }}
        >
          Get a cleaner trade value.
        </h1>

        <p style={{ fontWeight: 700 }}>
          Scan your vehicle. Get an instant cash offer.
        </p>

        <a
          href="#vehicle-scan"
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "14px 21px",
            borderRadius: 16,
            background: "#b91c1c",
            color: "white",
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Start Vehicle Scan
        </a>
      </section>

      {/* EXPERIENCE FIRST */}
      <section
        id="vehicle-scan"
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "0 14px 40px",
        }}
      >
        <TradeDesk mode="customer" dealerSlug="brenhamcdjr" />
      </section>

      {/* VALUE CARDS */}
      <section style={{ padding: "30px 18px" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {[
            ["Guided capture", "Customers follow a clean, step-by-step photo flow."],
            ["Cleaner values", "VIN and mileage come after verified image capture."],
            ["Dealer-ready", "Every trade becomes a structured acquisition packet."],
          ].map(([title, body]) => (
            <div
              key={title}
              style={{
                padding: 18,
                borderRadius: 20,
                background: "white",
                border: "1px solid #e2e8f0",
              }}
            >
              <strong>{title}</strong>
              <p style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 🔥 OLD FORMAT — MOVED TO BOTTOM */}
      <section
        style={{
          padding: "40px 18px",
          background: "#0f172a",
          color: "white",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          {/* LEFT CARD */}
          <div
            style={{
              padding: 24,
              borderRadius: 20,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: "#22c55e",
                marginBottom: 8,
              }}
            >
              DEALER SIGNUP
            </div>

            <h3 style={{ fontSize: 26, marginBottom: 12 }}>
              Start acquiring better trades.
            </h3>

            <p style={{ color: "#cbd5f5", fontSize: 14 }}>
              SolaceTrade turns trade-in intake into a guided acquisition flow:
              photo capture, VIN context, manager routing, and dealer-ready review.
            </p>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={pill}>Dealer onboarding</span>
              <span style={pill}>Manager routing</span>
              <span style={pill}>Monthly platform access</span>
            </div>
          </div>

          {/* RIGHT CARD */}
          <div
            style={{
              padding: 24,
              borderRadius: 20,
              background: "white",
              color: "#0f172a",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              Dealer Access
            </div>

            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Complete setup and subscription to begin onboarding.
            </p>

            <a
              href="https://buy.stripe.com/bJe9AUdeb70SfkN0jUcV200"
              target="_blank"
              style={primaryBtn}
            >
              Start Subscription — $595/mo
            </a>

            <a
              href="https://buy.stripe.com/5kQ5kE6PNfxo4G97MmcV201"
              target="_blank"
              style={secondaryBtn}
            >
              Pay Setup Fee — $299
            </a>

            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginTop: 10,
              }}
            >
              One-time setup fee + active subscription required
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          padding: 22,
          background: "#0b0b0b",
          color: "white",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        Brenham CDJR • Powered by TradeDesk by Solace
      </footer>
    </main>
  );
}

/* styles */
const pill = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  background: "rgba(255,255,255,0.08)",
};

const primaryBtn = {
  display: "block",
  width: "100%",
  padding: "14px",
  borderRadius: 12,
  background: "#22c55e",
  color: "black",
  fontWeight: 900,
  textAlign: "center" as const,
  textDecoration: "none",
  marginBottom: 10,
};

const secondaryBtn = {
  display: "block",
  width: "100%",
  padding: "14px",
  borderRadius: 12,
  background: "#e2e8f0",
  color: "#0f172a",
  fontWeight: 900,
  textAlign: "center" as const,
  textDecoration: "none",
};
