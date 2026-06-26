"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { notifyOwner } from "@/lib/telegram";
import { won } from "@/lib/format";

export type OrderResult = { ok: boolean; orderNo?: string; error?: string };

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  base_price: number;
};

export async function createOrder(input: {
  items: { id: string; qty: number }[];
  note: string;
}): Promise<OrderResult> {
  const account = await getMyAccount();
  if (!account || account.role === "admin") {
    return { ok: false, error: "권한이 없습니다." };
  }

  const wanted = (input.items ?? []).filter((i) => i && i.qty > 0);
  if (wanted.length === 0) {
    return { ok: false, error: "수량을 1개 이상 입력하세요." };
  }

  const admin = createAdminClient();
  const ids = wanted.map((i) => i.id);

  const { data: prodData } = await admin
    .from("products")
    .select("id, name, unit, base_price")
    .in("id", ids);
  const products = (prodData ?? []) as ProductRow[];

  const { data: priceData } = await admin
    .from("account_prices")
    .select("product_id, unit_price")
    .eq("account_id", account.id);
  const priceMap = new Map(
    (priceData ?? []).map((p) => [p.product_id as string, p.unit_price as number])
  );

  const lines = wanted
    .map((w) => {
      const prod = products.find((p) => p.id === w.id);
      if (!prod) return null;
      const unit_price = priceMap.get(prod.id) ?? prod.base_price;
      const qty = Math.max(0, Math.floor(w.qty));
      if (qty <= 0) return null;
      return {
        product_id: prod.id,
        product_name: prod.name,
        unit: prod.unit,
        unit_price,
        qty,
        line_amount: unit_price * qty,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lines.length === 0) return { ok: false, error: "주문할 상품이 없습니다." };
  const total = lines.reduce((s, l) => s + l.line_amount, 0);

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const p = (x: number) => String(x).padStart(2, "0");
  const order_no = `${kstNow.getUTCFullYear()}${p(kstNow.getUTCMonth() + 1)}${p(
    kstNow.getUTCDate()
  )}-${p(kstNow.getUTCHours())}${p(kstNow.getUTCMinutes())}${p(
    kstNow.getUTCSeconds()
  )}`;

  const { data: order, error: oErr } = await admin
    .from("b2b_orders")
    .insert({
      order_no,
      account_id: account.id,
      status: "requested",
      total_amount: total,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();
  if (oErr || !order) {
    console.error("[createOrder] order insert", oErr);
    return { ok: false, error: "주문 저장에 실패했습니다." };
  }

  const rows = lines.map((l) => ({ ...l, order_id: order.id }));
  const { error: iErr } = await admin.from("b2b_order_items").insert(rows);
  if (iErr) {
    console.error("[createOrder] items insert", iErr);
    return { ok: false, error: "주문 품목 저장에 실패했습니다." };
  }

  const lineText = lines
    .map((l) => `· ${l.product_name} ${l.qty}${l.unit} = ${won(l.line_amount)}`)
    .join("\n");
  await notifyOwner(
    `[새 주문] ${account.company_name}\n주문번호 ${order_no}\n${lineText}\n합계 ${won(
      total
    )}${input.note?.trim() ? `\n요청: ${input.note.trim()}` : ""}`
  );

  return { ok: true, orderNo: order_no };
}
