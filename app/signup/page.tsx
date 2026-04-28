"use client";

import { FormEvent, useState } from "react";

type SignupForm = {
  dealerName: string;
  legalName: string;
  dealerWebsite: string;
  managerEmail: string;
  crmEmail: string;
  routingCcEmails: string;
  billingContactName: string;
  billingEmail: string;
  billingPhone: string;
  salesPhone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
};

const initialForm: SignupForm = {
  dealerName: "",
  legalName: "",
  dealerWebsite: "",
  managerEmail: "",
  crmEmail: "",
  routingCcEmails: "",
  billingContactName: "",
  billingEmail: "",
  billingPhone: "",
  salesPhone: "",
  addressLine: "",
  city: "",
  state: "TX",
  postalCode: "",
};

const dark = "#0f172a";
const muted = "#64748b";
const red = "#b91c1c";

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    background: "white",
    color: dark,
    fontSize: 14,
    outline: "none",
  };
}

function labelStyle(): React.CSSProperties {
  return {
    display: "grid",
    gap: 6,
    color: "#334155",
    fontSize: 12,
    fontWeight: 900,
  };
}

function helperStyle(): React.CSSProperties {
  return {
    color: muted,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.35,
  };
}

export default function SignupPage() {
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField<K extends keyof SignupForm>(key: K, value: SignupForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json.url) {
        throw new Error(json.error || "Could not start dealer signup.");
      }

      window.location.href = json.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start dealer signup.");
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 10% 0%, rgba(185,28,28,0.16), transparent 34%), #f5f7fb",
        color: dark,
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 18,
      }}
    >
      <style>{`
        .signup-shell { max-width: 1060px; margin: 0 auto; }
        .signup-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr); gap: 18px; align-items: start; }
        .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 900px) { .signup-grid { grid-template-columns: 1fr; } }
        @media (max-width: 560px) { main { padding: 12px !important; } .two-col { grid-template-columns: 1fr; } }
      `}</style>

      <section className="signup-shell">
        <header style={{ padding: "12px 0 20px" }}>
          <a
            href="/"
            style={{
              color: dark,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            ← Back to SolaceTrade
          </a>
        </header>

        <div className="signup-grid">
          <section
            style={{
              padding: 24,
              borderRadius: 28,
              background: dark,
              color: "white",
              boxShadow: "0 24px 70px rgba(15,23,42,0.22)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "7px 11px",
                borderRadius: 999,
                background: "rgba(34,197,94,0.14)",
                color: "#bbf7d0",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Dealer onboarding
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(36px, 6vw, 62px)",
                lineHeight: 0.94,
                letterSpacing: "-0.06em",
              }}
            >
              Launch your trade intake page in minutes.
            </h1>

            <p style={{ margin: "16px 0 0", color: "#dbeafe", lineHeight: 1.6, fontWeight: 700 }}>
              Complete this setup form, start the monthly subscription, and SolaceTrade will automatically create your dealer page, internal intake link, and website install snippets.
            </p>

            <div style={{ display: "grid", gap: 10, marginTop: 22 }}>
              {[
                ["$595 / month", "Monthly platform access"],
                ["$299 setup fee", "WAIVED until July 1"],
                ["Automatic install email", "Customer link, internal link, button snippet, and iframe snippet"],
              ].map(([title, body]) => (
                <div
                  key={title}
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <strong style={{ display: "block" }}>{title}</strong>
                  <span style={{ display: "block", marginTop: 4, color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    {body}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <form
            onSubmit={submitSignup}
            style={{
              padding: 20,
              borderRadius: 28,
              background: "white",
              border: "1px solid #e2e8f0",
              boxShadow: "0 24px 70px rgba(15,23,42,0.10)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.03em" }}>Dealer setup</h2>
            <p style={{ margin: "6px 0 16px", color: muted, fontSize: 14, lineHeight: 1.5 }}>
              These details create your dealer page, manager routing, CRM delivery, billing record, and post-payment install instructions.
            </p>

            <div style={{ display: "grid", gap: 11 }}>
              <label style={labelStyle()}>
                Dealership name
                <input
                  required
                  value={form.dealerName}
                  onChange={(event) => updateField("dealerName", event.target.value)}
                  placeholder="Jersey Village Chrysler Jeep Dodge Ram"
                  style={inputStyle()}
                />
              </label>

              <label style={labelStyle()}>
                Legal name
                <input
                  value={form.legalName}
                  onChange={(event) => updateField("legalName", event.target.value)}
                  placeholder="Optional legal entity"
                  style={inputStyle()}
                />
              </label>

              <label style={labelStyle()}>
                Dealer website
                <input
                  value={form.dealerWebsite}
                  onChange={(event) => updateField("dealerWebsite", event.target.value)}
                  placeholder="https://www.exampledealer.com"
                  style={inputStyle()}
                />
              </label>

              <div className="two-col">
                <label style={labelStyle()}>
                  Sales phone
                  <input
                    value={form.salesPhone}
                    onChange={(event) => updateField("salesPhone", event.target.value)}
                    placeholder="(713) 555-0188"
                    style={inputStyle()}
                  />
                </label>
                <label style={labelStyle()}>
                  Billing phone
                  <input
                    value={form.billingPhone}
                    onChange={(event) => updateField("billingPhone", event.target.value)}
                    placeholder="Optional"
                    style={inputStyle()}
                  />
                </label>
              </div>

              <label style={labelStyle()}>
                Primary used car manager email
                <input
                  required
                  type="email"
                  value={form.managerEmail}
                  onChange={(event) => updateField("managerEmail", event.target.value)}
                  placeholder="manager@dealer.com"
                  style={inputStyle()}
                />
                <span style={helperStyle()}>
                  Oversight contact for trade packets and manager review.
                </span>
              </label>

              <label style={labelStyle()}>
                Primary lead / CRM intake email
                <input
                  type="email"
                  value={form.crmEmail}
                  onChange={(event) => updateField("crmEmail", event.target.value)}
                  placeholder="internet@dealer.com or leads@crm.com"
                  style={inputStyle()}
                />
                <span style={helperStyle()}>
                  Where new trade opportunities should be delivered. Leave blank to use the manager email.
                </span>
              </label>

              <label style={labelStyle()}>
                Additional routing emails
                <textarea
                  value={form.routingCcEmails}
                  onChange={(event) => updateField("routingCcEmails", event.target.value)}
                  placeholder="gsm@dealer.com, gm@dealer.com"
                  rows={3}
                  style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.45 }}
                />
              </label>

              <div className="two-col">
                <label style={labelStyle()}>
                  Billing contact name
                  <input
                    value={form.billingContactName}
                    onChange={(event) => updateField("billingContactName", event.target.value)}
                    placeholder="Controller / owner"
                    style={inputStyle()}
                  />
                </label>
                <label style={labelStyle()}>
                  Billing email
                  <input
                    required
                    type="email"
                    value={form.billingEmail}
                    onChange={(event) => updateField("billingEmail", event.target.value)}
                    placeholder="billing@dealer.com"
                    style={inputStyle()}
                  />
                </label>
              </div>

              <label style={labelStyle()}>
                Address
                <input
                  value={form.addressLine}
                  onChange={(event) => updateField("addressLine", event.target.value)}
                  placeholder="Street address"
                  style={inputStyle()}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 86px 110px", gap: 8 }}>
                <label style={labelStyle()}>
                  City
                  <input
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="Jersey Village"
                    style={inputStyle()}
                  />
                </label>
                <label style={labelStyle()}>
                  State
                  <input
                    value={form.state}
                    onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="TX"
                    style={inputStyle()}
                  />
                </label>
                <label style={labelStyle()}>
                  ZIP
                  <input
                    value={form.postalCode}
                    onChange={(event) => updateField("postalCode", event.target.value)}
                    placeholder="77040"
                    style={inputStyle()}
                  />
                </label>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 16,
                background: "#ecfdf5",
                color: "#065f46",
                fontSize: 13,
                fontWeight: 900,
                lineHeight: 1.4,
                border: "1px solid #bbf7d0",
              }}
            >
              Setup fee waived — no upfront setup cost if you start before July 1.
            </div>

            {error ? (
              <div style={{ marginTop: 13, padding: 12, borderRadius: 16, background: "#fef2f2", color: "#991b1b", fontSize: 13, fontWeight: 800 }}>
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                marginTop: 16,
                border: "none",
                borderRadius: 16,
                background: red,
                color: "white",
                padding: 15,
                fontSize: 15,
                fontWeight: 900,
                cursor: submitting ? "wait" : "pointer",
                opacity: submitting ? 0.72 : 1,
                boxShadow: "0 18px 42px rgba(185,28,28,0.24)",
              }}
            >
              {submitting ? "Starting checkout..." : "Finish setup & activate"}
            </button>

            <p style={{ margin: "12px 0 0", color: muted, fontSize: 12, lineHeight: 1.45 }}>
              After payment, your dealer links and website install snippets are emailed automatically.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
