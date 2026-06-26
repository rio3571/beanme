import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase 세션 토큰 갱신 + /portal 경로 보호.
 * 로그인 안 한 사용자가 /portal/* 접근 시 /portal/login 으로 보냄.
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isLogin = path === "/portal/login";
  if (path.startsWith("/portal") && !isLogin && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal/login";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/portal/:path*"],
};
