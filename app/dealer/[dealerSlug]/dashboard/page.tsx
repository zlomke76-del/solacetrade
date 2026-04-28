import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getDealerBySlug,
  SOLACETRADE_SCHEMA,
  formatMoney,
  formatDistance,
  normalizeCurrency,
  normalizeDistanceUnit,
} from "@/lib/solacetrade";

type PageProps = {
  params: {
    dealerSlug: string;
  };
};

type TradeLeadRow = {
  id: string;
  status: string;
  mode: string;
  customer_name: string | null;
  customer_contact: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_intent: string | null;
  salesperson: string | null;
  vin: string | null;
  mileage: number | null;
  mileage_unit: string | null;
  offer_amount: number | null;
  offer_range_low: number | null;
  offer_range_high: number | null;
  offer_currency: string | null;
  valuation_market: string | null;
  confidence: string | null;
  admissibility: string | null;
  photo_count: number | null;
  created_at: string;
  updated_at: string;
  value_payload: Record<string, unknown> | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getVehicleLabel(payload: Record<string, unknown>) {
  const vehicle = asObject(payload.vehicle);

  return [
    payload.vehicleYear || payload.year || vehicle.year,
    payload.vehicleMake || payload.make || vehicle.make,
    payload.vehicleModel || payload.model || vehicle.model,
    payload.vehicleTrim || payload.trim || vehicle.trim,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusColor(status: string) {
  if (status === "valued") return "#166534";
  if (status === "submitted") return "#075985";
  if (status === "scanned") return "#92400e";
  return "#334155";
}

function statusBackground(status: string) {
  if (status === "valued") return "#dcfce7";
  if (status === "submitted") return "#e0f2fe";
  if (status === "scanned") return "#fef3c7";
  return "#f1f5f9";
}

export default async function DealerDashboardPage({ params }: PageProps) {
  const dealer = await getDealerBySlug(params.dealerSlug);

  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("trade_intakes")
    .select(
      [
        "id",
        "status",
        "mode",
        "customer_name",
        "customer_contact",
        "customer_email",
        "customer_phone",
        "customer_intent",
        "salesperson",
        "vin",
        "mileage",
        "mileage_unit",
        "offer_amount",
        "offer_range_low",
        "offer_range_high",
        "offer_currency",
        "valuation_market",
        "confidence",
        "admissibility",
        "photo_count",
        "created_at",
        "updated_at",
        "value_payload",
      ].join(", ")
    )
    .eq("dealer_id", dealer.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<TradeLeadRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const leads = data || [];
  const totalLeads = leads.length;
  const valuedLeads = leads.filter((lead) => lead.status === "valued").length;
  const submittedLeads = leads.filter((lead) => lead.status === "submitted").length;
  const scannedLeads = leads.filter((lead) => lead.status === "scanned").length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        color: "#0f172a",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          background: "#0b0b0b",
          color: "white",
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#cbd5e1",
              marginBottom: 5,
            }}
          >
            TradeDesk CRM
          </div>
          <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.04em" }}>
            {dealer.name}
          </h1>
        </div>

        <Link
          href={`/${dealer.slug}`}
          style={{
            color: "white",
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 999,
            padding: "9px 12px",
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          View trade page
        </Link>
      </header>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {[
            ["Total leads", totalLeads],
            ["Scanned", scannedLeads],
            ["Valued", valuedLeads],
            ["Submitted", submittedLeads],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: 16,
                boxShadow: "0 14px 34px rgba(15,23,42,0.05)",
              }}
            >
              <div
                style={{
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {label}
              </div>
              <strong style={{ display: "block", marginTop: 7, fontSize: 30 }}>
                {value}
              </strong>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 22,
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Dealer leads</h2>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
                Every trade scan captured for this dealership.
              </p>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Dealer scoped by ID
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 980,
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569" }}>
                  {[
                    "Lead",
                    "Vehicle",
                    "VIN / Mileage",
                    "Offer",
                    "Status",
                    "Photos",
                    "Created",
                    "",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        borderBottom: "1px solid #e2e8f0",
                        fontSize: 11,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: 28,
                        color: "#64748b",
                        textAlign: "center",
                        fontWeight: 800,
                      }}
                    >
                      No trade leads yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const payload = asObject(lead.value_payload);
                    const currency = normalizeCurrency(lead.offer_currency);
                    const unit = normalizeDistanceUnit(lead.mileage_unit);
                    const vehicleLabel =
                      getVehicleLabel(payload) || "Vehicle pending decode";
                    const contact =
                      lead.customer_email ||
                      lead.customer_phone ||
                      lead.customer_contact ||
                      "No contact yet";

                    return (
                      <tr key={lead.id}>
                        <td
                          style={{
                            padding: "13px 14px",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "top",
                          }}
                        >
                          <strong style={{ display: "block", fontSize: 14 }}>
                            {lead.customer_name || "Unnamed lead"}
                          </strong>
                          <span style={{ display: "block", color: "#64748b", marginTop: 3 }}>
                            {contact}
                          </span>
                          {lead.customer_intent ? (
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: 7,
                                padding: "5px 8px",
                                borderRadius: 999,
                                background: "#f1f5f9",
                                fontSize: 11,
                                fontWeight: 900,
                                color: "#334155",
                              }}
                            >
                              {lead.customer_intent}
                            </span>
                          ) : null}
                        </td>

                        <td
                          style={{
                            padding: "13px 14px",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "top",
                          }}
                        >
                          <strong>{vehicleLabel}</strong>
                          <span style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                            {lead.salesperson ? `Salesperson: ${lead.salesperson}` : "Unassigned"}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: "13px 14px",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "top",
                          }}
                        >
                          <strong style={{ display: "block" }}>
                            {lead.vin || "VIN pending"}
                          </strong>
                          <span style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                            {formatDistance(lead.mileage, unit)}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: "13px 14px",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "top",
                          }}
                        >
                          <strong>
                            {formatMoney(lead.offer_amount, currency)}
                          </strong>
                          {lead.offer_range_low && lead.offer_range_high ? (
                            <span style={{ display: "block", color: "#64748b", marginTop: 4 }}>
                              {formatMoney(lead.offer_range_low, currency)} -{" "}
                              {formatMoney(lead.offer_range_high, currency)}
                            </span>
                          ) : null}
                        </td>

                        <td
                          style={{
                            padding: "13px 14px",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "top",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "6px 9px",
                              borderRadius: 999,
                              background: statusBackground(lead.status),
                              color: statusColor(lead.status),
                              fontSize: 11,
                              fontWeight: 900,
                              textTransform: "uppercase",
                            }}
                          >
                            {lead.status}
                          </span>
                          {lead.admissibility ? (
                            <span style={{ display: "block", color: "#64748b", marginTop: 7 }}>
                              {lead.admissibility}
                            </span>
                          ) : null}
                        </td>

                        <td
                          style={{
                            padding: "13px 14px",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "top",
                          }}
                        >
                          <strong>{lead.photo_count || 0}/5</strong>
                        </td>

                        <td
                          style={{
                            padding: "13px 14px",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "top",
                            color: "#64748b",
                          }}
                        >
                          {formatDate(lead.created_at)}
                        </td>

                        <td
                          style={{
                            padding: "13px 14px",
                            borderBottom: "1px solid #e2e8f0",
                            verticalAlign: "top",
                            textAlign: "right",
                          }}
                        >
                          <Link
                            href={`/dealer/${dealer.slug}/leads/${lead.id}`}
                            style={{
                              color: "#b91c1c",
                              fontWeight: 900,
                              textDecoration: "none",
                            }}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
