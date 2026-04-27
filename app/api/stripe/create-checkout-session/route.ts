import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLACETRADE_SCHEMA, cleanText } from "@/lib/solacetrade";
import {
  getAppBaseUrl,
  getStripeMonthlyPriceId,
  getStripeSetupPriceId,
  stripe,
} from "@/lib/stripe";

type DealerBillingRecord = {
  id: string;
  slug: string;
  name: string;
  legal_name: string | null;
  lead_email: string | null;
  billing_contact_name: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_price_id?: string | null;
  billing_status: string | null;
};

const DEALER_SELECT = [
  "id",
  "slug",
  "name",
  "legal_name",
  "lead_email",
  "billing_contact_name",
  "billing_email",
  "billing_phone",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_checkout_session_id",
  "stripe_price_id",
  "billing_status",
].join(", ");

function isActiveBillingStatus(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const dealerId = cleanText(body.dealer_id, 80);

    if (!dealerId) {
      return NextResponse.json(
        { error: "Dealer id is required." },
        { status: 400 }
      );
    }

    const { data: rawDealer, error: dealerError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .select(DEALER_SELECT)
      .eq("id", dealerId)
      .single();

    if (dealerError || !rawDealer) {
      return NextResponse.json(
        { error: dealerError?.message || "Dealer not found." },
        { status: 404 }
      );
    }

    const dealer = rawDealer as unknown as DealerBillingRecord;

    if (isActiveBillingStatus(dealer.billing_status)) {
      return NextResponse.json(
        { error: "Dealer already has an active subscription." },
        { status: 409 }
      );
    }

    const billingEmail = dealer.billing_email || dealer.lead_email;

    if (!billingEmail) {
      return NextResponse.json(
        { error: "Billing email or manager routing email is required." },
        { status: 400 }
      );
    }

    let stripeCustomerId = dealer.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: dealer.billing_contact_name || dealer.legal_name || dealer.name,
        email: billingEmail,
        phone: dealer.billing_phone || undefined,
        metadata: {
          dealer_id: dealer.id,
          dealer_slug: dealer.slug,
        },
      });

      stripeCustomerId = customer.id;

      const { error: updateCustomerError } = await supabaseAdmin
        .schema(SOLACETRADE_SCHEMA)
        .from("dealers")
        .update({
          stripe_customer_id: stripeCustomerId,
          billing_status: "checkout_pending",
        })
        .eq("id", dealer.id);

      if (updateCustomerError) {
        return NextResponse.json(
          { error: updateCustomerError.message },
          { status: 500 }
        );
      }
    }

    const baseUrl = getAppBaseUrl();
    const monthlyPriceId = getStripeMonthlyPriceId();
    const setupPriceId = getStripeSetupPriceId();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: dealer.id,
      line_items: [
        {
          price: monthlyPriceId,
          quantity: 1,
        },
        {
          price: setupPriceId,
          quantity: 1,
        },
      ],
      metadata: {
        dealer_id: dealer.id,
        dealer_slug: dealer.slug,
      },
      subscription_data: {
        metadata: {
          dealer_id: dealer.id,
          dealer_slug: dealer.slug,
        },
      },
      allow_promotion_codes: true,
      customer_update: {
        address: "auto",
        name: "auto",
      },
      success_url: `${baseUrl}/admin/dealers?billing=success&dealer=${dealer.id}`,
      cancel_url: `${baseUrl}/admin/dealers?billing=cancelled&dealer=${dealer.id}`,
    });

    const { error: updateSessionError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_price_id: monthlyPriceId,
        billing_status: "checkout_pending",
      })
      .eq("id", dealer.id);

    if (updateSessionError) {
      return NextResponse.json(
        { error: updateSessionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Stripe checkout session error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
