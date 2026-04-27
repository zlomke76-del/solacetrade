import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SOLACETRADE_SCHEMA,
  cleanText,
  normalizeDealerSlug,
} from "@/lib/solacetrade";

type DealerWritePayload = {
  slug: string;
  name: string;
  legal_name: string | null;
  sales_phone: string | null;
  lead_email: string;
  routing_cc_emails: string[];
  billing_contact_name: string | null;
  billing_email: string | null;
  billing_phone: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  brand_color: string;
  is_active: boolean;
};

type DealerPayloadResult =
  | { ok: true; payload: DealerWritePayload }
  | { ok: false; error: string };

const DEALER_SELECT = [
  "id",
  "slug",
  "name",
  "legal_name",
  "sales_phone",
  "lead_email",
  "routing_cc_emails",
  "billing_contact_name",
  "billing_email",
  "billing_phone",
  "address_line",
  "city",
  "state",
  "postal_code",
  "brand_color",
  "is_active",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_checkout_session_id",
  "stripe_price_id",
  "billing_status",
  "billing_current_period_end",
  "billing_cancel_at_period_end",
  "created_at",
  "updated_at",
].join(", ");

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

function isValidHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function parseEmailList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeEmail(item))
      .filter(Boolean);
  }

  const raw = cleanText(value, 1200);
  if (!raw) return [];

  return raw
    .split(/[,\n;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function dealerPayload(body: Record<string, unknown>): DealerPayloadResult {
  const name = cleanText(body.name, 180);
  const slug = normalizeDealerSlug(cleanText(body.slug, 120));
  const leadEmail = normalizeEmail(body.lead_email);
  const routingCcEmails = parseEmailList(body.routing_cc_emails ?? body.routing_cc);
  const billingEmail = normalizeEmail(body.billing_email);
  const brandColor = cleanText(body.brand_color, 24) || "#b91c1c";

  if (!name) return { ok: false, error: "Dealer name is required." };
  if (!slug) return { ok: false, error: "Dealer slug is required." };

  if (!leadEmail || !isValidEmail(leadEmail)) {
    return {
      ok: false,
      error: "A valid used car manager routing email is required.",
    };
  }

  const invalidRoutingEmail = routingCcEmails.find((email) => !isValidEmail(email));
  if (invalidRoutingEmail) {
    return {
      ok: false,
      error: `Invalid CC routing email: ${invalidRoutingEmail}`,
    };
  }

  if (billingEmail && !isValidEmail(billingEmail)) {
    return { ok: false, error: "Billing email must be valid." };
  }

  if (!isValidHexColor(brandColor)) {
    return {
      ok: false,
      error: "Brand color must be a valid hex color like #b91c1c.",
    };
  }

  return {
    ok: true,
    payload: {
      slug,
      name,
      legal_name: nullableText(body.legal_name, 220),
      sales_phone: nullableText(body.sales_phone, 80),
      lead_email: leadEmail,
      routing_cc_emails: routingCcEmails,
      billing_contact_name: nullableText(body.billing_contact_name, 180),
      billing_email: billingEmail || null,
      billing_phone: nullableText(body.billing_phone, 80),
      address_line: nullableText(body.address_line, 220),
      city: nullableText(body.city, 120),
      state: nullableText(body.state, 40),
      postal_code: nullableText(body.postal_code, 40),
      brand_color: brandColor,
      is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    },
  };
}

function duplicateSlugResponse(error: { message: string; code?: string }) {
  const isDuplicate =
    error.message.toLowerCase().includes("duplicate") || error.code === "23505";

  return NextResponse.json(
    { error: isDuplicate ? "That slug already exists." : error.message },
    { status: isDuplicate ? 409 : 500 }
  );
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .select(DEALER_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dealers: data || [] });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown dealer list error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const result = dealerPayload(body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .insert({
        ...result.payload,
        billing_status: "not_started",
      })
      .select(DEALER_SELECT)
      .single();

    if (error) {
      return duplicateSlugResponse(error);
    }

    return NextResponse.json({ dealer: data }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown dealer create error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const id = cleanText(body.id, 80);

    if (!id) {
      return NextResponse.json(
        { error: "Dealer id is required." },
        { status: 400 }
      );
    }

    const hasOnlyStatusUpdate =
      Object.keys(body).every((key) => ["id", "is_active"].includes(key)) &&
      typeof body.is_active === "boolean";

    let payload: Partial<DealerWritePayload>;

    if (hasOnlyStatusUpdate) {
      payload = { is_active: body.is_active as boolean };
    } else {
      const result = dealerPayload(body);

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      payload = result.payload;
    }

    const { data, error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .update(payload)
      .eq("id", id)
      .select(DEALER_SELECT)
      .single();

    if (error) {
      return duplicateSlugResponse(error);
    }

    return NextResponse.json({ dealer: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown dealer update error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
