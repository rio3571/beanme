import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabaseAdmin";

export type Account = {
  id: string;
  auth_user_id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  business_no: string | null;
  address: string | null;
  role: string; // 'buyer' | 'admin'
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  base_price: number;
  description: string | null;
  active: boolean;
  sort_order: number;
};

/** 로그인된 Supabase Auth 사용자 (없으면 null) */
export async function getAuthUser() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user ?? null;
}

/** 로그인 사용자의 거래처 계정 정보 (없으면 null) */
export async function getMyAccount(): Promise<Account | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("b2b_accounts")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return (data as Account) ?? null;
}
