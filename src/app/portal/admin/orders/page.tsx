import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { won, kst } from "@/lib/format";
import StatusSelect from "./StatusSelect";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_no: string | null;
  account_id: string;
  status: string;
  total_amount: number;
  note: string | null;
  created_at: string;
};
type ItemRow = {
  order_id: string;
  product_name: string;
  unit: string | null;
  qty: number;
  line_amount: number;
};

export default async function AdminOrdersPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const { data: orderData } = await admin
    .from("b2b_orders")
    .select("id, order_no, account_id, status, total_amount, note, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const orders = (orderData ?? []) as OrderRow[];

  const { data: acctData } = await admin
    .from("b2b_accounts")
    .select("id, company_name");
  const nameMap = new Map(
    (acctData ?? []).map((a) => [a.id as string, a.company_name as string])
  );

  const ids = orders.map((o) => o.id);
  let items: ItemRow[] = [];
  if (ids.length > 0) {
    const { data: itemData } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, unit, qty, line_amount")
      .in("order_id", ids);
    items = (itemData ?? []) as ItemRow[];
  }
  const byOrder = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = byOrder.get(it.order_id) ?? [];
    arr.push(it);
    byOrder.set(it.order_id, arr);
  }

  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-4">전체 주문</h1>
      {orders.length === 0 ? (
        <p className="text-stone-400 text-center py-16">아직 주문이 없어요.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-xl border border-stone-200 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-stone-800 truncate">
                    {nameMap.get(o.account_id) ?? "—"}
                  </div>
                  <div className="text-xs text-stone-400">
                    {o.order_no} · {kst(o.created_at)}
                  </div>
                </div>
                <StatusSelect orderId={o.id} initial={o.status} />
              </div>
              <div className="mt-2 border-t border-stone-100 pt-2 space-y-0.5">
                {(byOrder.get(o.id) ?? []).map((it, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-sm text-stone-600"
                  >
                    <span>
                      {it.product_name} {it.qty}
                      {it.unit}
                    </span>
                    <span>{won(it.line_amount)}</span>
                  </div>
                ))}
              </div>
              {o.note && (
                <div className="text-xs text-stone-400 mt-2">요청: {o.note}</div>
              )}
              <div className="flex justify-end mt-2 font-bold text-stone-800">
                {won(o.total_amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
