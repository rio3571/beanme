import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      quizResultId,
      orderType,
      blendType,
      packageName,
      amount,
      grind,
      frequency,
      totalPrice,
      deliveryAddress,
      giftMessage,
      memo,
    } = body ?? {};

    if (!orderType) {
      return NextResponse.json(
        { error: "orderType is required" },
        { status: 400 }
      );
    }

    const sb = await createClient();
    const { data, error } = await sb
      .from("orders")
      .insert({
        customer_id: customerId ?? null,
        quiz_result_id: quizResultId ?? null,
        order_type: orderType,
        blend_type: blendType ?? null,
        package_name: packageName ?? null,
        amount: amount ?? null,
        grind: grind ?? null,
        frequency: frequency ?? null,
        total_price: totalPrice ?? null,
        delivery_address: deliveryAddress ?? null,
        gift_message: giftMessage ?? null,
        memo: memo ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ orderId: data?.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/orders] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
