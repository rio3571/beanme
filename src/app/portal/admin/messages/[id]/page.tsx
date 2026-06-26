import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import Chat from "@/components/Chat";
import type { MsgRow } from "@/app/portal/messages";

export const dynamic = "force-dynamic";

export default async function AdminChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  const { id } = await params;
  const admin = createAdminClient();

  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("company_name")
    .eq("id", id)
    .maybeSingle();
  if (!acct) redirect("/portal/admin/messages");

  const { data } = await admin
    .from("b2b_messages")
    .select("id, sender, body, created_at")
    .eq("account_id", id)
    .order("created_at", { ascending: true });

  // 거래처가 보낸 메시지 읽음 처리
  await admin
    .from("b2b_messages")
    .update({ read_by_admin: true })
    .eq("account_id", id)
    .eq("sender", "buyer")
    .eq("read_by_admin", false);

  return (
    <div>
      <Link href="/portal/admin/messages" className="text-sm text-stone-400">
        ‹ 문의 목록
      </Link>
      <h1 className="text-lg font-bold text-stone-800 mt-1 mb-4">
        {acct.company_name}
      </h1>
      <Chat accountId={id} role="admin" initial={(data ?? []) as MsgRow[]} />
    </div>
  );
}
