"use client";

import TradeDesk from "../components/TradeDesk";
import type { CSSProperties } from "react";

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
      <style>{`
        @media (max-width: 980px) {
          .hero-vehicle-art { display: none !important; }
          .dealer-advantage-grid { grid-template-columns: 1fr !important; }
          .dealer-clarity-grid { grid-template-columns: 1fr !important; }
          .dealer-signup-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 620px) {
          .top-nav { gap: 10px !important; font-size: 12px !important; }
          .dealer-name { font-size: 12px !important; }
          .vehicle-scan-section { padding-left: 10px !important; padding-right: 10px !important; }
        }
      `}</style>

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
        Sales: (713) 555-0188 • 17400 Northwest Fwy, Jersey Village, TX
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
        <strong className="dealer-name" style={{ fontSize: 14 }}>
          Jersey Village Chrysler Jeep Dodge Ram
        </strong>
        <nav className="top-nav" style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 900 }}>
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
          padding: "30px 18px 18px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(185,28,28,0.13), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)",
          textAlign: "center",
        }}
      >
        <div className="hero-vehicle-art" style={{ ...heroVehicleArt, left: 24 }}>
          <img src="/images/jeep_01.png" alt="Baja-style Jeep on sand dunes" style={heroVehicleImage} />
          <div className="inventory-top-badge" style={inventoryTopBadge}>
            <strong style={inventoryTopTitle}>New Jeep Inventory</strong>
            <span style={inventoryTopAction}>View all</span>
          </div>
          <div style={vehicleArtOverlay}>
            <strong>Wrangler • Gladiator • Off-Road Ready</strong>
            <span>Scan your trade and move into the Jeep you want.</span>
          </div>
        </div>

        <div className="hero-vehicle-art" style={{ ...heroVehicleArt, right: 24 }}>
          <img src="/images/ram_truck_01.png" alt="Lifted Ram truck on a mountain dirt road" style={heroVehicleImage} />
          <div className="inventory-top-badge" style={inventoryTopBadge}>
            <strong style={inventoryTopTitle}>New Ram Inventory</strong>
            <span style={inventoryTopAction}>View all</span>
          </div>
          <div style={vehicleArtOverlay}>
            <strong>Ram 1500 • Heavy Duty • Work Trucks</strong>
            <span>Get a real trade offer and shop trucks with confidence.</span>
          </div>
        </div>

        <div style={{ maxWidth: 1040, margin: "0 auto", position: "relative", zIndex: 2 }}>
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
            Real offer in seconds. No games.
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
            Built from your actual vehicle — not a guess.
          </p>

          <p
            style={{
              margin: "0 auto 14px",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Scan your car. See your offer instantly.
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
            Get My Real Offer
          </a>

          <p
            style={{
              margin: "10px auto 0",
              color: "#64748b",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Final value confirmed upon inspection.
          </p>

          <p
            style={{
              margin: "14px auto 0",
              color: "#334155",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Trade value first. Inventory next. One clean path.
          </p>
        </div>
      </section>

      <section
        id="vehicle-scan"
        className="vehicle-scan-section"
        style={{ maxWidth: 760, margin: "0 auto", padding: "0 14px 32px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7px 12px",
              borderRadius: 999,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            This is what the dealer gets
          </div>

          <h2
            style={{
              margin: "0 auto 6px",
              color: "#0f172a",
              fontSize: "clamp(22px, 3vw, 30px)",
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
            }}
          >
            A live trade capture app for your website.
          </h2>

          <p
            style={{
              margin: "0 auto",
              maxWidth: 620,
              color: "#475569",
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.45,
            }}
          >
            Customers scan their vehicle, receive a real offer response, and your team gets a ready-to-work deal backed by real vehicle data.
          </p>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 30,
            border: "2px solid #b91c1c",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
            boxShadow: "0 28px 80px rgba(15,23,42,0.16)",
          }}
        >
          <div
            style={{
              borderRadius: 24,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              background: "white",
            }}
          >
            <TradeDesk mode="customer" dealerSlug="jerseyvillagecdjr" />
          </div>
        </div>

        <div className="dealer-clarity-grid" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <div style={dealerClarityCard}>
            <strong style={dealerClarityTitle}>Live on your site</strong>
            <span style={dealerClarityBody}>The app sits inside your trade page.</span>
          </div>
          <div style={dealerClarityCard}>
            <strong style={dealerClarityTitle}>Better vehicle intake</strong>
            <span style={dealerClarityBody}>Photos, VIN, mileage, and condition signals.</span>
          </div>
          <div style={dealerClarityCard}>
            <strong style={dealerClarityTitle}>Ready-to-work deals</strong>
            <span style={dealerClarityBody}>Your team starts with real vehicle data.</span>
          </div>
        </div>

        <p
          style={{
            margin: "12px auto 0",
            maxWidth: 620,
            textAlign: "center",
            color: "#475569",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.45,
          }}
        >
          Enhances antiquated trade practices with real vehicle data — without forcing the dealer to give up control of the deal.
        </p>
      </section>

      <section style={{ padding: "24px 18px 38px" }}>
        <div
          className="dealer-advantage-grid"
          style={{
            maxWidth: 1060,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            ["More complete leads", "Customers submit photos, VIN, mileage, and intent before your team invests time chasing the deal."],
            ["Faster appraisal path", "The offer flow turns a cold trade form into a guided vehicle scan your desk can actually use."],
            ["Cleaner customer experience", "The buyer gets an answer immediately, with no gimmicks, and your dealership keeps final inspection control."],
          ].map(([title, body]) => (
            <div key={title} style={advantageCard}>
              <strong style={{ display: "block", fontSize: 16 }}>{title}</strong>
              <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.45 }}>
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
          className="dealer-signup-grid"
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
              Turn your trade page into a real intake engine.
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
              TradeDesk gives your dealership a branded scan flow, structured vehicle evidence, and a faster path from customer interest to workable offer.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
              <span style={darkPill}>Website-ready</span>
              <span style={darkPill}>Evidence-based</span>
              <span style={darkPill}>Dealer-controlled</span>
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

            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Dealer Access</h3>

            <p style={{ margin: "6px 0 16px", color: "#64748b", fontSize: 13, lineHeight: 1.45, maxWidth: 300 }}>
              Complete setup and subscription to begin onboarding.
            </p>

            <a href="https://buy.stripe.com/bJe9AUdeb70SfkN0jUcV200" target="_blank" rel="noreferrer" style={primaryBtn}>
              <span>Start Subscription</span>
              <span>$595/mo</span>
            </a>

            <div style={{ marginTop: 10 }}>
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

              <a
                href="https://buy.stripe.com/5kQ5kE6PNfxo4G97MmcV201"
                target="_blank"
                rel="noreferrer"
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

            <p style={{ fontSize: 12, color: "#64748b", margin: "14px 0 0", lineHeight: 1.45 }}>
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
        Jersey Village CDJR • Powered by TradeDesk by Solace
      </footer>
    </main>
  );
}

const heroVehicleArt: CSSProperties = {
  position: "absolute",
  top: 24,
  width: "min(25vw, 360px)",
  minWidth: 250,
  height: 300,
  borderRadius: 34,
  overflow: "hidden",
  background: "#0f172a",
  border: "1px solid rgba(15,23,42,0.08)",
  boxShadow: "0 30px 80px rgba(15,23,42,0.16)",
  transform: "translateY(6px)",
};

const heroVehicleImage: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const inventoryTopBadge: CSSProperties = {
  position: "absolute",
  top: 14,
  left: 14,
  right: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 15,
  background: "rgba(255,255,255,0.94)",
  color: "#0f172a",
  boxShadow: "0 14px 34px rgba(0,0,0,0.18)",
};

const inventoryTopTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 950,
  letterSpacing: "-0.01em",
  lineHeight: 1,
};

const inventoryTopAction: CSSProperties = {
  padding: "6px 8px",
  borderRadius: 999,
  background: "#b91c1c",
  color: "white",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const vehicleArtOverlay: CSSProperties = {
  position: "absolute",
  left: 14,
  right: 14,
  bottom: 14,
  padding: "12px 13px",
  borderRadius: 18,
  background: "rgba(15,23,42,0.78)",
  color: "white",
  backdropFilter: "blur(12px)",
  textAlign: "left",
  display: "grid",
  gap: 3,
  fontSize: 12,
  lineHeight: 1.25,
  boxShadow: "0 16px 34px rgba(0,0,0,0.26)",
};

const heroPill: CSSProperties = {
  padding: "7px 10px",
  borderRadius: 999,
  background: "white",
  border: "1px solid #e2e8f0",
};

const dealerClarityCard: CSSProperties = {
  padding: "12px 13px",
  borderRadius: 17,
  background: "white",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
};

const dealerClarityTitle: CSSProperties = {
  display: "block",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 4,
};

const dealerClarityBody: CSSProperties = {
  display: "block",
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.35,
  fontWeight: 700,
};

const advantageCard: CSSProperties = {
  padding: 18,
  borderRadius: 21,
  background: "white",
  border: "1px solid #e2e8f0",
  boxShadow: "0 14px 36px rgba(15,23,42,0.06)",
};

const darkPill: CSSProperties = {
  padding: "8px 11px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#e2e8f0",
  fontSize: 12,
  fontWeight: 900,
};

const primaryBtn: CSSProperties = {
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

const secondaryBtn: CSSProperties = {
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
