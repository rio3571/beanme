"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { DEFAULT_VAT, isVatMode, type VatMode } from "@/lib/vat";

export type QuickAccount = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  business_no: string | null;
  address: string | null;
  bank: string | null;
  vat_mode: VatMode;
};

async function isAdmin() {
  const me = await getMyAccount();
  return !!me && me.role === "admin";
}

/** 저장된 간이 거래처 목록. 테이블이 아직 없으면(마이그레이션 전) 빈 배열로 조용히 폴백. */
export async function listQuickAccounts(): Promise<QuickAccount[]> {
  if (!(await isAdmin())) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quick_accounts")
    .select("*")
    .order("company_name", { ascending: true });
  if (error) return [];
  return (data ?? []).map((a) => ({
    ...a,
    vat_mode: isVatMode(a.vat_mode) ? a.vat_mode : DEFAULT_VAT,
  })) as QuickAccount[];
}

/** 거래처명 기준으로 upsert (있으면 갱신, 없으면 새로 생성) */
export async function saveQuickAccount(input: {
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  businessNo?: string;
  address?: string;
  bank?: string;
  vatMode?: VatMode;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "권한이 없습니다." };
  const companyName = input.companyName.trim();
  if (!companyName) return { ok: false, error: "거래처명을 입력해주세요." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("quick_accounts")
    .upsert(
      {
        company_name: companyName,
        contact_name: input.contactName?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        business_no: input.businessNo?.trim() || null,
        address: input.address?.trim() || null,
        bank: input.bank?.trim() || null,
        vat_mode: isVatMode(input.vatMode) ? input.vatMode : DEFAULT_VAT,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_name" }
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portal/admin/quick-statement");
  return { ok: true };
}

export async function deleteQuickAccount(id: string): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin.from("quick_accounts").delete().eq("id", id);
  revalidatePath("/portal/admin/quick-statement");
  return { ok: true };
}
