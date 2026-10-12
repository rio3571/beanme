import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import MessageList, { type ThreadRow } from "./MessageList";

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
  const [{ data: acctData }, { data: msgData }] = await Promise.all([
    admin.from("b2b_accounts").select("id, company_name").eq("role", "buyer"),
    admin
      .from("b2b_messages")
      .select("account_id, sender, body, created_at, read_by_admin")
      .order("created_at", { ascending: false }),
  ]);

  const accounts = (acctData ?? []) as AcctRow[];
  const msgs = (msgData ?? []) as MsgRow[];

  const last = new Map<string, MsgRow>();
  const unread = new Map<string, number>();
  for (const m of msgs) {
    if (!last.has(m.account_id)) last.set(m.account_id, m);
    if (m.sender === "buyer" && !m.read_by_admin) {
      unread.set(m.account_id, (unread.get(m.account_id) ?? 0) + 1);
    }
  }

  const rows: ThreadRow[] = accounts
    .map((a) => {
      const lm = last.get(a.id);
      return {
        id: a.id,
        company_name: a.company_name,
        last_body: lm?.body ?? null,
        last_sender: lm?.sender ?? null,
        last_at: lm?.created_at ?? null,
        unread: unread.get(a.id) ?? 0,
      };
    })
    .sort((a, b) => {
      // 안 읽은 것 먼저 → 최근 대화 순 → 대화 없는 곳은 맨 뒤
      if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
      if (!a.last_at && !b.last_at)
        return a.company_name.localeCompare(b.company_name);
      if (!a.last_at) return 1;
      if (!b.last_at) return -1;
      return b.last_at.localeCompare(a.last_at);
    });

  const unreadTotal = rows.reduce((s, r) => s + r.unread, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h1 className="text-lg font-bold text-stone-800">문의</h1>
        {unreadTotal > 0 && (
          <span className="text-sm font-bold text-red-600">
            안 읽은 문의 {unreadTotal}건
          </span>
        )}
      </div>

      {accounts.length === 0 ? (
        <p className="text-stone-400 text-center py-16 text-sm">
          발급된 거래처가 없어요.
        </p>
      ) : (
        <MessageList rows={rows} />
      )}
    </div>
  );
}
