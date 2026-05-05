import { notFound } from "next/navigation";
import TradeDesk from "@/components/TradeDesk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLACETRADE_SCHEMA } from "@/lib/solacetrade";

type InternalPageProps = {
  params: {
    dealerSlug: string;
  };
  searchParams?: {
    k?: string;
  };
};

type InternalDealer = {
  id: string;
  slug: string;
  name: string;
  brand_color: string | null;
  sales_phone: string | null;
  lead_email: string;
  routing_cc_emails: string[] | null;
  internal_access_key: string | null;
};

const defaultBrandColor = "#b91c1c";
const openInternalDemoSlugs = new Set(
  (process.env.SOLACETRADE_OPEN_INTERNAL_DEMO_SLUGS || "jerseyvillagecdjr")
    .split(",")
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean)
);

function isOpenInternalDemoDealer(slug: string) {
  return openInternalDemoSlugs.has(String(slug || "").trim().toLowerCase());
}

function cleanKey(value: unknown) {
  return String(value || "").trim();
}

function formatInternalSalesLine(dealer: InternalDealer) {
  const phone = String(dealer.sales_phone || "").trim();
  return phone || "Staff intake";
}

async function getInternalDealer(dealerSlug: string) {
  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .select(
      [
        "id",
        "slug",
        "name",
        "brand_color",
        "sales_phone",
        "lead_email",
        "routing_cc_emails",
        "internal_access_key",
      ].join(", ")
    )
    .eq("slug", dealerSlug)
    .maybeSingle<InternalDealer>();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: InternalPageProps) {
  const dealer = await getInternalDealer(params.dealerSlug);

  return {
    title: dealer
      ? `${dealer.name} Internal TradeDesk | SolaceTrade`
      : "Internal TradeDesk | SolaceTrade",
  };
}

export default async function DealerInternalPage({
  params,
  searchParams,
}: InternalPageProps) {
  const dealer = await getInternalDealer(params.dealerSlug);

  if (!dealer) {
    notFound();
  }

  const internalAccessKey = cleanKey(searchParams?.k);
  const isOpenDemo = isOpenInternalDemoDealer(dealer.slug);

  if (!isOpenDemo && (!dealer.internal_access_key || internalAccessKey !== dealer.internal_access_key)) {
    notFound();
  }

  const brandColor = dealer.brand_color || defaultBrandColor;
  const salesLine = formatInternalSalesLine(dealer);

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
          internalAccessKey={isOpenDemo ? "" : internalAccessKey}
        />
      </section>
    </main>
  );
}
