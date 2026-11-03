"use server";

import { revalidatePath } from "next/cache";
import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { loadPayments } from "@/lib/payments";

type Res = { ok: boolean; error?: string };

async function isAdmin() {
  const me = await getMyAccount();
  return !!me && me.role === "admin";
}

function done(accountId: string) {
  revalidatePath(`/portal/admin/accounts/${accountId}/payments`);
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  revalidatePath("/portal/admin/accounts");
}

/** 입금 등록 + 선택한 주문/수기 입력을 이 입금으로 처리.
 *  선택 합계가 (입금액 + 기존 잔액)을 넘으면 거부. 남는 금액은 잔액(선입금)으로 남는다. */
export async function recordPayment(
  accountId: string,
  input: { paidOn: string; amount: number; memo: string; orderIds: string[]; manualIds: string[] }
): Promise<Res> {
  if (!(await isAdmin())) return { ok: false, error: "권한이 없습니다." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paidOn)) return { ok: false, error: "입금일을 확인하세요." };
  const amount = Math.round(Number(input.amount) || 0);
  if (amount < 0) return { ok: false, error: "입금액을 확인하세요." };
  if (amount === 0 && input.orderIds.length + input.manualIds.length === 0)
    return { ok: false, error: "입금액을 넣거나 처리할 건을 고르세요." };

  const data = await loadPayments(accountId);
  if (!data) return { ok: false, error: "거래처가 없어요." };
  const pick = new Set([...input.orderIds.map((i) => `order:${i}`), ...input.manualIds.map((i) => `manual:${i}`)]);
  const chosen = data.unpaid.filter((it) => pick.has(`${it.kind}:${it.id}`));
  if (chosen.length !== pick.size) return { ok: false, error: "이미 처리됐거나 없는 건이 있어요. 새로고침 후 다시 해주세요." };
  const chosenSum = chosen.reduce((s, it) => s + it.amount, 0);
  if (chosenSum > amount + data.credit)
    return { ok: false, error: "선택한 금액이 입금액(+잔액)보다 많아요." };

  const admin = createAdminClient();
  const { data: pay, error } = await admin
    .from("b2b_payments")
    .insert({ account_id: accountId, paid_on: input.paidOn, amount, memo: input.memo.trim() || null })
    .select("id")
    .single();
  if (error || !pay) return { ok: false, error: error?.message ?? "저장 실패" };

  const orderIds = chosen.filter((c) => c.kind === "order").map((c) => c.id);
  const manualIds = chosen.filter((c) => c.kind === "manual").map((c) => c.id);
  if (orderIds.length) await admin.from("b2b_orders").update({ payment_id: pay.id }).in("id", orderIds);
  if (manualIds.length) await admin.from("roast_manual").update({ payment_id: pay.id }).in("id", manualIds);
  done(accountId);
  return { ok: true };
}

/** 입금 기록 삭제 — 연결된 건들은 다시 미입금으로 돌아간다 */
export async function deletePayment(accountId: string, paymentId: string): Promise<Res> {
  if (!(await isAdmin())) return { ok: false, error: "권한이 없습니다." };
  const admin = createAdminClient();
  await admin.from("b2b_orders").update({ payment_id: null }).eq("payment_id", paymentId);
  await admin.from("roast_manual").update({ payment_id: null }).eq("payment_id", paymentId);
  const { error } = await admin.from("b2b_payments").delete().eq("id", paymentId).eq("account_id", accountId);
  if (error) return { ok: false, error: error.message };
  done(accountId);
  return { ok: true };
}

/** 입금 처리된 1건만 미입금으로 되돌림 (그 금액은 잔액으로 남음) */
export async function unlinkItem(accountId: string, kind: "order" | "manual", id: string): Promise<Res> {
  if (!(await isAdmin())) return { ok: false, error: "권한이 없습니다." };
  const admin = createAdminClient();
  const table = kind === "order" ? "b2b_orders" : "roast_manual";
  const { error } = await admin.from(table).update({ payment_id: null }).eq("id", id).eq("account_id", accountId);
  if (error) return { ok: false, error: error.message };
  done(accountId);
  return { ok: true };
}
