import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
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

  return <OrderForm items={items} />;
}
