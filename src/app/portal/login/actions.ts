"use server";

import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

export type LoginState = { error: string | null };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요." };

  const sb = await createClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const admin = createAdminClient();
  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("role, active")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!acct) {
    await sb.auth.signOut();
    return { error: "등록되지 않은 계정입니다. 관리자에게 문의하세요." };
  }
  if (acct.active === false) {
    await sb.auth.signOut();
    return { error: "비활성화된 계정입니다. 관리자에게 문의하세요." };
  }

  redirect(acct.role === "admin" ? "/portal/admin" : "/portal/order");
}
