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
          padding: "34px 18px 16px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(185,28,28,0.13), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
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
              marginBottom: 12,
            }}
          >
            TradeDesk by Solace
          </div>

          <h1
            style={{
              margin: "0 auto 10px",
              maxWidth: 780,
              fontSize: "clamp(34px, 6vw, 62px)",
              lineHeight: 0.95,
              letterSpacing: "-0.058em",
            }}
          >
            Get a cleaner trade value.
          </h1>

          <p
            style={{
              margin: "0 auto 6px",
              maxWidth: 620,
              color: "#0f172a",
              fontSize: "clamp(16px, 2.2vw, 20px)",
              fontWeight: 700,
            }}
          >
            Scan your vehicle. Get an instant cash offer.
          </p>

          <p
            style={{
              margin: "0 auto 16px",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            No obligation. No pressure.
          </p>

          <a
            href="#vehicle-scan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 21px",
              borderRadius: 16,
              background: "#b91c1c",
              color: "white",
              fontSize: 15,
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
              marginTop: 14,
              color: "#334155",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <span style={heroPill}>5 guided photos</span>
            <span style={heroPill}>VIN after scan</span>
            <span style={heroPill}>Recall-ready review</span>
          </div>
        </div>
      </section>

      <section
        id="vehicle-scan"
        style={{ maxWidth: 690, margin: "0 auto", padding: "0 14px 32px" }}
      >
        <TradeDesk mode="customer" dealerSlug="brenhamcdjr" />
      </section>

      <section style={{ padding: "24px 18px 38px" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
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
                padding: 17,
                borderRadius: 21,
                background: "white",
                border: "1px solid #e2e8f0",
                boxShadow: "0 14px 36px rgba(15,23,42,0.06)",
              }}
            >
              <strong style={{ display: "block", fontSize: 16 }}>{title}</strong>
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: "42px 18px",
          background: "#0f172a",
          color: "white",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              padding: 24,
              borderRadius: 22,
              background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "7px 10px",
                borderRadius: 999,
                background: "rgba(34,197,94,0.16)",
                color: "#bbf7d0",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Dealer Signup
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "clamp(30px, 4vw, 44px)",
                lineHeight: 0.96,
                letterSpacing: "-0.055em",
              }}
            >
              Start acquiring better trades.
            </h2>

            <p
              style={{
                margin: "14px 0 0",
                color: "#dbeafe",
                fontSize: 15,
                lineHeight: 1.55,
                fontWeight: 700,
              }}
            >
              SolaceTrade turns trade-in intake into a guided acquisition flow:
              photo capture, VIN context, manager routing, and dealer-ready review.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 18,
              }}
            >
              <span style={darkPill}>Dealer onboarding</span>
              <span style={darkPill}>Manager routing</span>
              <span style={darkPill}>Monthly platform access</span>
            </div>
          </div>

          <div
            style={{
              padding: 24,
              borderRadius: 22,
              background: "white",
              color: "#0f172a",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 24px 70px rgba(0,0,0,0.26)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                padding: "7px 10px",
                borderRadius: 999,
                background: "#dcfce7",
                color: "#166534",
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              Live
            </div>

            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
              Dealer Access
            </h3>

            <p
              style={{
                margin: "6px 0 16px",
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.45,
                maxWidth: 300,
              }}
            >
              Complete setup and subscription to begin onboarding.
            </p>

            <a
              href="https://buy.stripe.com/bJe9AUdeb70SfkN0jUcV200"
              target="_blank"
              rel="noreferrer"
              style={primaryBtn}
            >
              <span>Start Subscription</span>
              <span>$595/mo</span>
            </a>

<div style={{ marginTop: 10 }}>
  {/* WAIVER BADGE */}
  <div
    style={{
      background: "#16a34a",
      color: "white",
      fontWeight: 900,
      fontSize: 11,
      padding: "6px 10px",
      borderRadius: 999,
      display: "inline-block",
      marginBottom: 8,
    }}
  >
    SETUP FEE WAIVED BEFORE JULY 1
  </div>

  {/* BUTTON (DIMMED) */}
  <a
    href="https://buy.stripe.com/5kQ5kE6PNfxo4G97MmcV201"
    target="_blank"
    style={{
      ...secondaryBtn,
      background: "#f1f5f9",
      color: "#64748b",
      textDecoration: "line-through",
      cursor: "not-allowed",
      opacity: 0.7,
    }}
  >
    Pay Setup Fee — $299
  </a>
</div>

            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                margin: "14px 0 0",
                lineHeight: 1.45,
              }}
            >
              Setup fee is waived for dealers who start a monthly subscription before July 1.
            </p>
          </div>
        </div>
      </section>

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

const heroPill: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "white",
  border: "1px solid #e2e8f0",
};

const darkPill: React.CSSProperties = {
  padding: "8px 11px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#e2e8f0",
  fontSize: 12,
  fontWeight: 900,
};

const primaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 16px",
  borderRadius: 15,
  background: "#16a34a",
  color: "white",
  fontWeight: 950,
  fontSize: 15,
  textDecoration: "none",
  boxShadow: "0 14px 30px rgba(22,163,74,0.26)",
};

const secondaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  width: "100%",
  boxSizing: "border-box",
  padding: "15px 16px",
  borderRadius: 15,
  background: "#f1f5f9",
  color: "#0f172a",
  fontWeight: 950,
  fontSize: 15,
  textDecoration: "none",
  border: "1px solid #e2e8f0",
};
