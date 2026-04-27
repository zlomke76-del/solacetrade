import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLACETRADE_SCHEMA, cleanText } from "@/lib/solacetrade";
import { getAppBaseUrl, stripe } from "@/lib/stripe";

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

    const { data: dealer, error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .select("id, stripe_customer_id")
      .eq("id", dealerId)
      .single();

    if (error || !dealer) {
      return NextResponse.json(
        { error: error?.message || "Dealer not found." },
        { status: 404 }
      );
    }

    if (!dealer.stripe_customer_id) {
      return NextResponse.json(
        { error: "Dealer does not have a Stripe customer yet." },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: dealer.stripe_customer_id,
      return_url: `${getAppBaseUrl()}/admin/dealers`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown billing portal error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
