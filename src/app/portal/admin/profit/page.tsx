import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";

export const dynamic = "force-dynamic";

const PROFIT_URL = "https://factory-profit.vercel.app";

export default async function ProfitPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  // 가운데 max-w-5xl 컨테이너를 벗어나 화면 전체 폭으로 (full-bleed)
  return (
    <div
      style={{
        width: "100vw",
        position: "relative",
        left: "50%",
        marginLeft: "-50vw",
      }}
    >
      <div className="px-3 sm:px-5">
        <div
          className="rounded-xl border border-stone-200 overflow-hidden bg-white"
          style={{ height: "calc(100vh - 130px)" }}
        >
          <iframe
            src={PROFIT_URL}
            title="로스팅 수익 관리"
            className="w-full h-full"
            style={{ border: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
