import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { kst } from "@/lib/format";

export const dynamic = "force-dynamic";

type AcctRow = { id: string; company_name: string };
type MsgRow = {
  account_id: string;
  sender: string;
  body: string;
  created_at: string;
  read_by_admin: boolean;
};

export default async function AdminMessagesPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const admin = createAdminClient();
  const { data: acctData } = await admin
    .from("b2b_accounts")
    .select("id, company_name")
    .eq("role", "buyer");
  const accounts = (acctData ?? []) as AcctRow[];

  const { data: msgData } = await admin
    .from("b2b_messages")
    .select("account_id, sender, body, created_at, read_by_admin")
    .order("created_at", { ascending: false });
  const msgs = (msgData ?? []) as MsgRow[];

  const last = new Map<string, MsgRow>();
  const unread = new Map<string, number>();
  for (const m of msgs) {
    if (!last.has(m.account_id)) last.set(m.account_id, m);
    if (m.sender === "buyer" && !m.read_by_admin) {
      unread.set(m.account_id, (unread.get(m.account_id) ?? 0) + 1);
    }
  }

  const sorted = [...accounts].sort((a, b) => {
    // 안 읽은 새 문의 먼저, 그 다음 최신 메시지 순
    const ua = (unread.get(a.id) ?? 0) > 0 ? 1 : 0;
    const ub = (unread.get(b.id) ?? 0) > 0 ? 1 : 0;
    if (ua !== ub) return ub - ua;
    const ta = last.get(a.id)?.created_at ?? "";
    const tb = last.get(b.id)?.created_at ?? "";
    return tb.localeCompare(ta);
  });

  return (
    <div>
      <h1 className="text-lg font-bold text-stone-800 mb-4">문의</h1>
      {sorted.length === 0 ? (
        <p className="text-stone-400 text-center py-16 text-sm">
          발급된 거래처가 없어요.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-start">
          {sorted.map((a) => {
            const lm = last.get(a.id);
            const u = unread.get(a.id) ?? 0;
            return (
              <Link
                key={a.id}
                href={`/portal/admin/messages/${a.id}`}
                className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-stone-800 truncate">
                    {a.company_name}
                  </span>
                  {u > 0 && (
                    <span className="text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
                      {u}
                    </span>
                  )}
                </div>
                {lm ? (
                  <div className="text-sm text-stone-500 mt-0.5 truncate">
                    <span className="text-stone-400">
                      {lm.sender === "admin" ? "나: " : ""}
                    </span>
                    {lm.body}
                  </div>
                ) : (
                  <div className="text-sm text-stone-300 mt-0.5">
                    메시지 없음
                  </div>
                )}
                {lm && (
                  <div className="text-xs text-stone-400 mt-0.5">
                    {kst(lm.created_at)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
