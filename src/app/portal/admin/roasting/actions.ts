"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

async function isAdmin() {
  const me = await getMyAccount();
  return !!me && me.role === "admin";
}

type Qtys = Record<string, number>;

export async function addManualRoast(input: {
  account: string;
  qtys: Qtys;
  roastDate: string;
  amount?: number;
}): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin.from("roast_manual").insert({
    account: (input.account ?? "").trim(),
    qtys: input.qtys ?? {},
    roast_date: input.roastDate,
    amount: Math.max(0, Math.round(Number(input.amount) || 0)),
  });
  revalidatePath("/portal/admin/roasting");
  return { ok: true };
}

export async function removeManualRoast(id: string): Promise<{ ok: boolean }> {
  if (!(await isAdmin())) return { ok: false };
  const admin = createAdminClient();
  await admin.from("roast_manual").delete().eq("id", id);
  revalidatePath("/portal/admin/roasting");
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
