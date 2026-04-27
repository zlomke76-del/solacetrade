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
        Sales: (979) 451-6727 | 1880 US-290, Brenham, TX
      </div>

      <header
        style={{
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <strong style={{ fontSize: 15 }}>Brenham Chrysler Jeep Dodge Ram</strong>

        <nav
          style={{
            display: "flex",
            gap: 18,
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          <span>New</span>
          <span>Used</span>
          <span>Service</span>
          <span style={{ color: "#b91c1c" }}>Trade</span>
        </nav>
      </header>

      <section
        style={{
          padding: "76px 20px 46px",
          textAlign: "center",
          background:
            "radial-gradient(circle at 50% 0%, rgba(185,28,28,0.12), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            padding: "7px 12px",
            borderRadius: 999,
            background: "#fee2e2",
            color: "#991b1b",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: "#dc2626",
            }}
          />
          TradeDesk by Solace
        </div>

        <h1
          style={{
            margin: "0 auto 14px",
            maxWidth: 960,
            fontSize: "clamp(38px, 7vw, 74px)",
            lineHeight: 0.95,
            letterSpacing: "-0.06em",
          }}
        >
          Get a real vehicle offer in minutes — just take a few photos.
        </h1>

        <p
          style={{
            margin: "0 auto 24px",
            maxWidth: 770,
            fontSize: 18,
            lineHeight: 1.55,
            color: "#475569",
          }}
        >
          Your car is the application. TradeDesk guides you through a live vehicle scan,
          checks open recall readiness, captures condition signals, and builds a Brenham
          CDJR offer file for review.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          {[
            "Live vehicle scan",
            "Free open recall check",
            "Preliminary offer path",
            "Dealer-ready vehicle file",
          ].map((item) => (
            <span
              key={item}
              style={{
                padding: "9px 13px",
                borderRadius: 999,
                background: "white",
                border: "1px solid #e5e7eb",
                fontSize: 13,
                fontWeight: 800,
                boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
              }}
            >
              {item}
            </span>
          ))}
        </div>

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
      </section>

      <section
        id="vehicle-scan"
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "42px 18px 56px",
        }}
      >
        <TradeDesk mode="customer" />
      </section>

      <section
        style={{
          padding: "44px 20px",
          background: "white",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 10px", fontSize: 30, letterSpacing: "-0.03em" }}>
          More useful than a trade form.
        </h2>
        <p
          style={{
            margin: "0 auto",
            maxWidth: 760,
            color: "#475569",
            lineHeight: 1.65,
            fontSize: 16,
          }}
        >
          TradeDesk helps customers understand their vehicle before they sell: recall
          status, condition readiness, missing verification items, and whether the file is
          complete enough for a stronger preliminary offer.
        </p>
      </section>

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
