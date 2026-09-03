import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { displayLoginId } from "@/lib/loginId";
import { parseMeta } from "@/lib/acctMeta";
import PriceForm, { type PriceRow } from "./PriceForm";
import BankForm from "./BankForm";
import VatForm from "./VatForm";
import CarryForm from "./CarryForm";
import NameForm from "./NameForm";
import TaxInfoForm from "./TaxInfoForm";
import CustomProductForm from "./CustomProductForm";
import UnitsForm from "./UnitsForm";
import PasswordResetForm from "./PasswordResetForm";
import { DEFAULT_VAT } from "@/lib/vat";

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
  memo: string | null;
  auth_user_id: string | null;
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
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const account = acctData as AccountRow | null;
  if (!account) redirect("/portal/admin");
  const meta = parseMeta(account.memo);

  const { data: prodData } = await admin
    .from("products")
    .select("id, name, unit, category, base_price")
    .eq("active", true)
    .is("owner_account_id", null)
    .order("sort_order");
  const products = (prodData ?? []) as ProductRow[];

  // 이 거래처 전용 판매품목
  const { data: customData } = await admin
    .from("products")
    .select("id, name, base_price")
    .eq("active", true)
    .eq("owner_account_id", id)
    .order("sort_order");
  const customProducts = (customData ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    price: (p.base_price as number) ?? 0,
  }));

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
        <a href="/portal/admin/accounts" className="text-sm text-stone-400">
          ‹ 거래처 목록
        </a>
        <h1 className="text-lg font-bold text-stone-800 mt-1">
          {account.company_name}
        </h1>
        <p className="text-sm text-stone-500">
          {[account.contact_name, account.phone].filter(Boolean).join(" · ") ||
            "—"}
        </p>
        <NameForm accountId={account.id} initial={account.company_name} />
      </div>

      {account.auth_user_id ? (
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <div className="font-semibold text-stone-800 mb-2">로그인 정보</div>
          <div className="text-sm space-y-1">
            <div className="flex gap-2">
              <span className="text-stone-400 w-16">아이디</span>
              <span className="font-medium text-stone-800 select-all">
                {displayLoginId(account.email)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-stone-400 w-16">비밀번호</span>
              <span className="font-medium text-stone-800 select-all">
                {meta.pw ? meta.pw : "(확인 불가 — 아래에서 재설정하세요)"}
              </span>
            </div>
          </div>
          <PasswordResetForm accountId={account.id} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <div className="font-semibold text-stone-800 mb-1">포털 아이디 없음</div>
          <p className="text-sm text-stone-500">
            전화·카톡으로 주문받는 거래처입니다. 주문은{" "}
            <Link
              href="/portal/admin/orders"
              className="font-semibold text-amber-700 underline"
            >
              전체 주문
            </Link>{" "}
            화면의 <b>＋ 거래처 대신 주문 넣기</b>로 등록하세요. 단가·거래명세서·로스팅
            목록은 아이디 있는 거래처와 똑같이 동작합니다.
          </p>
        </div>
      )}

      <VatForm accountId={account.id} initial={meta.vat} />
      <TaxInfoForm
        accountId={account.id}
        companyName={account.company_name}
        vat={meta.vat ?? DEFAULT_VAT}
        initial={{
          businessNo: account.business_no ?? "",
          address: account.address ?? "",
          ceo: meta.tax?.ceo ?? "",
          bizType: meta.tax?.bizType ?? "",
          bizItem: meta.tax?.bizItem ?? "",
          email: meta.tax?.email ?? "",
        }}
      />
      <CarryForm
        accountId={account.id}
        productNames={products.map((p) => p.name)}
        initial={meta.carry ?? []}
      />
      <BankForm accountId={account.id} initial={meta.bank ?? ""} />
      <a
        href={`/portal/admin/accounts/${account.id}/statement`}
        className="block text-center rounded-xl border border-amber-600 text-amber-700 font-semibold py-2.5 mb-4 hover:bg-amber-50"
      >
        📄 거래내역서 (월별) · PDF 다운로드
      </a>
      <UnitsForm
        accountId={account.id}
        units={meta.units ?? []}
        billDay={meta.billDay}
      />
      <CustomProductForm accountId={account.id} items={customProducts} />
      <PriceForm accountId={account.id} rows={rows} />
    </div>
  );
}
