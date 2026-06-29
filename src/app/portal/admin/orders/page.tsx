import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { won, kstDate, ym, ymLabel } from "@/lib/format";
import StatusSelect from "./StatusSelect";
import DeliveryAdjust from "./DeliveryAdjust";
import OrderComments from "@/components/OrderComments";
import DeleteOrderButton from "@/components/DeleteOrderButton";
import type { CommentRow } from "@/app/portal/comments";
import { parseMeta } from "@/lib/acctMeta";
import { carrySummary, type CarryItem } from "@/lib/carry";

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
    .select("id, company_name, memo");
  const nameMap = new Map(
    (acctData ?? []).map((a) => [a.id as string, a.company_name as string])
  );
  const carryMap = new Map<string, CarryItem[]>(
    (acctData ?? []).map((a) => [
      a.id as string,
      parseMeta(a.memo as string | null).carry ?? [],
    ])
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

  let comments: (CommentRow & { order_id: string })[] = [];
  if (ids.length > 0) {
    const { data: cData } = await admin
      .from("b2b_order_comments")
      .select("id, order_id, sender, body, created_at")
      .in("order_id", ids)
      .order("created_at", { ascending: true });
    comments = (cData ?? []) as (CommentRow & { order_id: string })[];
  }
  const cByOrder = new Map<string, CommentRow[]>();
  for (const c of comments) {
    const arr = cByOrder.get(c.order_id) ?? [];
    arr.push({ id: c.id, sender: c.sender, body: c.body, created_at: c.created_at });
    cByOrder.set(c.order_id, arr);
  }

  // 월별 그룹
  const groups: { ym: string; orders: OrderRow[] }[] = [];
  const gmap = new Map<string, OrderRow[]>();
  for (const o of orders) {
    const key = ym(o.created_at);
    if (!gmap.has(key)) {
      gmap.set(key, []);
      groups.push({ ym: key, orders: gmap.get(key)! });
    }
    gmap.get(key)!.push(o);
  }

  const renderRow = (o: OrderRow) => {
    const items = byOrder.get(o.id) ?? [];
    const summary = items
      .map((it) => `${it.product_name} ${it.qty}${it.unit}`)
      .join(" · ");
    const productNames = [...new Set(items.map((it) => it.product_name))];
    const carry = carryMap.get(o.account_id) ?? [];
    return (
      <div
        key={o.id}
        className="bg-white rounded-lg border border-stone-200 px-3 py-2.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="text-xs text-stone-400 w-12 shrink-0">
            {kstDate(o.created_at).slice(5)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-stone-800 truncate">
              {nameMap.get(o.account_id) ?? "—"}
            </div>
            <div className="text-xs text-stone-500 truncate">
              {summary || "—"}
            </div>
          </div>
          <div className="text-sm font-bold text-stone-800 text-right shrink-0">
            {won(o.total_amount)}
          </div>
          <StatusSelect orderId={o.id} initial={o.status} />
          <DeleteOrderButton orderId={o.id} />
        </div>
        {o.note && (
          <div className="text-xs text-stone-400 mt-1.5">요청: {o.note}</div>
        )}
        {carry.length > 0 && (
          <div className="mt-1.5 inline-block rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700">
            📦 받아야 할 것(이월): {carrySummary(carry)} · 출고 후 0으로 비우기
          </div>
        )}
        <DeliveryAdjust
          accountId={o.account_id}
          productNames={productNames}
          currentCarry={carry}
        />
        <OrderComments
          orderId={o.id}
          role="admin"
          initial={cByOrder.get(o.id) ?? []}
        />
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-4">전체 주문</h1>
      {orders.length === 0 ? (
        <p className="text-stone-400 text-center py-16">아직 주문이 없어요.</p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.ym}>
              <h2 className="font-bold text-stone-700 mb-2">{ymLabel(g.ym)}</h2>
              <div className="space-y-1.5">{g.orders.map(renderRow)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
