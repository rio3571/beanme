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
  const account = await getMyAccount();
  if (!account) redirect("/portal/login");
  if (account.role === "admin") redirect("/portal/admin/orders");

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("b2b_orders")
    .select("id, account_id, status, note, order_no")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.account_id !== account.id) redirect("/portal/orders");
  if (order.status === "done" || order.status === "canceled") {
    redirect("/portal/orders");
  }

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

  const items: OrderItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    category: p.category,
    price: priceMap.get(p.id) ?? p.base_price,
  }));

  const { data: itemData } = await admin
    .from("b2b_order_items")
    .select("product_id, qty")
    .eq("order_id", id);
  const initialQty: Record<string, number> = {};
  for (const it of itemData ?? []) {
    if (it.product_id)
      initialQty[it.product_id as string] = it.qty as number;
  }

  return (
    <div>
      <Link href="/portal/orders" className="text-sm text-stone-400">
        ‹ 주문내역
      </Link>
      <h1 className="text-lg font-bold text-stone-800 mt-1 mb-1">
        주문 수정 · {order.order_no}
      </h1>
      <p className="text-sm text-stone-500 mb-4">
        수량을 바꾸고 수정 저장을 누르세요.
      </p>
      <OrderForm
        items={items}
        orderId={id}
        initialQty={initialQty}
        initialNote={order.note ?? ""}
        vatMode={parseMeta(account.memo).vat ?? DEFAULT_VAT}
      />
    </div>
  );
}
