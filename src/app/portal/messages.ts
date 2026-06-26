"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { notifyOwner } from "@/lib/telegram";

export type MsgRow = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
};

export async function sendMessage(
  accountId: string,
  body: string
): Promise<{ ok: boolean; message?: MsgRow; error?: string }> {
  const me = await getMyAccount();
  if (!me) return { ok: false, error: "권한이 없습니다." };

  const text = (body || "").trim();
  if (!text) return { ok: false, error: "내용을 입력하세요." };

  const isAdmin = me.role === "admin";
  // 거래처는 본인 계정으로만, 관리자는 지정한 거래처로
  const target = isAdmin ? accountId : me.id;
  if (!target) return { ok: false, error: "대상이 없습니다." };

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("b2b_messages")
    .insert({
      account_id: target,
      sender: isAdmin ? "admin" : "buyer",
      body: text,
      read_by_admin: isAdmin,
      read_by_buyer: !isAdmin,
    })
    .select("id, sender, body, created_at")
    .single();
  if (error || !inserted) return { ok: false, error: "전송에 실패했어요." };

  if (!isAdmin) {
    await notifyOwner(`[문의] ${me.company_name}\n"${text}"`);
  }

  return { ok: true, message: inserted as MsgRow };
}
