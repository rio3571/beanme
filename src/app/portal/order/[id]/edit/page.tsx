import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { parseMeta } from "@/lib/acctMeta";
import { DEFAULT_VAT } from "@/lib/vat";
import OrderForm, { type OrderItem } from "../../OrderForm";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  category: string;
  base_price: number;
};

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  const isAdmin = me.role === "admin";
  const backHref = isAdmin ? "/portal/admin/orders" : "/portal/orders";

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("b2b_orders")
    .select("id, account_id, status, note, order_no, unit")
    .eq("id", id)
    .maybeSingle();
  if (!order) redirect(backHref);

  // 관리자는 거래처 주문도 수정할 수 있다. 단가·부가세·층은 그 거래처 기준을 쓴다.
  let account = me;
  if (isAdmin) {
    const { data: acct } = await admin
      .from("b2b_accounts")
      .select("*")
      .eq("id", order.account_id as string)
      .maybeSingle();
    if (!acct) redirect(backHref);
    account = acct as typeof me;
  } else {
    if (order.account_id !== me.id) redirect("/portal/orders");
    if (order.status === "done" || order.status === "canceled") {
      redirect("/portal/orders");
    }
  }
  // 취소된 주문은 관리자도 수정 대상이 아니다 (되살리려면 상태를 먼저 바꿔야 함)
  if (isAdmin && order.status === "canceled") redirect(backHref);

  const { data: prodData } = await admin
    .from("products")
    .select("id, name, unit, category, base_price")
    .eq("active", true)
    .or(`owner_account_id.is.null,owner_account_id.eq.${account.id}`)
    .order("sort_order");
  const products = (prodData ?? []) as ProductRow[];

  const { data: priceData } = await admin
    .from("account_prices")
    .select("product_id, unit_price")
    .eq("account_id", account.id);
  const priceMap = new Map(
    (priceData ?? []).map((p) => [p.product_id as string, p.unit_price as number])
  );

  const { data: itemData } = await admin
    .from("b2b_order_items")
    .select("product_id, qty")
    .eq("order_id", id);
  const initialQty: Record<string, number> = {};
  for (const it of itemData ?? []) {
    if (it.product_id)
      initialQty[it.product_id as string] = it.qty as number;
  }

  // 숨긴 공용 품목은 제외. 단, 이미 이 주문에 들어간 품목은 수정할 수 있게 남긴다.
  const hiddenIds = new Set(parseMeta(account.memo).hidden ?? []);
  const items: OrderItem[] = products
    .filter((p) => !hiddenIds.has(p.id) || (initialQty[p.id] ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      category: p.category,
      price: priceMap.get(p.id) ?? p.base_price,
    }));

  return (
    <div>
      <Link href={backHref} className="text-sm text-stone-400">
        ‹ {isAdmin ? "전체 주문" : "주문내역"}
      </Link>
      <h1 className="text-lg font-bold text-stone-800 mt-1 mb-1">
        주문 수정 · {order.order_no}
      </h1>
      {isAdmin ? (
        <div className="mb-4">
          <p className="text-sm text-stone-500">
            <b className="text-stone-700">{account.company_name}</b> 의 주문을 대신
            수정합니다. 단가는 이 거래처에 설정된 값이 적용됩니다.
          </p>
          {order.status === "done" && (
            <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              ⚠️ 이미 <b>완료</b>된 주문입니다. 수정하면 거래명세서 금액도 함께 바뀝니다.
            </p>
          )}
          {(order.status === "confirmed" || order.status === "shipped") && (
            <p className="mt-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2 text-sm text-stone-600">
              확인·출고 처리된 주문입니다. 관리자 수정은 <b>상태를 그대로 유지</b>하고,
              거래처에 알림도 가지 않습니다.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-stone-500 mb-4">
          수량을 바꾸고 수정 저장을 누르세요.
        </p>
      )}
      <OrderForm
        items={items}
        orderId={id}
        initialQty={initialQty}
        initialNote={order.note ?? ""}
        vatMode={parseMeta(account.memo).vat ?? DEFAULT_VAT}
        units={parseMeta(account.memo).units ?? []}
        initialUnit={(order.unit as string) ?? ""}
        doneHref={backHref}
        doneLabel={isAdmin ? "전체 주문으로" : "주문내역으로"}
      />
    </div>
  );
}
