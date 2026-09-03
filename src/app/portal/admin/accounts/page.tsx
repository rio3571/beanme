import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import AccountCreateForm from "../AccountCreateForm";

export const dynamic = "force-dynamic";

type AccountRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  active: boolean;
  auth_user_id: string | null;
};

export default async function AdminAccountsPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const { data } = await admin
    .from("b2b_accounts")
    .select("id, company_name, contact_name, phone, active, auth_user_id")
    .eq("role", "buyer")
    .order("created_at", { ascending: false });
  const accounts = (data ?? []) as AccountRow[];

  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-4">거래처 관리</h1>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        {accounts.length === 0 && (
          <p className="text-stone-400 text-center py-8 text-sm sm:col-span-2 lg:col-span-3">
            아직 발급된 거래처가 없어요. 아래에서 추가하세요.
          </p>
        )}
        {accounts.map((a) => (
          <Link
            key={a.id}
            href={`/portal/admin/accounts/${a.id}`}
            className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-500"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-800">
                {a.company_name}
                {!a.auth_user_id && (
                  <span className="ml-1.5 align-middle text-[11px] font-bold text-stone-500 bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5">
                    아이디 없음
                  </span>
                )}
              </span>
              <span className="text-xs text-amber-700">관리 ›</span>
            </div>
            <div className="text-sm text-stone-500 mt-0.5">
              {[a.contact_name, a.phone].filter(Boolean).join(" · ") || "—"}
              {!a.active && <span className="ml-2 text-red-500">(비활성)</span>}
            </div>
          </Link>
        ))}
      </div>

      <AccountCreateForm />
    </div>
  );
}
