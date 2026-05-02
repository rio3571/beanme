import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * 브라우저 / 클라이언트 컴포넌트용 Supabase 클라이언트.
 * 익명 키로만 동작하며, RLS가 보호함.
 */
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;

/**
 * 서버 컴포넌트 / API Route / Server Action용 클라이언트.
 * Next.js cookies()를 내부에서 호출 (Next 15+ async 패턴).
 *
 * 사용 예 (API Route):
 *   import { createClient } from "@/lib/supabase";
 *   const sb = await createClient();
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component에서는 set 불가 — 무시
        }
      },
    },
  });
}
