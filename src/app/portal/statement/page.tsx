import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { loadStatement } from "@/lib/statement";
import { ymLabel } from "@/lib/format";
import StatementView from "@/components/StatementView";

export const dynamic = "force-dynamic";

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const account = await getMyAccount();
  if (!account) redirect("/portal/login");
  if (account.role === "admin") redirect("/portal/admin");

  const sp = await searchParams;
  const { buyer, months, selectedYm, rows, total } = await loadStatement(
    account.id,
    sp.ym
  );

  return (
    <div>
      <Link href="/portal/orders" className="text-sm text-stone-400">
        ‹ 주문내역
      </Link>
      <h1 className="text-lg font-bold text-stone-800 mt-1 mb-3">거래내역서</h1>

      {months.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {months.map((m) => (
            <Link
              key={m}
              href={`/portal/statement?ym=${m}`}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium border ${
                m === selectedYm
                  ? "bg-amber-700 text-white border-amber-700"
                  : "bg-white text-stone-600 border-stone-300"
              }`}
            >
              {ymLabel(m)}
            </Link>
          ))}
        </div>
      )}

      <StatementView
        buyer={buyer}
        monthYm={selectedYm}
        rows={rows}
        total={total}
      />
    </div>
  );
}
