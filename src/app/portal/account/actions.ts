"use server";

import { createClient } from "@/lib/supabase";

export type PwState = { error: string | null; ok?: boolean };

export async function changePasswordAction(
  _prev: PwState,
  formData: FormData
): Promise<PwState> {
  const pw = String(formData.get("password") || "");
  const pw2 = String(formData.get("password2") || "");
  if (pw.length < 6) return { error: "비밀번호는 6자 이상이어야 해요." };
  if (pw !== pw2) return { error: "두 비밀번호가 일치하지 않아요." };

  const sb = await createClient();
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) return { error: "변경 실패: " + error.message };
  return { error: null, ok: true };
}
