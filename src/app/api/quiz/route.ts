import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pathType, answers, resultType, blendName, customer } = body ?? {};

    if (!pathType) {
      return NextResponse.json(
        { error: "pathType is required" },
        { status: 400 }
      );
    }

    const sb = await createClient();

    // 1. customer upsert (이메일 기준; 없으면 익명 row)
    let customerId: string | null = null;
    if (customer?.email || customer?.phone || customer?.name) {
      const customerType =
        pathType === "b2c"
          ? "b2c"
          : pathType === "pro"
            ? "b2b_pro"
            : pathType === "office"
              ? "b2b_office"
              : "gift";

      // email 있으면 동일 email upsert, 없으면 그냥 insert
      if (customer.email) {
        const { data: existing } = await sb
          .from("customers")
          .select("id")
          .eq("email", customer.email)
          .maybeSingle();
        if (existing?.id) {
          customerId = existing.id;
          await sb
            .from("customers")
            .update({
              name: customer.name ?? null,
              phone: customer.phone ?? null,
              customer_type: customerType,
            })
            .eq("id", existing.id);
        } else {
          const { data: ins, error } = await sb
            .from("customers")
            .insert({
              name: customer.name ?? "",
              phone: customer.phone ?? null,
              email: customer.email,
              customer_type: customerType,
            })
            .select("id")
            .single();
          if (error) throw error;
          customerId = ins?.id ?? null;
        }
      } else {
        const { data: ins, error } = await sb
          .from("customers")
          .insert({
            name: customer.name ?? "",
            phone: customer.phone ?? null,
            email: null,
            customer_type: customerType,
          })
          .select("id")
          .single();
        if (error) throw error;
        customerId = ins?.id ?? null;
      }
    }

    // 2. quiz_results insert
    const { data: qr, error: qrErr } = await sb
      .from("quiz_results")
      .insert({
        customer_id: customerId,
        path_type: pathType,
        answers: answers ?? {},
        result_type: resultType ?? null,
        blend_name: blendName ?? null,
      })
      .select("id")
      .single();
    if (qrErr) throw qrErr;

    return NextResponse.json(
      { quizResultId: qr?.id, customerId },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/quiz] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
