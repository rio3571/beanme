import { redirect } from "next/navigation";
import { getMyAccount } from "@/lib/portal";

export const dynamic = "force-dynamic";

export default async function PortalIndex() {
  const account = await getMyAccount();
  if (!account) redirect("/portal/login");
  redirect(account.role === "admin" ? "/portal/admin" : "/portal/orders");
}
