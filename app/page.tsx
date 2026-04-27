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
      <section
        style={{
          padding: "34px 18px 16px",
          textAlign: "center",
        }}
      >
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

      {/* APP EXPERIENCE FIRST */}
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

      {/* VALUE REINFORCEMENT */}
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
            [
              "Guided capture",
              "Customers follow a clean, step-by-step photo flow.",
            ],
            [
              "Cleaner values",
              "VIN and mileage come after verified image capture.",
            ],
            [
              "Dealer-ready",
              "Every trade becomes a structured acquisition packet.",
            ],
          ].map(([title, body]) => (
            <div
              key={title}
              style={{
                padding: 18,
                borderRadius: 20,
                background: "white",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              }}
            >
              <strong style={{ fontSize: 16 }}>{title}</strong>
              <p style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 🔥 PRICING NOW AT THE BOTTOM */}
      <section
        style={{
          padding: "50px 18px",
          background: "#0f172a",
          color: "white",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 30, marginBottom: 10 }}>
            Ready to start acquiring better trades?
          </h2>

          <p style={{ color: "#cbd5f5", marginBottom: 30 }}>
            Turn every trade into a structured acquisition opportunity.
          </p>

          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <a
              href="https://buy.stripe.com/bJe9AUdeb70SfkN0jUcV200"
              target="_blank"
              style={{
                padding: "18px 24px",
                borderRadius: 14,
                background: "#22c55e",
                color: "black",
                fontWeight: 900,
                textDecoration: "none",
                fontSize: 16,
              }}
            >
              Start Subscription — $595/mo
            </a>

            <a
              href="https://buy.stripe.com/5kQ5kE6PNfxo4G97MmcV201"
              target="_blank"
              style={{
                padding: "18px 24px",
                borderRadius: 14,
                background: "#e2e8f0",
                color: "#0f172a",
                fontWeight: 900,
                textDecoration: "none",
                fontSize: 16,
              }}
            >
              Pay Setup Fee — $299
            </a>
          </div>

          <p style={{ marginTop: 16, fontSize: 13, color: "#94a3b8" }}>
            One-time setup fee + active monthly subscription required
          </p>
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
