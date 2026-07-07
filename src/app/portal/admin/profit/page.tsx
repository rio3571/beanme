import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { roastDateKey } from "@/lib/roasting";
import { mergeConfig } from "@/lib/roastConfig";
import ProfitView, { type MonthAgg } from "./ProfitView";

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
      admin.from("roast_manual").select("qtys, roast_date, amount"),
    ]);

  const config = mergeConfig(cfgRow?.data);

  const orderDate = new Map(
    (orderRows ?? []).map((o) => [o.id as string, o.created_at as string])
  );
  const orderIds = [...orderDate.keys()];

  const monthData: Record<string, MonthAgg> = {};
  const ensure = (ym: string) =>
    (monthData[ym] ??= { orderRevenue: 0, manualRevenue: 0, kg: {} });

  if (orderIds.length > 0) {
    const { data: items } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, qty, line_amount")
      .in("order_id", orderIds);
    for (const it of items ?? []) {
      const created = orderDate.get(it.order_id as string);
      if (!created) continue;
      const ym = roastDateKey(created).slice(0, 7);
      const m = ensure(ym);
      m.orderRevenue += (it.line_amount as number) ?? 0;
      const pn = it.product_name as string;
      m.kg[pn] = (m.kg[pn] ?? 0) + ((it.qty as number) ?? 0);
    }
  }
  for (const r of manualRows ?? []) {
    const ym = ((r.roast_date as string) ?? "").slice(0, 7);
    if (!ym) continue;
    const m = ensure(ym);
    m.manualRevenue += (r.amount as number) ?? 0;
    const qtys = (r.qtys as Record<string, number>) ?? {};
    for (const [pn, kg] of Object.entries(qtys)) {
      m.kg[pn] = (m.kg[pn] ?? 0) + (kg ?? 0);
    }
  }

  const kstYm = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  ensure(kstYm);
  const months = Object.keys(monthData).sort().reverse();

  return (
    <ProfitView
      config={config}
      monthData={monthData}
      months={months}
      defaultMonth={kstYm}
    />
  );
}
