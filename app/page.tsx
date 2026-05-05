"use client";

import TradeDesk from "../components/TradeDesk";
import type { CSSProperties } from "react";

const DEMO_DEALER_SLUG = "jerseyvillagecdjr";
const DEMO_DEALER_NAME = "Jersey Village Chrysler Jeep Dodge Ram";
const DEMO_BRAND_COLOR = "#b91c1c";
const DEMO_MANAGER_EMAIL = "manager@dealer.com";

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#0f172a",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        html, body { max-width: 100%; overflow-x: hidden; }

        .dashboard-mobile-preview { display: none; }

        @media (max-width: 1280px) {
          .hero-vehicle-art { width: 230px !important; height: 230px !important; top: 36px !important; }
          .hero-copy-wrap { max-width: 620px !important; }
          .hero-title { font-size: clamp(34px, 4.8vw, 50px) !important; line-height: 0.98 !important; }
        }

        @media (max-width: 1120px) {
          .hero-vehicle-art { width: 210px !important; height: 220px !important; }
          .hero-copy-wrap { max-width: 560px !important; }
          .hero-title { font-size: clamp(30px, 4.4vw, 44px) !important; letter-spacing: -0.048em !important; }
        }

        @media (max-width: 980px) {
          .hero-vehicle-art { display: none !important; }
          .dealer-clarity-grid { grid-template-columns: 1fr !important; }
          .dealer-signup-grid { grid-template-columns: 1fr !important; }
          .trade-flow-grid { grid-template-columns: 1fr !important; }
          .manager-review-card { order: 2; position: relative !important; top: auto !important; }
          .flow-arrow { display: none !important; }
          .scan-card-wrap { order: 1; }
        }

        @media (max-width: 720px) {
          .site-header {
            position: relative !important;
            top: auto !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 8px !important;
            padding: 10px 12px !important;
          }

          .dealer-name {
            font-size: 12px !important;
            line-height: 1.15 !important;
            max-width: 100% !important;
          }

          .top-nav {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 6px !important;
            font-size: 11px !important;
          }

          .top-nav span {
            min-width: 0 !important;
            text-align: center !important;
            padding: 7px 4px !important;
            border-radius: 999px !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
          }

          .vehicle-scan-section { padding-left: 10px !important; padding-right: 10px !important; }
          .dealer-packet-header { align-items: flex-start !important; flex-direction: column !important; }
          .dealer-packet-title { text-align: left !important; }
          .manager-review-topline { align-items: flex-start !important; flex-direction: column !important; }
          .dashboard-preview-header { display: grid !important; grid-template-columns: 1fr !important; }
          .dashboard-preview-link { width: 100% !important; }
        }

        @media (max-width: 620px) {
          .sales-strip { font-size: 11px !important; padding: 7px 10px !important; line-height: 1.25 !important; }
          .hero-section { padding: 22px 12px 16px !important; }
          .hero-title { font-size: clamp(31px, 10vw, 42px) !important; line-height: 0.96 !important; }
          .scan-outer-card { padding: 8px !important; border-radius: 24px !important; }
          .scan-inner-card { border-radius: 19px !important; }
          .manager-review-card { padding: 14px !important; border-radius: 24px !important; }
          .live-internal-desk-shell { max-height: none !important; overflow: visible !important; }
          .dashboard-preview-section { padding: 14px !important; border-radius: 24px !important; margin-top: 16px !important; }
          .dashboard-preview-title { font-size: 24px !important; line-height: 1.02 !important; }
          .dashboard-preview-copy { font-size: 13px !important; }

          .dashboard-frame-shell { display: none !important; }
          .dashboard-mobile-preview { display: grid !important; gap: 12px !important; }
        }
      `}</style>

      <div className="sales-strip" style={salesStrip}>
        Sales: (713) 555-0188 • 17400 Northwest Fwy, Jersey Village, TX
      </div>

      <header className="site-header" style={siteHeader}>
        <strong className="dealer-name" style={{ fontSize: 14 }}>
          Jersey Village Chrysler Jeep Dodge Ram
        </strong>
        <nav className="top-nav" style={topNav}>
          <span>New</span>
          <span>Used</span>
          <span>Service</span>
          <span style={{ color: "#b91c1c" }}>Trade</span>
        </nav>
      </header>

      <section className="hero-section" style={heroSection}>
        <div className="hero-vehicle-art" style={{ ...heroVehicleArt, left: 24 }}>
          <img src="/images/jeep_01.png" alt="Baja-style Jeep on sand dunes" style={heroVehicleImage} />
          <div style={inventoryTopBadge}>
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
          <div style={inventoryTopBadge}>
            <strong style={inventoryTopTitle}>New Ram Inventory</strong>
            <span style={inventoryTopAction}>View all</span>
          </div>
          <div style={vehicleArtOverlay}>
            <strong>Ram 1500 • Heavy Duty • Work Trucks</strong>
            <span>Get a real trade offer and shop trucks with confidence.</span>
          </div>
        </div>

        <div className="hero-copy-wrap" style={heroCopyWrap}>
          <div style={eyebrowRed}>TradeDesk by Solace</div>
          <h1 className="hero-title" style={heroTitle}>Real offer in seconds. No games.</h1>
          <p style={heroSubhead}>Built from your actual vehicle — not a guess.</p>
          <p style={heroSmallCopy}>Scan your car. See your offer instantly.</p>
          <a href="#vehicle-scan" style={heroCta}>Get My Real Offer</a>
          <p style={heroFinePrint}>Final value confirmed upon inspection.</p>
          <p style={heroPathLine}>Trade value first. Inventory next. One clean path.</p>
        </div>
      </section>

      <section id="vehicle-scan" className="vehicle-scan-section" style={vehicleScanSection}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={dealerGetsBadge}>This is what the dealer gets</div>
          <h2 style={sectionTitle}>From scan to desk — one clean flow.</h2>
          <p style={sectionCopy}>
            Customers scan their vehicle, receive a real offer response, and your team gets a manager-ready review packet backed by real vehicle data.
          </p>
        </div>

        <div style={tradeFlowShell}>
          <div className="trade-flow-grid" style={tradeFlowGrid}>
            <div className="scan-card-wrap" style={scanColumn}>
              <div className="scan-outer-card" style={scanOuterCard}>
                <div className="scan-inner-card" style={scanInnerCard}>
                  <TradeDesk mode="customer" dealerSlug={DEMO_DEALER_SLUG} />
                </div>
              </div>

              <div style={dealerPacketBar}>
                <div className="dealer-packet-header" style={dealerPacketHeader}>
                  <span style={dealerPacketEyebrow}>Dealer-ready trade packet</span>
                  <strong className="dealer-packet-title" style={dealerPacketTitle}>Everything your team needs to work the deal faster.</strong>
                </div>

                <div className="dealer-clarity-grid" style={dealerPacketGrid}>
                  <div style={dealerPacketItem}>
                    <span style={dealerPacketIcon}>01</span>
                    <strong style={dealerClarityTitle}>Live on your site</strong>
                    <span style={dealerClarityBody}>Trade capture stays branded to the dealership.</span>
                  </div>
                  <div style={dealerPacketItem}>
                    <span style={dealerPacketIcon}>02</span>
                    <strong style={dealerClarityTitle}>Real vehicle evidence</strong>
                    <span style={dealerClarityBody}>Photos, VIN, mileage, and condition signals.</span>
                  </div>
                  <div style={dealerPacketItem}>
                    <span style={dealerPacketIcon}>03</span>
                    <strong style={dealerClarityTitle}>Immediate next step</strong>
                    <span style={dealerClarityBody}>Customer gets a clean answer while your desk keeps final inspection control.</span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="manager-review-card" style={managerReviewCard}>
              <div className="manager-review-topline" style={managerReviewTopline}>
                <span style={managerReviewBadge}>Live internal desk</span>
                <span style={managerReviewStatus}>Staff intake</span>
              </div>

              <h3 style={managerReviewTitle}>Manager review — ready instantly.</h3>
              <p style={managerReviewCopy}>
                This is the live internal TradeDesk your sales team can use from an internal website, CRM shortcut, or pinned tablet link.
              </p>

              <div className="live-internal-desk-shell" style={liveInternalDeskShell}>
                <TradeDesk
                  mode="internal"
                  dealerSlug={DEMO_DEALER_SLUG}
                  dealerName={DEMO_DEALER_NAME}
                  brandColor={DEMO_BRAND_COLOR}
                  managerEmail={DEMO_MANAGER_EMAIL}
                  routingCcEmails={[]}
                />
              </div>

              <div style={managerBullets}>
                <div style={managerBulletItem}><span style={managerBulletCheck}>✓</span><span>Sales staff can create manager packets without CRM access.</span></div>
                <div style={managerBulletItem}><span style={managerBulletCheck}>✓</span><span>VIN, mileage, condition photos, and deal context route to the desk.</span></div>
                <div style={managerBulletItem}><span style={managerBulletCheck}>✓</span><span>Dealer keeps final inspection and offer control.</span></div>
              </div>
            </aside>
          </div>

          <div className="flow-arrow" style={flowArrow} aria-hidden="true">→</div>
        </div>

        <div className="dashboard-preview-section" style={dashboardPreviewSection}>
          <div className="dashboard-preview-header" style={dashboardPreviewHeader}>
            <div>
              <span style={dashboardPreviewEyebrow}>Live CRM projection</span>
              <h3 className="dashboard-preview-title" style={dashboardPreviewTitle}>Watch the dashboard update below.</h3>
              <p className="dashboard-preview-copy" style={dashboardPreviewCopy}>
                The customer scan and internal sales intake both feed the live dealer-scoped dashboard. This preview lets dealers see the operational result without leaving the demo page.
              </p>
            </div>
            <a className="dashboard-preview-link" href={`/dealer/${DEMO_DEALER_SLUG}/dashboard`} target="_blank" rel="noreferrer" style={dashboardPreviewLink}>
              Open full dashboard
            </a>
          </div>

          <div className="dashboard-frame-shell" style={dashboardFrameShell}>
            <iframe title="Live SolaceTrade dealer dashboard preview" src={`/dealer/${DEMO_DEALER_SLUG}/dashboard`} style={dashboardFrame} />
          </div>

          <div className="dashboard-mobile-preview" style={dashboardMobilePreview}>
            <div style={mobileCrmHero}>
              <span style={mobileCrmEyebrow}>TradeDesk CRM</span>
              <strong style={mobileCrmDealer}>Jersey Village CDJR</strong>
              <a href={`/dealer/${DEMO_DEALER_SLUG}/dashboard`} target="_blank" rel="noreferrer" style={mobileCrmButton}>
                View full dashboard
              </a>
            </div>

            <div style={mobileMetricGrid}>
              <div style={mobileMetricCard}><span>Opportunities</span><strong>9</strong></div>
              <div style={mobileMetricCard}><span>Completed scans</span><strong>7</strong></div>
              <div style={mobileMetricCard}><span>Valuations</span><strong>2</strong></div>
              <div style={mobileMetricCard}><span>Named leads</span><strong>5</strong></div>
            </div>

            <div style={mobileOpportunityCard}>
              <strong style={mobileOpportunityTitle}>Dealer opportunities</strong>
              <span style={mobileOpportunityCopy}>Real-time trade scans captured for this dealership.</span>
              <span style={mobileOpportunityBadge}>Live dealer-scoped view</span>
            </div>
          </div>
        </div>
      </section>

      <section style={dealerSignupSection}>
        <div className="dealer-signup-grid" style={dealerSignupGrid}>
          <div style={dealerSignupCopyCard}>
            <div style={dealerSignupBadge}>Dealer Signup</div>
            <h2 style={dealerSignupTitle}>Turn your trade page into a real intake engine.</h2>
            <p style={dealerSignupCopy}>TradeDesk gives your dealership a branded scan flow, structured vehicle evidence, and a faster path from customer interest to workable offer.</p>
            <div style={pillWrap}>
              <span style={darkPill}>Website-ready</span>
              <span style={darkPill}>Evidence-based</span>
              <span style={darkPill}>Dealer-controlled</span>
            </div>
          </div>

          <div style={dealerAccessCard}>
            <div style={liveBadge}>Live</div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Dealer Access</h3>
            <p style={dealerAccessCopy}>Fill out the setup form first. We build your dealer record, then send you to secure checkout.</p>
            <a href="/signup" style={primaryBtn}><span>Start Setup</span><span>$595/mo</span></a>
            <div style={{ marginTop: 10 }}>
              <div style={waiverBadge}>$299 SETUP FEE WAIVED BEFORE JULY 1</div>
              <div aria-disabled="true" style={disabledSetupFeeBox}><span>Setup Fee — $299</span><span>Waived</span></div>
            </div>
            <p style={dealerFinePrint}>Dealers complete setup first. The $299 setup fee is waived for subscriptions started before July 1.</p>
          </div>
        </div>
      </section>

      <footer style={footerStyle}>Jersey Village CDJR • Powered by TradeDesk by Solace</footer>
    </main>
  );
}

const salesStrip: CSSProperties = { background: "#0b0b0b", color: "white", padding: "8px 16px", fontSize: 13, fontWeight: 800, textAlign: "center" };
const siteHeader: CSSProperties = { background: "rgba(255,255,255,0.94)", backdropFilter: "blur(14px)", borderBottom: "1px solid #e5e7eb", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 20 };
const topNav: CSSProperties = { display: "flex", gap: 16, fontSize: 13, fontWeight: 900 };
const heroSection: CSSProperties = { position: "relative", overflow: "hidden", padding: "30px 18px 18px", background: "radial-gradient(circle at 50% 0%, rgba(185,28,28,0.13), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)", textAlign: "center" };
const heroCopyWrap: CSSProperties = { maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 2 };
const heroTitle: CSSProperties = { margin: "0 auto 10px", maxWidth: 780, fontSize: "clamp(32px, 5vw, 62px)", lineHeight: 0.95, letterSpacing: "-0.058em" };
const heroSubhead: CSSProperties = { margin: "0 auto 6px", maxWidth: 620, color: "#0f172a", fontSize: "clamp(16px, 2.2vw, 20px)", fontWeight: 700 };
const heroSmallCopy: CSSProperties = { margin: "0 auto 14px", color: "#64748b", fontSize: 14, fontWeight: 600 };
const heroFinePrint: CSSProperties = { margin: "10px auto 0", color: "#64748b", fontSize: 12, fontWeight: 700 };
const heroPathLine: CSSProperties = { margin: "14px auto 0", color: "#334155", fontSize: 12, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" };
const vehicleScanSection: CSSProperties = { maxWidth: 1160, margin: "0 auto", padding: "0 14px 34px" };
const sectionTitle: CSSProperties = { margin: "0 auto 6px", color: "#0f172a", fontSize: "clamp(22px, 3vw, 30px)", lineHeight: 1.08, letterSpacing: "-0.04em" };
const sectionCopy: CSSProperties = { margin: "0 auto", maxWidth: 680, color: "#475569", fontSize: 14, fontWeight: 700, lineHeight: 1.45 };
const eyebrowRed: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 };
const heroCta: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "14px 21px", borderRadius: 16, background: "#b91c1c", color: "white", fontSize: 15, fontWeight: 900, textDecoration: "none", boxShadow: "0 18px 42px rgba(185,28,28,0.24)" };
const dealerGetsBadge: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "7px 12px", borderRadius: 999, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 };
const scanOuterCard: CSSProperties = { padding: 12, borderRadius: 30, border: "2px solid #b91c1c", background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))", boxShadow: "0 28px 80px rgba(15,23,42,0.16)" };
const scanInnerCard: CSSProperties = { borderRadius: 24, border: "1px solid #e2e8f0", overflow: "hidden", background: "white" };
const dealerSignupSection: CSSProperties = { padding: "42px 18px", background: "#0f172a", color: "white" };
const dealerSignupGrid: CSSProperties = { maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20, alignItems: "stretch" };
const dealerSignupCopyCard: CSSProperties = { padding: 24, borderRadius: 22, background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 70px rgba(0,0,0,0.28)" };
const dealerSignupBadge: CSSProperties = { display: "inline-flex", padding: "7px 10px", borderRadius: 999, background: "rgba(34,197,94,0.16)", color: "#bbf7d0", fontSize: 11, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 };
const dealerSignupTitle: CSSProperties = { margin: 0, fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 0.96, letterSpacing: "-0.055em" };
const dealerSignupCopy: CSSProperties = { margin: "14px 0 0", color: "#dbeafe", fontSize: 15, lineHeight: 1.55, fontWeight: 700 };
const pillWrap: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 };
const dealerAccessCard: CSSProperties = { padding: 24, borderRadius: 22, background: "white", color: "#0f172a", position: "relative", overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,0.26)" };
const dealerAccessCopy: CSSProperties = { margin: "6px 0 16px", color: "#64748b", fontSize: 13, lineHeight: 1.45, maxWidth: 330 };
const liveBadge: CSSProperties = { position: "absolute", top: 18, right: 18, padding: "7px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 900 };
const waiverBadge: CSSProperties = { background: "#16a34a", color: "white", fontWeight: 900, fontSize: 11, padding: "6px 10px", borderRadius: 999, display: "inline-block", marginBottom: 8 };
const heroVehicleArt: CSSProperties = { position: "absolute", top: 40, width: "min(22vw, 300px)", minWidth: 235, height: 260, borderRadius: 34, overflow: "hidden", background: "#0f172a", border: "1px solid rgba(15,23,42,0.08)", boxShadow: "0 30px 80px rgba(15,23,42,0.16)", transform: "translateY(6px)" };
const heroVehicleImage: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const inventoryTopBadge: CSSProperties = { position: "absolute", top: 14, left: 14, right: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 15, background: "rgba(255,255,255,0.94)", color: "#0f172a", boxShadow: "0 14px 34px rgba(0,0,0,0.18)" };
const inventoryTopTitle: CSSProperties = { fontSize: 13, fontWeight: 950, letterSpacing: "-0.01em", lineHeight: 1 };
const inventoryTopAction: CSSProperties = { padding: "6px 8px", borderRadius: 999, background: "#b91c1c", color: "white", fontSize: 10, fontWeight: 950, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" };
const vehicleArtOverlay: CSSProperties = { position: "absolute", left: 14, right: 14, bottom: 14, padding: "12px 13px", borderRadius: 18, background: "rgba(15,23,42,0.78)", color: "white", backdropFilter: "blur(12px)", textAlign: "left", display: "grid", gap: 3, fontSize: 12, lineHeight: 1.25, boxShadow: "0 16px 34px rgba(0,0,0,0.26)" };
const tradeFlowShell: CSSProperties = { position: "relative" };
const tradeFlowGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", justifyContent: "center", alignItems: "start", gap: 20 };
const flowArrow: CSSProperties = { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 38, height: 38, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "white", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 24, fontWeight: 900, opacity: 0.9, pointerEvents: "none", boxShadow: "0 16px 38px rgba(185,28,28,0.18)", zIndex: 3 };
const scanColumn: CSSProperties = { minWidth: 0 };
const managerReviewCard: CSSProperties = { borderRadius: 30, padding: 18, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #e2e8f0", boxShadow: "0 28px 80px rgba(15,23,42,0.14)", position: "sticky", top: 84 };
const managerReviewTopline: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 };
const managerReviewBadge: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "7px 10px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" };
const managerReviewStatus: CSSProperties = { color: "#64748b", fontSize: 11, fontWeight: 950, letterSpacing: "0.06em", textTransform: "uppercase" };
const managerReviewTitle: CSSProperties = { margin: 0, color: "#0f172a", fontSize: "clamp(24px, 2.4vw, 32px)", lineHeight: 0.98, letterSpacing: "-0.05em" };
const managerReviewCopy: CSSProperties = { margin: "10px 0 14px", color: "#475569", fontSize: 14, fontWeight: 750, lineHeight: 1.45 };
const liveInternalDeskShell: CSSProperties = { borderRadius: 22, overflow: "hidden", border: "1px solid #cbd5e1", background: "#f8fafc", boxShadow: "0 22px 54px rgba(15,23,42,0.16)", maxHeight: 620, overflowY: "auto" };
const dashboardPreviewSection: CSSProperties = { marginTop: 22, padding: 18, borderRadius: 30, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #e2e8f0", boxShadow: "0 28px 80px rgba(15,23,42,0.12)" };
const dashboardPreviewHeader: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 14 };
const dashboardPreviewEyebrow: CSSProperties = { display: "inline-flex", padding: "7px 10px", borderRadius: 999, background: "#e0f2fe", color: "#075985", fontSize: 10, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 };
const dashboardPreviewTitle: CSSProperties = { margin: 0, color: "#0f172a", fontSize: "clamp(22px, 2.6vw, 30px)", lineHeight: 1, letterSpacing: "-0.045em" };
const dashboardPreviewCopy: CSSProperties = { margin: "7px 0 0", color: "#475569", fontSize: 13, fontWeight: 750, lineHeight: 1.45, maxWidth: 690 };
const dashboardPreviewLink: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 13px", borderRadius: 999, background: "#0f172a", color: "white", fontSize: 12, fontWeight: 950, textDecoration: "none", whiteSpace: "nowrap" };
const dashboardFrameShell: CSSProperties = { borderRadius: 24, overflow: "hidden", border: "1px solid #cbd5e1", background: "#0f172a", boxShadow: "0 22px 54px rgba(15,23,42,0.18)" };
const dashboardFrame: CSSProperties = { display: "block", width: "100%", height: 520, border: 0, background: "white" };
const dashboardMobilePreview: CSSProperties = { display: "none" };
const mobileCrmHero: CSSProperties = { display: "grid", gap: 10, padding: 18, borderRadius: 24, background: "#050505", color: "white" };
const mobileCrmEyebrow: CSSProperties = { color: "#dbeafe", fontSize: 11, fontWeight: 950, letterSpacing: "0.12em", textTransform: "uppercase" };
const mobileCrmDealer: CSSProperties = { fontSize: 26, lineHeight: 0.98, letterSpacing: "-0.05em", maxWidth: 260 };
const mobileCrmButton: CSSProperties = { justifySelf: "start", marginTop: 4, padding: "10px 13px", borderRadius: 999, color: "white", textDecoration: "none", border: "1px solid rgba(255,255,255,0.28)", fontSize: 12, fontWeight: 950 };
const mobileMetricGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 };
const mobileMetricCard: CSSProperties = { minHeight: 92, display: "grid", alignContent: "center", gap: 6, padding: 14, borderRadius: 18, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 12px 28px rgba(15,23,42,0.08)", color: "#0f172a" };
const mobileOpportunityCard: CSSProperties = { display: "grid", gap: 7, padding: 18, borderRadius: 22, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 14px 34px rgba(15,23,42,0.08)" };
const mobileOpportunityTitle: CSSProperties = { color: "#0f172a", fontSize: 20, fontWeight: 950, letterSpacing: "-0.03em" };
const mobileOpportunityCopy: CSSProperties = { color: "#64748b", fontSize: 13, fontWeight: 750, lineHeight: 1.35 };
const mobileOpportunityBadge: CSSProperties = { color: "#64748b", fontSize: 11, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" };
const managerBullets: CSSProperties = { display: "grid", gap: 9, marginTop: 14 };
const managerBulletItem: CSSProperties = { display: "grid", gridTemplateColumns: "24px minmax(0, 1fr)", alignItems: "start", gap: 9, color: "#0f172a", fontSize: 13, fontWeight: 850, lineHeight: 1.28 };
const managerBulletCheck: CSSProperties = { width: 22, height: 22, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#dcfce7", color: "#166534", fontSize: 13, fontWeight: 950 };
const dealerPacketBar: CSSProperties = { width: "100%", boxSizing: "border-box", margin: "14px 0 0", padding: 14, borderRadius: 24, background: "white", border: "1px solid #e2e8f0", boxShadow: "0 18px 46px rgba(15,23,42,0.07)" };
const dealerPacketHeader: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "2px 2px 12px", borderBottom: "1px solid #e2e8f0" };
const dealerPacketEyebrow: CSSProperties = { padding: "7px 10px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontSize: 10, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" };
const dealerPacketTitle: CSSProperties = { color: "#0f172a", fontSize: 13, fontWeight: 950, textAlign: "right", lineHeight: 1.25 };
const dealerPacketGrid: CSSProperties = { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 };
const dealerPacketItem: CSSProperties = { display: "grid", gap: 5, padding: "12px 13px", borderRadius: 17, background: "#f8fafc", border: "1px solid #e2e8f0" };
const dealerPacketIcon: CSSProperties = { width: 28, height: 28, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white", fontSize: 11, fontWeight: 950 };
const dealerClarityTitle: CSSProperties = { display: "block", color: "#0f172a", fontSize: 13, fontWeight: 900, marginBottom: 4 };
const dealerClarityBody: CSSProperties = { display: "block", color: "#64748b", fontSize: 12, lineHeight: 1.35, fontWeight: 700 };
const darkPill: CSSProperties = { padding: "8px 11px", borderRadius: 999, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)", color: "#e2e8f0", fontSize: 12, fontWeight: 900 };
const primaryBtn: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", boxSizing: "border-box", padding: "15px 16px", borderRadius: 15, background: "#16a34a", color: "white", fontWeight: 950, fontSize: 15, textDecoration: "none", boxShadow: "0 14px 30px rgba(22,163,74,0.26)" };
const secondaryBtn: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", boxSizing: "border-box", padding: "15px 16px", borderRadius: 15, background: "#f1f5f9", color: "#0f172a", fontWeight: 950, fontSize: 15, textDecoration: "none", border: "1px solid #e2e8f0" };
const disabledSetupFeeBox: CSSProperties = { ...secondaryBtn, background: "#f1f5f9", color: "#64748b", cursor: "not-allowed", opacity: 0.78 };
const dealerFinePrint: CSSProperties = { fontSize: 12, color: "#64748b", margin: "14px 0 0", lineHeight: 1.45 };
const footerStyle: CSSProperties = { padding: 22, background: "#0b0b0b", color: "white", textAlign: "center", fontSize: 13, fontWeight: 800 };
