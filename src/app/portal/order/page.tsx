import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { parseMeta } from "@/lib/acctMeta";
import { DEFAULT_VAT } from "@/lib/vat";
import OrderForm, { type OrderItem } from "./OrderForm";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  category: string;
  base_price: number;
};

export default async function OrderPage() {
  const account = await getMyAccount();
  if (!account) redirect("/portal/login");
  if (account.role === "admin") redirect("/portal/admin");

  const admin = createAdminClient();
  const { data: prodData } = await admin
    .from("products")
    .select("id, name, unit, category, base_price")
    .eq("active", true)
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

  const meta = parseMeta(account.memo);

  return (
    <>
      {meta.bank && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm">
          <span className="font-semibold text-amber-800">입금계좌 </span>
          <span className="text-stone-700 whitespace-pre-wrap">{meta.bank}</span>
        </div>
      )}
      <OrderForm items={items} vatMode={meta.vat ?? DEFAULT_VAT} />
    </>
  );
}
