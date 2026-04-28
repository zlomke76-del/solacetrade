import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createSignedPhotoUrls,
  formatDistance,
  formatMoney,
  getDealerBySlug,
  normalizeCurrency,
  normalizeDistanceUnit,
  SOLACETRADE_SCHEMA,
} from "@/lib/solacetrade";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type PageProps = {
  params: {
    dealerSlug: string;
    intakeId: string;
  };
};

type TradeIntake = {
  id: string;
  dealer_id: string;
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
  vehicle_notes: string | null;
  manager_notes: string | null;
  photo_count: number | null;
  llm_model: string | null;
  llm_summary: unknown;
  offer_amount: number | null;
  offer_range_low: number | null;
  offer_range_high: number | null;
  offer_currency: string | null;
  valuation_market: string | null;
  confidence: string | null;
  admissibility: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  value_payload: Record<string, unknown> | null;
};

type TradePhoto = {
  id?: string;
  step_key: string;
  storage_path: string;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_at?: string;
};

type TradeEvent = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown) {
  return String(value || "").trim();
}

function getDealerTimezone(dealer: unknown) {
  const value = textValue(asObject(dealer).timezone);
  return value || "America/Chicago";
}

function getVehicleLabel(payload: Record<string, unknown>) {
  const vehicle = asObject(payload.vehicle);

  return [
    payload.vehicleYear || payload.year || vehicle.year,
    payload.vehicleMake || payload.make || vehicle.make,
    payload.vehicleModel || payload.model || vehicle.model,
    payload.vehicleTrim || payload.trim || vehicle.trim,
  ]
    .map(textValue)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getVehicleDetails(payload: Record<string, unknown>) {
  const vehicle = asObject(payload.vehicle);

  return [
    ["Body", payload.vehicleBodyClass || vehicle.bodyClass],
    ["Drive", payload.vehicleDriveType || vehicle.driveType],
    ["Engine", payload.vehicleEngine || vehicle.engine],
    ["Fuel", payload.vehicleFuelType || vehicle.fuelType],
    ["Doors", payload.vehicleDoors || vehicle.doors],
    ["Transmission", payload.vehicleTransmission || vehicle.transmission],
    ["Series", payload.vehicleSeries || vehicle.series],
  ]
    .map(([label, value]) => [label, textValue(value)])
    .filter(([, value]) => Boolean(value));
}

function getOptions(payload: Record<string, unknown>) {
  const vehicle = asObject(payload.vehicle);
  const options = [
    ...asArray(payload.vehicleOptions),
    ...asArray(vehicle.options),
    ...asArray(payload.optionSignals),
  ]
    .map(textValue)
    .filter(Boolean);

  return Array.from(new Set(options.map((item) => item.trim()))).slice(0, 16);
}

function getConditionNotes(payload: Record<string, unknown>) {
  return asArray(payload.conditionNotes).map(textValue).filter(Boolean);
}

function getDealerReviewNotes(payload: Record<string, unknown>) {
  return asArray(payload.dealerReviewNotes).map(textValue).filter(Boolean);
}

function getSummaryLines(payload: Record<string, unknown>, llmSummary: unknown) {
  const payloadLines = asArray(payload.summaryLines).map(textValue).filter(Boolean);
  if (payloadLines.length) return payloadLines;

  if (Array.isArray(llmSummary)) {
    return llmSummary.map(textValue).filter(Boolean);
  }

  if (typeof llmSummary === "string") {
    return llmSummary
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function formatDate(value: string | null | undefined, timezone: string) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function statusColor(status: string) {
  if (status === "valued") return "#166534";
  if (status === "submitted") return "#075985";
  if (status === "scanned") return "#92400e";
  if (status === "new") return "#334155";
  return "#475569";
}

function statusBackground(status: string) {
  if (status === "valued") return "#dcfce7";
  if (status === "submitted") return "#e0f2fe";
  if (status === "scanned") return "#fef3c7";
  if (status === "new") return "#f1f5f9";
  return "#f8fafc";
}

function sectionCardStyle(): React.CSSProperties {
  return {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 18px 48px rgba(15,23,42,0.07)",
  };
}

function miniCardStyle(): React.CSSProperties {
  return {
    padding: 13,
    borderRadius: 16,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    minWidth: 0,
  };
}

function MiniCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={miniCardStyle()}>
      <span
        style={{
          display: "block",
          color: "#64748b",
          fontSize: 11,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 5,
        }}
      >
        {label}
      </span>
      <strong
        style={{
          display: "block",
          color: "#0f172a",
          fontSize: 14,
          lineHeight: 1.35,
          overflowWrap: "anywhere",
        }}
      >
        {value || "Not set"}
      </strong>
    </div>
  );
}

export default async function DealerLeadDetailPage({ params }: PageProps) {
  noStore();

  const dealer = await getDealerBySlug(params.dealerSlug);
  const dealerTimezone = getDealerTimezone(dealer);

  const { data: intake, error: intakeError } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("trade_intakes")
    .select(
      [
        "id",
        "dealer_id",
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
        "vehicle_notes",
        "manager_notes",
        "photo_count",
        "llm_model",
        "llm_summary",
        "offer_amount",
        "offer_range_low",
        "offer_range_high",
        "offer_currency",
        "valuation_market",
        "confidence",
        "admissibility",
        "submitted_at",
        "created_at",
        "updated_at",
        "value_payload",
      ].join(", ")
    )
    .eq("id", params.intakeId)
    .eq("dealer_id", dealer.id)
    .maybeSingle<TradeIntake>();

  if (intakeError) {
    throw new Error(intakeError.message);
  }

  if (!intake) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f6f8",
          color: "#0f172a",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: 20,
        }}
      >
        <div style={{ ...sectionCardStyle(), maxWidth: 520 }}>
          <h1 style={{ margin: 0, fontSize: 26 }}>Lead not found</h1>
          <p style={{ color: "#64748b", lineHeight: 1.5 }}>
            This opportunity either does not exist or does not belong to this dealership.
          </p>
          <Link
            href={`/dealer/${dealer.slug}/dashboard`}
            style={{ color: "#b91c1c", fontWeight: 900, textDecoration: "none" }}
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { data: photoRows, error: photoError } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("trade_photos")
    .select("id, step_key, storage_path, original_filename, content_type, size_bytes, created_at")
    .eq("dealer_id", dealer.id)
    .eq("intake_id", intake.id)
    .order("created_at", { ascending: true })
    .returns<TradePhoto[]>();

  if (photoError) {
    throw new Error(photoError.message);
  }

  const photos = photoRows || [];
  const signedPhotos = await createSignedPhotoUrls(
    photos.map((photo) => photo.storage_path)
  );

  const photosWithUrls = photos.map((photo) => ({
    ...photo,
    signedUrl:
      signedPhotos.find((signed) => signed.path === photo.storage_path)?.signedUrl ||
      null,
  }));

  const { data: eventRows } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("trade_events")
    .select("id, event_type, payload, created_at")
    .eq("dealer_id", dealer.id)
    .eq("intake_id", intake.id)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<TradeEvent[]>();

  const payload = asObject(intake.value_payload);
  const marketContext = asObject(payload.marketContext);
  const currency = normalizeCurrency(
    intake.offer_currency || payload.offerCurrency,
    marketContext.country
  );
  const unit = normalizeDistanceUnit(intake.mileage_unit || payload.mileageUnit);
  const vehicleLabel = getVehicleLabel(payload) || "Vehicle pending decode";
  const vehicleDetails = getVehicleDetails(payload);
  const options = getOptions(payload);
  const summaryLines = getSummaryLines(payload, intake.llm_summary);
  const conditionNotes = getConditionNotes(payload);
  const dealerReviewNotes = getDealerReviewNotes(payload);
  const customerName = intake.customer_name || "New opportunity";
  const customerContact =
    intake.customer_email ||
    intake.customer_phone ||
    intake.customer_contact ||
    "Customer info pending";

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
          <h1 style={{ margin: 0, fontSize: 25, letterSpacing: "-0.04em" }}>
            {customerName}
          </h1>
          <p style={{ margin: "5px 0 0", color: "#cbd5e1", fontSize: 13 }}>
            {dealer.name}
          </p>
        </div>

        <Link
          href={`/dealer/${dealer.slug}/dashboard`}
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
          Back to dashboard
        </Link>
      </header>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <section style={sectionCardStyle()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              <div>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 9px",
                    borderRadius: 999,
                    background: statusBackground(intake.status),
                    color: statusColor(intake.status),
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {intake.status}
                </span>
                <h2 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.045em" }}>
                  {vehicleLabel}
                </h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", lineHeight: 1.45 }}>
                  {customerContact}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Offer
                </div>
                <strong style={{ display: "block", marginTop: 5, fontSize: 26 }}>
                  {formatMoney(intake.offer_amount, currency)}
                </strong>
                {intake.offer_range_low && intake.offer_range_high ? (
                  <span style={{ display: "block", marginTop: 3, color: "#64748b" }}>
                    {formatMoney(intake.offer_range_low, currency)} -{" "}
                    {formatMoney(intake.offer_range_high, currency)}
                  </span>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <MiniCard label="VIN" value={intake.vin || textValue(payload.detectedVin) || "VIN pending"} />
              <MiniCard label="Mileage" value={formatDistance(intake.mileage, unit)} />
              <MiniCard label="Photos" value={`${intake.photo_count || photos.length}/5`} />
              <MiniCard label="Intent" value={intake.customer_intent || "Not selected"} />
              <MiniCard label="Salesperson" value={intake.salesperson || "Unassigned"} />
              <MiniCard label="Admissibility" value={intake.admissibility || textValue(payload.admissibility)} />
              <MiniCard label="Confidence" value={intake.confidence || textValue(payload.confidence)} />
              <MiniCard label="Market" value={intake.valuation_market || textValue(marketContext.valuationMarket)} />
              <MiniCard label="Created" value={formatDate(intake.created_at, dealerTimezone)} />
            </div>

            {vehicleDetails.length ? (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Vehicle details</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {vehicleDetails.map(([label, value]) => (
                    <MiniCard key={String(label)} label={String(label)} value={String(value)} />
                  ))}
                </div>
              </div>
            ) : null}

            {options.length ? (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Configuration / option signals</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {options.map((option) => (
                    <span
                      key={option}
                      style={{
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section style={sectionCardStyle()}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Customer / desk notes</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <MiniCard label="Customer name" value={customerName} />
              <MiniCard label="Customer contact" value={customerContact} />
              <MiniCard label="Mode" value={intake.mode} />
              <MiniCard label="Submitted" value={formatDate(intake.submitted_at, dealerTimezone)} />
            </div>

            {intake.manager_notes ? (
              <div style={{ marginTop: 14, ...miniCardStyle() }}>
                <span
                  style={{
                    display: "block",
                    color: "#64748b",
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: 6,
                  }}
                >
                  Manager notes
                </span>
                <p style={{ margin: 0, color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {intake.manager_notes}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <section style={{ ...sectionCardStyle(), marginTop: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Photos</h2>
          <p style={{ margin: "5px 0 14px", color: "#64748b", fontSize: 13 }}>
            Guided vehicle evidence captured for this opportunity.
          </p>

          {photosWithUrls.length === 0 ? (
            <div style={{ color: "#64748b", fontWeight: 800 }}>No photos uploaded yet.</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              {photosWithUrls.map((photo) => (
                <a
                  key={`${photo.step_key}-${photo.storage_path}`}
                  href={photo.signedUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "block",
                    textDecoration: "none",
                    color: "#0f172a",
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#f8fafc",
                  }}
                >
                  {photo.signedUrl ? (
                    <img
                      src={photo.signedUrl}
                      alt={photo.step_key}
                      style={{
                        width: "100%",
                        height: 120,
                        objectFit: "cover",
                        display: "block",
                        background: "#e2e8f0",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 120,
                        display: "grid",
                        placeItems: "center",
                        color: "#64748b",
                        fontWeight: 900,
                      }}
                    >
                      No preview
                    </div>
                  )}
                  <div style={{ padding: 10 }}>
                    <strong style={{ display: "block", fontSize: 13, textTransform: "capitalize" }}>
                      {photo.step_key}
                    </strong>
                    <span style={{ display: "block", marginTop: 3, color: "#64748b", fontSize: 11 }}>
                      {photo.size_bytes ? `${Math.round(photo.size_bytes / 1024)} KB` : "Uploaded"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {(summaryLines.length || conditionNotes.length || dealerReviewNotes.length) ? (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
              marginTop: 16,
            }}
          >
            <div style={sectionCardStyle()}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Summary</h2>
              <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "#334155", lineHeight: 1.5 }}>
                {(summaryLines.length ? summaryLines : ["No summary available yet."]).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div style={sectionCardStyle()}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Condition</h2>
              <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "#334155", lineHeight: 1.5 }}>
                {(conditionNotes.length ? conditionNotes : ["No condition notes yet."]).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div style={sectionCardStyle()}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Dealer review</h2>
              <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "#334155", lineHeight: 1.5 }}>
                {(dealerReviewNotes.length ? dealerReviewNotes : ["No dealer review notes yet."]).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section style={{ ...sectionCardStyle(), marginTop: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Activity</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {(eventRows || []).length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 800 }}>No activity recorded yet.</div>
            ) : (
              (eventRows || []).map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: 12,
                    borderRadius: 15,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <strong style={{ display: "block" }}>{event.event_type}</strong>
                  <span style={{ display: "block", color: "#64748b", marginTop: 4, fontSize: 12 }}>
                    {formatDate(event.created_at, dealerTimezone)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
