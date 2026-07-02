"use server";

import { getMyAccount } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { loadStatement } from "@/lib/statement";
import { parseMeta } from "@/lib/acctMeta";
import { SUPPLIER } from "@/lib/supplier";
import { registIssue, POPBILL_IS_TEST } from "@/lib/popbill";

function ymd(ts: string): string {
  const k = new Date(new Date(ts).getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}${p(k.getUTCMonth() + 1)}${p(k.getUTCDate())}`;
}

export type IssueResult = {
  ok: boolean;
  message: string;
  test?: boolean;
  mgtKey?: string;
};

export async function issueTaxInvoice(
  accountId: string,
  ym: string
): Promise<IssueResult> {
  const me = await getMyAccount();
  if (!me || me.role !== "admin")
    return { ok: false, message: "권한이 없습니다." };

  // 공급자 필수값 체크
  if (!SUPPLIER.bizType || !SUPPLIER.bizItem) {
    return {
      ok: false,
      message: "공급자(희연재) 업태·종목이 비어 있어요. supplier.ts에 먼저 입력해야 발행돼요.",
    };
  }

  const admin = createAdminClient();
  const { data: acct } = await admin
    .from("b2b_accounts")
    .select("company_name, business_no, address, contact_name, memo")
    .eq("id", accountId)
    .maybeSingle();
  if (!acct) return { ok: false, message: "거래처를 찾을 수 없어요." };

  const meta = parseMeta(acct.memo as string | null);
  if (meta.vat === "cash") {
    return {
      ok: false,
      message: "현금(부가세 없음) 거래처는 세금계산서 대상이 아니에요.",
    };
  }

  const tax = meta.tax ?? {};
  const bizNo = String(acct.business_no ?? "").replace(/\D/g, "");
  const missing = [
    bizNo.length !== 10 && "사업자번호(10자리)",
    !tax.ceo && "대표자명",
    !tax.email && "세금계산서 이메일",
  ].filter(Boolean);
  if (missing.length) {
    return {
      ok: false,
      message: `세금계산서 정보 부족: ${missing.join(", ")} — 거래처 상세에서 채워주세요.`,
    };
  }

  // 해당 월 거래내역 (공급가=net 기준)
  const { rows, selectedYm } = await loadStatement(accountId, ym);
  if (rows.length === 0)
    return { ok: false, message: `${selectedYm} 거래내역이 없어요.` };

  const today = ymd(new Date().toISOString());
  const detailList = rows.map((r, i) => {
    const supplyCost = Math.round(r.amount);
    const tax10 = Math.round(supplyCost * 0.1);
    return {
      serialNum: i + 1,
      purchaseDT: ymd(r.date),
      itemName: r.name,
      spec: r.unit ?? "",
      qty: String(r.qty),
      unitCost: String(r.unitPrice),
      supplyCost: String(supplyCost),
      tax: String(tax10),
      remark: "",
    };
  });
  const supplyCostTotal = detailList.reduce((s, d) => s + Number(d.supplyCost), 0);
  const taxTotal = detailList.reduce((s, d) => s + Number(d.tax), 0);
  const totalAmount = supplyCostTotal + taxTotal;

  const mgtKey = `BM${selectedYm.replace("-", "")}${Date.now().toString(36)}`;

  const taxinvoice = {
    writeDate: today,
    chargeDirection: "정과금",
    issueType: "정발행",
    purposeType: "청구",
    taxType: "과세",

    // 공급자 (희연재)
    invoicerMgtKey: mgtKey,
    invoicerCorpNum: SUPPLIER.bizNo.replace(/\D/g, ""),
    invoicerCorpName: SUPPLIER.name,
    invoicerCEOName: SUPPLIER.ceo,
    invoicerAddr: SUPPLIER.address,
    invoicerBizType: SUPPLIER.bizType,
    invoicerBizClass: SUPPLIER.bizItem,
    invoicerContactName: SUPPLIER.ceo,
    invoicerTEL: SUPPLIER.tel,
    invoicerEmail: SUPPLIER.email,

    // 공급받는자 (거래처)
    invoiceeType: "사업자",
    invoiceeCorpNum: bizNo,
    invoiceeCorpName: acct.company_name,
    invoiceeCEOName: tax.ceo,
    invoiceeAddr: acct.address ?? "",
    invoiceeBizType: tax.bizType ?? "",
    invoiceeBizClass: tax.bizItem ?? "",
    invoiceeContactName1: acct.contact_name ?? tax.ceo,
    invoiceeEmail1: tax.email,
    invoiceeSMSSendYN: false,

    supplyCostTotal: String(supplyCostTotal),
    taxTotal: String(taxTotal),
    totalAmount: String(totalAmount),

    detailList,
  };

  try {
    const r = await registIssue(taxinvoice);
    if (r.code === 1) {
      return {
        ok: true,
        test: POPBILL_IS_TEST,
        mgtKey,
        message: POPBILL_IS_TEST
          ? "테스트 발행 성공 (실제 국세청 전송 아님)"
          : "세금계산서 발행 완료",
      };
    }
    return { ok: false, message: `발행 실패: ${r.message} (code ${r.code})` };
  } catch (e) {
    const err = e as { code?: number; message?: string };
    return {
      ok: false,
      message: `발행 오류: ${err.message ?? "알 수 없음"}${
        err.code ? ` (code ${err.code})` : ""
      }`,
    };
  }
}
