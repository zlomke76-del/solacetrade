import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-12-18.acacia",
});

export function getStripeMonthlyPriceId() {
  const value = process.env.STRIPE_MONTHLY_PRICE_ID;
  if (!value) {
    throw new Error("Missing STRIPE_MONTHLY_PRICE_ID environment variable.");
  }
  return value;
}

export function getStripeSetupPriceId() {
  const value = process.env.STRIPE_SETUP_PRICE_ID;
  if (!value) {
    throw new Error("Missing STRIPE_SETUP_PRICE_ID environment variable.");
  }
  return value;
}

export function getAppBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
