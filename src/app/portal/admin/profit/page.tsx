import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";

export const dynamic = "force-dynamic";

const PROFIT_URL = "https://factory-profit.vercel.app";

export default async function ProfitPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-lg font-bold text-stone-800">로스팅 수익 관리</h1>
        <a
          href={PROFIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-amber-700 font-medium hover:text-amber-800"
        >
          ↗ 새 탭에서 크게 열기
        </a>
      </div>
      <p className="text-xs text-stone-400 mb-3">
        관리자(대표)만 볼 수 있어요. 저장한 값(생두단가 등)이 안 보이면 위 “새 탭에서 열기”로 쓰세요.
      </p>
      <div
        className="rounded-xl border border-stone-200 overflow-hidden bg-white"
        style={{ height: "82vh" }}
      >
        <iframe
          src={PROFIT_URL}
          title="로스팅 수익 관리"
          className="w-full h-full"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}
