import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import Chat from "@/components/Chat";
import type { MsgRow } from "@/app/portal/messages";

export const dynamic = "force-dynamic";

export default async function InquiryPage() {
  const account = await getMyAccount();
  if (!account) redirect("/portal/login");
  if (account.role === "admin") redirect("/portal/admin/messages");

  const admin = createAdminClient();
  const { data } = await admin
    .from("b2b_messages")
    .select("id, sender, body, created_at")
    .eq("account_id", account.id)
    .order("created_at", { ascending: true });

  // 관리자가 보낸 메시지를 읽음 처리
  await admin
    .from("b2b_messages")
    .update({ read_by_buyer: true })
    .eq("account_id", account.id)
    .eq("sender", "admin")
    .eq("read_by_buyer", false);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-bold text-stone-800">문의</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          희연재 원두사업부에 자유롭게 문의하세요. 보통 영업시간 안에 답변드립니다.
        </p>
      </div>
      <Chat accountId={account.id} role="buyer" initial={(data ?? []) as MsgRow[]} />
    </div>
  );
}
