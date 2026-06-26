import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { won, kst, ym, ymLabel, STATUS_LABEL } from "@/lib/format";
import { parseMeta } from "@/lib/acctMeta";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const account = await getMyAccount();
  if (!account) redirect("/portal/login");
  if (account.role === "admin") redirect("/portal/admin");

  const admin = createAdminClient();
  const thisYm = ym(new Date().toISOString());

  const { data: orderData } = await admin
    .from("b2b_orders")
    .select("id, order_no, total_amount, status, created_at")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });
  const orders = (orderData ?? []) as {
    id: string;
    order_no: string | null;
    total_amount: number;
    status: string;
    created_at: string;
  }[];

  const monthOrders = orders.filter((o) => ym(o.created_at) === thisYm);
  const monthCount = monthOrders.length;
  const monthSales = monthOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

  const monthIds = monthOrders.map((o) => o.id);
  let monthQty = 0;
  if (monthIds.length > 0) {
    const { data: itemData } = await admin
      .from("b2b_order_items")
      .select("qty")
      .in("order_id", monthIds);
    monthQty = (itemData ?? []).reduce(
      (s, it) => s + ((it.qty as number) ?? 0),
      0
    );
  }

  const { data: msgData } = await admin
    .from("b2b_messages")
    .select("sender, read_by_buyer")
    .eq("account_id", account.id);
  const newReplies = (msgData ?? []).filter(
    (m) => m.sender === "admin" && !m.read_by_buyer
  ).length;

  const bank = parseMeta(account.memo).bank;
  const recent = orders.slice(0, 5);

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
        <h1 className="text-lg font-bold text-stone-800">
          {account.company_name}
        </h1>
        <span className="text-sm text-stone-400">{ymLabel(thisYm)}</span>
      </div>

      {bank && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3 text-sm">
          <span className="font-semibold text-amber-800">입금계좌 </span>
          <span className="text-stone-700 whitespace-pre-wrap">{bank}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
        {metric("이번 달 주문", `${monthCount}건`)}
        {metric("이번 달 주문량", `${monthQty}kg`)}
        {metric("이번 달 금액", won(monthSales), "VAT 별도")}
        <Link href="/portal/inquiry" className="contents">
          {metric(
            "문의",
            newReplies > 0 ? `새 답변 ${newReplies}` : "—",
            "문의하기 ›"
          )}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-3">
        <div className="flex items-baseline justify-between mb-3">
          <span className="font-semibold text-stone-800">최근 주문</span>
          <Link href="/portal/orders" className="text-sm text-amber-700">
            전체보기 ›
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">
            아직 주문이 없어요.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-700 truncate">
                    {o.order_no}
                  </div>
                  <div className="text-xs text-stone-400">
                    {kst(o.created_at)}
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
                <span className="text-sm font-bold text-stone-800 w-24 text-right">
                  {won(o.total_amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/portal/order"
          className="bg-amber-700 text-white rounded-xl p-4 text-center font-semibold hover:bg-amber-800"
        >
          ＋ 주문하기
        </Link>
        <Link
          href="/portal/statement"
          className="bg-white border border-stone-200 rounded-xl p-4 text-center font-semibold text-stone-800 hover:border-amber-500"
        >
          📄 거래내역서
        </Link>
      </div>
    </div>
  );
}
