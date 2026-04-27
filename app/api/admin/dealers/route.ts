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

const DEALER_SELECT =
  "id, slug, name, legal_name, sales_phone, lead_email, address_line, city, state, postal_code, brand_color, is_active, created_at, updated_at";

function nullableText(value: unknown, maxLength = 500) {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function dealerPayload(body: Record<string, unknown>): DealerPayloadResult {
  const name = cleanText(body.name, 180);
  const slug = normalizeDealerSlug(cleanText(body.slug, 120));
  const leadEmail = cleanText(body.lead_email, 180).toLowerCase();
  const brandColor = cleanText(body.brand_color, 24) || "#b91c1c";

  if (!name) return { ok: false, error: "Dealer name is required." };
  if (!slug) return { ok: false, error: "Dealer slug is required." };

  if (!leadEmail || !isValidEmail(leadEmail)) {
    return { ok: false, error: "A valid lead email is required." };
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
      .insert(result.payload)
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
