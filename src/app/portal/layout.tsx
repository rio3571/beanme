import Link from "next/link";
import { getMyAccount } from "@/lib/portal";
import { signOutAction } from "./actions";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getMyAccount();

  // 로그인 안 된 상태(로그인 페이지 등) → 크롬 없이 그대로
  if (!account) return <>{children}</>;

  const isAdmin = account.role === "admin";
  // 왼쪽(운영) / 오른쪽(관리) 그룹 분리
  const leftNav = isAdmin
    ? [
        { href: "/portal/admin", label: "대시보드" },
        { href: "/portal/admin/orders", label: "주문" },
        { href: "/portal/admin/roasting", label: "로스팅" },
        { href: "/portal/admin/messages", label: "문의" },
      ]
    : [
        { href: "/portal", label: "홈" },
        { href: "/portal/orders", label: "주문내역" },
        { href: "/portal/order", label: "주문하기" },
        { href: "/portal/inquiry", label: "문의" },
      ];
  const rightNav = isAdmin
    ? [
        { href: "/portal/admin/profit", label: "수익관리" },
        { href: "/portal/admin/accounts", label: "거래처 관리" },
        { href: "/portal/admin/quick-statement", label: "간이 명세서" },
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      <header className="sticky top-0 z-20 bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center gap-3">
            <span className="font-bold text-stone-800 truncate min-w-0 flex-1">
              {isAdmin ? "관리자" : account.company_name}
            </span>
            <Link
              href="/portal/account"
              className="flex-shrink-0 whitespace-nowrap text-sm text-stone-400 hover:text-stone-700 px-2 py-1"
            >
              비밀번호
            </Link>
            <form action={signOutAction} className="flex-shrink-0">
              <button className="whitespace-nowrap text-sm text-stone-400 hover:text-stone-700 px-2 py-1">
                로그아웃
              </button>
            </form>
          </div>
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 -mt-0.5">
            {leftNav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex-shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200"
              >
                {n.label}
              </Link>
            ))}
            {rightNav.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5 pl-3">
                {rightNav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="flex-shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200"
                  >
                    {n.label}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {children}
      </main>
    </div>
  );
}
