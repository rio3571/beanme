"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { notifyOwner } from "@/lib/telegram";

export type CommentRow = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
};

export async function addOrderComment(
  orderId: string,
  body: string
): Promise<{ ok: boolean; comment?: CommentRow; error?: string }> {
  const account = await getMyAccount();
  if (!account) return { ok: false, error: "권한이 없습니다." };

  const text = (body || "").trim();
  if (!text) return { ok: false, error: "내용을 입력하세요." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("b2b_orders")
    .select("id, account_id, order_no")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "주문을 찾을 수 없어요." };

  const isAdmin = account.role === "admin";
  if (!isAdmin && order.account_id !== account.id) {
    return { ok: false, error: "권한이 없습니다." };
  }
  const sender = isAdmin ? "admin" : "buyer";

  const { data: inserted, error } = await admin
    .from("b2b_order_comments")
    .insert({ order_id: orderId, sender, body: text })
    .select("id, sender, body, created_at")
    .single();
  if (error || !inserted) return { ok: false, error: "저장에 실패했어요." };

  // 거래처가 남긴 문의는 대표님 텔레그램으로 알림
  if (sender === "buyer") {
    await notifyOwner(
      `[주문 문의] ${account.company_name}\n주문 ${order.order_no}\n"${text}"`
    );
  }

  return { ok: true, comment: inserted as CommentRow };
}
