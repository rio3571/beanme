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
            res.cookies.set(name, value, {
              ...options,
              maxAge: value ? 60 * 60 * 24 * 400 : options?.maxAge,
            })
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
  // 이미 로그인했는데 로그인 페이지로 오면 → 포털 홈으로
  if (isLogin && user) {
    const url = req.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }
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
