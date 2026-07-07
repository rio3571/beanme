import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { roastDateKey } from "@/lib/roasting";
import { mergeConfig } from "@/lib/roastConfig";
import ProfitView, { type MonthAgg, type PuEntry } from "./ProfitView";

export const dynamic = "force-dynamic";

export default async function ProfitPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const fromIso = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: cfgRow }, { data: orderRows }, { data: manualRows }] =
    await Promise.all([
      admin.from("roast_config").select("data").eq("id", 1).maybeSingle(),
      admin
        .from("b2b_orders")
        .select("id, created_at")
        .neq("status", "canceled")
        .gte("created_at", fromIso)
        .limit(2000),
      admin
        .from("roast_manual")
        .select("id, account, qtys, roast_date, amount, brand"),
    ]);

  const config = mergeConfig(cfgRow?.data);

  const orderDate = new Map(
    (orderRows ?? []).map((o) => [o.id as string, o.created_at as string])
  );
  const orderIds = [...orderDate.keys()];

  const monthHY: Record<string, MonthAgg> = {};
  const monthPU: Record<string, MonthAgg> = {};
  const ensureHY = (ym: string) =>
    (monthHY[ym] ??= { orderRevenue: 0, manualRevenue: 0, kg: {} });
  const ensurePU = (ym: string) =>
    (monthPU[ym] ??= { orderRevenue: 0, manualRevenue: 0, kg: {} });

  // 희연재 = 포털 주문
  if (orderIds.length > 0) {
    const { data: items } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, qty, line_amount")
      .in("order_id", orderIds);
    for (const it of items ?? []) {
      const created = orderDate.get(it.order_id as string);
      if (!created) continue;
      const ym = roastDateKey(created).slice(0, 7);
      const m = ensureHY(ym);
      m.orderRevenue += (it.line_amount as number) ?? 0;
      const pn = it.product_name as string;
      m.kg[pn] = (m.kg[pn] ?? 0) + ((it.qty as number) ?? 0);
    }
  }

  // 수기: 브랜드별 분리 (푸르파파는 원시 목록도 수집)
  const puEntries: PuEntry[] = [];
  for (const r of manualRows ?? []) {
    const ym = ((r.roast_date as string) ?? "").slice(0, 7);
    if (!ym) continue;
    const qtys = (r.qtys as Record<string, number>) ?? {};
    const amount = (r.amount as number) ?? 0;
    const isPu = ((r.brand as string) ?? "희연재") === "푸르파파";
    const m = isPu ? ensurePU(ym) : ensureHY(ym);
    m.manualRevenue += amount;
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
    }
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
      months={months}
      defaultMonth={kstYm}
    />
  );
}
