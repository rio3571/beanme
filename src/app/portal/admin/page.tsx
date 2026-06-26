import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { won, ym, ymLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const thisYm = ym(new Date().toISOString());

  const { data: orderData } = await admin
    .from("b2b_orders")
    .select("id, total_amount, created_at, status");
  const orders = (orderData ?? []) as {
    id: string;
    total_amount: number;
    created_at: string;
    status: string;
  }[];
  const monthOrders = orders.filter((o) => ym(o.created_at) === thisYm);
  const monthCount = monthOrders.length;
  const monthSales = monthOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "requested").length;

  const monthIds = monthOrders.map((o) => o.id);
  const qtyMap = new Map<string, number>();
  if (monthIds.length > 0) {
    const { data: itemData } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, qty")
      .in("order_id", monthIds);
    for (const it of itemData ?? []) {
      const name = it.product_name as string;
      qtyMap.set(name, (qtyMap.get(name) ?? 0) + ((it.qty as number) ?? 0));
    }
  }

  const { data: prodData } = await admin
    .from("products")
    .select("name")
    .eq("active", true)
    .order("sort_order");
  const products = (prodData ?? []).map((p) => p.name as string);
  const monthTotalQty = [...qtyMap.values()].reduce((s, v) => s + v, 0);

  const { data: msgData } = await admin
    .from("b2b_messages")
    .select("sender, read_by_admin");
  const unread = (msgData ?? []).filter(
    (m) => m.sender === "buyer" && !m.read_by_admin
  ).length;

  const { data: acctData } = await admin
    .from("b2b_accounts")
    .select("id")
    .eq("role", "buyer");
  const acctCount = (acctData ?? []).length;

  const metric = (label: string, value: string, sub?: string) => (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="text-xs text-stone-400 font-medium">{label}</div>
      <div className="text-2xl font-bold text-stone-800 mt-1 leading-tight">
        {value}
      </div>
      {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-lg font-bold text-stone-800">대시보드</h1>
        <span className="text-sm text-stone-400">{ymLabel(thisYm)} 기준</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        {metric("이번 달 주문", `${monthCount}건`)}
        {metric("이번 달 매출", won(monthSales), "VAT 별도")}
        <Link href="/portal/admin/orders" className="contents">
          {metric("처리 대기", `${pendingCount}건`, "접수 상태")}
        </Link>
        <Link href="/portal/admin/messages" className="contents">
          {metric("안 읽은 문의", `${unread}건`, unread > 0 ? "확인 필요" : "—")}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-3">
        <div className="flex items-baseline justify-between mb-3">
          <span className="font-semibold text-stone-800">상품별 주문 수량</span>
          <span className="text-xs text-stone-400">
            이번 달 합계 {monthTotalQty}kg
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {products.map((name) => (
            <div
              key={name}
              className="bg-stone-50 rounded-lg border border-stone-200 px-3 py-2.5"
            >
              <div className="text-sm text-stone-500">{name}</div>
              <div className="text-xl font-bold text-stone-800">
                {qtyMap.get(name) ?? 0}
                <span className="text-sm font-medium text-stone-400">kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Link
          href="/portal/admin/accounts"
          className="bg-white rounded-xl border border-stone-200 p-4 text-center hover:border-amber-500"
        >
          <div className="font-semibold text-stone-800">거래처</div>
          <div className="text-xs text-stone-400 mt-0.5">{acctCount}개</div>
        </Link>
        <Link
          href="/portal/admin/orders"
          className="bg-white rounded-xl border border-stone-200 p-4 text-center hover:border-amber-500"
        >
          <div className="font-semibold text-stone-800">전체 주문</div>
          <div className="text-xs text-stone-400 mt-0.5">누적 {orders.length}건</div>
        </Link>
        <Link
          href="/portal/admin/messages"
          className="bg-white rounded-xl border border-stone-200 p-4 text-center hover:border-amber-500"
        >
          <div className="font-semibold text-stone-800">문의</div>
          <div className="text-xs text-stone-400 mt-0.5">
            {unread > 0 ? `안읽음 ${unread}` : "관리"}
          </div>
        </Link>
      </div>
    </div>
  );
}
