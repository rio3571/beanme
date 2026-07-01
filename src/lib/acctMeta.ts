// b2b_accounts.memo 한 칸에 입금계좌 + 로그인비번 + 부가세모드를 JSON으로 저장.
// 별도 컬럼 추가(SQL) 없이 기존 memo 컬럼 재사용.
import { isVatMode, type VatMode } from "@/lib/vat";
import { isCarryList, type CarryItem } from "@/lib/carry";

export type TaxInfo = {
  ceo?: string; // 대표자명
  bizType?: string; // 업태
  bizItem?: string; // 종목
  email?: string; // 세금계산서 수신 이메일 (로그인 아이디와 별개)
};

export type AcctMeta = {
  bank?: string;
  pw?: string;
  vat?: VatMode;
  carry?: CarryItem[];
  tax?: TaxInfo;
};

function parseTax(v: unknown): TaxInfo | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const t: TaxInfo = {};
  if (typeof o.ceo === "string") t.ceo = o.ceo;
  if (typeof o.bizType === "string") t.bizType = o.bizType;
  if (typeof o.bizItem === "string") t.bizItem = o.bizItem;
  if (typeof o.email === "string") t.email = o.email;
  return Object.keys(t).length ? t : undefined;
}

export function parseMeta(memo: string | null | undefined): AcctMeta {
  if (!memo) return {};
  const s = memo.trim();
  if (s.startsWith("{")) {
    try {
      const o = JSON.parse(s);
      return {
        bank: o.bank ?? undefined,
        pw: o.pw ?? undefined,
        vat: isVatMode(o.vat) ? o.vat : undefined,
        carry: isCarryList(o.carry) ? o.carry : undefined,
        tax: parseTax(o.tax),
      };
    } catch {
      return { bank: s };
    }
  }
  return { bank: s }; // 예전 평문 memo = 계좌로 간주
}

export function stringifyMeta(m: AcctMeta): string | null {
  const o: AcctMeta = {};
  if (m.bank && m.bank.trim()) o.bank = m.bank.trim();
  if (m.pw && m.pw.trim()) o.pw = m.pw.trim();
  if (isVatMode(m.vat)) o.vat = m.vat;
  if (isCarryList(m.carry) && m.carry.length) o.carry = m.carry.filter((c) => c.qty !== 0);
  const t = parseTax(m.tax);
  if (t) o.tax = t;
  return Object.keys(o).length ? JSON.stringify(o) : null;
}
