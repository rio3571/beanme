"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import type { RoastConfig } from "@/lib/roastConfig";

async function isAdmin() {
  const me = await getMyAccount();
  return !!me && me.role === "admin";
}

type Qtys = Record<string, number>;

type Admin = ReturnType<typeof createAdminClient>;

/** 거래처에 설정된 단가로 수기 금액을 계산.
 *  단가가 하나도 없으면 null (금액 자동입력 안 함).
 *  저장 금액은 공급가(net) 기준 — 포털 주문의 line_amount 와 같은 기준이다. */
export async function amountFromPrices(
  admin: Admin,
  accountId: string | null | undefined,
  qtys: Qtys
): Promise<number | null> {
  if (!accountId) return null;

  const [{ data: prodData }, { data: priceData }] = await Promise.all([
    admin
      .from("products")
      .select("id, name, base_price")
      .eq("active", true)
      .or(`owner_account_id.is.null,owner_account_id.eq.${accountId}`),
    admin
      .from("account_prices")
      .select("product_id, unit_price")
      .eq("account_id", accountId),
  ]);

  const priceMap = new Map(
    (priceData ?? []).map((p) => [p.product_id as string, p.unit_price as number])
  );

  let sum = 0;
  let priced = false;
  for (const [name, raw] of Object.entries(qtys ?? {})) {
    const qty = Math.max(0, Math.round(Number(raw) || 0));
    if (qty <= 0) continue;
    const prod = (prodData ?? []).find((p) => (p.name as string) === name);
    if (!prod) continue;
    const unit = priceMap.get(prod.id as string) ?? (prod.base_price as number) ?? 0;
    if (unit > 0) priced = true;
    sum += unit * qty;
  }
  return priced ? Math.round(sum) : null;
}

export async function addManualRoast(input: {
  account: string;
  qtys: Qtys;
  roastDate: string;
  amount?: number;
  brand?: string; // '희연재'(기본) | '푸르파파'
  accountId?: string | null; // 기존 거래처(b2b_accounts) 연결 (선택)
  cash?: boolean; // 현금 매출 여부 (희연재)
  oem?: boolean; // OEM(가공 위탁) 여부 — 가공비 계산에서 제외 (푸르파파)
}): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();

  // 금액을 비워두면 거래처에 설정된 단가로 자동 계산
  let amount = Math.max(0, Math.round(Number(input.amount) || 0));
  if (amount === 0) {
    amount = (await amountFromPrices(admin, input.accountId, input.qtys ?? {})) ?? 0;
  }

  await admin.from("roast_manual").insert({
    account: (input.account ?? "").trim(),
    qtys: input.qtys ?? {},
    roast_date: input.roastDate,
    amount,
    brand: input.brand === "푸르파파" ? "푸르파파" : "희연재",
    account_id: input.accountId || null,
    cash: input.cash === true,
    oem: input.oem === true,
  });
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}

/** 수기 행 현금 여부만 토글 (목록에서 체크) */
export async function setManualCash(
  id: string,
  cash: boolean
): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin.from("roast_manual").update({ cash: cash === true }).eq("id", id);
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}

/** 수기 행 OEM(가공 위탁) 여부만 토글 (목록에서 클릭) */
export async function setManualOem(
  id: string,
  oem: boolean
): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin.from("roast_manual").update({ oem: oem === true }).eq("id", id);
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}

export async function updateManualAmount(
  id: string,
  amount: number
): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin
    .from("roast_manual")
    .update({ amount: Math.max(0, Math.round(Number(amount) || 0)) })
    .eq("id", id);
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}

/** 수기 행 전체 수정 (거래처·품목수량·금액·연결) */
export async function updateManualRoast(
  id: string,
  input: {
    account: string;
    qtys: Qtys;
    amount?: number;
    accountId?: string | null;
    cash?: boolean;
    oem?: boolean;
  }
): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();

  // 금액을 비워두면 거래처 단가로 다시 계산
  let amount = Math.max(0, Math.round(Number(input.amount) || 0));
  if (amount === 0) {
    amount = (await amountFromPrices(admin, input.accountId, input.qtys ?? {})) ?? 0;
  }

  await admin
    .from("roast_manual")
    .update({
      account: (input.account ?? "").trim(),
      qtys: input.qtys ?? {},
      amount,
      account_id: input.accountId || null,
      ...(input.cash === undefined ? {} : { cash: input.cash === true }),
      ...(input.oem === undefined ? {} : { oem: input.oem === true }),
    })
    .eq("id", id);
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}

export async function removeManualRoast(id: string): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin.from("roast_manual").delete().eq("id", id);
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}

export async function setManualDone(
  id: string,
  done: boolean
): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin.from("roast_manual").update({ done }).eq("id", id);
  revalidatePath("/portal/admin/roasting");
  return { ok: true };
}

export async function clearManualMonth(month: string): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false };
  const admin = createAdminClient();
  await admin.from("roast_manual").delete().like("roast_date", `${month}%`);
  revalidatePath("/portal/admin/roasting");
  return { ok: true };
}

export async function saveRoastConfig(
  cfg: RoastConfig
): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin.from("roast_config").upsert({
    id: 1,
    data: cfg,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/portal/admin/profit");
  return { ok: true };
}

/** 기존 localStorage 수기를 서버로 1회 이전 (기기별 최초 진입 시) */
export async function migrateManualRoast(
  entries: {
    account?: string;
    qtys?: Qtys;
    roastDate?: string;
    done?: boolean;
    ts?: string;
    amount?: number;
  }[]
): Promise<{ ok: boolean; added: number }> {
  if (!(await isAdmin())) return { ok: false, added: 0 };
  if (!Array.isArray(entries) || entries.length === 0)
    return { ok: true, added: 0 };
  const admin = createAdminClient();
  const rows = entries
    .filter((e) => e && e.qtys && Object.keys(e.qtys).length > 0)
    .map((e) => ({
      account: (e.account ?? "").trim(),
      qtys: e.qtys ?? {},
      roast_date: e.roastDate || new Date().toISOString().slice(0, 10),
      done: e.done === true,
      created_at: e.ts || new Date().toISOString(),
      amount: Math.max(0, Math.round(Number(e.amount) || 0)),
    }));
  if (rows.length > 0) await admin.from("roast_manual").insert(rows);
  revalidatePath("/portal/admin/roasting");
  return { ok: true, added: rows.length };
}

/** 금액이 0인 수기 행들을 거래처 단가로 한 번에 채운다.
 *  거래처가 연결되지 않은 행, 단가가 없는 행은 건드리지 않는다. */
export async function fillManualAmounts(
  month?: string
): Promise<{ ok: boolean; filled: number; total: number }> {
  if (!(await isAdmin())) return { ok: false, filled: 0, total: 0 };
  const admin = createAdminClient();

  let q = admin
    .from("roast_manual")
    .select("id, qtys, account_id, amount, roast_date")
    .eq("amount", 0)
    .not("account_id", "is", null);
  if (month) q = q.gte("roast_date", `${month}-01`).lte("roast_date", `${month}-31`);

  const { data } = await q;
  const rows = data ?? [];

  let filled = 0;
  for (const r of rows) {
    const amt = await amountFromPrices(
      admin,
      r.account_id as string,
      (r.qtys as Qtys) ?? {}
    );
    if (!amt || amt <= 0) continue;
    await admin.from("roast_manual").update({ amount: amt }).eq("id", r.id as string);
    filled++;
  }

  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/profit");
  return { ok: true, filled, total: rows.length };
}

/** 수기 행 하나만 거래처 단가로 다시 계산 */
export async function recalcManualAmount(
  id: string
): Promise<{ ok: boolean; amount?: number; error?: string }> {
  if (!(await isAdmin())) return { ok: false, error: "권한이 없습니다." };
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("roast_manual")
    .select("id, qtys, account_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "행을 찾을 수 없어요." };
  if (!row.account_id) {
    return { ok: false, error: "거래처가 연결되지 않은 행이에요. 수정에서 거래처를 골라주세요." };
  }

  const amt = await amountFromPrices(admin, row.account_id as string, (row.qtys as Qtys) ?? {});
  if (!amt || amt <= 0) {
    return { ok: false, error: "이 거래처에 설정된 단가가 없어요. 거래처 관리에서 단가를 넣어주세요." };
  }

  await admin.from("roast_manual").update({ amount: amt }).eq("id", id);
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/profit");
  return { ok: true, amount: amt };
}
