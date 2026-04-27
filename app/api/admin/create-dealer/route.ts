import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SOLACETRADE_SCHEMA, normalizeDealerSlug } from "@/lib/solacetrade";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = body.name?.trim();
    const slug = normalizeDealerSlug(body.slug);
    const lead_email = body.lead_email?.trim();

    if (!name || !slug || !lead_email) {
      return NextResponse.json(
        { error: "Name, slug, and email required." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .schema(SOLACETRADE_SCHEMA)
      .from("dealers")
      .insert({
        name,
        slug,
        lead_email,
        city: body.city || null,
        state: body.state || null,
        brand_color: body.brand_color || "#b91c1c",
        is_active: true,
      });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to create dealer." },
      { status: 500 }
    );
  }
}
