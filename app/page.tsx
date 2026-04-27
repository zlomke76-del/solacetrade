"use client";

import { FormEvent, useMemo, useState } from "react";
import TradeDesk from "../components/TradeDesk";

const dealerName = "Brenham Chrysler Jeep Dodge Ram";
const dealerSlug = "brenhamcdjr";
const salesPhone = "(979) 451-6727";
const dealerAddress = "1880 US-290, Brenham, TX";

const solaceTradeSignupUrl =
  process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ||
  process.env.NEXT_PUBLIC_SOLACETRADE_SIGNUP_URL ||
  "";

type SignupForm = {
  dealership: string;
  contactName: string;
  email: string;
  phone: string;
};

const blankSignupForm: SignupForm = {
  dealership: "",
  contactName: "",
  email: "",
  phone: "",
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function encode(value: string) {
  return encodeURIComponent(value.trim());
}

export default function Page() {
  const [signup, setSignup] = useState<SignupForm>(blankSignupForm);
  const [signupStatus, setSignupStatus] = useState("");

  const signupReady = useMemo(() => {
    return Boolean(
      signup.dealership.trim() &&
      signup.contactName.trim() &&
      isValidEmail(signup.email),
    );
  }, [signup]);

  function updateSignupField<K extends keyof SignupForm>(
    key: K,
    value: SignupForm[K],
  ) {
    setSignup((previous) => ({ ...previous, [key]: value }));
    setSignupStatus("");
  }

  function handleDealerSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!signupReady) {
      setSignupStatus(
        "Add dealership name, contact name, and a valid billing email.",
      );
      return;
    }

    if (!solaceTradeSignupUrl) {
      setSignupStatus(
        "Signup link is not configured yet. Add NEXT_PUBLIC_STRIPE_PAYMENT_LINK in Vercel.",
      );
      return;
    }

    const separator = solaceTradeSignupUrl.includes("?") ? "&" : "?";
    const checkoutUrl = `${solaceTradeSignupUrl}${separator}prefilled_email=${encode(
      signup.email,
    )}&client_reference_id=${encode(signup.dealership)}`;

    window.location.href = checkoutUrl;
  }

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
          padding: "8px 16px",
          fontSize: 13,
          fontWeight: 800,
          textAlign: "center",
        }}
      >
        Sales: {salesPhone} • {dealerAddress}
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
        <strong style={{ fontSize: 14 }}>{dealerName}</strong>
        <nav
          style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 900 }}
        >
          <span>New</span>
          <span>Used</span>
          <span>Service</span>
          <span style={{ color: "#b91c1c" }}>Trade</span>
        </nav>
      </header>

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "34px 18px 16px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(185,28,28,0.13), transparent 34%), linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)",
        }}
      >
        <div style={{ maxWidth: 1040, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              borderRadius: 999,
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            TradeDesk by Solace
          </div>

          <h1
            style={{
              margin: "0 auto 10px",
              maxWidth: 780,
              fontSize: "clamp(34px, 6vw, 62px)",
              lineHeight: 0.95,
              letterSpacing: "-0.058em",
            }}
          >
            Get a cleaner trade value.
          </h1>

          <p
            style={{
              margin: "0 auto 6px",
              maxWidth: 620,
              color: "#0f172a",
              fontSize: "clamp(16px, 2.2vw, 20px)",
              fontWeight: 700,
            }}
          >
            Scan your vehicle. Get an instant cash offer.
          </p>

          <p
            style={{
              margin: "0 auto 16px",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            No obligation. No pressure.
          </p>

          <a
            href="#vehicle-scan"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 21px",
              borderRadius: 16,
              background: "#b91c1c",
              color: "white",
              fontSize: 15,
              fontWeight: 900,
              textDecoration: "none",
              boxShadow: "0 18px 42px rgba(185,28,28,0.24)",
            }}
          >
            Start Vehicle Scan
          </a>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
              marginTop: 14,
              color: "#334155",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {["5 guided photos", "VIN after scan", "Recall-ready review"].map(
              (item) => (
                <span
                  key={item}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    background: "white",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section
        id="vehicle-scan"
        style={{ maxWidth: 690, margin: "0 auto", padding: "0 14px 32px" }}
      >
        <TradeDesk mode="customer" dealerSlug={dealerSlug} />
      </section>

      <section style={{ padding: "24px 18px 20px" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            [
              "Guided capture",
              "The customer sees one clear photo task at a time.",
            ],
            [
              "Cleaner value",
              "VIN and mileage are requested only after the images are complete.",
            ],
            [
              "Dealer-ready",
              "Solace produces the offer before asking the customer’s intent.",
            ],
          ].map(([title, body]) => (
            <div
              key={title}
              style={{
                padding: 17,
                borderRadius: 21,
                background: "white",
                border: "1px solid #e2e8f0",
                boxShadow: "0 14px 36px rgba(15,23,42,0.06)",
              }}
            >
              <strong style={{ display: "block", fontSize: 16 }}>
                {title}
              </strong>
              <p
                style={{
                  margin: "7px 0 0",
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.45,
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="dealer-signup" style={{ padding: "12px 18px 42px" }}>
        <div
          style={{
            maxWidth: 980,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.82fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: 26,
              padding: "26px 24px",
              background:
                "radial-gradient(circle at 8% 0%, rgba(248,113,113,0.28), transparent 34%), #0f172a",
              color: "white",
              boxShadow: "0 22px 55px rgba(15,23,42,0.22)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "7px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              For Dealers
            </div>
            <h2
              style={{
                margin: 0,
                maxWidth: 560,
                fontSize: "clamp(28px, 4vw, 46px)",
                lineHeight: 0.96,
                letterSpacing: "-0.045em",
              }}
            >
              Put SolaceTrade on your dealership website.
            </h2>
            <p
              style={{
                margin: "14px 0 0",
                maxWidth: 560,
                color: "#cbd5e1",
                fontSize: 16,
                lineHeight: 1.55,
              }}
            >
              Launch a guided trade-in capture flow with VIN decoding, photo
              review, and automatic routing to your used car manager.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 9,
                marginTop: 18,
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              {[
                "$595/mo",
                "$299 setup",
                "Manager routing",
                "5-photo intake",
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleDealerSignup}
            style={{
              borderRadius: 26,
              padding: 18,
              background: "white",
              border: "1px solid #e2e8f0",
              boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
            }}
          >
            <strong style={{ display: "block", fontSize: 20, marginBottom: 5 }}>
              Start dealer signup
            </strong>
            <p
              style={{
                margin: "0 0 14px",
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              Enter the billing contact, then continue to secure checkout.
            </p>

            <div style={{ display: "grid", gap: 9 }}>
              <input
                value={signup.dealership}
                onChange={(event) =>
                  updateSignupField("dealership", event.target.value)
                }
                placeholder="Dealership name"
                style={signupInputStyle()}
              />
              <input
                value={signup.contactName}
                onChange={(event) =>
                  updateSignupField("contactName", event.target.value)
                }
                placeholder="Billing contact name"
                style={signupInputStyle()}
              />
              <input
                type="email"
                value={signup.email}
                onChange={(event) =>
                  updateSignupField("email", event.target.value)
                }
                placeholder="Billing email"
                style={signupInputStyle()}
              />
              <input
                value={signup.phone}
                onChange={(event) =>
                  updateSignupField("phone", event.target.value)
                }
                placeholder="Phone number optional"
                style={signupInputStyle()}
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                marginTop: 13,
                border: "none",
                borderRadius: 16,
                background: "#0f172a",
                color: "white",
                padding: 14,
                fontSize: 14,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Continue to Secure Signup
            </button>

            {signupStatus && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 14,
                  padding: 11,
                  background: signupStatus.includes("configured")
                    ? "#fef2f2"
                    : "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: signupStatus.includes("configured")
                    ? "#991b1b"
                    : "#475569",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                {signupStatus}
              </div>
            )}

            <p
              style={{
                margin: "12px 0 0",
                color: "#64748b",
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              Includes monthly subscription plus one-time setup. Billing is
              handled securely through Stripe.
            </p>
          </form>
        </div>
      </section>

      <footer
        style={{
          padding: 22,
          background: "#0b0b0b",
          color: "white",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {dealerName} • Powered by TradeDesk by Solace
      </footer>
    </main>
  );
}

function signupInputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: "12px 13px",
    color: "#0f172a",
    background: "white",
    fontSize: 14,
    outline: "none",
  };
}
