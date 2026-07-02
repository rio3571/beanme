import "server-only";
import popbill from "popbill";

// 팝빌 SDK는 최초 TaxinvoiceService() 생성 전에 config()가 호출돼야 함.
let configured = false;
function taxService() {
  if (!configured) {
    popbill.config({
      LinkID: process.env.POPBILL_LINK_ID ?? "",
      SecretKey: process.env.POPBILL_SECRET_KEY ?? "",
      IsTest: process.env.POPBILL_IS_TEST === "true",
      IPRestrictOnOff: false, // 서버 IP 고정 아니라 제한 해제
      UseStaticIP: false,
      UseLocalTimeYN: true,
      defaultErrorHandler: () => {},
    });
    configured = true;
  }
  return popbill.TaxinvoiceService();
}

export const POPBILL_CORP_NUM = (process.env.POPBILL_CORP_NUM ?? "").replace(
  /\D/g,
  ""
);
export const POPBILL_IS_TEST = process.env.POPBILL_IS_TEST === "true";

export type PopbillResult = { code: number; message: string };

/** 잔여 포인트 조회 (연결 확인용) */
export function getBalance(): Promise<number> {
  const s = taxService();
  return new Promise((resolve, reject) => {
    s.getBalance(
      POPBILL_CORP_NUM,
      (v: number) => resolve(v),
      (e: unknown) => reject(e)
    );
  });
}

/** 세금계산서 즉시 발행 (정발행) */
export function registIssue(
  taxinvoice: Record<string, unknown>
): Promise<PopbillResult> {
  const s = taxService();
  return new Promise((resolve, reject) => {
    s.registIssue(
      POPBILL_CORP_NUM,
      taxinvoice,
      (r: PopbillResult) => resolve(r),
      (e: unknown) => reject(e)
    );
  });
}
