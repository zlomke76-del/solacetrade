import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLACETRADE_SCHEMA, cleanText, normalizeDealerSlug } from "@/lib/solacetrade";
import { getAppBaseUrl, getStripeMonthlyPriceId, getStripeSetupPriceId, isSetupFeeWaived, stripe } from "@/lib/stripe";

type SignupBody = {
  dealerName?: string;
  legalName?: string;
  dealerWebsite?: string;
  managerEmail?: string;
  routingCcEmails?: string;
  billingContactName?: string;
  billingEmail?: string;
  billingPhone?: string;
  salesPhone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

const DEALER_SELECT = "id, slug, name, billing_email, lead_email, stripe_customer_id";

function nullableText(value: unknown, maxLength = 500) {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}

function normalizeEmail(value: unknown, maxLength = 180) {
  return cleanText(value, maxLength).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function parseEmailList(value: unknown) {
  const raw = cleanText(value, 1200);
  if (!raw) return [];

  return raw
    .split(/[,\n;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function createUniqueSlug(dealerName: string) {
  const base = normalizeDealerSlug(dealerName).replace(/-?chrysler|-?jeep|-?dodge|-?ram|-?cdjr/g, "") || "dealer";
  const preferred = normalizeDealerSlug(base) || "dealer";

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const slug = attempt === 0 ? preferred : `${preferred}-${attempt + 1}`;

    const { data, error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw new Error(`Could not verify dealer slug: ${error.message}`);
    if (!data) return slug;
  }

  return `${preferred}-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as SignupBody;

    const dealerName = cleanText(body.dealerName, 180);
    const legalName = nullableText(body.legalName, 220);
    const dealerWebsite = nullableText(body.dealerWebsite, 220);
    const managerEmail = normalizeEmail(body.managerEmail);
    const billingEmail = normalizeEmail(body.billingEmail);
    const routingCcEmails = parseEmailList(body.routingCcEmails);

    if (!dealerName) {
      return NextResponse.json({ error: "Dealership name is required." }, { status: 400 });
    }

    if (!managerEmail || !isValidEmail(managerEmail)) {
      return NextResponse.json({ error: "A valid used car manager email is required." }, { status: 400 });
    }

    if (!billingEmail || !isValidEmail(billingEmail)) {
      return NextResponse.json({ error: "A valid billing email is required." }, { status: 400 });
    }

    const invalidCc = routingCcEmails.find((email) => !isValidEmail(email));
    if (invalidCc) {
      return NextResponse.json({ error: `Invalid additional routing email: ${invalidCc}` }, { status: 400 });
    }

    const slug = await createUniqueSlug(dealerName);
    const appUrl = getAppBaseUrl();
    const monthlyPriceId = getStripeMonthlyPriceId();
    const setupPriceId = getStripeSetupPriceId();
    const setupWaived = isSetupFeeWaived();

    const customer = await stripe.customers.create({
      name: legalName || dealerName,
      email: billingEmail,
      phone: nullableText(body.billingPhone, 80) || undefined,
      metadata: {
        dealer_name: dealerName,
        dealer_slug: slug,
        manager_email: managerEmail,
        dealer_website: dealerWebsite || "",
      },
    });

    const { data: dealer, error: insertError } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .insert({
        slug,
        name: dealerName,
        legal_name: legalName,
        sales_phone: nullableText(body.salesPhone, 80),
        lead_email: managerEmail,
        routing_cc_emails: routingCcEmails,
        billing_contact_name: nullableText(body.billingContactName, 180),
        billing_email: billingEmail,
        billing_phone: nullableText(body.billingPhone, 80),
        dealer_website: dealerWebsite,
        address_line: nullableText(body.addressLine, 220),
        city: nullableText(body.city, 120),
        state: nullableText(body.state, 40) || "TX",
        postal_code: nullableText(body.postalCode, 40),
        brand_color: "#b91c1c",
        is_active: false,
        billing_status: "checkout_started",
        stripe_customer_id: customer.id,
        stripe_price_id: monthlyPriceId,
      })
      .select(DEALER_SELECT)
      .single();

    if (insertError || !dealer) {
      await stripe.customers.del(customer.id).catch(() => null);
      return NextResponse.json(
        { error: insertError?.message || "Could not create dealer record." },
        { status: 500 }
      );
    }

    const lineItems = [
      {
        price: monthlyPriceId,
        quantity: 1,
      },
    ];

    if (!setupWaived) {
      lineItems.push({
        price: setupPriceId,
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: lineItems,
      allow_promotion_codes: true,
      success_url: `${appUrl}/signup/success?dealer=${encodeURIComponent(slug)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/signup?canceled=1`,
      metadata: {
        dealer_id: dealer.id,
        dealer_slug: slug,
        setup_fee_waived: setupWaived ? "true" : "false",
      },
      subscription_data: {
        metadata: {
          dealer_id: dealer.id,
          dealer_slug: slug,
        },
      },
      custom_text: setupWaived
        ? {
            submit: {
              message: "Setup fee waived for dealers who subscribe before July 1.",
            },
          }
        : undefined,
    });

    await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", dealer.id);

    return NextResponse.json({
      url: session.url,
      dealerSlug: slug,
      setupFeeWaived: setupWaived,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown signup error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
