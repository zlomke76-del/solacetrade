"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 13px",
    borderRadius: 13,
    border: "1px solid #cbd5e1",
    background: "white",
    color: dark,
    fontSize: 14,
    outline: "none",
  };
}

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

    return dealers.filter((dealer) => {
      return [dealer.name, dealer.slug, dealer.lead_email, dealer.city, dealer.state]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
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
      <section style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
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
            <p style={{ margin: "8px 0 0", color: muted, maxWidth: 680, lineHeight: 1.55 }}>
              Create and manage dealer clients without changing code. Each active dealer is available at
              /[dealerSlug] and /[dealerSlug]/internal.
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
            }}
          >
            + New Dealer
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 0.95fr) minmax(0, 1.35fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <form
            onSubmit={saveDealer}
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 24,
              padding: 16,
              boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20 }}>
              {isEditing ? "Edit dealer" : "Create dealer"}
            </h2>
            <p style={{ margin: "5px 0 14px", color: muted, fontSize: 13, lineHeight: 1.45 }}>
              Name, slug, and lead email are required. Slug controls the public and internal URLs.
            </p>

            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                Dealer name
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Brenham CDJR"
                  style={{ ...inputStyle(), marginTop: 5 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                Slug
                <input
                  value={form.slug}
                  onChange={(event) => updateField("slug", normalizeSlug(event.target.value))}
                  placeholder="brenhamcdjr"
                  style={{ ...inputStyle(), marginTop: 5 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                Lead email
                <input
                  value={form.lead_email}
                  onChange={(event) => updateField("lead_email", event.target.value)}
                  placeholder="manager@dealer.com"
                  style={{ ...inputStyle(), marginTop: 5 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                Legal name
                <input
                  value={form.legal_name}
                  onChange={(event) => updateField("legal_name", event.target.value)}
                  placeholder="Optional legal entity name"
                  style={{ ...inputStyle(), marginTop: 5 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                Sales phone
                <input
                  value={form.sales_phone}
                  onChange={(event) => updateField("sales_phone", event.target.value)}
                  placeholder="Optional phone"
                  style={{ ...inputStyle(), marginTop: 5 }}
                />
              </label>

              <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                Address
                <input
                  value={form.address_line}
                  onChange={(event) => updateField("address_line", event.target.value)}
                  placeholder="Street address"
                  style={{ ...inputStyle(), marginTop: 5 }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 96px 120px", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                  City
                  <input
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="City"
                    style={{ ...inputStyle(), marginTop: 5 }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                  State
                  <input
                    value={form.state}
                    onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="TX"
                    style={{ ...inputStyle(), marginTop: 5 }}
                  />
                </label>
                <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                  ZIP
                  <input
                    value={form.postal_code}
                    onChange={(event) => updateField("postal_code", event.target.value)}
                    placeholder="77833"
                    style={{ ...inputStyle(), marginTop: 5 }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 56px", gap: 8, alignItems: "end" }}>
                <label style={{ fontSize: 12, fontWeight: 900, color: muted }}>
                  Brand color
                  <input
                    value={form.brand_color}
                    onChange={(event) => updateField("brand_color", event.target.value)}
                    placeholder="#b91c1c"
                    style={{ ...inputStyle(), marginTop: 5 }}
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
                  gap: 9,
                  padding: 12,
                  borderRadius: 14,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => updateField("is_active", event.target.checked)}
                />
                Active dealer
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                marginTop: 14,
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

            {status && (
              <div
                style={{
                  marginTop: 12,
                  padding: 11,
                  borderRadius: 14,
                  background: status.toLowerCase().includes("could") || status.toLowerCase().includes("error")
                    ? "#fef2f2"
                    : "#f0fdf4",
                  color: status.toLowerCase().includes("could") || status.toLowerCase().includes("error")
                    ? "#991b1b"
                    : "#166534",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {status}
              </div>
            )}
          </form>

          <section
            style={{
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 24,
              padding: 16,
              boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
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
              placeholder="Search dealers"
              style={{ ...inputStyle(), marginTop: 12 }}
            />

            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {filteredDealers.map((dealer) => (
                <article
                  key={dealer.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 18,
                    padding: 13,
                    background: dealer.is_active ? "#ffffff" : "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 16 }}>{dealer.name}</strong>
                      <span style={{ display: "block", color: muted, fontSize: 13, marginTop: 3 }}>
                        /{dealer.slug} · /{dealer.slug}/internal
                      </span>
                      <span style={{ display: "block", color: muted, fontSize: 13, marginTop: 3 }}>
                        {dealer.lead_email}
                      </span>
                    </div>
                    <span
                      style={{
                        alignSelf: "flex-start",
                        padding: "6px 9px",
                        borderRadius: 999,
                        background: dealer.is_active ? "#dcfce7" : "#e2e8f0",
                        color: dealer.is_active ? "#166534" : "#475569",
                        fontSize: 11,
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {dealer.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    <a
                      href={`/${dealer.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "9px 10px",
                        borderRadius: 12,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
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
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
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
              ))}

              {!loading && filteredDealers.length === 0 && (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: muted,
                    fontSize: 14,
                  }}
                >
                  No dealers found.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
