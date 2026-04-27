"use client";

import TradeDesk from "../components/TradeDesk";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        color: "#0f172a",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          background: "#0b0b0b",
          color: "white",
          padding: "9px 18px",
          fontSize: 13,
          fontWeight: 700,
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
        }}
      >
        <strong>Brenham Chrysler Jeep Dodge Ram</strong>

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

      <section
        style={{
          padding: "74px 20px 54px",
          textAlign: "center",
          background:
            "linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 8,
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
          TradeDesk by Solace
        </div>

        <h1
          style={{
            margin: "0 auto 12px",
            maxWidth: 900,
            fontSize: "clamp(36px, 6vw, 68px)",
            lineHeight: 1,
            letterSpacing: "-0.055em",
          }}
        >
          Scan your vehicle for recalls and trade value in minutes.
        </h1>

        <p
          style={{
            margin: "0 auto 22px",
            maxWidth: 760,
            fontSize: 18,
            lineHeight: 1.55,
            color: "#475569",
          }}
        >
          Stand by your car. Take live photos from your phone. TradeDesk checks
          VIN, mileage, recall readiness, condition signals, and builds a
          Brenham CDJR offer file.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {["Live vehicle scan", "Open recall check", "Dealer-ready offer file"].map(
            (item) => (
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
            ),
          )}
        </div>
      </section>

      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "42px 18px 56px",
        }}
      >
        <TradeDesk />
      </section>

      <section
        style={{
          padding: "42px 20px",
          background: "white",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
        }}
      >
        <h2 style={{ margin: "0 0 10px", fontSize: 28 }}>
          More useful than a trade form.
        </h2>
        <p
          style={{
            margin: "0 auto",
            maxWidth: 720,
            color: "#475569",
            lineHeight: 1.6,
          }}
        >
          TradeDesk helps customers understand their vehicle before they sell:
          recall status, condition readiness, missing verification items, and a
          preliminary value path subject to final inspection.
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
