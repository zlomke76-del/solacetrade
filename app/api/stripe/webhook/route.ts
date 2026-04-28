import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SOLACETRADE_SCHEMA,
  cleanText,
  normalizeDealerSlug,
} from "@/lib/solacetrade";
import { stripe } from "@/lib/stripe";
import { sendDealerOnboardingEmail } from "@/lib/onboardingEmail";

export const runtime = "nodejs";

type DealerEmailRecord = {
  id: string;
  slug: string;
  name: string;
  billing_email: string | null;
  lead_email: string;
};

function getWebhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  }
  return value;
}

function getStringId(
  value: string | Stripe.Customer | Stripe.Subscription | null | undefined,
) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id || null;
}

function normalizeSubscriptionStatus(
  status: Stripe.Subscription.Status | string | null | undefined,
) {
  if (!status) return "inactive";
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "incomplete" || status === "incomplete_expired") {
    return "incomplete";
  }
  return String(status);
}

function normalizeEmail(value: unknown, fallback = "") {
  return cleanText(value ?? fallback, 180).toLowerCase();
}

function normalizeDealerName(value: unknown) {
  return cleanText(value, 180) || "New SolaceTrade Dealer";
}

function buildDealerSlug(input: {
  metadataSlug?: string | null;
  dealerName: string;
  customerId: string | null;
}) {
  const fromMetadata = normalizeDealerSlug(input.metadataSlug || "");
  if (fromMetadata) return fromMetadata;

  const fromName = normalizeDealerSlug(input.dealerName.replace(/\s+/g, "-"));
  if (fromName) return fromName;

  const customerSuffix = input.customerId ? input.customerId.slice(-8).toLowerCase() : "dealer";
  return `dealer-${customerSuffix}`;
}

async function makeUniqueDealerSlug(baseSlug: string) {
  const safeBase = normalizeDealerSlug(baseSlug) || "dealer";

  for (let index = 0; index < 25; index += 1) {
    const candidate = index === 0 ? safeBase : `${safeBase}-${index + 1}`;

    const { data, error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(`Dealer slug lookup failed: ${error.message}`);
    }

    if (!data) return candidate;
  }

  return `${safeBase}-${Date.now()}`;
}

async function updateDealerBySubscription(subscription: Stripe.Subscription) {
  const dealerId = subscription.metadata?.dealer_id;
  const dealerSlug = subscription.metadata?.dealer_slug;
  const customerId = getStringId(subscription.customer as string | Stripe.Customer);
  const priceId = subscription.items.data[0]?.price?.id || null;

  const payload = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    billing_status: normalizeSubscriptionStatus(subscription.status),
    billing_current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    billing_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    is_active: subscription.status === "active" || subscription.status === "trialing",
  };

  let query = supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .update(payload);

  if (dealerId) {
    query = query.eq("id", dealerId);
  } else if (dealerSlug) {
    query = query.eq("slug", dealerSlug);
  } else if (customerId) {
    query = query.eq("stripe_customer_id", customerId);
  } else {
    return;
  }

  const { error } = await query;
  if (error) {
    throw new Error(`Subscription dealer update failed: ${error.message}`);
  }
}

async function findExistingDealer(input: {
  dealerId: string | null;
  dealerSlug: string | null;
  customerId: string | null;
}) {
  let query = supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .select("id, slug, name, billing_email, lead_email")
    .limit(1);

  if (input.dealerId) {
    query = query.eq("id", input.dealerId);
  } else if (input.dealerSlug) {
    query = query.eq("slug", input.dealerSlug);
  } else if (input.customerId) {
    query = query.eq("stripe_customer_id", input.customerId);
  } else {
    return null;
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Dealer lookup failed: ${error.message}`);
  }

  return (data?.[0] || null) as DealerEmailRecord | null;
}

async function createDealerFromCheckout(input: {
  session: Stripe.Checkout.Session;
  subscription: Stripe.Subscription | null;
  customerId: string | null;
  subscriptionId: string | null;
}) {
  const metadata = input.session.metadata || {};
  const dealerName = normalizeDealerName(
    metadata.dealer_name || metadata.name || input.session.customer_details?.name,
  );
  const managerEmail = normalizeEmail(
    metadata.manager_email || metadata.lead_email,
    input.session.customer_details?.email || input.session.customer_email || "",
  );
  const billingEmail = normalizeEmail(
    metadata.billing_email,
    input.session.customer_details?.email || input.session.customer_email || managerEmail,
  );
  const salesPhone = cleanText(
    metadata.sales_phone || input.session.customer_details?.phone || "",
    80,
  );
  const address = input.session.customer_details?.address;
  const metadataSlug = metadata.dealer_slug || metadata.slug || null;
  const baseSlug = buildDealerSlug({
    metadataSlug,
    dealerName,
    customerId: input.customerId,
  });
  const uniqueSlug = await makeUniqueDealerSlug(baseSlug);

  const payload = {
    slug: uniqueSlug,
    name: dealerName,
    legal_name: cleanText(metadata.legal_name || dealerName, 220) || null,
    sales_phone: salesPhone || null,
    lead_email: managerEmail || billingEmail || "onboarding@solacetrade.ai",
    routing_cc_emails: [],
    billing_contact_name: cleanText(metadata.billing_contact_name || input.session.customer_details?.name || dealerName, 180) || null,
    billing_email: billingEmail || null,
    billing_phone: cleanText(metadata.billing_phone || input.session.customer_details?.phone || "", 80) || null,
    address_line: cleanText(metadata.address_line || address?.line1 || "", 220) || null,
    city: cleanText(metadata.city || address?.city || "", 120) || null,
    state: cleanText(metadata.state || address?.state || "", 40) || null,
    postal_code: cleanText(metadata.postal_code || address?.postal_code || "", 40) || null,
    brand_color: cleanText(metadata.brand_color || "#b91c1c", 24) || "#b91c1c",
    is_active: true,
    stripe_customer_id: input.customerId,
    stripe_subscription_id: input.subscriptionId,
    stripe_checkout_session_id: input.session.id,
    stripe_price_id: input.subscription?.items.data[0]?.price?.id || null,
    billing_status: input.subscription
      ? normalizeSubscriptionStatus(input.subscription.status)
      : "active",
    billing_current_period_end: input.subscription?.current_period_end
      ? new Date(input.subscription.current_period_end * 1000).toISOString()
      : null,
    billing_cancel_at_period_end: input.subscription
      ? Boolean(input.subscription.cancel_at_period_end)
      : false,
  };

  const { data, error } = await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .insert(payload)
    .select("id, slug, name, billing_email, lead_email")
    .single();

  if (error) {
    throw new Error(`Dealer auto-create failed: ${error.message}`);
  }

  return data as DealerEmailRecord;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const dealerId = session.metadata?.dealer_id || null;
  const metadataSlug = session.metadata?.dealer_slug || session.metadata?.slug || null;
  const dealerSlug = metadataSlug ? normalizeDealerSlug(metadataSlug) : null;
  const customerId = getStringId(session.customer as string | Stripe.Customer | null);
  const subscriptionId = getStringId(
    session.subscription as string | Stripe.Subscription | null,
  );

  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  }

  const updatePayload = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_checkout_session_id: session.id,
    stripe_price_id: subscription?.items.data[0]?.price?.id || null,
    billing_status: subscription
      ? normalizeSubscriptionStatus(subscription.status)
      : "active",
    billing_current_period_end: subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    billing_cancel_at_period_end: subscription
      ? Boolean(subscription.cancel_at_period_end)
      : false,
    is_active: true,
  };

  let dealer = await findExistingDealer({ dealerId, dealerSlug, customerId });

  if (dealer) {
    const { data, error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .update(updatePayload)
      .eq("id", dealer.id)
      .select("id, slug, name, billing_email, lead_email")
      .single();

    if (error) {
      throw new Error(`Dealer checkout update failed: ${error.message}`);
    }

    dealer = data as DealerEmailRecord;
  } else {
    dealer = await createDealerFromCheckout({
      session,
      subscription,
      customerId,
      subscriptionId,
    });
  }

  await sendDealerOnboardingEmail({
    dealerName: dealer.name,
    dealerSlug: dealer.slug,
    billingEmail: dealer.billing_email,
    managerEmail: dealer.lead_email,
  }).catch((error) => {
    console.error("Dealer onboarding email failed", error);
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer as string | Stripe.Customer | null);
  const subscriptionId = getStringId(
    invoice.subscription as string | Stripe.Subscription | null,
  );

  if (!customerId && !subscriptionId) return;

  let query = supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .update({
      billing_status: "active",
      is_active: true,
    });

  if (subscriptionId) query = query.eq("stripe_subscription_id", subscriptionId);
  else if (customerId) query = query.eq("stripe_customer_id", customerId);

  const { error } = await query;
  if (error) {
    throw new Error(`Invoice success dealer update failed: ${error.message}`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer as string | Stripe.Customer | null);
  const subscriptionId = getStringId(
    invoice.subscription as string | Stripe.Subscription | null,
  );

  if (!customerId && !subscriptionId) return;

  let query = supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .update({
      billing_status: "past_due",
    });

  if (subscriptionId) query = query.eq("stripe_subscription_id", subscriptionId);
  else if (customerId) query = query.eq("stripe_customer_id", customerId);

  const { error } = await query;
  if (error) {
    throw new Error(`Invoice failure dealer update failed: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await updateDealerBySubscription(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler failed", error);
    const message = error instanceof Error ? error.message : "Webhook handler failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
