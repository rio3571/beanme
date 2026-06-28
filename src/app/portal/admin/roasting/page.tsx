import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { roastDateKey, roastDateLabel, todayKstKey } from "@/lib/roasting";

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
  unit: string | null;
  qty: number;
};

export default async function RoastingPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();

  // 로스팅 대상: 취소 제외, 최근 주문
  const { data: orderData } = await admin
    .from("b2b_orders")
    .select("id, account_id, status, created_at")
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .limit(300);
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
      .select("order_id, product_name, unit, qty")
      .in("order_id", ids);
    items = (itemData ?? []) as ItemRow[];
  }
  const itemsByOrder = new Map<string, ItemRow[]>();
  for (const it of items) {
    const arr = itemsByOrder.get(it.order_id) ?? [];
    arr.push(it);
    itemsByOrder.set(it.order_id, arr);
  }

  // 로스팅 날짜별 그룹
  type Batch = {
    key: string;
    productTotals: Map<string, number>; // 품목 → 총 kg
    byAccount: Map<string, Map<string, number>>; // 거래처 → (품목 → kg)
    accountOrder: string[]; // 거래처 등장 순서
  };
  const batchMap = new Map<string, Batch>();
  const batchKeys: string[] = [];

  for (const o of orders) {
    const key = roastDateKey(o.created_at);
    let b = batchMap.get(key);
    if (!b) {
      b = {
        key,
        productTotals: new Map(),
        byAccount: new Map(),
        accountOrder: [],
      };
      batchMap.set(key, b);
      batchKeys.push(key);
    }
    const acct = nameMap.get(o.account_id) ?? "—";
    let acctMap = b.byAccount.get(acct);
    if (!acctMap) {
      acctMap = new Map();
      b.byAccount.set(acct, acctMap);
      b.accountOrder.push(acct);
    }
    for (const it of itemsByOrder.get(o.id) ?? []) {
      b.productTotals.set(
        it.product_name,
        (b.productTotals.get(it.product_name) ?? 0) + (it.qty ?? 0)
      );
      acctMap.set(
        it.product_name,
        (acctMap.get(it.product_name) ?? 0) + (it.qty ?? 0)
      );
    }
  }

  // 로스팅 날짜 오름차순(가까운 미래 → 과거 순으로 정렬 후, 오늘 이후를 위로)
  batchKeys.sort(); // 'YYYY-MM-DD' 문자열 정렬 = 날짜순
  const today = todayKstKey(new Date().toISOString());
  // 오늘 포함 이후(예정) 먼저(가까운 순), 그 다음 지난 것(최근 순)
  const upcoming = batchKeys.filter((k) => k >= today);
  const past = batchKeys.filter((k) => k < today).reverse();
  const ordered = [...upcoming, ...past];

  const fmtItems = (m: Map<string, number>) =>
    [...m.entries()]
      .filter(([, q]) => q > 0)
      .map(([name, q]) => `${name} ${q}kg`)
      .join(" · ");

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-lg font-bold text-stone-800">로스팅 목록</h1>
      </div>
      <p className="text-xs text-stone-400 mb-4">
        월·수 주문 마감 → 화·목 로스팅. 화요일 = 목~월 주문 / 목요일 = 화·수 주문.
      </p>

      {ordered.length === 0 ? (
        <p className="text-stone-400 text-center py-16">
          로스팅할 주문이 없어요.
        </p>
      ) : (
        <div className="space-y-4">
          {ordered.map((key) => {
            const b = batchMap.get(key)!;
            const isToday = key === today;
            const isUpcoming = key >= today;
            const totalKg = [...b.productTotals.values()].reduce(
              (s, v) => s + v,
              0
            );
            return (
              <div
                key={key}
                className={`rounded-xl border p-4 ${
                  isToday
                    ? "bg-amber-50 border-amber-300 ring-1 ring-amber-200"
                    : isUpcoming
                    ? "bg-white border-stone-200"
                    : "bg-stone-50 border-stone-200 opacity-90"
                }`}
              >
                <div className="flex items-baseline justify-between mb-3">
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

                {/* 품목별 총 로스팅양 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[...b.productTotals.entries()]
                    .filter(([, q]) => q > 0)
                    .map(([name, q]) => (
                      <div
                        key={name}
                        className="bg-white rounded-lg border border-stone-200 px-3 py-2"
                      >
                        <div className="text-xs text-stone-500">{name}</div>
                        <div className="text-lg font-bold text-stone-800 leading-tight">
                          {q}
                          <span className="text-sm font-medium text-stone-400">
                            kg
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* 거래처별 목록 */}
                <div className="space-y-1">
                  {b.accountOrder.map((acct) => (
                    <div
                      key={acct}
                      className="flex items-baseline gap-2.5 bg-white rounded-lg border border-stone-200 px-3 py-2"
                    >
                      <div className="text-sm font-semibold text-stone-800 w-28 shrink-0 truncate">
                        {acct}
                      </div>
                      <div className="text-sm text-stone-600 min-w-0">
                        {fmtItems(b.byAccount.get(acct)!) || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
