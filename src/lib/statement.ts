import { createAdminClient } from "@/lib/supabaseAdmin";
import { parseMeta } from "@/lib/acctMeta";
import { DEFAULT_VAT, type VatMode } from "@/lib/vat";
import type { StmtRow, StmtBuyer } from "@/components/StatementView";

export type StatementData = {
  buyer: StmtBuyer;
  months: string[]; // 정산주기 라벨들 (최신순) 'YYYY-MM'
  selectedYm: string;
  rows: StmtRow[];
  total: number;
  vatMode: VatMode;
  periodLabel: string; // 'YYYY-MM-DD ~ YYYY-MM-DD'
  billDay: number;
};

const p2 = (n: number) => String(n).padStart(2, "0");

/** KST 기준 날짜(YYYY-MM-DD) */
function kstDateStr(iso: string): string {
  const k = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}-${p2(k.getUTCMonth() + 1)}-${p2(k.getUTCDate())}`;
}

/** 주문일 → 정산주기 라벨(끝나는 달 기준). billDay>=2면 전월billDay~당월(billDay-1) */
export function periodKey(iso: string, billDay: number): string {
  const k = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  let y = k.getUTCFullYear();
  let m = k.getUTCMonth(); // 0-11
  const d = k.getUTCDate();
  if (billDay >= 2 && d >= billDay) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return `${y}-${p2(m + 1)}`;
}

/** 정산주기 라벨 → [시작일, 종료일] (YYYY-MM-DD) */
export function periodRange(key: string, billDay: number): [string, string] {
  const [y, m] = key.split("-").map(Number); // m: 1-12
  if (billDay >= 2) {
    const from = new Date(Date.UTC(y, m - 2, billDay));
    const to = new Date(Date.UTC(y, m - 1, billDay - 1));
    return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
  }
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0));
  return [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)];
}

type ManualRow = { id: string; qtys: Record<string, number> | null; amount: number | null; roast_date: string | null };

/** 거래처 단가(account_prices → products.base_price) 맵: 품목명 → 단가 */
async function loadUnitPrices(
  admin: ReturnType<typeof createAdminClient>,
  accountId: string
): Promise<Map<string, number>> {
  const [{ data: prodData }, { data: priceData }] = await Promise.all([
    admin
      .from("products")
      .select("id, name, base_price")
      .eq("active", true)
      .or(`owner_account_id.is.null,owner_account_id.eq.${accountId}`),
    admin.from("account_prices").select("product_id, unit_price").eq("account_id", accountId),
  ]);
  const byProduct = new Map((priceData ?? []).map((p) => [p.product_id as string, p.unit_price as number]));
  const out = new Map<string, number>();
  for (const p of prodData ?? []) {
    out.set(p.name as string, byProduct.get(p.id as string) ?? ((p.base_price as number) ?? 0));
  }
  return out;
}

/** 수기 1건 → 명세서 행. 단가로 환산한 합계가 저장 금액과 맞으면 품목별로, 아니면 한 줄(저장 금액)로 */
function manualToRows(m: ManualRow, prices: Map<string, number>): StmtRow[] {
  const date = `${m.roast_date}T00:00:00+09:00`;
  const items = Object.entries(m.qtys ?? {})
    .map(([name, q]) => [name, Number(q) || 0] as const)
    .filter(([, q]) => q > 0);
  const stored = Math.round(Number(m.amount) || 0);
  const known = items.length > 0 && items.every(([name]) => (prices.get(name) ?? 0) > 0);
  const computed = known ? Math.round(items.reduce((sum, [name, q]) => sum + (prices.get(name) as number) * Math.round(q), 0)) : null;

  if (computed !== null && (stored === 0 || Math.abs(stored - computed) <= 1)) {
    return items.map(([name, q]) => {
      const unitPrice = prices.get(name) as number;
      return { date, floor: "", name, unit: "kg", qty: q, unitPrice, amount: unitPrice * Math.round(q) };
    });
  }
  const label = items.map(([name, q]) => `${name} ${q}kg`).join(" · ") || "품목 미기재";
  return [{ date, floor: "", name: `로스팅 · ${label}`, unit: "", qty: 1, unitPrice: stored, amount: stored }];
}

export async function loadStatement(
  accountId: string,
  ymParam?: string,
  range?: { from?: string; to?: string }
): Promise<StatementData> {
  const admin = createAdminClient();

  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  const meta = parseMeta((acct as { memo?: string | null } | null)?.memo);
  const billDay = meta.billDay ?? 1;

  const { data: orderData } = await admin
    .from("b2b_orders")
    .select("id, created_at, unit")
    .eq("account_id", accountId)
    .neq("status", "canceled")
    .order("created_at", { ascending: true });
  const orders = (orderData ?? []) as {
    id: string;
    created_at: string;
    unit: string | null;
  }[];

  // 이 거래처에 연결된 로스팅 수기 입력 (간이로 거래 내역을 따로 만들 필요 없이 함께 집계)
  const { data: manualData } = await admin
    .from("roast_manual")
    .select("id, qtys, amount, roast_date")
    .eq("account_id", accountId)
    .order("roast_date", { ascending: true });
  const manuals = ((manualData ?? []) as ManualRow[]).filter((m) => !!m.roast_date);
  const manualKey = (m: ManualRow) => periodKey(`${m.roast_date}T00:00:00+09:00`, billDay);

  const months = Array.from(
    new Set([...orders.map((o) => periodKey(o.created_at, billDay)), ...manuals.map(manualKey)])
  )
    .filter(Boolean)
    .sort()
    .reverse();

  const fallback = periodKey(new Date().toISOString(), billDay);
  const selectedYm =
    ymParam && months.includes(ymParam) ? ymParam : months[0] ?? fallback;

  // 날짜 지정(range)이 있으면 그 구간, 없으면 선택된 정산주기
  const customRange = !!(range?.from && range?.to);
  const [pFrom, pTo] = periodRange(selectedYm, billDay);
  const from = customRange ? range!.from! : pFrom;
  const to = customRange ? range!.to! : pTo;

  const periodOrders = orders.filter((o) => {
    if (customRange) {
      const d = kstDateStr(o.created_at);
      return d >= from && d <= to;
    }
    return periodKey(o.created_at, billDay) === selectedYm;
  });
  const monthOrderIds = periodOrders.map((o) => o.id);

  let rows: StmtRow[] = [];
  if (monthOrderIds.length > 0) {
    const orderDate = new Map(orders.map((o) => [o.id, o.created_at]));
    const orderFloor = new Map(orders.map((o) => [o.id, o.unit ?? ""]));
    const { data: itemData } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, unit, unit_price, qty, line_amount")
      .in("order_id", monthOrderIds);
    rows = (itemData ?? []).map((it) => ({
      date: orderDate.get(it.order_id as string) ?? "",
      floor: orderFloor.get(it.order_id as string) ?? "",
      name: it.product_name as string,
      unit: (it.unit as string) ?? "",
      qty: it.qty as number,
      unitPrice: it.unit_price as number,
      amount: it.line_amount as number,
    }));
    rows.sort(
      (a, b) =>
        (a.floor || "").localeCompare(b.floor || "") ||
        a.date.localeCompare(b.date)
    );
  }

  // 해당 기간의 수기 입력을 행으로 합침
  const periodManuals = manuals.filter((m) =>
    customRange ? (m.roast_date as string) >= from && (m.roast_date as string) <= to : manualKey(m) === selectedYm
  );
  if (periodManuals.length > 0) {
    const prices = await loadUnitPrices(admin, accountId);
    for (const m of periodManuals) rows.push(...manualToRows(m, prices));
    rows.sort((a, b) => (a.floor || "").localeCompare(b.floor || "") || a.date.localeCompare(b.date));
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const buyer = (acct ? { ...acct, bank: meta.bank } : null) as StmtBuyer;
  return {
    buyer,
    months,
    selectedYm,
    rows,
    total,
    vatMode: meta.vat ?? DEFAULT_VAT,
    periodLabel: `${from} ~ ${to}`,
    billDay,
  };
}
