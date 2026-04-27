import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLACETRADE_SCHEMA } from "@/lib/solacetrade";
import { stripe } from "@/lib/stripe";

function isoFromUnix(seconds: number | null | undefined) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

async function updateDealerByStripeCustomer(
  stripeCustomerId: string,
  updates: Record<string, unknown>
) {
  return supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .update(updates)
    .eq("stripe_customer_id", stripeCustomerId);
}

async function updateDealerByStripeSubscription(
  stripeSubscriptionId: string,
  updates: Record<string, unknown>
) {
  return supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .update(updates)
    .eq("stripe_subscription_id", stripeSubscriptionId);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const dealerId = session.metadata?.dealer_id || session.client_reference_id;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!dealerId || !stripeCustomerId) return;

  let subscription: Stripe.Subscription | null = null;

  if (stripeSubscriptionId) {
    subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  }

  await supabaseAdmin
    .schema(SOLACETRADE_SCHEMA)
    .from("dealers")
    .update({
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId || null,
      stripe_checkout_session_id: session.id,
      billing_status: subscription?.status || "checkout_completed",
      billing_current_period_end: isoFromUnix(subscription?.current_period_end),
      billing_cancel_at_period_end: subscription?.cancel_at_period_end || false,
      stripe_last_event_id: session.id,
    })
    .eq("id", dealerId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const updates = {
    stripe_subscription_id: subscription.id,
    billing_status: subscription.status,
    billing_current_period_end: isoFromUnix(subscription.current_period_end),
    billing_cancel_at_period_end: subscription.cancel_at_period_end,
    stripe_last_event_id: subscription.id,
  };

  const bySubscription = await updateDealerByStripeSubscription(
    subscription.id,
    updates
  );

  if (!bySubscription.error && bySubscription.count && bySubscription.count > 0) {
    return;
  }

  await updateDealerByStripeCustomer(stripeCustomerId, updates);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

  const stripeSubscriptionId =
    typeof invoice.subscription === "string"
      ? invoice.subscription
      : invoice.subscription?.id;

  const updates = {
    billing_status: "past_due",
    stripe_last_event_id: invoice.id,
  };

  if (stripeSubscriptionId) {
    await updateDealerByStripeSubscription(stripeSubscriptionId, updates);
    return;
  }

  if (stripeCustomerId) {
    await updateDealerByStripeCustomer(stripeCustomerId, updates);
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET environment variable." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Stripe webhook.";
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
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            stripeSubscriptionId
          );
          await handleSubscriptionUpdated(subscription);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe webhook handling failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
