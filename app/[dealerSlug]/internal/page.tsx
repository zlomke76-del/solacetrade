"use client";

import TradeDesk from "../../../components/TradeDesk";

type InternalTradeDeskPageProps = {
  params: {
    dealerSlug: string;
  };
};

function formatDealerName(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function InternalTradeDeskPage({
  params,
}: InternalTradeDeskPageProps) {
  const dealerSlug = params.dealerSlug;
  const dealerName = formatDealerName(dealerSlug);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.18), transparent 34%), #0f172a",
        color: "#0f172a",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "18px",
      }}
    >
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto 18px",
          color: "white",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "7px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Internal Trade Desk
        </div>

        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "clamp(32px, 6vw, 56px)",
            lineHeight: 0.96,
            letterSpacing: "-0.055em",
          }}
        >
          Sales-floor trade packet.
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: 740,
            color: "#cbd5e1",
            lineHeight: 1.6,
          }}
        >
          Capture five vehicle photos, attach the customer name and deal number,
          then route the packet to the used car manager for review and approval.
        </p>

        <p
          style={{
            margin: "10px 0 0",
            color: "#94a3b8",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          Dealer: {dealerName}
        </p>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 36 }}>
        <TradeDesk mode="internal" dealerSlug={dealerSlug} />
      </section>
    </main>
  );
}
