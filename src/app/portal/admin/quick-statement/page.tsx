import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import QuickStatementForm from "@/components/QuickStatementForm";

export const dynamic = "force-dynamic";

export default async function QuickStatementPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-1">간이 명세서 작성</h1>
      <p className="text-sm text-stone-500 mb-4">
        포털에 가입하지 않은 거래처용입니다. 거래처명과 품목·가격을 직접 입력해 명세서를 바로 만드세요. 저장되지 않고, 그 자리에서 PDF/공유만 됩니다.
      </p>
      <QuickStatementForm />
    </div>
  );
}
