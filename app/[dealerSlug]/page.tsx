import { notFound } from "next/navigation";
import TradeDesk from "../../components/TradeDesk";
import { formatDealerPhoneLine, getDealerBySlug } from "@/lib/solacetrade";

type DealerPageProps = {
  params: {
    dealerSlug: string;
  };
};

const defaultBrandColor = "#b91c1c";

export async function generateMetadata({ params }: DealerPageProps) {
  try {
    const dealer = await getDealerBySlug(params.dealerSlug);

    return {
      title: `${dealer.name} Trade Value | SolaceTrade`,
      description: `Start a guided trade-in scan for ${dealer.name}.`,
    };
  } catch {
    return {
      title: "Dealer Not Found | SolaceTrade",
    };
  }
}

export default async function DealerLandingPage({ params }: DealerPageProps) {
  let dealer;

  try {
    dealer = await getDealerBySlug(params.dealerSlug);
  } catch {
    notFound();
  }

  const brandColor = dealer.brand_color || defaultBrandColor;
  const dealerShortName = dealer.legal_name || dealer.name;
  const salesLine = formatDealerPhoneLine(dealer);

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
          padding: "8px 14px",
          fontSize: 12,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.35,
        }}
      >
        {salesLine}
      </div>

      <header
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid #e5e7eb",
          padding: "11px 14px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <strong
            style={{
              fontSize: 14,
              lineHeight: 1.2,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {dealerShortName}
          </strong>

          <span
            style={{
              flex: "0 0 auto",
              padding: "7px 10px",
              borderRadius: 999,
              background: hexToRgba(brandColor, 0.12),
              color: brandColor,
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Trade Value
          </span>
        </div>
      </header>

      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "14px 10px 28px",
        }}
      >
        <TradeDesk
          mode="customer"
          dealerSlug={dealer.slug}
          dealerName={dealer.name}
          brandColor={brandColor}
        />
      </section>
    </main>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "").trim();
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : cleaned;

  const number = Number.parseInt(normalized, 16);

  if (!Number.isFinite(number)) {
    return `rgba(185,28,28,${alpha})`;
  }

  const r = (number >> 16) & 255;
  const g = (number >> 8) & 255;
  const b = number & 255;

  return `rgba(${r},${g},${b},${alpha})`;
}
