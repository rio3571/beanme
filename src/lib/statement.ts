import { createAdminClient } from "@/lib/supabaseAdmin";
import { ym } from "@/lib/format";
import type { StmtRow, StmtBuyer } from "@/components/StatementView";

export type StatementData = {
  buyer: StmtBuyer;
  months: string[]; // 거래가 있는 달들 (최신순) 'YYYY-MM'
  selectedYm: string;
  rows: StmtRow[];
  total: number;
};

export async function loadStatement(
  accountId: string,
  ymParam?: string
): Promise<StatementData> {
  const admin = createAdminClient();

  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("company_name, contact_name, phone, business_no, address")
    .eq("id", accountId)
    .maybeSingle();

  const { data: orderData } = await admin
    .from("b2b_orders")
    .select("id, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });
  const orders = (orderData ?? []) as { id: string; created_at: string }[];

  const months = Array.from(new Set(orders.map((o) => ym(o.created_at))))
    .filter(Boolean)
    .sort()
    .reverse();

  const fallback = ym(new Date().toISOString());
  const selectedYm =
    ymParam && months.includes(ymParam) ? ymParam : months[0] ?? fallback;

  const monthOrderIds = orders
    .filter((o) => ym(o.created_at) === selectedYm)
    .map((o) => o.id);

  let rows: StmtRow[] = [];
  if (monthOrderIds.length > 0) {
    const orderDate = new Map(orders.map((o) => [o.id, o.created_at]));
    const { data: itemData } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, unit, unit_price, qty, line_amount")
      .in("order_id", monthOrderIds);
    rows = (itemData ?? []).map((it) => ({
      date: orderDate.get(it.order_id as string) ?? "",
      name: it.product_name as string,
      unit: (it.unit as string) ?? "",
      qty: it.qty as number,
      unitPrice: it.unit_price as number,
      amount: it.line_amount as number,
    }));
    rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { buyer: acct as StmtBuyer, months, selectedYm, rows, total };
}
