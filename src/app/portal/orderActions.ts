"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export async function deleteOrder(
  orderId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me) return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("b2b_orders")
    .select("account_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "주문을 찾을 수 없어요." };

  const isAdmin = me.role === "admin";
  if (!isAdmin) {
    if (order.account_id !== me.id) return { ok: false, error: "권한이 없습니다." };
    if (order.status === "done") {
      return { ok: false, error: "완료된 주문은 삭제할 수 없어요. 관리자에게 문의하세요." };
    }
  }

  // b2b_order_items / b2b_order_comments 는 FK CASCADE 로 함께 삭제됨
  const { error } = await admin.from("b2b_orders").delete().eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/orders");
  revalidatePath("/portal/admin/orders");
  revalidatePath("/portal");
  revalidatePath("/portal/admin");
  return { ok: true };
}
