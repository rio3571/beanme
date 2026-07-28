import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { loadStatement } from "@/lib/statement";
import { ymLabel } from "@/lib/format";
import StatementView from "@/components/StatementView";
import IssueTaxButton from "./IssueTaxButton";
import { updateAccountEmail } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function AdminStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ym?: string; from?: string; to?: string }>;
}) {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const { id } = await params;
  const sp = await searchParams;
  const custom = !!(sp.from && sp.to);
  const { buyer, months, selectedYm, rows, total, vatMode, periodLabel, billDay } =
    await loadStatement(id, sp.ym, { from: sp.from, to: sp.to });

  return (
    <div>
      <Link href={`/portal/admin/accounts/${id}`} className="text-sm text-stone-400">
        ‹ {buyer?.company_name ?? "거래처"}
      </Link>
      <h1 className="text-lg font-bold text-stone-800 mt-1 mb-1">거래내역서</h1>
      <p className="text-sm text-stone-500 mb-3">
        기간 <b className="text-stone-700">{periodLabel}</b>
        {billDay >= 2 && !custom && (
          <span className="ml-1 text-xs text-stone-400">
            (매월 {billDay}일 시작 정산주기)
          </span>
        )}
        {custom && (
          <span className="ml-1 text-xs text-amber-700">· 날짜 지정</span>
        )}
      </p>

      {months.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {months.map((m) => (
            <Link
              key={m}
              href={`/portal/admin/accounts/${id}/statement?ym=${m}`}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border ${
                m === selectedYm && !custom
                  ? "bg-amber-700 text-white border-amber-700"
                  : "bg-white text-stone-600 border-stone-300"
              }`}
            >
              {ymLabel(m)}
            </Link>
          ))}
        </div>
      )}

      {/* 날짜 지정 조회 */}
      <form
        method="get"
        className="flex flex-wrap items-center gap-2 mb-3 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2"
      >
        <span className="text-xs font-medium text-stone-500">날짜 지정</span>
        <input
          type="date"
          name="from"
          defaultValue={custom ? sp.from : ""}
          className="h-8 rounded-md border border-stone-300 px-2 text-sm"
        />
        <span className="text-stone-400">~</span>
        <input
          type="date"
          name="to"
          defaultValue={custom ? sp.to : ""}
          className="h-8 rounded-md border border-stone-300 px-2 text-sm"
        />
        <button
          type="submit"
          className="h-8 rounded-md bg-stone-700 text-white text-sm font-medium px-3 hover:bg-stone-800"
        >
          조회
        </button>
        {custom && (
          <Link
            href={`/portal/admin/accounts/${id}/statement`}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            월별로
          </Link>
        )}
      </form>

      <IssueTaxButton accountId={id} ym={selectedYm} />

      <StatementView
        buyer={buyer}
        monthYm={selectedYm}
        rows={rows}
        total={total}
        vatMode={vatMode}
        periodLabel={periodLabel}
        onSaveEmail={updateAccountEmail.bind(null, id)}
      />
    </div>
  );
}
