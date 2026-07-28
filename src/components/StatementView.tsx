"use client";

import { useRef, useState } from "react";
import { won, kstDate, ymLabel } from "@/lib/format";
import { SUPPLIER } from "@/lib/supplier";
import { vatAmounts, VAT_LABEL, DEFAULT_VAT, type VatMode } from "@/lib/vat";

export type StmtRow = {
  date: string;
  floor?: string; // 층/부서 (공용 주문 거래처)
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type StmtBuyer = {
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  business_no: string | null;
  address: string | null;
  bank?: string | null;
} | null;

export default function StatementView({
  buyer,
  monthYm,
  rows,
  total,
  vatMode = DEFAULT_VAT,
  periodLabel,
}: {
  buyer: StmtBuyer;
  monthYm: string;
  rows: StmtRow[];
  total: number;
  vatMode?: VatMode;
  periodLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [inAppWarning, setInAppWarning] = useState(false);

  const { supply, vat, total: grand } = vatAmounts(total, vatMode);

  const filename = `거래내역서_${buyer?.company_name ?? ""}_${monthYm}.pdf`;

  async function makePdfBlob(): Promise<Blob | null> {
    if (!ref.current) return null;
    const [{ default: html2canvas }, jspdf] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const JsPDF = jspdf.jsPDF;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(img, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(img, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    return pdf.output("blob") as Blob;
  }

  function isKakaoInApp() {
    return typeof navigator !== "undefined" && /KAKAOTALK/i.test(navigator.userAgent);
  }

  async function savePdf() {
    setBusy(true);
    try {
      const blob = await makePdfBlob();
      if (!blob) return;
      // jsPDF의 내장 save()는 카카오톡 인앱 브라우저 등에서 조용히 실패하는 경우가 있어
      // Blob + 앵커 클릭 방식으로 직접 다운로드를 트리거한다.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      if (isKakaoInApp()) setInAppWarning(true);
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      alert(`PDF 생성 중 오류가 발생했습니다: ${(err as Error)?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  }

  async function sharePdf() {
    setSharing(true);
    try {
      const blob = await makePdfBlob();
      if (!blob) return;

      let shared = false;
      try {
        const file = new File([blob], filename, { type: "application/pdf" });
        const nav = navigator as Navigator & {
          canShare?: (data?: ShareData) => boolean;
          share?: (data: ShareData) => Promise<void>;
        };
        if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
          await nav.share({
            files: [file],
            title: "거래명세서",
            text: `${buyer?.company_name ?? ""} ${ymLabel(monthYm)} 거래명세서`,
          });
          shared = true;
        }
      } catch (err) {
        // 사용자가 공유 시트를 취소한 경우는 정상 흐름 — 폴백 없이 조용히 종료
        if ((err as Error)?.name === "AbortError") {
          shared = true;
        }
        // 그 외 실패(데스크톱 브라우저에 공유 대상 앱이 없는 경우 등)는 아래 새 탭 폴백으로 이어간다
      }

      if (!shared) {
        // 공유 API 미지원·실패 — 새 탭에서 열어 거기서 저장/공유하도록 안내
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        if (isKakaoInApp()) {
          setInAppWarning(true);
        } else {
          alert("공유 대신 새 탭에서 PDF를 열었어요. 거기서 저장하거나 다른 방법으로 공유해주세요.");
        }
      }
    } catch (err) {
      console.error("PDF 생성 실패:", err);
      alert(`PDF 생성 중 오류가 발생했습니다: ${(err as Error)?.message ?? err}`);
    } finally {
      setSharing(false);
    }
  }

  const supplierLines = [
    SUPPLIER.bizNo && `사업자번호 ${SUPPLIER.bizNo}`,
    SUPPLIER.ceo && `대표 ${SUPPLIER.ceo}`,
    SUPPLIER.tel && `Tel ${SUPPLIER.tel}`,
    SUPPLIER.address && `주소 : ${SUPPLIER.address}`,
    SUPPLIER.email && `email : ${SUPPLIER.email}`,
  ].filter(Boolean) as string[];

  const buyerLines = [
    buyer?.business_no && `사업자번호 ${buyer.business_no}`,
    buyer?.contact_name && `담당 ${buyer.contact_name}`,
    buyer?.phone && `Tel ${buyer.phone}`,
    buyer?.address,
  ].filter(Boolean) as string[];

  return (
    <div>
      {inAppWarning && (
        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs sm:text-sm px-4 py-3">
          ⚠️ 카카오톡 안에서 열려 있으면 다운로드·공유가 안 될 수 있어요. 우측 상단 <b>≡ 메뉴 → &quot;다른 브라우저로 열기&quot;</b>를 눌러 Chrome/Safari로 열어주세요.
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={sharePdf}
          disabled={sharing || rows.length === 0}
          className="rounded-xl bg-[#FEE500] text-[#3C1E1E] font-semibold px-5 py-2.5 text-sm disabled:opacity-40"
        >
          {sharing ? "준비 중…" : "📤 카톡 등으로 공유"}
        </button>
        <button
          onClick={savePdf}
          disabled={busy || rows.length === 0}
          className="rounded-xl bg-amber-700 text-white font-semibold px-5 py-2.5 text-sm disabled:opacity-40"
        >
          {busy ? "PDF 만드는 중…" : "📄 PDF 저장"}
        </button>
        <button
          onClick={() => window.print()}
          disabled={rows.length === 0}
          className="rounded-xl border border-stone-300 text-stone-700 font-semibold px-5 py-2.5 text-sm disabled:opacity-40"
        >
          🖨 인쇄
        </button>
      </div>

      {/* 인쇄/캡처 대상 */}
      <div className="overflow-x-auto">
        <div
          ref={ref}
          className="bg-white text-stone-800 mx-auto"
          style={{ width: 720, padding: 28 }}
        >
          <div className="text-center text-2xl font-bold tracking-wide border-b-2 border-stone-800 pb-3 mb-4">
            거 래 명 세 서
          </div>
          <div className="text-center text-sm text-stone-500 mb-4">
            {periodLabel ?? ymLabel(monthYm)} 거래내역 · {VAT_LABEL[vatMode]}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div className="border border-stone-300 rounded-lg p-3">
              <div className="text-xs text-amber-700 font-bold mb-1">공급자</div>
              <div className="font-bold">{SUPPLIER.name}</div>
              {supplierLines.map((l, i) => (
                <div key={i} className="text-stone-600 text-xs mt-0.5">
                  {l}
                </div>
              ))}
            </div>
            <div className="border border-stone-300 rounded-lg p-3">
              <div className="text-xs text-amber-700 font-bold mb-1">
                공급받는자
              </div>
              <div className="font-bold">{buyer?.company_name ?? "-"}</div>
              {buyerLines.map((l, i) => (
                <div key={i} className="text-stone-600 text-xs mt-0.5">
                  {l}
                </div>
              ))}
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-stone-100">
                <th className="border border-stone-300 px-2 py-1.5 text-left">
                  일자
                </th>
                <th className="border border-stone-300 px-2 py-1.5 text-left">
                  품목
                </th>
                <th className="border border-stone-300 px-2 py-1.5 text-right">
                  수량
                </th>
                <th className="border border-stone-300 px-2 py-1.5 text-right">
                  단가
                </th>
                <th className="border border-stone-300 px-2 py-1.5 text-right">
                  공급가액
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="border border-stone-300 px-2 py-6 text-center text-stone-400"
                  >
                    해당 월 거래내역이 없습니다.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="border border-stone-300 px-2 py-1.5">
                    {kstDate(r.date)}
                  </td>
                  <td className="border border-stone-300 px-2 py-1.5">
                    {r.floor && (
                      <span className="text-stone-500">[{r.floor}] </span>
                    )}
                    {r.name}
                  </td>
                  <td className="border border-stone-300 px-2 py-1.5 text-right">
                    {r.qty}
                    {r.unit}
                  </td>
                  <td className="border border-stone-300 px-2 py-1.5 text-right">
                    {r.unitPrice.toLocaleString("ko-KR")}
                  </td>
                  <td className="border border-stone-300 px-2 py-1.5 text-right">
                    {r.amount.toLocaleString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <table className="text-sm">
              <tbody>
                <tr>
                  <td className="px-3 py-1 text-stone-500">공급가액</td>
                  <td className="px-3 py-1 text-right font-medium w-36">
                    {won(supply)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1 text-stone-500">
                    {vatMode === "cash" ? "부가세 (현금·면세)" : "부가세 (10%)"}
                  </td>
                  <td className="px-3 py-1 text-right font-medium">{won(vat)}</td>
                </tr>
                <tr className="border-t-2 border-stone-800">
                  <td className="px-3 py-1.5 font-bold">합계금액</td>
                  <td className="px-3 py-1.5 text-right font-bold text-base">
                    {won(grand)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {buyer?.bank && (
            <div className="mt-5 border border-stone-300 rounded-lg p-3 text-sm">
              <span className="text-amber-700 font-bold">입금계좌 </span>
              <span className="whitespace-pre-wrap">{buyer.bank}</span>
            </div>
          )}

          <div className="text-center text-xs text-stone-400 mt-6">
            {SUPPLIER.name} · 본 명세서는 거래 참고용입니다.
          </div>
        </div>
      </div>
    </div>
  );
}
