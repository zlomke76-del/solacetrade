export default function SignupSuccessPage({
  searchParams,
}: {
  searchParams?: { dealer?: string };
}) {
  const dealerSlug = searchParams?.dealer || "your-dealer";
  const customerLink = `/${dealerSlug}`;
  const internalLink = `/${dealerSlug}/internal`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f5f7fb",
        color: "#0f172a",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 18,
      }}
    >
      <section
        style={{
          maxWidth: 720,
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 28,
          padding: 26,
          boxShadow: "0 24px 70px rgba(15,23,42,0.12)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "7px 11px",
            borderRadius: 999,
            background: "#dcfce7",
            color: "#166534",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Subscription active
        </div>
        <h1 style={{ margin: 0, fontSize: "clamp(32px, 6vw, 52px)", lineHeight: 0.98, letterSpacing: "-0.055em" }}>
          Your SolaceTrade setup is being activated.
        </h1>
        <p style={{ margin: "14px auto 0", maxWidth: 560, color: "#64748b", lineHeight: 1.55 }}>
          Your dealer links and install snippets are being emailed now. You can also open them below.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 20 }}>
          <a href={customerLink} style={buttonStyle("#b91c1c", "white")}>Open customer page</a>
          <a href={internalLink} style={buttonStyle("#0f172a", "white")}>Open internal intake</a>
        </div>
      </section>
    </main>
  );
}

function buttonStyle(background: string, color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 16px",
    borderRadius: 14,
    background,
    color,
    textDecoration: "none",
    fontWeight: 900,
  };
}
