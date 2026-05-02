import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      contactName,
      phone,
      email,
      inquiryType,
      answers,
      volume,
      memo,
    } = body ?? {};

    if (!inquiryType) {
      return NextResponse.json(
        { error: "inquiryType is required" },
        { status: 400 }
      );
    }

    const sb = await createClient();
    const { data, error } = await sb
      .from("b2b_inquiries")
      .insert({
        company_name: companyName ?? null,
        contact_name: contactName ?? null,
        phone: phone ?? null,
        email: email ?? null,
        inquiry_type: inquiryType,
        answers: answers ?? {},
        volume: volume ?? null,
        memo: memo ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ inquiryId: data?.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/b2b] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
