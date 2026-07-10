"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { notifyOwner } from "@/lib/telegram";
import { revalidatePath } from "next/cache";

export async function deleteOrder(
  orderId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me) return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("b2b_orders")
    .select("account_id, status, order_no, unit")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "주문을 찾을 수 없어요." };

  const isAdmin = me.role === "admin";

  // 거래처(구매자): 완전 삭제 대신 '취소' 상태로 남김(기록 보존) + 대표 알림.
  // → 알림만 오고 사이트엔 없어 누락처럼 보이던 문제 방지.
  if (!isAdmin) {
    if (order.account_id !== me.id) return { ok: false, error: "권한이 없습니다." };
    if (order.status === "done") {
      return {
        ok: false,
        error: "완료된 주문은 취소할 수 없어요. 관리자에게 문의하세요.",
      };
    }
    if (order.status !== "canceled") {
      const { error } = await admin
        .from("b2b_orders")
        .update({ status: "canceled" })
        .eq("id", orderId);
      if (error) return { ok: false, error: error.message };

      const { data: acct } = await admin
        .from("b2b_accounts")
        .select("company_name")
        .eq("id", order.account_id)
        .maybeSingle();
      await notifyOwner(
        `[주문 취소] ${acct?.company_name ?? ""}${
          order.unit ? ` · ${order.unit}` : ""
        }\n주문 ${order.order_no ?? ""}\n거래처가 주문을 취소했습니다.`
      );
    }
    revalidatePath("/portal/orders");
    revalidatePath("/portal/admin/orders");
    revalidatePath("/portal");
    revalidatePath("/portal/admin");
    return { ok: true };
  }

  // 관리자: 완전 삭제 (의도적 정리, 기존 동작 유지)
  // b2b_order_items / b2b_order_comments 는 FK CASCADE 로 함께 삭제됨
  const { error } = await admin.from("b2b_orders").delete().eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/orders");
  revalidatePath("/portal/admin/orders");
  revalidatePath("/portal");
  revalidatePath("/portal/admin");
  return { ok: true };
}
