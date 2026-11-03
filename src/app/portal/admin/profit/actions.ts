"use server";

import { revalidatePath } from "next/cache";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";

async function isAdmin() {
  const me = await getMyAccount();
  return !!me && me.role === "admin";
}

/** 생두 결제 기록 추가 */
export async function addGreenPurchase(input: {
  paidOn: string;
  forMonth: string;
  amount: number;
  vatIncluded: boolean;
  kg: number | null;
  supplier: string;
  memo: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "권한이 없습니다." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)) return { ok: false, error: "결제일을 확인하세요." };
  if (!/^\d{4}-\d{2}$/.test(input.forMonth)) return { ok: false, error: "귀속월을 확인하세요." };
  const amount = Math.round(Number(input.amount) || 0);
  if (amount <= 0) return { ok: false, error: "금액을 입력하세요." };
  const kg = input.kg && input.kg > 0 ? input.kg : null;
  const { error } = await createAdminClient().from("green_purchases").insert({
    paid_on: input.paidOn,
    for_month: input.forMonth,
    amount,
    vat_included: input.vatIncluded,
    kg,
    supplier: input.supplier.trim() || null,
    memo: input.memo.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}

export async function removeGreenPurchase(id: string): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  await createAdminClient().from("green_purchases").delete().eq("id", id);
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}
