"use client";

import { useRef, useState } from "react";
import { won, kstDate, ymLabel } from "@/lib/format";
import { SUPPLIER } from "@/lib/supplier";

export type StmtRow = {
  date: string;
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
}: {
  buyer: StmtBuyer;
  monthYm: string;
  rows: StmtRow[];
  total: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const vat = Math.round(total * 0.1);
  const grand = total + vat;

  async function savePdf() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, jspdf] = await Promise.all([
        import("html2canvas"),
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
      pdf.save(`거래내역서_${buyer?.company_name ?? ""}_${monthYm}.pdf`);
    } finally {
      setBusy(false);
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
      <div className="flex gap-2 mb-3">
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
            {ymLabel(monthYm)} 거래내역
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
                    {won(total)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-1 text-stone-500">부가세 (10%)</td>
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
