"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { toAuthEmail, validLoginId } from "@/lib/loginId";
import { parseMeta, stringifyMeta } from "@/lib/acctMeta";
import { revalidatePath } from "next/cache";

export type CreateAccountState = { error: string | null; ok?: boolean };

// ── 거래처 층/부서 목록 (공용 아이디에서 주문 시 선택) ──
export async function setAccountUnits(
  accountId: string,
  unitsText: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const units = String(unitsText)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const admin = createAdminClient();
  const { data } = await admin
    .from("b2b_accounts")
    .select("memo")
    .eq("id", accountId)
    .maybeSingle();
  const meta = parseMeta((data?.memo as string) ?? null);
  meta.units = units;
  const memo = stringifyMeta(meta);
  const { error } = await admin
    .from("b2b_accounts")
    .update({ memo })
    .eq("id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

// ── 거래처 정산 시작일 (전월 N일 ~ 당월 N-1일 주기) ──
export async function setAccountBillDay(
  accountId: string,
  day: number
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const admin = createAdminClient();
  const { data } = await admin
    .from("b2b_accounts")
    .select("memo")
    .eq("id", accountId)
    .maybeSingle();
  const meta = parseMeta((data?.memo as string) ?? null);
  const d = Math.round(Number(day) || 0);
  meta.billDay = d >= 2 && d <= 28 ? d : undefined;
  const memo = stringifyMeta(meta);
  const { error } = await admin
    .from("b2b_accounts")
    .update({ memo })
    .eq("id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

// ── 거래처 전용 판매품목 (전용 블렌드 등) ──
export async function addCustomProduct(
  accountId: string,
  name: string,
  price: number
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const n = String(name).trim();
  if (!n) return { ok: false, error: "품목명을 입력하세요." };
  const admin = createAdminClient();
  const { error } = await admin.from("products").insert({
    name: n,
    unit: "kg",
    category: "blend",
    base_price: Math.max(0, Math.round(Number(price) || 0)),
    active: true,
    owner_account_id: accountId,
    sort_order: 100,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function updateCustomProductPrice(
  productId: string,
  accountId: string,
  price: number
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .update({ base_price: Math.max(0, Math.round(Number(price) || 0)) })
    .eq("id", productId)
    .not("owner_account_id", "is", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function removeCustomProduct(
  productId: string,
  accountId: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("products")
    .update({ active: false })
    .eq("id", productId)
    .not("owner_account_id", "is", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function createAccount(
  _prev: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { error: "권한이 없습니다." };

  const loginId = String(formData.get("loginId") || "").trim();
  const password = String(formData.get("password") || "");
  const company = String(formData.get("company") || "").trim();
  const contact = String(formData.get("contact") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const business = String(formData.get("business") || "").trim();
  const address = String(formData.get("address") || "").trim();

  if (!loginId || !password || !company) {
    return { error: "아이디·비밀번호·상호는 필수입니다." };
  }
  if (!validLoginId(loginId)) {
    return { error: "아이디는 영문/숫자(. _ - 가능) 또는 이메일 형식이어야 해요." };
  }
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 해요." };

  const email = toAuthEmail(loginId);

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    return { error: "계정 생성 실패: " + (error?.message ?? "알 수 없음") };
  }

  const { error: insErr } = await admin.from("b2b_accounts").insert({
    auth_user_id: created.user.id,
    company_name: company,
    contact_name: contact || null,
    phone: phone || null,
    email,
    business_no: business || null,
    address: address || null,
    role: "buyer",
    active: true,
    memo: stringifyMeta({ pw: password }), // 관리자 참고용 비번 저장
  });
  if (insErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "거래처 저장 실패: " + insErr.message };
  }

  revalidatePath("/portal/admin/accounts");
  return { error: null, ok: true };
}

export async function setPrices(
  accountId: string,
  rows: { product_id: string; unit_price: number | null }[]
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  for (const r of rows) {
    if (r.unit_price === null || Number.isNaN(r.unit_price)) {
      await admin
        .from("account_prices")
        .delete()
        .eq("account_id", accountId)
        .eq("product_id", r.product_id);
    } else {
      await admin.from("account_prices").upsert(
        {
          account_id: accountId,
          product_id: r.product_id,
          unit_price: Math.max(0, Math.floor(r.unit_price)),
        },
        { onConflict: "account_id,product_id" }
      );
    }
  }
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function updateAccountBank(
  accountId: string,
  bankInfo: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const admin = createAdminClient();
  const { data: cur } = await admin
    .from("b2b_accounts")
    .select("memo")
    .eq("id", accountId)
    .maybeSingle();
  const meta = parseMeta(cur?.memo as string | null | undefined);
  meta.bank = bankInfo.trim();
  const { error } = await admin
    .from("b2b_accounts")
    .update({ memo: stringifyMeta(meta) })
    .eq("id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function updateAccountTax(
  accountId: string,
  input: {
    businessNo?: string;
    address?: string;
    ceo?: string;
    bizType?: string;
    bizItem?: string;
    email?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };

  const admin = createAdminClient();
  const { data: cur } = await admin
    .from("b2b_accounts")
    .select("memo")
    .eq("id", accountId)
    .maybeSingle();
  const meta = parseMeta(cur?.memo as string | null | undefined);
  meta.tax = {
    ceo: (input.ceo ?? "").trim() || undefined,
    bizType: (input.bizType ?? "").trim() || undefined,
    bizItem: (input.bizItem ?? "").trim() || undefined,
    email: (input.email ?? "").trim() || undefined,
  };

  const { error } = await admin
    .from("b2b_accounts")
    .update({
      business_no: (input.businessNo ?? "").trim() || null,
      address: (input.address ?? "").trim() || null,
      memo: stringifyMeta(meta),
    })
    .eq("id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function updateAccountName(
  accountId: string,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const n = String(name).trim();
  if (!n) return { ok: false, error: "이름을 입력하세요." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("b2b_accounts")
    .update({ company_name: n })
    .eq("id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  revalidatePath("/portal/admin/accounts");
  revalidatePath("/portal/admin/orders");
  return { ok: true };
}

export async function setAccountCarry(
  accountId: string,
  items: { name: string; qty: number }[]
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const admin = createAdminClient();
  const { data: cur } = await admin
    .from("b2b_accounts")
    .select("memo")
    .eq("id", accountId)
    .maybeSingle();
  const meta = parseMeta(cur?.memo as string | null | undefined);
  // 전달된 목록으로 이월을 '교체'(누적 아님) — 관리자가 보면서 직접 조정
  const clean = (items ?? [])
    .map((c) => ({ name: String(c.name).trim(), qty: Math.round(Number(c.qty) || 0) }))
    .filter((c) => c.name && c.qty !== 0);
  meta.carry = clean;
  const { error } = await admin
    .from("b2b_accounts")
    .update({ memo: stringifyMeta(meta) })
    .eq("id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portal/admin/orders");
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function updateAccountVat(
  accountId: string,
  vat: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  if (!["excluded", "included", "cash"].includes(vat)) {
    return { ok: false, error: "잘못된 부가세 모드." };
  }
  const admin = createAdminClient();
  const { data: cur } = await admin
    .from("b2b_accounts")
    .select("memo")
    .eq("id", accountId)
    .maybeSingle();
  const meta = parseMeta(cur?.memo as string | null | undefined);
  meta.vat = vat as "excluded" | "included" | "cash";
  const { error } = await admin
    .from("b2b_accounts")
    .update({ memo: stringifyMeta(meta) })
    .eq("id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function updateAccountPassword(
  accountId: string,
  newPw: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  if (newPw.length < 6) return { ok: false, error: "비밀번호는 6자 이상이어야 해요." };
  const admin = createAdminClient();
  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("auth_user_id, memo")
    .eq("id", accountId)
    .maybeSingle();
  if (!acct?.auth_user_id) return { ok: false, error: "계정을 찾을 수 없어요." };

  const { error: pwErr } = await admin.auth.admin.updateUserById(
    acct.auth_user_id as string,
    { password: newPw }
  );
  if (pwErr) return { ok: false, error: "변경 실패: " + pwErr.message };

  const meta = parseMeta(acct.memo as string | null | undefined);
  meta.pw = newPw;
  await admin
    .from("b2b_accounts")
    .update({ memo: stringifyMeta(meta) })
    .eq("id", accountId);
  revalidatePath(`/portal/admin/accounts/${accountId}`);
  return { ok: true };
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const allowed = ["requested", "confirmed", "shipped", "done", "canceled"];
  if (!allowed.includes(status)) return { ok: false, error: "잘못된 상태." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("b2b_orders")
    .update({ status })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/portal/admin/orders");
  revalidatePath("/portal/admin/roasting");
  return { ok: true };
}

/**
 * 상태 변경 시 거래처에게 포털 메시지 알림.
 * 확인(confirmed) → "접수되었습니다", 완료(done) → "발송되었습니다".
 * 이미 그 상태였던 주문은 제외해 중복 클릭 시 재알림하지 않음.
 */
const STATUS_NOTIFY: Record<string, string> = {
  confirmed: "☕ 주문이 접수되었습니다.",
  done: "🚚 주문이 발송되었습니다.",
};

async function notifyStatusToBuyers(
  admin: ReturnType<typeof createAdminClient>,
  before: { account_id: string | null; status: string }[],
  status: string
): Promise<void> {
  const body = STATUS_NOTIFY[status];
  if (!body) return;
  const acctIds = [
    ...new Set(
      before
        .filter((o) => o.status !== status && o.account_id)
        .map((o) => o.account_id as string)
    ),
  ];
  for (const account_id of acctIds) {
    await admin.from("b2b_messages").insert({
      account_id,
      sender: "admin",
      body,
      read_by_admin: true,
      read_by_buyer: false,
    });
  }
}

/**
 * 거래처 행(로스팅)의 '보낸 수량'을 기록. 품목별 총 보낸 수량을 받아
 * 해당 거래처의 이 배치 주문들에 순서대로(오래된 주문부터) 채워 분배한다.
 * 로스팅 목록은 '주문 − 보냄'(안 보낸 나머지)만 표시.
 */
export async function setAccountShipped(
  orderIds: string[],
  shipped: Record<string, number>
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  if (!orderIds.length) return { ok: true };

  const admin = createAdminClient();
  const [{ data: ords }, { data: its }] = await Promise.all([
    admin.from("b2b_orders").select("id, created_at, shipped").in("id", orderIds),
    admin
      .from("b2b_order_items")
      .select("order_id, product_name, qty")
      .in("order_id", orderIds),
  ]);

  // 주문별·품목별 주문수량(용량)
  const cap = new Map<string, Map<string, number>>();
  for (const it of its ?? []) {
    const oid = it.order_id as string;
    const m = cap.get(oid) ?? new Map<string, number>();
    const pn = it.product_name as string;
    m.set(pn, (m.get(pn) ?? 0) + ((it.qty as number) ?? 0));
    cap.set(oid, m);
  }

  const sorted = [...(ords ?? [])].sort((a, b) =>
    String(a.created_at).localeCompare(String(b.created_at))
  );
  // 기존 shipped 에서 시작 (편집한 품목만 덮어씀)
  const shippedByOrder = new Map<string, Record<string, number>>(
    sorted.map((o) => [
      o.id as string,
      { ...((o.shipped as Record<string, number>) ?? {}) },
    ])
  );

  for (const [product, raw] of Object.entries(shipped)) {
    let left = Math.max(0, Math.round(Number(raw) || 0));
    for (const o of sorted) {
      const capacity = cap.get(o.id as string)?.get(product) ?? 0;
      const assign = Math.min(capacity, left);
      const s = shippedByOrder.get(o.id as string)!;
      if (assign > 0) s[product] = assign;
      else delete s[product];
      left -= assign;
    }
    // 주문량보다 많이 보낸 경우(초과분)는 마지막 주문에 얹어 기록
    if (left > 0 && sorted.length) {
      const last = sorted[sorted.length - 1].id as string;
      const s = shippedByOrder.get(last)!;
      s[product] = (s[product] ?? 0) + left;
    }
  }

  for (const o of sorted) {
    const { error } = await admin
      .from("b2b_orders")
      .update({ shipped: shippedByOrder.get(o.id as string) ?? {} })
      .eq("id", o.id);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/orders");
  return { ok: true };
}

/** 여러 주문의 상태를 한 번에 변경 (로스팅 목록의 거래처별 일괄 처리용) */
export async function updateOrdersStatus(
  orderIds: string[],
  status: string
): Promise<{ ok: boolean; error?: string }> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") return { ok: false, error: "권한이 없습니다." };
  const allowed = ["requested", "confirmed", "shipped", "done", "canceled"];
  if (!allowed.includes(status)) return { ok: false, error: "잘못된 상태." };
  if (!orderIds.length) return { ok: true };

  const admin = createAdminClient();
  // 알림 판단용: 변경 전 상태·거래처 조회
  const { data: before } = await admin
    .from("b2b_orders")
    .select("account_id, status")
    .in("id", orderIds);
  const { error } = await admin
    .from("b2b_orders")
    .update({ status })
    .in("id", orderIds);
  if (error) return { ok: false, error: error.message };
  await notifyStatusToBuyers(admin, before ?? [], status);
  revalidatePath("/portal/admin/roasting");
  revalidatePath("/portal/admin/orders");
  return { ok: true };
}
