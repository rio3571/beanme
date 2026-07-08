import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { won, ym, ymLabel } from "@/lib/format";
import { parseMeta } from "@/lib/acctMeta";
import { DEFAULT_VAT } from "@/lib/vat";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const thisYm = ym(new Date().toISOString());

  // 서로 독립된 쿼리 4개는 동시에 실행 (순차 → 병렬)
  const [
    { data: orderData },
    { data: acctRows },
    { data: prodData },
    { data: msgData },
  ] = await Promise.all([
    admin
      .from("b2b_orders")
      .select("id, account_id, total_amount, created_at, status"),
    admin.from("b2b_accounts").select("id, role, memo"),
    admin
      .from("products")
      .select("name")
      .eq("active", true)
      .is("owner_account_id", null)
      .order("sort_order"),
    admin.from("b2b_messages").select("sender, read_by_admin"),
  ]);

  const orders = (orderData ?? []) as {
    id: string;
    account_id: string;
    total_amount: number;
    created_at: string;
    status: string;
  }[];
  const monthOrders = orders.filter((o) => ym(o.created_at) === thisYm);
  const monthCount = monthOrders.length;
  const pendingCount = orders.filter((o) => o.status === "requested").length;

  // 거래처별 부가세 모드 (현금 매출 분리용)
  const vatMap = new Map(
    (acctRows ?? []).map((a) => [
      a.id as string,
      parseMeta(a.memo as string | null).vat ?? DEFAULT_VAT,
    ])
  );
  const acctCount = (acctRows ?? []).filter((a) => a.role === "buyer").length;

  // 매출 분리: 현금 vs 부가세(별도+포함)
  let salesCash = 0;
  let salesVat = 0;
  for (const o of monthOrders) {
    const mode = vatMap.get(o.account_id) ?? DEFAULT_VAT;
    if (mode === "cash") salesCash += o.total_amount || 0;
    else salesVat += o.total_amount || 0;
  }

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

  const products = (prodData ?? []).map((p) => p.name as string);
  const monthTotalQty = [...qtyMap.values()].reduce((s, v) => s + v, 0);

  const unread = (msgData ?? []).filter(
    (m) => m.sender === "buyer" && !m.read_by_admin
  ).length;

  const metric = (
    label: string,
    value: string,
    sub?: string,
    tone = "bg-white border-stone-200"
  ) => (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="text-xs text-stone-500 font-medium">{label}</div>
      <div className="text-2xl font-bold text-stone-800 mt-1 leading-tight">
        {value}
      </div>
      {sub && <div className="text-xs text-stone-400 mt-0.5">{sub}</div>}
    </div>
  );

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4 gap-2">
        <h1 className="text-lg font-bold text-stone-800">대시보드</h1>
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-stone-400">{ymLabel(thisYm)} 기준</span>
          <AutoRefresh seconds={30} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-3">
        {metric("이번 달 주문", `${monthCount}건`, undefined, "bg-amber-50 border-amber-100")}
        {metric("부가세 매출", won(salesVat), "별도+포함 · 공급가", "bg-emerald-50 border-emerald-100")}
        {metric("현금 매출", won(salesCash), "부가세 없음 · 따로 관리", "bg-teal-50 border-teal-100")}
        <Link href="/portal/admin/orders" className="contents">
          {metric("처리 대기", `${pendingCount}건`, "접수 상태", "bg-orange-50 border-orange-100")}
        </Link>
        <Link href="/portal/admin/messages" className="contents">
          {metric(
            "안 읽은 문의",
            `${unread}건`,
            unread > 0 ? "확인 필요" : "—",
            unread > 0 ? "bg-rose-50 border-rose-200" : "bg-sky-50 border-sky-100"
          )}
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
              className="bg-amber-50 rounded-lg border border-amber-100 px-3 py-2.5"
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Link
          href="/portal/admin/roasting"
          className="bg-amber-600 rounded-xl border border-amber-600 p-4 text-center hover:bg-amber-700"
        >
          <div className="font-semibold text-white">로스팅 목록</div>
          <div className="text-xs text-amber-100 mt-0.5">화·목 작업량</div>
        </Link>
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
