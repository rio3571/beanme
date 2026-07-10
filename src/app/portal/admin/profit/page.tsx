import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { roastDateKey } from "@/lib/roasting";
import { mergeConfig } from "@/lib/roastConfig";
import { vatAmounts, DEFAULT_VAT } from "@/lib/vat";
import { parseMeta } from "@/lib/acctMeta";
import ProfitView, {
  type MonthAgg,
  type PuEntry,
  type HyDetailRow,
} from "./ProfitView";

export const dynamic = "force-dynamic";

export default async function ProfitPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const fromIso = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: cfgRow },
    { data: orderRows },
    { data: manualRows },
    { data: acctRows },
  ] = await Promise.all([
    admin.from("roast_config").select("data").eq("id", 1).maybeSingle(),
    admin
      .from("b2b_orders")
      .select("id, created_at, account_id")
      .neq("status", "canceled")
      .gte("created_at", fromIso)
      .limit(2000),
    admin
      .from("roast_manual")
      .select("id, account, qtys, roast_date, amount, brand"),
    admin.from("b2b_accounts").select("id, company_name, memo"),
  ]);

  const config = mergeConfig(cfgRow?.data);

  const orderDate = new Map(
    (orderRows ?? []).map((o) => [o.id as string, o.created_at as string])
  );
  const orderAccount = new Map(
    (orderRows ?? []).map((o) => [o.id as string, o.account_id as string])
  );
  const acctName = new Map(
    (acctRows ?? []).map((a) => [a.id as string, a.company_name as string])
  );
  // 거래처별 부가세 모드 (현금 = 부가세 없음)
  const vatMode = new Map(
    (acctRows ?? []).map((a) => [
      a.id as string,
      parseMeta(a.memo as string | null).vat ?? DEFAULT_VAT,
    ])
  );
  const orderIds = [...orderDate.keys()];

  const monthHY: Record<string, MonthAgg> = {};
  const monthPU: Record<string, MonthAgg> = {};
  const ensureHY = (ym: string) =>
    (monthHY[ym] ??= { orderRevenue: 0, manualRevenue: 0, cashRevenue: 0, kg: {} });
  const ensurePU = (ym: string) =>
    (monthPU[ym] ??= { orderRevenue: 0, manualRevenue: 0, cashRevenue: 0, kg: {} });

  // 희연재 거래처별 주문내역 (월→거래처)
  const hyDetailMap: Record<string, Map<string, HyDetailRow>> = {};
  const hyRow = (ym: string, account: string) => {
    const mm = (hyDetailMap[ym] ??= new Map());
    let r = mm.get(account);
    if (!r) {
      r = { account, kg: {}, revenue: 0 };
      mm.set(account, r);
    }
    return r;
  };

  // 희연재 = 포털 주문
  if (orderIds.length > 0) {
    const { data: items } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, qty, line_amount")
      .in("order_id", orderIds);
    for (const it of items ?? []) {
      const oid = it.order_id as string;
      const created = orderDate.get(oid);
      if (!created) continue;
      const ym = roastDateKey(created).slice(0, 7);
      const m = ensureHY(ym);
      const acctId = orderAccount.get(oid) ?? "";
      const rev = (it.line_amount as number) ?? 0;
      const pn = it.product_name as string;
      const qty = (it.qty as number) ?? 0;
      m.orderRevenue += rev;
      if ((vatMode.get(acctId) ?? DEFAULT_VAT) === "cash") m.cashRevenue += rev;
      m.kg[pn] = (m.kg[pn] ?? 0) + qty;
      const name = acctName.get(acctId) ?? "(미지정)";
      const r = hyRow(ym, name);
      r.revenue += rev;
      r.kg[pn] = (r.kg[pn] ?? 0) + qty;
    }
  }

  // 수기: 브랜드별 분리 (원시 목록 수집)
  const puEntries: PuEntry[] = [];
  const hyManual: PuEntry[] = [];
  for (const r of manualRows ?? []) {
    const ym = ((r.roast_date as string) ?? "").slice(0, 7);
    if (!ym) continue;
    const qtys = (r.qtys as Record<string, number>) ?? {};
    const amount = (r.amount as number) ?? 0;
    const isPu = ((r.brand as string) ?? "희연재") === "푸르파파";
    // 푸르파파 납품 단가는 부가세 별도 → 매출 부가세 포함. 희연재는 원래대로(입력값 그대로).
    const rev = isPu ? vatAmounts(amount, "excluded").total : amount;
    const m = isPu ? ensurePU(ym) : ensureHY(ym);
    m.manualRevenue += rev;
    for (const [pn, kg] of Object.entries(qtys)) {
      m.kg[pn] = (m.kg[pn] ?? 0) + (kg ?? 0);
    }
    if (isPu) {
      puEntries.push({
        id: r.id as string,
        account: (r.account as string) ?? "",
        qtys,
        roastDate: (r.roast_date as string) ?? "",
        amount,
      });
    } else {
      const acc = (r.account as string)?.trim() || "(수기)";
      const hr = hyRow(ym, acc);
      hr.revenue += amount;
      for (const [pn, kg] of Object.entries(qtys)) {
        hr.kg[pn] = (hr.kg[pn] ?? 0) + (kg ?? 0);
      }
      hyManual.push({
        id: r.id as string,
        account: (r.account as string) ?? "",
        qtys,
        roastDate: (r.roast_date as string) ?? "",
        amount,
      });
    }
  }

  const hyDetail: Record<string, HyDetailRow[]> = {};
  for (const [ym, mm] of Object.entries(hyDetailMap)) {
    hyDetail[ym] = [...mm.values()].sort((a, b) => b.revenue - a.revenue);
  }

  const kstYm = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  ensureHY(kstYm);
  ensurePU(kstYm);
  const months = [
    ...new Set([...Object.keys(monthHY), ...Object.keys(monthPU)]),
  ]
    .sort()
    .reverse();

  return (
    <ProfitView
      config={config}
      monthHY={monthHY}
      monthPU={monthPU}
      puEntries={puEntries}
      hyManual={hyManual}
      hyDetail={hyDetail}
      months={months}
      defaultMonth={kstYm}
    />
  );
}
