import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { parseMeta } from "@/lib/acctMeta";
import { DEFAULT_VAT } from "@/lib/vat";
import { carrySummary } from "@/lib/carry";
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

  const meta = parseMeta(account.memo);
  const carry = (meta.carry ?? []).filter((c) => c.qty !== 0);

  return (
    <>
      {carry.length > 0 && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl px-4 py-3 mb-4">
          <div className="text-sm font-bold text-rose-700">
            📦 아직 받지 못한 수량(이월)이 있어요
          </div>
          <div className="text-sm text-stone-700 mt-0.5">
            {carrySummary(carry)}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            이번 주문과 <b>별개</b>로 추가로 받게 돼요. (이번 주문 금액엔 포함되지 않아요)
          </div>
        </div>
      )}
      {meta.bank && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm">
          <span className="font-semibold text-amber-800">입금계좌 </span>
          <span className="text-stone-700 whitespace-pre-wrap">{meta.bank}</span>
        </div>
      )}
      <OrderForm
        items={items}
        vatMode={meta.vat ?? DEFAULT_VAT}
        units={meta.units ?? []}
      />
    </>
  );
}
