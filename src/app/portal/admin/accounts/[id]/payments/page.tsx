import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { loadPayments } from "@/lib/payments";
import { VAT_LABEL } from "@/lib/vat";
import PaymentBoard from "./PaymentBoard";

export const dynamic = "force-dynamic";

export default async function AccountPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const { id } = await params;
  const data = await loadPayments(id);
  if (!data) redirect("/portal/admin/accounts");

  return (
    <div>
      <Link href={`/portal/admin/accounts/${id}`} className="text-sm text-stone-400">
        ‹ {data.companyName}
      </Link>
      <h1 className="text-lg font-bold text-stone-800 mt-1">입금 관리</h1>
      <p className="text-sm text-stone-500 mb-4">
        주문·수기 입력별 입금 확인 · 금액은 {VAT_LABEL[data.vatMode]} 기준 실제 받을 금액
      </p>
      <PaymentBoard
        accountId={id}
        unpaid={data.unpaid}
        payments={data.payments}
        unpaidTotal={data.unpaidTotal}
        credit={data.credit}
      />
    </div>
  );
}
