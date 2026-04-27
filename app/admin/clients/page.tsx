"use client";

import { useState } from "react";

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  };
}

export default function AdminClientsPage() {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    lead_email: "",
    city: "",
    state: "",
    brand_color: "#b91c1c",
  });

  const [status, setStatus] = useState("");

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createClient() {
    setStatus("Creating...");

    const res = await fetch("/api/admin/create-dealer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const json = await res.json();

    if (!res.ok) {
      setStatus(json.error || "Error");
      return;
    }

    setStatus("Dealer created ✔");
    setForm({
      name: "",
      slug: "",
      lead_email: "",
      city: "",
      state: "",
      brand_color: "#b91c1c",
    });
  }

  return (
    <main style={{ padding: 24, maxWidth: 600 }}>
      <h1>Create Dealer</h1>

      <input
        placeholder="Dealer Name"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        style={inputStyle()}
      />

      <input
        placeholder="Slug (brenhamcdjr)"
        value={form.slug}
        onChange={(e) => update("slug", e.target.value)}
        style={{ ...inputStyle(), marginTop: 10 }}
      />

      <input
        placeholder="Lead Email"
        value={form.lead_email}
        onChange={(e) => update("lead_email", e.target.value)}
        style={{ ...inputStyle(), marginTop: 10 }}
      />

      <input
        placeholder="City"
        value={form.city}
        onChange={(e) => update("city", e.target.value)}
        style={{ ...inputStyle(), marginTop: 10 }}
      />

      <input
        placeholder="State"
        value={form.state}
        onChange={(e) => update("state", e.target.value)}
        style={{ ...inputStyle(), marginTop: 10 }}
      />

      <input
        placeholder="Brand Color (#b91c1c)"
        value={form.brand_color}
        onChange={(e) => update("brand_color", e.target.value)}
        style={{ ...inputStyle(), marginTop: 10 }}
      />

      <button
        onClick={createClient}
        style={{
          marginTop: 16,
          padding: 14,
          width: "100%",
          background: "#0f172a",
          color: "white",
          borderRadius: 12,
          fontWeight: 800,
        }}
      >
        Create Dealer
      </button>

      <p style={{ marginTop: 10 }}>{status}</p>
    </main>
  );
}
