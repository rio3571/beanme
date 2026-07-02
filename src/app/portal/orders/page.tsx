import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { won, kst, ym, ymLabel, STATUS_LABEL } from "@/lib/format";
import { parseMeta } from "@/lib/acctMeta";
import { carrySummary } from "@/lib/carry";
import OrderComments from "@/components/OrderComments";
import DeleteOrderButton from "@/components/DeleteOrderButton";
import ReportDelivery from "./ReportDelivery";
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
  let comments: (CommentRow & { order_id: string })[] = [];
  if (ids.length > 0) {
    // items + comments 동시 실행
    const [{ data: itemData }, { data: cData }] = await Promise.all([
      admin
        .from("b2b_order_items")
        .select("order_id, product_name, unit, unit_price, qty, line_amount")
        .in("order_id", ids),
      admin
        .from("b2b_order_comments")
        .select("id, order_id, sender, body, created_at")
        .in("order_id", ids)
        .order("created_at", { ascending: true }),
    ]);
    items = (itemData ?? []) as ItemRow[];
    comments = (cData ?? []) as (CommentRow & { order_id: string })[];
  }
  const byOrder = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = byOrder.get(it.order_id) ?? [];
    arr.push(it);
    byOrder.set(it.order_id, arr);
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

  const meta = parseMeta(account.memo);
  const carry = (meta.carry ?? []).filter((c) => c.qty !== 0);

  const renderCard = (o: OrderRow) => {
    const editable = o.status !== "done" && o.status !== "canceled";
    const productNames = [
      ...new Set((byOrder.get(o.id) ?? []).map((it) => it.product_name)),
    ];
    return (
    <div key={o.id} className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-stone-700">{o.order_no}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
            {STATUS_LABEL[o.status] ?? o.status}
          </span>
          {editable && (
            <Link
              href={`/portal/order/${o.id}/edit`}
              className="text-xs text-stone-400 hover:text-amber-700 px-1"
            >
              수정
            </Link>
          )}
          {editable && <DeleteOrderButton orderId={o.id} label="취소" />}
        </div>
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
      <ReportDelivery
        orderId={o.id}
        productNames={productNames}
        currentCarry={carry}
      />
      <OrderComments
        orderId={o.id}
        role="buyer"
        initial={cByOrder.get(o.id) ?? []}
      />
    </div>
    );
  };

  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-4">주문내역</h1>
      {carry.length > 0 && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl px-4 py-3 mb-4">
          <div className="text-sm font-bold text-rose-700">
            📦 아직 받지 못한 수량(이월)이 있어요
          </div>
          <div className="text-sm text-stone-700 mt-0.5">{carrySummary(carry)}</div>
          <div className="text-xs text-stone-500 mt-1">
            다음 출고 때 추가로 받게 돼요. (주문 금액과는 별개)
          </div>
        </div>
      )}
      {meta.bank && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm">
          <span className="font-semibold text-amber-800">입금계좌 </span>
          <span className="text-stone-700 whitespace-pre-wrap">{meta.bank}</span>
        </div>
      )}
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
              <div className="grid gap-3 sm:grid-cols-2 items-start">
                {g.orders.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
