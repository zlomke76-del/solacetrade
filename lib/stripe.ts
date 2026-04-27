import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
});

export function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export const getAppUrl = getAppBaseUrl;

export function getStripeMonthlyPriceId() {
  const value = process.env.STRIPE_MONTHLY_PRICE_ID;
  if (!value) throw new Error("Missing STRIPE_MONTHLY_PRICE_ID environment variable.");
  return value;
}

export function getStripeSetupPriceId() {
  const value = process.env.STRIPE_SETUP_PRICE_ID;
  if (!value) throw new Error("Missing STRIPE_SETUP_PRICE_ID environment variable.");
  return value;
}

export function isSetupFeeWaived(now = new Date()) {
  const cutoff = new Date("2026-07-01T00:00:00-05:00");
  return now < cutoff;
}
