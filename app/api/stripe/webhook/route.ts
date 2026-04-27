import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLACETRADE_SCHEMA } from "@/lib/solacetrade";
import { stripe } from "@/lib/stripe";
import { sendDealerOnboardingEmail } from "@/lib/onboardingEmail";

export const runtime = "nodejs";

function getWebhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable.");
  return value;
}

function getStringId(value: string | Stripe.Customer | Stripe.Subscription | null | undefined) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id || null;
}

function normalizeSubscriptionStatus(status: Stripe.Subscription.Status | string | null | undefined) {
  if (!status) return "inactive";
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "incomplete" || status === "incomplete_expired") return "incomplete";
  return String(status);
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

  let query = supabaseAdmin.schema(SOLACETRADE_SCHEMA).from("dealers").update(payload);

  if (dealerId) {
    query = query.eq("id", dealerId);
  } else if (dealerSlug) {
    query = query.eq("slug", dealerSlug);
  } else if (customerId) {
    query = query.eq("stripe_customer_id", customerId);
  } else {
    return;
  }

  await query;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const dealerId = session.metadata?.dealer_id || null;
  const dealerSlug = session.metadata?.dealer_slug || null;
  const customerId = getStringId(session.customer as string | Stripe.Customer | null);
  const subscriptionId = getStringId(session.subscription as string | Stripe.Subscription | null);

  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  }

  const updatePayload = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_checkout_session_id: session.id,
    billing_status: subscription ? normalizeSubscriptionStatus(subscription.status) : "active",
    billing_current_period_end: subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    billing_cancel_at_period_end: subscription ? Boolean(subscription.cancel_at_period_end) : false,
    is_active: true,
  };

  let query = supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .update(updatePayload)
    .select("id, slug, name, billing_email, lead_email")
    .limit(1);

  if (dealerId) {
    query = query.eq("id", dealerId);
  } else if (dealerSlug) {
    query = query.eq("slug", dealerSlug);
  } else if (customerId) {
    query = query.eq("stripe_customer_id", customerId);
  }

  const { data } = await query;
  const dealer = data?.[0];

  if (dealer) {
    await sendDealerOnboardingEmail({
      dealerName: dealer.name,
      dealerSlug: dealer.slug,
      billingEmail: dealer.billing_email,
      managerEmail: dealer.lead_email,
    }).catch((error) => {
      console.error("Dealer onboarding email failed", error);
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer as string | Stripe.Customer | null);
  const subscriptionId = getStringId(invoice.subscription as string | Stripe.Subscription | null);

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

  await query;
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = getStringId(invoice.customer as string | Stripe.Customer | null);
  const subscriptionId = getStringId(invoice.subscription as string | Stripe.Subscription | null);

  if (!customerId && !subscriptionId) return;

  let query = supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .update({
      billing_status: "past_due",
    });

  if (subscriptionId) query = query.eq("stripe_subscription_id", subscriptionId);
  else if (customerId) query = query.eq("stripe_customer_id", customerId);

  await query;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
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
