import { createAdminClient } from "@/lib/supabaseAdmin";
import { parseMeta } from "@/lib/acctMeta";
import { DEFAULT_VAT, vatAmounts, type VatMode } from "@/lib/vat";

/** 입금 대상 1건 — 포털 주문 또는 로스팅 수기 입력 */
export type BillItem = {
  kind: "order" | "manual";
  id: string;
  date: string; // YYYY-MM-DD (KST)
  label: string; // 주문번호·품목 요약
  amount: number; // 거래처가 실제로 낼 금액 (부가세 모드 반영)
  paymentId: string | null;
};

export type Payment = {
  id: string;
  paidOn: string;
  amount: number;
  memo: string;
  items: BillItem[];
};

export type PaymentData = {
  companyName: string;
  vatMode: VatMode;
  unpaid: BillItem[]; // 오래된 순
  payments: Payment[]; // 최신 입금 순
  unpaidTotal: number;
  credit: number; // 입금했지만 아직 어떤 건에도 안 쓴 금액(선입금 잔액)
};

const p2 = (n: number) => String(n).padStart(2, "0");
function kstDate(iso: string): string {
  const k = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}-${p2(k.getUTCMonth() + 1)}-${p2(k.getUTCDate())}`;
}

/** 거래처의 주문·수기 입력과 입금 기록을 모아 입금/미입금으로 나눈다 */
export async function loadPayments(accountId: string): Promise<PaymentData | null> {
  const admin = createAdminClient();
  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("company_name, memo")
    .eq("id", accountId)
    .maybeSingle();
  if (!acct) return null;
  const vatMode = parseMeta(acct.memo as string | null).vat ?? DEFAULT_VAT;
  const payable = (n: number) => vatAmounts(n, vatMode).total;

  const [{ data: orderData }, { data: manualData }, { data: payData }] = await Promise.all([
    admin
      .from("b2b_orders")
      .select("id, order_no, created_at, unit, payment_id")
      .eq("account_id", accountId)
      .neq("status", "canceled")
      .order("created_at", { ascending: true }),
    admin
      .from("roast_manual")
      .select("id, qtys, amount, roast_date, payment_id")
      .eq("account_id", accountId)
      .order("roast_date", { ascending: true }),
    admin
      .from("b2b_payments")
      .select("id, paid_on, amount, memo, created_at")
      .eq("account_id", accountId)
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const orders = orderData ?? [];
  const orderIds = orders.map((o) => o.id as string);
  const { data: itemData } = orderIds.length
    ? await admin.from("b2b_order_items").select("order_id, product_name, qty, line_amount").in("order_id", orderIds)
    : { data: [] };
  const byOrder = new Map<string, { names: string[]; sum: number }>();
  for (const it of itemData ?? []) {
    const e = byOrder.get(it.order_id as string) ?? { names: [], sum: 0 };
    e.names.push(`${it.product_name} ${it.qty}`);
    e.sum += (it.line_amount as number) ?? 0;
    byOrder.set(it.order_id as string, e);
  }

  const items: BillItem[] = [
    ...orders.map((o) => {
      const e = byOrder.get(o.id as string) ?? { names: [], sum: 0 };
      const head = [o.order_no ? `#${o.order_no}` : "", o.unit ? `${o.unit}` : ""].filter(Boolean).join(" ");
      return {
        kind: "order" as const,
        id: o.id as string,
        date: kstDate(o.created_at as string),
        label: [head, e.names.join(" · ") || "품목 없음"].filter(Boolean).join(" "),
        amount: payable(e.sum),
        paymentId: (o.payment_id as string | null) ?? null,
      };
    }),
    ...(manualData ?? [])
      .filter((m) => !!m.roast_date)
      .map((m) => ({
        kind: "manual" as const,
        id: m.id as string,
        date: m.roast_date as string,
        label:
          "수기 · " +
          (Object.entries((m.qtys as Record<string, number>) ?? {})
            .filter(([, v]) => Number(v) > 0)
            .map(([k, v]) => `${k} ${v}kg`)
            .join(" · ") || "품목 미기재"),
        amount: payable(Math.round(Number(m.amount) || 0)),
        paymentId: (m.payment_id as string | null) ?? null,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const payments: Payment[] = (payData ?? []).map((p) => ({
    id: p.id as string,
    paidOn: p.paid_on as string,
    amount: (p.amount as number) ?? 0,
    memo: (p.memo as string) ?? "",
    items: items.filter((it) => it.paymentId === p.id),
  }));
  const unpaid = items.filter((it) => !it.paymentId);
  const paidSum = payments.reduce((s, p) => s + p.amount, 0);
  const usedSum = items.filter((it) => it.paymentId).reduce((s, it) => s + it.amount, 0);

  return {
    companyName: acct.company_name as string,
    vatMode,
    unpaid,
    payments,
    unpaidTotal: unpaid.reduce((s, it) => s + it.amount, 0),
    credit: paidSum - usedSum,
  };
}
