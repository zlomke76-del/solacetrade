"use client";

import TradeDesk from "../components/TradeDesk";

const MONTHLY_SUBSCRIPTION_LINK = "https://buy.stripe.com/bJe9AUdeb70SfkN0jUcV200";
const SETUP_FEE_LINK = "https://buy.stripe.com/5kQ5kE6PNfxo4G97MmcV201";

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

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "34px 18px 16px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(185,28,28,0.13), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)",
        }}
      >
        <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
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
            <span
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                background: "white",
                border: "1px solid #e2e8f0",
              }}
            >
              5 guided photos
            </span>
            <span
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                background: "white",
                border: "1px solid #e2e8f0",
              }}
            >
              VIN after scan
            </span>
            <span
              style={{
                padding: "7px 10px",
                borderRadius: 999,
                background: "white",
                border: "1px solid #e2e8f0",
              }}
            >
              Recall-ready review
            </span>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "20px 14px 28px",
          background:
            "linear-gradient(135deg, #0f172a 0%, #111827 54%, #1e293b 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              padding: 22,
              borderRadius: 24,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 22px 60px rgba(0,0,0,0.22)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "7px 10px",
                borderRadius: 999,
                background: "rgba(34,197,94,0.14)",
                color: "#bbf7d0",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Dealer Signup
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: "clamp(26px, 4vw, 42px)",
                lineHeight: 1,
                letterSpacing: "-0.045em",
              }}
            >
              Start acquiring better trades.
            </h2>

            <p
              style={{
                margin: "10px 0 0",
                maxWidth: 560,
                color: "#cbd5e1",
                fontSize: 15,
                lineHeight: 1.55,
                fontWeight: 650,
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
                marginTop: 16,
                color: "#e2e8f0",
                fontSize: 12,
                fontWeight: 850,
              }}
            >
              <span
                style={{
                  padding: "7px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Dealer onboarding
              </span>
              <span
                style={{
                  padding: "7px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Manager routing
              </span>
              <span
                style={{
                  padding: "7px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Monthly platform access
              </span>
            </div>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 24,
              background: "white",
              color: "#0f172a",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 22px 60px rgba(0,0,0,0.24)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div>
                <strong style={{ display: "block", fontSize: 17 }}>
                  Dealer Access
                </strong>
                <p
                  style={{
                    margin: "4px 0 0",
                    color: "#64748b",
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  Complete setup and subscription to begin onboarding.
                </p>
              </div>
              <span
                style={{
                  padding: "6px 9px",
                  borderRadius: 999,
                  background: "#dcfce7",
                  color: "#166534",
                  fontSize: 11,
                  fontWeight: 950,
                  whiteSpace: "nowrap",
                }}
              >
                Live
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <a
                href={MONTHLY_SUBSCRIPTION_LINK}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 15px",
                  borderRadius: 16,
                  background: "#16a34a",
                  color: "white",
                  textDecoration: "none",
                  fontWeight: 950,
                  boxShadow: "0 14px 30px rgba(22,163,74,0.25)",
                }}
              >
                <span>Start Subscription</span>
                <span>$595/mo</span>
              </a>

              <a
                href={SETUP_FEE_LINK}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 15px",
                  borderRadius: 16,
                  background: "#f8fafc",
                  color: "#0f172a",
                  border: "1px solid #e2e8f0",
                  textDecoration: "none",
                  fontWeight: 950,
                }}
              >
                <span>Pay Setup Fee</span>
                <span>$299</span>
              </a>
            </div>

            <p
              style={{
                margin: "12px 0 0",
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.45,
                fontWeight: 700,
              }}
            >
              Setup fee and active monthly subscription are required for dealer
              onboarding. Verify the setup fee link is one-time in Stripe before
              going live.
            </p>
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
            [
              "Guided capture",
              "The customer sees one clear photo task at a time.",
            ],
            [
              "Cleaner value",
              "VIN and mileage are requested only after the images are complete.",
            ],
            [
              "Dealer-ready",
              "Solace produces the offer before asking the customer’s intent.",
            ],
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
              <strong style={{ display: "block", fontSize: 16 }}>
                {title}
              </strong>
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
