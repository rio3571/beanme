import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRET = process.env.SUPABASE_SECRET_KEY ?? "";

/**
 * 서버 전용 Supabase 클라이언트 (secret key).
 * RLS를 우회해 모든 b2b_* 테이블에 접근한다.
 * ⚠️ 절대 클라이언트 컴포넌트에서 import 하지 말 것 (secret key 노출 금지).
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL, SECRET, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
