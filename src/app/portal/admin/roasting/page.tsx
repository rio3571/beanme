import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import {
  roastDateKey,
  roastDateLabel,
  todayKstKey,
  nextRoastDayKey,
} from "@/lib/roasting";
import RoastingRow from "./RoastingRow";
import TodayRoast from "./TodayRoast";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  account_id: string;
  status: string;
  created_at: string;
};
type ItemRow = {
  order_id: string;
  product_name: string;
  qty: number;
};

const STATUS_PRIORITY = ["requested", "confirmed", "shipped", "done"];

export default async function RoastingPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();

  // orders(취소·완료 제외) + accounts + products 동시 실행
  const [{ data: orderData }, { data: acctData }, { data: prodData }] =
    await Promise.all([
      admin
        .from("b2b_orders")
        .select("id, account_id, status, created_at")
        .not("status", "in", "(canceled,done)")
        .order("created_at", { ascending: false })
        .limit(300),
      admin.from("b2b_accounts").select("id, company_name"),
      admin
        .from("products")
        .select("name")
        .eq("active", true)
        .order("sort_order"),
    ]);
  const orders = (orderData ?? []) as OrderRow[];

  const nameMap = new Map(
    (acctData ?? []).map((a) => [a.id as string, a.company_name as string])
  );
  const columns: string[] = (prodData ?? []).map((p) => p.name as string);

  const ids = orders.map((o) => o.id);
  let items: ItemRow[] = [];
  if (ids.length > 0) {
    const { data: itemData } = await admin
      .from("b2b_order_items")
      .select("order_id, product_name, qty")
      .in("order_id", ids);
    items = (itemData ?? []) as ItemRow[];
  }
  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it);
    itemsByOrder.set(it.order_id, arr);
    if (!columns.includes(it.product_name)) columns.push(it.product_name); // 비활성 상품 보강
  }

  // 로스팅 날짜 → 거래처 → {품목별 수량, 주문ids, 상태}
  type AcctAgg = {
    name: string;
    orderIds: string[];
    qty: Map<string, number>;
    status: string; // 가장 진행 안 된 상태
  };
  type Batch = { key: string; accounts: Map<string, AcctAgg>; order: string[] };
  const batchMap = new Map<string, Batch>();

  for (const o of orders) {
    const key = roastDateKey(o.created_at);
    let b = batchMap.get(key);
    if (!b) {
      b = { key, accounts: new Map(), order: [] };
      batchMap.set(key, b);
    }
    let a = b.accounts.get(o.account_id);
    if (!a) {
      a = {
        name: nameMap.get(o.account_id) ?? "—",
        orderIds: [],
        qty: new Map(),
        status: "done",
      };
      b.accounts.set(o.account_id, a);
      b.order.push(o.account_id);
    }
    a.orderIds.push(o.id);
    // 가장 진행 안 된 상태로 유지
    if (
      STATUS_PRIORITY.indexOf(o.status) < STATUS_PRIORITY.indexOf(a.status)
    ) {
      a.status = o.status;
    }
    for (const it of itemsByOrder.get(o.id) ?? []) {
      a.qty.set(it.product_name, (a.qty.get(it.product_name) ?? 0) + (it.qty ?? 0));
    }
  }

  // 날짜 정렬: 오늘 이후(가까운 순) → 지난(최근 순)
  const keys = [...batchMap.keys()].sort();
  const today = todayKstKey(new Date().toISOString());
  // 수기·현재 배치 기준일: 가장 가까운 화/목 로스팅일 (오늘이 화·목이면 오늘)
  const roastAnchor = nextRoastDayKey(new Date().toISOString());
  const ordered = [
    ...keys.filter((k) => k >= today),
    ...keys.filter((k) => k < today).reverse(),
  ];

  // 현재 로스팅 배치(다음 화/목) → 클라이언트 표(수기 추가 포함)로 렌더
  const todayBatch = batchMap.get(roastAnchor);
  const todayOrderRows = todayBatch
    ? todayBatch.order.map((aid) => {
        const a = todayBatch.accounts.get(aid)!;
        const qtys: Record<string, number> = {};
        for (const c of columns) qtys[c] = a.qty.get(c) ?? 0;
        return {
          accountId: aid,
          name: a.name,
          qtys,
          orderIds: a.orderIds,
          status: a.status,
        };
      })
    : [];
  const otherKeys = ordered.filter((k) => k !== roastAnchor);

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <h1 className="text-lg font-bold text-stone-800">로스팅 목록</h1>
        <AutoRefresh seconds={30} />
      </div>
      <p className="text-xs text-stone-400 mb-4">
        월·수 주문 마감 → 화·목 로스팅. 화요일 = 목~월 주문 / 목요일 = 화·수 주문.
        완료 누르면 목록에서 사라져요.
      </p>

      <TodayRoast
        columns={columns}
        dateLabel={roastDateLabel(roastAnchor)}
        isToday={roastAnchor === today}
        rows={todayOrderRows}
      />

      {otherKeys.length > 0 && (
        <div className="space-y-4">
          {otherKeys.map((key) => {
            const b = batchMap.get(key)!;
            const isToday = key === today;
            const isUpcoming = key >= today;
            const totals = columns.map((c) =>
              b.order.reduce(
                (s, aid) => s + (b.accounts.get(aid)!.qty.get(c) ?? 0),
                0
              )
            );
            const totalKg = totals.reduce((s, v) => s + v, 0);
            return (
              <div
                key={key}
                className={`rounded-xl border overflow-hidden ${
                  isToday
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-stone-200"
                }`}
              >
                <div
                  className={`flex items-baseline justify-between px-4 py-3 ${
                    isToday
                      ? "bg-amber-50"
                      : isUpcoming
                      ? "bg-white"
                      : "bg-stone-50"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <h2 className="font-bold text-stone-800">
                      {roastDateLabel(key)} 로스팅
                    </h2>
                    {isToday && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-200 rounded-full px-2 py-0.5">
                        오늘
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-stone-700">
                    총 {totalKg}kg
                  </span>
                </div>

                <div className="overflow-x-auto bg-white">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-t border-b border-stone-200 bg-stone-50/70">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-stone-500 whitespace-nowrap">
                          거래처
                        </th>
                        {columns.map((c) => (
                          <th
                            key={c}
                            className="px-2 py-2 text-center text-xs font-semibold text-stone-500 whitespace-nowrap"
                          >
                            {c}
                          </th>
                        ))}
                        <th className="px-2 py-2 text-right text-xs font-semibold text-stone-500 whitespace-nowrap">
                          상태
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {b.order.map((aid) => {
                        const a = b.accounts.get(aid)!;
                        return (
                          <RoastingRow
                            key={aid}
                            name={a.name}
                            orderIds={a.orderIds}
                            qtys={columns.map((c) => a.qty.get(c) ?? 0)}
                            status={a.status}
                          />
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-stone-200 bg-stone-50">
                        <td className="px-3 py-2 text-sm font-bold text-stone-700 whitespace-nowrap">
                          합계
                        </td>
                        {totals.map((t, i) => (
                          <td
                            key={i}
                            className="px-2 py-2 text-center text-sm font-bold text-stone-800 tabular-nums whitespace-nowrap"
                          >
                            {t > 0 ? `${t}kg` : "·"}
                          </td>
                        ))}
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
