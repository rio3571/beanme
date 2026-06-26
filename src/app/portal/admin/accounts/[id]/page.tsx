import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import PriceForm, { type PriceRow } from "./PriceForm";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  category: string;
  base_price: number;
};
type AccountRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  business_no: string | null;
  address: string | null;
};

export default async function AccountPricePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const { data: acctData } = await admin
    .from("b2b_accounts")
    .select("id, company_name, contact_name, phone, email, business_no, address")
    .eq("id", id)
    .maybeSingle();
  const account = acctData as AccountRow | null;
  if (!account) redirect("/portal/admin");

  const { data: prodData } = await admin
    .from("products")
    .select("id, name, unit, category, base_price")
    .eq("active", true)
    .order("sort_order");
  const products = (prodData ?? []) as ProductRow[];

  const { data: priceData } = await admin
    .from("account_prices")
    .select("product_id, unit_price")
    .eq("account_id", id);
  const priceMap = new Map(
    (priceData ?? []).map((p) => [p.product_id as string, p.unit_price as number])
  );

  const rows: PriceRow[] = products.map((p) => ({
    product_id: p.id,
    name: p.name,
    unit: p.unit,
    base_price: p.base_price,
    override: priceMap.has(p.id) ? (priceMap.get(p.id) as number) : null,
  }));

  return (
    <div>
      <div className="mb-4">
        <a href="/portal/admin" className="text-sm text-stone-400">
          ‹ 거래처 목록
        </a>
        <h1 className="text-lg font-bold text-stone-800 mt-1">
          {account.company_name}
        </h1>
        <p className="text-sm text-stone-500">
          {[account.contact_name, account.phone, account.email]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
      </div>
      <a
        href={`/portal/admin/accounts/${account.id}/statement`}
        className="block text-center rounded-xl border border-amber-600 text-amber-700 font-semibold py-2.5 mb-4 hover:bg-amber-50"
      >
        📄 거래내역서 (월별) · PDF 다운로드
      </a>
      <PriceForm accountId={account.id} rows={rows} />
    </div>
  );
}
