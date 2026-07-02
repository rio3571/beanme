import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";

export const dynamic = "force-dynamic";

const PROFIT_URL = "https://factory-profit.vercel.app";

export default async function ProfitPage() {
  const me = await getMyAccount();
  if (!me) redirect("/portal/login");
  if (me.role !== "admin") redirect("/portal/order");

  return (
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
  );
}
