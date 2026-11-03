"use client";

import { won } from "@/lib/format";
import { SUPPLIER } from "@/lib/supplier";

export type CloseRow = {
  ym: string;
  biz: number; // 회사 매출 (공급가 · 현금 제외)
  vat: number; // 내야 할 부가세
  bean: number;
  pkg: number;
  proc: number;
  fix: number;
  profit: number;
  cash: number; // 제외한 현금 매출 (참고)
  kg: number;
};

type NumKey = Exclude<keyof CloseRow, "ym">;

const COLS: { key: NumKey; label: string; neg?: boolean }[] = [
  { key: "kg", label: "출고(kg)" },
  { key: "biz", label: "회사 매출" },
  { key: "bean", label: "원두원가", neg: true },
  { key: "pkg", label: "포장재", neg: true },
  { key: "proc", label: "가공비", neg: true },
  { key: "fix", label: "고정비", neg: true },
  { key: "profit", label: "실질이익" },
  { key: "vat", label: "부가세(별도)" },
];

const mLabel = (ym: string) => `${Number(ym.slice(5))}월`;
const pct = (profit: number, biz: number) => (biz > 0 ? `${((profit / biz) * 100).toFixed(1)}%` : "—");
const cell = (key: NumKey, v: number) => (key === "kg" ? `${v.toLocaleString("ko-KR")}` : won(v));

/** 월별 마감표 — 현금 매출을 뺀 회사 기준 매출·원가·실질이익을 한 해 단위로 */
export default function MonthlyClose({
  brand,
  year,
  years,
  onYear,
  rows,
  onPick,
}: {
  brand: string;
  year: string;
  years: string[];
  onYear: (y: string) => void;
  rows: CloseRow[];
  onPick: (ym: string) => void;
}) {
  const total = rows.reduce(
    (t, r) => {
      for (const c of COLS) t[c.key] += r[c.key];
      t.cash += r.cash;
      return t;
    },
    { ym: "합계", biz: 0, vat: 0, bean: 0, pkg: 0, proc: 0, fix: 0, profit: 0, cash: 0, kg: 0 } as CloseRow
  );
  const title = `${year}년 월 마감표 · ${brand}`;

  function downloadCsv() {
    const head = ["월", ...COLS.map((c) => c.label), "이익률", "제외한 현금"];
    const line = (r: CloseRow, label: string) =>
      [label, ...COLS.map((c) => r[c.key]), pct(r.profit, r.biz), r.cash].join(",");
    const csv = [head.join(","), ...rows.map((r) => line(r, `${year}-${r.ym.slice(5)}`)), line(total, "합계")].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `월마감표_${brand}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function print() {
    const tr = (r: CloseRow, label: string, cls = "") =>
      `<tr class="${cls}"><td>${label}</td>${COLS.map(
        (c) => `<td class="r${c.neg ? " n" : ""}">${c.neg && r[c.key] ? "-" : ""}${cell(c.key, r[c.key] as number)}</td>`
      ).join("")}<td class="r">${pct(r.profit, r.biz)}</td></tr>`;
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${title}</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#1c1917;padding:24px 28px;font-size:12px;}
h1{font-size:20px;font-weight:800;}
.sub{color:#78716c;font-size:11.5px;margin-top:4px;}
table{width:100%;border-collapse:collapse;margin-top:14px;font-size:11.5px;}
th{background:#292524;color:#fff;padding:7px 8px;text-align:right;font-weight:600;}
th:first-child,td:first-child{text-align:left;}
td{padding:7px 8px;border-bottom:1px solid #e7e5e4;}
td.r{text-align:right;}
.n{color:#b91c1c;}
tr.total td{background:#f5f5f4;font-weight:800;border-top:2px solid #292524;}
.foot{margin-top:14px;font-size:10.5px;color:#78716c;line-height:1.6;}
@media print{body{padding:0;}@page{size:A4 landscape;margin:12mm;}}
</style></head><body>
<h1>${title}</h1>
<div class="sub">${SUPPLIER.name} · 사업자 ${SUPPLIER.bizNo} · 현금 매출 제외 · 금액은 공급가(VAT 별도)</div>
<table><thead><tr><th>월</th>${COLS.map((c) => `<th>${c.label}</th>`).join("")}<th>이익률</th></tr></thead><tbody>
${rows.map((r) => tr(r, mLabel(r.ym))).join("")}
${tr(total, "합계", "total")}
</tbody></table>
<div class="foot">※ 실질이익 = 회사 매출(공급가·현금 제외) − 원두원가·포장재·가공비·고정비. 부가세는 수익이 아니라 따로 낼 금액. 이 기간 제외한 현금 매출 합계 ${won(
      total.cash
    )}. 원가는 현재 원가 설정 기준으로 계산됩니다.</div>
</body></html>`;
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return alert("팝업이 차단됐어요. 팝업 허용 후 다시 시도해주세요.");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
      <div className="px-4 py-2.5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-700 text-sm">📅 월 마감표 · {brand}</span>
          <select
            value={year}
            onChange={(e) => onYear(e.target.value)}
            className="h-7 rounded-md border border-stone-300 px-1.5 text-xs"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={downloadCsv}
            className="text-xs font-semibold text-stone-600 border border-stone-300 rounded-md px-2.5 py-1 hover:bg-stone-50"
          >
            엑셀(CSV)
          </button>
          <button
            onClick={print}
            className="text-xs font-semibold text-amber-700 border border-amber-200 rounded-md px-2.5 py-1 hover:bg-amber-50"
          >
            🖨 출력
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm border-collapse">
          <thead>
            <tr className="bg-stone-50/70 border-b border-stone-200 text-xs text-stone-500">
              <th className="px-3 py-2 text-left">월</th>
              {COLS.map((c) => (
                <th key={c.key} className="px-2 py-2 text-right whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right">이익률</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => (
              <tr key={r.ym} onClick={() => onPick(r.ym)} className="cursor-pointer hover:bg-amber-50/50">
                <td className="px-3 py-2 font-medium text-stone-800 whitespace-nowrap">{mLabel(r.ym)}</td>
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-2 py-2 text-right tabular-nums whitespace-nowrap ${
                      c.neg
                        ? "text-rose-600"
                        : c.key === "profit"
                        ? `font-semibold ${r.profit < 0 ? "text-rose-700" : "text-stone-800"}`
                        : c.key === "vat"
                        ? "text-sky-700"
                        : c.key === "kg"
                        ? "text-stone-500"
                        : ""
                    }`}
                  >
                    {c.neg && r[c.key] ? "-" : ""}
                    {cell(c.key, r[c.key] as number)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums text-stone-500">{pct(r.profit, r.biz)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 2} className="px-3 py-5 text-center text-stone-400">
                  {year}년 내역이 없어요.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold text-stone-800">
                <td className="px-3 py-2">합계</td>
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-2 py-2 text-right tabular-nums whitespace-nowrap ${
                      c.neg ? "text-rose-600" : c.key === "profit" ? "text-emerald-700" : ""
                    }`}
                  >
                    {c.neg && total[c.key] ? "-" : ""}
                    {cell(c.key, total[c.key] as number)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{pct(total.profit, total.biz)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="px-4 py-2 text-[11px] text-stone-400 leading-relaxed">
        ※ 현금 매출을 뺀 회사 기준(공급가)이에요. 이 기간 제외한 현금 매출 {won(total.cash)}. 월을 누르면 위
        요약이 그 달로 바뀌어요. 원가는 현재 원가 설정 기준이에요.
      </div>
    </div>
  );
}
