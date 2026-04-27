import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
});

export function getStripeMonthlyPriceId() {
  const priceId = process.env.STRIPE_MONTHLY_PRICE_ID;

  if (!priceId) {
    throw new Error("Missing STRIPE_MONTHLY_PRICE_ID environment variable.");
  }

  return priceId;
}

export function getStripeSetupPriceId() {
  const priceId = process.env.STRIPE_SETUP_PRICE_ID;

  if (!priceId) {
    throw new Error("Missing STRIPE_SETUP_PRICE_ID environment variable.");
  }

  return priceId;
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.solacetrade.ai").replace(/\/$/, "");
}

export const getAppBaseUrl = getAppUrl;
