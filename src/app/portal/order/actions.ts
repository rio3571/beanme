"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { notifyOwner } from "@/lib/telegram";
import { won } from "@/lib/format";
import { parseMeta, stringifyMeta } from "@/lib/acctMeta";
import { carrySummary } from "@/lib/carry";
import { revalidatePath } from "next/cache";

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

  // 활성 상품 전체 (이월 합산 시 미주문 품목도 추가될 수 있어 전체 로드)
  const { data: prodData } = await admin
    .from("products")
    .select("id, name, unit, base_price")
    .eq("active", true);
  const products = (prodData ?? []) as ProductRow[];
  const byId = new Map(products.map((p) => [p.id, p]));
  const byName = new Map(products.map((p) => [p.name, p]));

  const { data: priceData } = await admin
    .from("account_prices")
    .select("product_id, unit_price")
    .eq("account_id", account.id);
  const priceMap = new Map(
    (priceData ?? []).map((p) => [p.product_id as string, p.unit_price as number])
  );
  const priceOf = (p: ProductRow) => priceMap.get(p.id) ?? p.base_price;

  type Line = {
    product_id: string;
    product_name: string;
    unit: string;
    unit_price: number;
    qty: number;
    line_amount: number;
  };
  const mkLine = (p: ProductRow, qty: number): Line => {
    const unit_price = priceOf(p);
    return {
      product_id: p.id,
      product_name: p.name,
      unit: p.unit,
      unit_price,
      qty,
      line_amount: unit_price * qty,
    };
  };

  const lineMap = new Map<string, Line>(); // product_id 기준
  for (const w of wanted) {
    const prod = byId.get(w.id);
    if (!prod) continue;
    const qty = Math.max(0, Math.floor(w.qty));
    if (qty > 0) lineMap.set(prod.id, mkLine(prod, qty));
  }

  // 이월(출고 차이) 자동 합산
  const carry = (parseMeta(account.memo).carry ?? []).filter((c) => c.qty !== 0);
  const appliedCarry: { name: string; qty: number }[] = [];
  for (const c of carry) {
    const prod = byName.get(c.name);
    if (!prod) continue;
    const base = lineMap.get(prod.id)?.qty ?? 0;
    const newQty = base + c.qty;
    appliedCarry.push({ name: c.name, qty: c.qty });
    if (newQty > 0) lineMap.set(prod.id, mkLine(prod, newQty));
    else lineMap.delete(prod.id); // 전량 상계
  }

  const lines = [...lineMap.values()];
  if (lines.length === 0) return { ok: false, error: "주문할 상품이 없습니다." };
  const total = lines.reduce((s, l) => s + l.line_amount, 0);
  const carryNote = appliedCarry.length
    ? `[이월 합산] ${carrySummary(appliedCarry)}`
    : "";

  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const p = (x: number) => String(x).padStart(2, "0");
  const order_no = `${kstNow.getUTCFullYear()}${p(kstNow.getUTCMonth() + 1)}${p(
    kstNow.getUTCDate()
  )}-${p(kstNow.getUTCHours())}${p(kstNow.getUTCMinutes())}${p(
    kstNow.getUTCSeconds()
  )}`;

  const finalNote =
    [input.note?.trim(), carryNote].filter(Boolean).join("\n") || null;

  const { data: order, error: oErr } = await admin
    .from("b2b_orders")
    .insert({
      order_no,
      account_id: account.id,
      status: "requested",
      total_amount: total,
      note: finalNote,
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

  // 이월 소진 (합산 적용됐으니 비움)
  if (carry.length > 0) {
    const meta = parseMeta(account.memo);
    meta.carry = [];
    await admin
      .from("b2b_accounts")
      .update({ memo: stringifyMeta(meta) })
      .eq("id", account.id);
  }

  const lineText = lines
    .map((l) => `· ${l.product_name} ${l.qty}${l.unit} = ${won(l.line_amount)}`)
    .join("\n");
  await notifyOwner(
    `[새 주문] ${account.company_name}\n주문번호 ${order_no}\n${lineText}\n합계 ${won(
      total
    )}${carryNote ? `\n📦 ${carryNote}` : ""}${
      input.note?.trim() ? `\n요청: ${input.note.trim()}` : ""
    }`
  );

  return { ok: true, orderNo: order_no };
}

/** 거래처(받는 사람)가 '받은 수량이 주문과 다름'을 신고 → 내 계정 이월에 반영.
 *  덜 받았으면 +, 더 받았으면 − (kg). 다음 주문에 자동 합산. */
export async function reportOrderCarry(
  orderId: string,
  items: { name: string; qty: number }[]
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me) return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("b2b_orders")
    .select("account_id, order_no")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "주문을 찾을 수 없어요." };

  const acctId = order.account_id as string;
  if (me.role !== "admin" && acctId !== me.id) {
    return { ok: false, error: "권한이 없습니다." };
  }

  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("memo, company_name")
    .eq("id", acctId)
    .maybeSingle();
  const meta = parseMeta(acct?.memo as string | null | undefined);

  const orderNames = items.map((i) => String(i.name));
  const others = (meta.carry ?? []).filter((c) => !orderNames.includes(c.name));
  const mine = items
    .map((c) => ({ name: String(c.name).trim(), qty: Math.round(Number(c.qty) || 0) }))
    .filter((c) => c.name && c.qty !== 0);
  meta.carry = [...others, ...mine];

  const { error } = await admin
    .from("b2b_accounts")
    .update({ memo: stringifyMeta(meta) })
    .eq("id", acctId);
  if (error) return { ok: false, error: error.message };

  if (mine.length > 0) {
    await notifyOwner(
      `[받은 수량 차이 신고] ${acct?.company_name ?? ""}\n주문 ${
        order.order_no ?? ""
      }\n${carrySummary(mine)}\n→ 다음 주문에 자동 합산됩니다.`
    );
  }

  revalidatePath("/portal/orders");
  revalidatePath("/portal/order");
  return { ok: true };
}

export async function editOrder(
  orderId: string,
  input: { items: { id: string; qty: number }[]; note: string }
): Promise<OrderResult> {
  const me = await getMyAccount();
  if (!me) return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("b2b_orders")
    .select("account_id, status, order_no")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "주문을 찾을 수 없어요." };

  const isAdmin = me.role === "admin";
  const acctId = order.account_id as string;
  if (!isAdmin) {
    if (acctId !== me.id) return { ok: false, error: "권한이 없습니다." };
    if (order.status === "done" || order.status === "canceled") {
      return { ok: false, error: "완료/취소된 주문은 수정할 수 없어요." };
    }
  }

  const wanted = (input.items ?? []).filter((i) => i && i.qty > 0);
  if (wanted.length === 0)
    return { ok: false, error: "수량을 1개 이상 입력하세요." };

  const ids = wanted.map((i) => i.id);
  const { data: prodData } = await admin
    .from("products")
    .select("id, name, unit, base_price")
    .in("id", ids);
  const products = (prodData ?? []) as ProductRow[];
  const { data: priceData } = await admin
    .from("account_prices")
    .select("product_id, unit_price")
    .eq("account_id", acctId);
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

  // 확인 이후(확인/출고) 상태였는데 거래처가 수정 → 다시 '접수'로 되돌려 재확인 유도
  const wasConfirmed = order.status === "confirmed" || order.status === "shipped";
  const newStatus = !isAdmin && wasConfirmed ? "requested" : (order.status as string);

  await admin.from("b2b_order_items").delete().eq("order_id", orderId);
  const { error: iErr } = await admin
    .from("b2b_order_items")
    .insert(lines.map((l) => ({ ...l, order_id: orderId })));
  if (iErr) return { ok: false, error: "수정 저장에 실패했어요." };

  await admin
    .from("b2b_orders")
    .update({
      total_amount: total,
      note: input.note?.trim() || null,
      status: newStatus,
    })
    .eq("id", orderId);

  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("company_name")
    .eq("id", acctId)
    .maybeSingle();
  const company = acct?.company_name ?? "";
  const lineText = lines
    .map((l) => `· ${l.product_name} ${l.qty}${l.unit} = ${won(l.line_amount)}`)
    .join("\n");
  if (!isAdmin) {
    const head = wasConfirmed
      ? `[주문 수정 ⚠️ 재확인 필요] ${company}\n주문 ${order.order_no} (확인 후 수정됨)`
      : `[주문 수정] ${company}\n주문 ${order.order_no}`;
    await notifyOwner(`${head}\n${lineText}\n합계 ${won(total)}`);
  }

  return { ok: true, orderNo: order.order_no ?? undefined };
}
