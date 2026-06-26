import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { won, kst, ym, ymLabel, STATUS_LABEL } from "@/lib/format";
import OrderComments from "@/components/OrderComments";
import type { CommentRow } from "@/app/portal/comments";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  order_no: string | null;
  status: string;
  total_amount: number;
  note: string | null;
  created_at: string;
};
type ItemRow = {
  order_id: string;
  product_name: string;
  unit: string | null;
  unit_price: number;
  qty: number;
  line_amount: number;
};

export default async function OrdersPage() {
  const account = await getMyAccount();
  if (!account) redirect("/portal/login");
  if (account.role === "admin") redirect("/portal/admin/orders");

  const admin = createAdminClient();
  const { data: orderData } = await admin
    .from("b2b_orders")
    .select("id, order_no, status, total_amount, note, created_at")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });
  const orders = (orderData ?? []) as OrderRow[];

  const ids = orders.map((o) => o.id);
  let items: ItemRow[] = [];
  if (ids.length > 0) {
    const { data: itemData } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, unit, unit_price, qty, line_amount")
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

  // 월별 그룹 (orders는 최신순 정렬됨)
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

  const renderCard = (o: OrderRow) => (
    <div key={o.id} className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-700">{o.order_no}</span>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
          {STATUS_LABEL[o.status] ?? o.status}
        </span>
      </div>
      <div className="text-xs text-stone-400 mt-0.5">{kst(o.created_at)}</div>
      <div className="mt-2 border-t border-stone-100 pt-2 space-y-0.5">
        {(byOrder.get(o.id) ?? []).map((it, i) => (
          <div key={i} className="flex justify-between text-sm text-stone-600">
            <span>
              {it.product_name} {it.qty}
              {it.unit}
            </span>
            <span>{won(it.line_amount)}</span>
          </div>
        ))}
      </div>
      {o.note && <div className="text-xs text-stone-400 mt-2">요청: {o.note}</div>}
      <div className="flex justify-end mt-2 font-bold text-stone-800">
        {won(o.total_amount)}
      </div>
      <OrderComments
        orderId={o.id}
        role="buyer"
        initial={cByOrder.get(o.id) ?? []}
      />
    </div>
  );

  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-4">주문내역</h1>
      {orders.length === 0 ? (
        <p className="text-stone-400 text-center py-16">아직 주문 내역이 없어요.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.ym}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-stone-700">{ymLabel(g.ym)}</h2>
                <Link
                  href={`/portal/statement?ym=${g.ym}`}
                  className="text-sm text-amber-700 font-medium"
                >
                  📄 거래내역서
                </Link>
              </div>
              <div className="space-y-3">{g.orders.map(renderCard)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
