import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import QuickStatementForm, { type ManualEntry } from "@/components/QuickStatementForm";
import { listQuickAccounts } from "./actions";

export const dynamic = "force-dynamic";

export default async function QuickStatementPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const { data } = await admin
    .from("roast_manual")
    .select("id, account, qtys, roast_date, amount, brand")
    .order("roast_date", { ascending: false })
    .limit(300);

  const manualEntries: ManualEntry[] = (data ?? []).map((m) => ({
    id: m.id as string,
    account: (m.account as string) ?? "",
    qtys: (m.qtys as Record<string, number>) ?? {},
    roastDate: (m.roast_date as string) ?? "",
    amount: (m.amount as number) ?? 0,
    brand: ((m.brand as string) ?? "희연재") as "희연재" | "푸르파파",
  }));

  const quickAccounts = await listQuickAccounts();

  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-1">간이 명세서 작성</h1>
      <p className="text-sm text-stone-500 mb-4">
        포털에 가입하지 않은 거래처용입니다. 저장해둔 간이 거래처를 고르거나, 거래처명과 품목·가격을 직접 입력하세요. 아래에서 로스팅 수기 입력분을 체크해서 바로 가져올 수도 있습니다. 명세서 자체는 저장되지 않고, 그 자리에서 PDF/공유만 됩니다.
      </p>
      <QuickStatementForm manualEntries={manualEntries} quickAccounts={quickAccounts} />
    </div>
  );
}
