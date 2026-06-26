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
  const nav = isAdmin
    ? [
        { href: "/portal/admin", label: "거래처" },
        { href: "/portal/admin/orders", label: "주문" },
      ]
    : [
        { href: "/portal/order", label: "주문하기" },
        { href: "/portal/orders", label: "주문내역" },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      <header className="sticky top-0 z-20 bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <span className="font-bold text-stone-800 truncate">
            {isAdmin ? "관리자" : account.company_name}
          </span>
          <nav className="flex gap-1 ml-2">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/portal/account"
              className="text-sm text-stone-400 hover:text-stone-700 px-2 py-1"
            >
              비밀번호
            </Link>
            <form action={signOutAction}>
              <button className="text-sm text-stone-400 hover:text-stone-700 px-2 py-1">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5">{children}</main>
    </div>
  );
}
