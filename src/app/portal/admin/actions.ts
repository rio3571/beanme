"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export type CreateAccountState = { error: string | null; ok?: boolean };

export async function createAccount(
  _prev: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { error: "권한이 없습니다." };

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const company = String(formData.get("company") || "").trim();
  const contact = String(formData.get("contact") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const business = String(formData.get("business") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!email || !password || !company) {
    return { error: "이메일·비밀번호·상호는 필수입니다." };
  }
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 해요." };

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    return { error: "계정 생성 실패: " + (error?.message ?? "알 수 없음") };
  }

  const { error: insErr } = await admin.from("b2b_accounts").insert({
    auth_user_id: created.user.id,
    company_name: company,
    contact_name: contact || null,
    phone: phone || null,
    email,
    business_no: business || null,
    address: address || null,
    role: "buyer",
    active: true,
  });
  if (insErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "거래처 저장 실패: " + insErr.message };
  }

  revalidatePath("/portal/admin");
  return { error: null, ok: true };
}

export async function setPrices(
  accountId: string,
  rows: { product_id: string; unit_price: number | null }[]
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  for (const r of rows) {
    if (r.unit_price === null || Number.isNaN(r.unit_price)) {
      await admin
        .from("account_prices")
        .delete()
        .eq("account_id", accountId)
        .eq("product_id", r.product_id);
    } else {
      await admin.from("account_prices").upsert(
        {
          account_id: accountId,
          product_id: r.product_id,
          unit_price: Math.max(0, Math.floor(r.unit_price)),
        },
        { onConflict: "account_id,product_id" }
      );
    }
  }
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const allowed = ["requested", "confirmed", "shipped", "done", "canceled"];
  if (!allowed.includes(status)) return { ok: false, error: "잘못된 상태." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("b2b_orders")
    .update({ status })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portal/admin/orders");
  return { ok: true };
}
