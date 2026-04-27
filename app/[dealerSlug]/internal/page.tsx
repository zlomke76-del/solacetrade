import { notFound } from "next/navigation";
import TradeDesk from "../../../components/TradeDesk";
import { getDealerBySlug, formatDealerPhoneLine } from "@/lib/solacetrade";

type InternalPageProps = {
  params: {
    dealerSlug: string;
  };
};

const defaultBrandColor = "#b91c1c";

export async function generateMetadata({ params }: InternalPageProps) {
  try {
    const dealer = await getDealerBySlug(params.dealerSlug);
    return {
      title: `${dealer.name} Internal TradeDesk | SolaceTrade`,
    };
  } catch {
    return {
      title: "Internal TradeDesk | SolaceTrade",
    };
  }
}

export default async function DealerInternalPage({ params }: InternalPageProps) {
  let dealer;

  try {
    dealer = await getDealerBySlug(params.dealerSlug);
  } catch {
    notFound();
  }

  const brandColor = dealer.brand_color || defaultBrandColor;
  const salesLine = formatDealerPhoneLine(dealer);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.12), transparent 34%), #f4f6f8",
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
        Internal TradeDesk • {dealer.name} • {salesLine}
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
        <strong style={{ fontSize: 14 }}>{dealer.name}</strong>
        <nav style={{ display: "flex", gap: 14, fontSize: 13, fontWeight: 900 }}>
          <a href={`/${dealer.slug}`} style={{ color: "#334155", textDecoration: "none" }}>
            Customer View
          </a>
          <span style={{ color: brandColor }}>Internal</span>
        </nav>
      </header>

      <section style={{ maxWidth: 760, margin: "0 auto", padding: "28px 14px 42px" }}>
        <div
          style={{
            marginBottom: 14,
            padding: 14,
            borderRadius: 22,
            background: "white",
            border: "1px solid #e2e8f0",
            boxShadow: "0 16px 42px rgba(15,23,42,0.07)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "7px 10px",
              borderRadius: 999,
              background: "#e0f2fe",
              color: "#075985",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Salesperson Intake
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(28px, 5vw, 46px)",
              lineHeight: 0.98,
              letterSpacing: "-0.055em",
            }}
          >
            Build the manager review packet.
          </h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.5 }}>
            Capture the five required vehicle photos. Packets route to the saved used car manager
            configuration for this dealer.
          </p>
        </div>

        <TradeDesk
          mode="internal"
          dealerSlug={dealer.slug}
          dealerName={dealer.name}
          brandColor={brandColor}
          managerEmail={dealer.lead_email}
          routingCcEmails={dealer.routing_cc_emails || []}
        />
      </section>
    </main>
  );
}
