"use client";

import { useRef, useState } from "react";
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

const ymText = (ym: string) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`;
const pct = (profit: number, biz: number) => (biz > 0 ? `${((profit / biz) * 100).toFixed(1)}%` : "—");
const cell = (key: NumKey, v: number) => (key === "kg" ? `${v.toLocaleString("ko-KR")}` : won(v));
const shiftYm = (ym: string, d: number) => {
  const [y, m] = ym.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + d, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** 월 마감표 — 현금 매출을 뺀 회사 기준 매출·원가·실질이익을 지정한 월 구간으로 */
export default function MonthlyClose({
  brand,
  from,
  to,
  maxMonth,
  onRange,
  rows,
  onPick,
}: {
  brand: string;
  from: string;
  to: string;
  maxMonth: string; // 이번 달
  onRange: (from: string, to: string) => void;
  rows: CloseRow[];
  onPick: (ym: string) => void;
}) {
  const shotRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const [lo, hi] = from <= to ? [from, to] : [to, from];
  const sameYear = lo.slice(0, 4) === hi.slice(0, 4);
  const rangeText = lo === hi ? ymText(lo) : `${ymText(lo)} ~ ${sameYear ? `${Number(hi.slice(5))}월` : ymText(hi)}`;
  const mLabel = (ym: string) => (sameYear ? `${Number(ym.slice(5))}월` : `${ym.slice(2, 4)}.${ym.slice(5)}`);
  const title = `월 마감표 · ${brand}`;
  const fileBase = `월마감표_${brand}_${lo}${lo === hi ? "" : `_${hi}`}`;

  const total = rows.reduce(
    (t, r) => {
      for (const c of COLS) t[c.key] += r[c.key];
      t.cash += r.cash;
      return t;
    },
    { ym: "합계", biz: 0, vat: 0, bean: 0, pkg: 0, proc: 0, fix: 0, profit: 0, cash: 0, kg: 0 } as CloseRow
  );

  const year = maxMonth.slice(0, 4);
  const presets: [string, string, string][] = [
    ["이번 달", maxMonth, maxMonth],
    ["지난 달", shiftYm(maxMonth, -1), shiftYm(maxMonth, -1)],
    ["최근 3개월", shiftYm(maxMonth, -2), maxMonth],
    ["올해", `${year}-01`, maxMonth],
    ["작년", `${Number(year) - 1}-01`, `${Number(year) - 1}-12`],
  ];

  function downloadCsv() {
    const head = ["월", ...COLS.map((c) => c.label), "이익률", "제외한 현금"];
    const line = (r: CloseRow, label: string) => [label, ...COLS.map((c) => r[c.key]), pct(r.profit, r.biz), r.cash].join(",");
    const csv = [head.join(","), ...rows.map((r) => line(r, r.ym)), line(total, "합계")].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveImage() {
    if (!shotRef.current) return;
    setSaving(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(shotRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("이미지 생성 실패");
      const file = new File([blob], `${fileBase}.png`, { type: "image/png" });
      // 휴대폰: 공유 시트(사진 저장·카톡 전송) / PC: 바로 다운로드
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${title} · ${rangeText}` }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      alert("이미지 저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  const tone = (c: (typeof COLS)[number], r: CloseRow) =>
    c.neg
      ? "text-rose-600"
      : c.key === "profit"
      ? `font-semibold ${r.profit < 0 ? "text-rose-700" : "text-stone-800"}`
      : c.key === "vat"
      ? "text-sky-700"
      : c.key === "kg"
      ? "text-stone-500"
      : "";
  const sign = (c: (typeof COLS)[number], v: number) => (c.neg && v ? "-" : "");

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
      <div className="px-4 py-2.5 border-b border-stone-100 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-stone-700 text-sm">📅 월 마감표 · {brand}</span>
          <div className="flex gap-1.5">
            <button
              onClick={saveImage}
              disabled={saving || rows.length === 0}
              className="text-xs font-semibold text-white bg-amber-700 rounded-md px-2.5 py-1 hover:bg-amber-800 disabled:opacity-40"
            >
              {saving ? "만드는 중…" : "🖼 이미지 저장"}
            </button>
            <button
              onClick={downloadCsv}
              disabled={rows.length === 0}
              className="text-xs font-semibold text-stone-600 border border-stone-300 rounded-md px-2.5 py-1 hover:bg-stone-50 disabled:opacity-40"
            >
              엑셀(CSV)
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="month"
            value={from}
            max={maxMonth}
            onChange={(e) => e.target.value && onRange(e.target.value, to)}
            className="h-8 rounded-md border border-stone-300 px-2 text-sm"
          />
          <span className="text-stone-400">~</span>
          <input
            type="month"
            value={to}
            max={maxMonth}
            onChange={(e) => e.target.value && onRange(from, e.target.value)}
            className="h-8 rounded-md border border-stone-300 px-2 text-sm"
          />
          {presets.map(([label, f, t]) => (
            <button
              key={label}
              onClick={() => onRange(f, t)}
              className={`h-8 rounded-full border px-2.5 text-xs font-medium ${
                lo === f && hi === t ? "border-amber-700 bg-amber-700 text-white" : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {label}
            </button>
          ))}
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
                  <td key={c.key} className={`px-2 py-2 text-right tabular-nums whitespace-nowrap ${tone(c, r)}`}>
                    {sign(c, r[c.key])}
                    {cell(c.key, r[c.key])}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums text-stone-500">{pct(r.profit, r.biz)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 2} className="px-3 py-5 text-center text-stone-400">
                  {rangeText} 내역이 없어요.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 1 && (
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
                    {sign(c, total[c.key])}
                    {cell(c.key, total[c.key])}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums">{pct(total.profit, total.biz)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="px-4 py-2 text-[11px] text-stone-400 leading-relaxed">
        ※ 현금 매출을 뺀 회사 기준(공급가)이에요. 이 기간 제외한 현금 매출 {won(total.cash)}. 월을 누르면 위 요약이 그
        달로 바뀌어요. 원가는 현재 원가 설정 기준이에요.
      </div>

      {/* 이미지 저장용 (화면 밖, 고정 폭) */}
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0 }}>
        <div ref={shotRef} style={{ width: 1000, padding: 32, background: "#fff", color: "#1c1917", fontFamily: "'Malgun Gothic','Apple SD Gothic Neo',sans-serif" }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{title}</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: "#92400e" }}>{rangeText}</div>
          <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>
            {SUPPLIER.name} · 사업자 {SUPPLIER.bizNo} · 현금 매출 제외 · 공급가(VAT 별도)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#292524", color: "#fff" }}>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>월</th>
                {COLS.map((c) => (
                  <th key={c.key} style={{ padding: "8px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {c.label}
                  </th>
                ))}
                <th style={{ padding: "8px 10px", textAlign: "right" }}>이익률</th>
              </tr>
            </thead>
            <tbody>
              {[...rows, ...(rows.length > 1 ? [total] : [])].map((r) => {
                const isTotal = r === total;
                return (
                  <tr
                    key={r.ym}
                    style={isTotal ? { background: "#f5f5f4", fontWeight: 800, borderTop: "2px solid #292524" } : { borderBottom: "1px solid #e7e5e4" }}
                  >
                    <td style={{ padding: "8px 10px", fontWeight: 700 }}>{isTotal ? "합계" : mLabel(r.ym)}</td>
                    {COLS.map((c) => (
                      <td
                        key={c.key}
                        style={{
                          padding: "8px 8px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          color: c.neg ? "#b91c1c" : c.key === "vat" ? "#0369a1" : c.key === "profit" ? (r.profit < 0 ? "#b91c1c" : "#047857") : undefined,
                          fontWeight: c.key === "profit" ? 700 : undefined,
                        }}
                      >
                        {sign(c, r[c.key])}
                        {cell(c.key, r[c.key])}
                      </td>
                    ))}
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>{pct(r.profit, r.biz)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 14, fontSize: 11.5, color: "#78716c", lineHeight: 1.6 }}>
            ※ 실질이익 = 회사 매출(공급가·현금 제외) − 원두원가·포장재·가공비·고정비. 부가세는 수익이 아니라 따로 낼 금액.
            제외한 현금 매출 {won(total.cash)}. 원가는 현재 원가 설정 기준.
          </div>
        </div>
      </div>
    </div>
  );
}
