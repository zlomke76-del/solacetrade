"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";

type Dealer = {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  sales_phone: string | null;
  lead_email: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  brand_color: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

type DealerForm = {
  id: string | null;
  slug: string;
  name: string;
  legal_name: string;
  sales_phone: string;
  lead_email: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  brand_color: string;
  is_active: boolean;
};

const blankForm: DealerForm = {
  id: null,
  slug: "",
  name: "",
  legal_name: "",
  sales_phone: "",
  lead_email: "",
  address_line: "",
  city: "",
  state: "",
  postal_code: "",
  brand_color: "#b91c1c",
  is_active: true,
};

const dark = "#0f172a";
const muted = "#64748b";
const border = "#e2e8f0";
const soft = "#f8fafc";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function dealerToForm(dealer: Dealer): DealerForm {
  return {
    id: dealer.id,
    slug: dealer.slug || "",
    name: dealer.name || "",
    legal_name: dealer.legal_name || "",
    sales_phone: dealer.sales_phone || "",
    lead_email: dealer.lead_email || "",
    address_line: dealer.address_line || "",
    city: dealer.city || "",
    state: dealer.state || "",
    postal_code: dealer.postal_code || "",
    brand_color: dealer.brand_color || "#b91c1c",
    is_active: Boolean(dealer.is_active),
  };
}

function hasRoutingEmail(dealer: Pick<Dealer, "lead_email">) {
  return Boolean(dealer.lead_email && dealer.lead_email.includes("@"));
}

function isErrorStatus(message: string) {
  const lowered = message.toLowerCase();
  return lowered.includes("could") || lowered.includes("error") || lowered.includes("failed");
}

function fieldStyle(): CSSProperties {
  return {
    width: "100%",
    padding: "12px 13px",
    borderRadius: 13,
    border: "1px solid #cbd5e1",
    background: "white",
    color: dark,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };
}

function labelStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 6,
    color: "#334155",
    fontSize: 12,
    fontWeight: 900,
  };
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div style={{ margin: "18px 0 10px" }}>
      <h3 style={{ margin: 0, color: dark, fontSize: 14, letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      {note ? (
        <p style={{ margin: "4px 0 0", color: muted, fontSize: 12, lineHeight: 1.45 }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "green" | "gray" | "amber" }) {
  const styles: Record<typeof tone, CSSProperties> = {
    green: { background: "#dcfce7", color: "#166534" },
    gray: { background: "#e2e8f0", color: "#475569" },
    amber: { background: "#fef3c7", color: "#92400e" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 900,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...styles[tone],
      }}
    >
      {children}
    </span>
  );
}

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [form, setForm] = useState<DealerForm>(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const isEditing = Boolean(form.id);

  const filteredDealers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dealers;

    return dealers.filter((dealer) =>
      [dealer.name, dealer.slug, dealer.lead_email, dealer.city, dealer.state]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [dealers, search]);

  async function loadDealers() {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/dealers", {
        method: "GET",
        cache: "no-store",
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not load dealers.");
      }

      setDealers(Array.isArray(json.dealers) ? json.dealers : []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load dealers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDealers();
  }, []);

  function updateField<K extends keyof DealerForm>(key: K, value: DealerForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function startCreate() {
    setForm(blankForm);
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startEdit(dealer: Dealer) {
    setForm(dealerToForm(dealer));
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDealer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const payload = {
        ...form,
        slug: normalizeSlug(form.slug),
      };

      const response = await fetch("/api/admin/dealers", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not save dealer.");
      }

      setStatus(isEditing ? "Dealer updated." : "Dealer created.");
      setForm(blankForm);
      await loadDealers();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save dealer.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDealer(dealer: Dealer) {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/dealers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dealer.id,
          is_active: !dealer.is_active,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.error || "Could not update dealer status.");
      }

      setStatus(dealer.is_active ? "Dealer deactivated." : "Dealer activated.");
      await loadDealers();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update dealer status.");
    } finally {
      setSaving(false);
    }
  }

  const statusIsError = status ? isErrorStatus(status) : false;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 8% 4%, rgba(59,130,246,0.16), transparent 32%), #f4f6f8",
        color: dark,
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 18,
      }}
    >
      <style>{`
        .admin-shell {
          max-width: 1180px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .admin-grid {
          display: grid;
          grid-template-columns: minmax(340px, 0.9fr) minmax(0, 1.35fr);
          gap: 18px;
          align-items: start;
        }

        .admin-card {
          background: white;
          border: 1px solid ${border};
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 20px 60px rgba(15,23,42,0.08);
        }

        .field-grid {
          display: grid;
          gap: 11px;
        }

        .two-col {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 10px;
        }

        .location-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 96px 120px;
          gap: 8px;
        }

        .dealer-card-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .dealer-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        @media (max-width: 900px) {
          main {
            padding: 12px !important;
          }

          .admin-header {
            flex-direction: column;
          }

          .admin-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .admin-card {
            border-radius: 18px;
            padding: 14px;
          }

          .two-col,
          .location-grid {
            grid-template-columns: 1fr;
          }

          .dealer-card-header {
            flex-direction: column;
          }

          .dealer-actions a,
          .dealer-actions button {
            flex: 1 1 auto;
            text-align: center;
          }
        }
      `}</style>

      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <div
              style={{
                display: "inline-flex",
                padding: "7px 11px",
                borderRadius: 999,
                background: "#e2e8f0",
                color: dark,
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              SolaceTrade Admin
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 5vw, 52px)",
                lineHeight: 0.98,
                letterSpacing: "-0.055em",
              }}
            >
              Dealer dashboard.
            </h1>
            <p style={{ margin: "8px 0 0", color: muted, maxWidth: 720, lineHeight: 1.55 }}>
              Create dealers, configure the used car manager routing email, and control the customer
              and internal intake links from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreate}
            style={{
              border: "none",
              borderRadius: 14,
              background: dark,
              color: "white",
              padding: "12px 14px",
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 14px 30px rgba(15,23,42,0.16)",
            }}
          >
            + New Dealer
          </button>
        </div>

        <div className="admin-grid">
          <form onSubmit={saveDealer} className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>
                  {isEditing ? "Edit dealer" : "Create dealer"}
                </h2>
                <p style={{ margin: "5px 0 0", color: muted, fontSize: 13, lineHeight: 1.45 }}>
                  Name, slug, and manager routing email are required.
                </p>
              </div>

              {isEditing ? <Pill tone="gray">Editing</Pill> : <Pill tone="green">New</Pill>}
            </div>

            <SectionHeader
              title="Dealer identity"
              note="Slug controls both customer and internal URLs."
            />
            <div className="field-grid">
              <label style={labelStyle()}>
                Dealer name
                <input
                  required
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Brenham CDJR"
                  style={fieldStyle()}
                />
              </label>

              <label style={labelStyle()}>
                Slug
                <input
                  required
                  value={form.slug}
                  onChange={(event) => updateField("slug", normalizeSlug(event.target.value))}
                  placeholder="brenhamcdjr"
                  style={fieldStyle()}
                />
              </label>

              <label style={labelStyle()}>
                Legal name
                <input
                  value={form.legal_name}
                  onChange={(event) => updateField("legal_name", event.target.value)}
                  placeholder="Optional legal entity name"
                  style={fieldStyle()}
                />
              </label>
            </div>

            <SectionHeader
              title="Used car manager routing"
              note="Trade appraisal packets are automatically sent to this email for approval."
            />
            <div
              style={{
                padding: 12,
                borderRadius: 18,
                background: "#f8fafc",
                border: "1px solid #dbeafe",
              }}
            >
              <label style={labelStyle()}>
                Used Car Manager Email
                <input
                  required
                  type="email"
                  value={form.lead_email}
                  onChange={(event) => updateField("lead_email", event.target.value)}
                  placeholder="manager@dealer.com"
                  style={fieldStyle()}
                />
              </label>
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 11px",
                  borderRadius: 14,
                  background: "white",
                  border: "1px solid #e2e8f0",
                  color: muted,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                Salespeople will not enter this manually. The internal intake flow uses this saved
                routing address when the packet is submitted.
              </div>
            </div>

            <SectionHeader title="Contact and location" />
            <div className="field-grid">
              <label style={labelStyle()}>
                Sales phone
                <input
                  value={form.sales_phone}
                  onChange={(event) => updateField("sales_phone", event.target.value)}
                  placeholder="Optional phone"
                  style={fieldStyle()}
                />
              </label>

              <label style={labelStyle()}>
                Address
                <input
                  value={form.address_line}
                  onChange={(event) => updateField("address_line", event.target.value)}
                  placeholder="Street address"
                  style={fieldStyle()}
                />
              </label>

              <div className="location-grid">
                <label style={labelStyle()}>
                  City
                  <input
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="City"
                    style={fieldStyle()}
                  />
                </label>
                <label style={labelStyle()}>
                  State
                  <input
                    value={form.state}
                    onChange={(event) =>
                      updateField("state", event.target.value.toUpperCase().slice(0, 2))
                    }
                    placeholder="TX"
                    style={fieldStyle()}
                  />
                </label>
                <label style={labelStyle()}>
                  ZIP
                  <input
                    value={form.postal_code}
                    onChange={(event) => updateField("postal_code", event.target.value)}
                    placeholder="77833"
                    style={fieldStyle()}
                  />
                </label>
              </div>
            </div>

            <SectionHeader title="System settings" />
            <div className="field-grid">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 56px", gap: 8, alignItems: "end" }}>
                <label style={labelStyle()}>
                  Brand color
                  <input
                    value={form.brand_color}
                    onChange={(event) => updateField("brand_color", event.target.value)}
                    placeholder="#b91c1c"
                    style={fieldStyle()}
                  />
                </label>
                <div
                  title="Brand color preview"
                  style={{
                    height: 43,
                    borderRadius: 13,
                    border: "1px solid #cbd5e1",
                    background: form.brand_color || "#b91c1c",
                  }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  background: soft,
                  border: `1px solid ${border}`,
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                <span>
                  Active dealer
                  <span style={{ display: "block", color: muted, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                    Active dealers can receive customer and internal intake traffic.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => updateField("is_active", event.target.checked)}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                marginTop: 16,
                border: "none",
                borderRadius: 15,
                background: dark,
                color: "white",
                padding: 14,
                fontSize: 14,
                fontWeight: 900,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : isEditing ? "Save dealer" : "Create dealer"}
            </button>

            {status ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 11,
                  borderRadius: 14,
                  background: statusIsError ? "#fef2f2" : "#f0fdf4",
                  color: statusIsError ? "#991b1b" : "#166534",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {status}
              </div>
            ) : null}
          </form>

          <section className="admin-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Dealers</h2>
                <p style={{ margin: "5px 0 0", color: muted, fontSize: 13 }}>
                  {loading ? "Loading..." : `${filteredDealers.length} shown · ${dealers.length} total`}
                </p>
              </div>
              <button
                type="button"
                onClick={loadDealers}
                disabled={loading}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 13,
                  background: "white",
                  color: dark,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                Refresh
              </button>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dealers, slugs, manager emails, or locations"
              style={{ ...fieldStyle(), marginTop: 12 }}
            />

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {filteredDealers.map((dealer) => {
                const routingConfigured = hasRoutingEmail(dealer);

                return (
                  <article
                    key={dealer.id}
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 18,
                      padding: 14,
                      background: dealer.is_active ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <div className="dealer-card-header">
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: 16 }}>{dealer.name}</strong>
                        <span style={{ display: "block", color: muted, fontSize: 13, marginTop: 4 }}>
                          /{dealer.slug} · /{dealer.slug}/internal
                        </span>
                        <span
                          style={{
                            display: "block",
                            color: routingConfigured ? dark : "#92400e",
                            fontSize: 13,
                            marginTop: 6,
                            overflowWrap: "anywhere",
                          }}
                        >
                          Manager routing: {dealer.lead_email || "Missing"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <Pill tone={dealer.is_active ? "green" : "gray"}>
                          {dealer.is_active ? "Active" : "Inactive"}
                        </Pill>
                        <Pill tone={routingConfigured ? "green" : "amber"}>
                          {routingConfigured ? "Routing set" : "Routing missing"}
                        </Pill>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 14,
                          background: soft,
                          border: `1px solid ${border}`,
                        }}
                      >
                        <span style={{ display: "block", color: muted, fontSize: 11, fontWeight: 900 }}>
                          Customer link
                        </span>
                        <span style={{ display: "block", color: dark, fontSize: 12, marginTop: 3 }}>
                          /{dealer.slug}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: 10,
                          borderRadius: 14,
                          background: soft,
                          border: `1px solid ${border}`,
                        }}
                      >
                        <span style={{ display: "block", color: muted, fontSize: 11, fontWeight: 900 }}>
                          Internal link
                        </span>
                        <span style={{ display: "block", color: dark, fontSize: 12, marginTop: 3 }}>
                          /{dealer.slug}/internal
                        </span>
                      </div>
                    </div>

                    <div className="dealer-actions">
                      <a
                        href={`/${dealer.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: soft,
                          border: `1px solid ${border}`,
                          color: dark,
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        Open customer
                      </a>
                      <a
                        href={`/${dealer.slug}/internal`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: soft,
                          border: `1px solid ${border}`,
                          color: dark,
                          textDecoration: "none",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        Open internal
                      </a>
                      <button
                        type="button"
                        onClick={() => startEdit(dealer)}
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: dark,
                          border: "none",
                          color: "white",
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleDealer(dealer)}
                        disabled={saving}
                        style={{
                          padding: "9px 10px",
                          borderRadius: 12,
                          background: dealer.is_active ? "#fff7ed" : "#f0fdf4",
                          border: dealer.is_active ? "1px solid #fed7aa" : "1px solid #bbf7d0",
                          color: dealer.is_active ? "#9a3412" : "#166534",
                          fontSize: 12,
                          fontWeight: 900,
                          cursor: saving ? "wait" : "pointer",
                        }}
                      >
                        {dealer.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </article>
                );
              })}

              {!loading && filteredDealers.length === 0 ? (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: soft,
                    border: `1px solid ${border}`,
                    color: muted,
                    fontSize: 14,
                  }}
                >
                  No dealers found.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
