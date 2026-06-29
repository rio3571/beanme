// b2b_accounts.memo 한 칸에 입금계좌 + 로그인비번 + 부가세모드를 JSON으로 저장.
// 별도 컬럼 추가(SQL) 없이 기존 memo 컬럼 재사용.
import { isVatMode, type VatMode } from "@/lib/vat";

export type AcctMeta = { bank?: string; pw?: string; vat?: VatMode };

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
  return Object.keys(o).length ? JSON.stringify(o) : null;
}
