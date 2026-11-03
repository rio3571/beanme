"use client";

import { useState } from "react";
import { won } from "@/lib/format";
import { beanPrice, recipeCost, type RoastConfig } from "@/lib/roastConfig";
import { addGreenPurchase, removeGreenPurchase } from "./actions";

export type GreenPurchase = {
  id: string;
  paidOn: string;
  forMonth: string; // 귀속월 YYYY-MM
  amount: number;
  vatIncluded: boolean;
  kg: number | null;
  supplier: string;
  memo: string;
};

type MonthKg = { ym: string; kg: Record<string, number> };

const supplyOf = (p: GreenPurchase) => (p.vatIncluded ? Math.round(p.amount / 1.1) : p.amount);
const prevMonth = (date: string) => {
  const [y, m] = date.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const pctText = (v: number | null) => (v === null || !isFinite(v) ? "—" : `${(v * 100).toFixed(1)}%`);

/** 생두 결제 대조 — 실제 생두 결제액 vs 출고량으로 계산한 이론 생두원가, 로스율 점검 */
export default function GreenCheck({
  cfg,
  months,
  purchases,
  defaultMonth,
  onChanged,
}: {
  cfg: RoastConfig;
  months: MonthKg[]; // 월 마감표와 같은 구간, 희연재+푸르파파 합산 출고 kg
  purchases: GreenPurchase[];
  defaultMonth: string;
  onChanged: () => void;
}) {
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const [paidOn, setPaidOn] = useState(today);
  const [forMonth, setForMonth] = useState(prevMonth(today));
  const [amount, setAmount] = useState("");
  const [kg, setKg] = useState("");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);

  const recipeOf = (name: string) => cfg.recipes.find((r) => r.name === name);

  const rows = months.map(({ ym, kg: kgMap }) => {
    let roasted = 0,
      noRecipe = 0,
      needGreen = 0,
      costNoLoss = 0,
      theo = 0;
    for (const [name, q] of Object.entries(kgMap)) {
      const r = recipeOf(name);
      if (!r) {
        noRecipe += q;
        continue;
      }
      const base = r.ingredients.reduce((s, ing) => s + beanPrice(cfg, ing.bean) * ((ing.ratio || 0) / 100), 0);
      roasted += q;
      needGreen += q * (1 + (r.lossRate || 0) / 100);
      costNoLoss += q * base;
      theo += q * recipeCost(cfg, r);
    }
    const list = purchases.filter((p) => p.forMonth === ym);
    const actual = list.reduce((s, p) => s + supplyOf(p), 0);
    const allKg = list.length > 0 && list.every((p) => p.kg && p.kg > 0);
    const actualKg = allKg ? list.reduce((s, p) => s + (p.kg ?? 0), 0) : null;
    return { ym, roasted, noRecipe, needGreen, costNoLoss, theo: Math.round(theo), actual, actualKg, count: list.length };
  });

  const lossOf = (r: { roasted: number; costNoLoss: number; actual: number; actualKg: number | null }) => {
    if (r.roasted <= 0 || r.actual <= 0) return { v: null as number | null, measured: false };
    if (r.actualKg) return { v: r.actualKg / r.roasted - 1, measured: true };
    return { v: r.costNoLoss > 0 ? r.actual / r.costNoLoss - 1 : null, measured: false };
  };

  const sum = rows.reduce(
    (t, r) => ({
      roasted: t.roasted + r.roasted,
      needGreen: t.needGreen + r.needGreen,
      costNoLoss: t.costNoLoss + r.costNoLoss,
      theo: t.theo + r.theo,
      actual: t.actual + r.actual,
      actualKg: t.actualKg !== null && r.actualKg !== null ? t.actualKg + r.actualKg : r.actual > 0 ? null : t.actualKg,
    }),
    { roasted: 0, needGreen: 0, costNoLoss: 0, theo: 0, actual: 0, actualKg: 0 as number | null }
  );
  const avgLoss = cfg.recipes.length
    ? cfg.recipes.reduce((s, r) => s + (r.lossRate || 0), 0) / cfg.recipes.length
    : 0;
  const inRange = new Set(months.map((m) => m.ym));
  const shown = purchases.filter((p) => inRange.has(p.forMonth));

  async function save() {
    setErr("");
    setBusy(true);
    const r = await addGreenPurchase({
      paidOn,
      forMonth,
      amount: Number(amount) || 0,
      vatIncluded,
      kg: kg ? Number(kg) : null,
      supplier,
      memo,
    });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "저장 실패");
    setAmount("");
    setKg("");
    setMemo("");
    onChanged();
  }

  async function remove(p: GreenPurchase) {
    if (!confirm(`${p.paidOn} 생두 결제 ${won(p.amount)} 기록을 지울까요?`)) return;
    await removeGreenPurchase(p.id);
    onChanged();
  }

  const ratioTone = (actual: number, theo: number) => {
    if (!actual || !theo) return "text-stone-400";
    const q = actual / theo;
    return q > 1.1 ? "text-rose-700 font-bold" : q < 0.9 ? "text-amber-700 font-bold" : "text-emerald-700 font-semibold";
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
      <div className="px-4 py-2.5 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-stone-700 text-sm">🌱 생두 결제 대조 · 로스율 점검</span>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-semibold text-white bg-emerald-700 rounded-md px-2.5 py-1 hover:bg-emerald-800"
        >
          {showForm ? "닫기" : "＋ 생두 결제 입력"}
        </button>
      </div>

      {showForm && (
        <div className="border-b border-stone-100 bg-emerald-50/40 px-4 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs font-semibold text-stone-600">
              결제일
              <input
                type="date"
                value={paidOn}
                onChange={(e) => {
                  setPaidOn(e.target.value);
                  if (e.target.value) setForMonth(prevMonth(e.target.value));
                }}
                className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-stone-600">
              귀속월 <span className="font-normal text-stone-400">어느 달 생두값</span>
              <input
                type="month"
                value={forMonth}
                onChange={(e) => setForMonth(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-stone-600">
              결제 금액 (원)
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2 text-right text-sm font-semibold"
              />
            </label>
            <label className="text-xs font-semibold text-stone-600">
              생두 kg <span className="font-normal text-stone-400">(알면)</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2 text-right text-sm"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="거래처 (예: 생두 공급처)"
              className="h-9 rounded-md border border-stone-300 px-2 text-sm"
            />
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 (예: 운송비, 추가분)"
              className="h-9 rounded-md border border-stone-300 px-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs text-stone-600">
              <input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} />
              부가세 포함 금액 (공급가로 환산해서 비교)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-600">{err}</span>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-stone-400">
            귀속월은 결제일의 전달로 자동 입력돼요(예: 8/14 결제 → 7월분). 다르면 바꿔 주세요. 같은 달 여러 번 결제하면
            따로 넣으면 합쳐서 비교해요.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm border-collapse">
          <thead>
            <tr className="bg-stone-50/70 border-b border-stone-200 text-xs text-stone-500">
              <th className="px-3 py-2 text-left">월</th>
              <th className="px-2 py-2 text-right">출고(kg)</th>
              <th className="px-2 py-2 text-right">필요 생두(kg)</th>
              <th className="px-2 py-2 text-right">이론 생두원가</th>
              <th className="px-2 py-2 text-right">실제 결제</th>
              <th className="px-2 py-2 text-right">차이</th>
              <th className="px-2 py-2 text-right">실제/이론</th>
              <th className="px-3 py-2 text-right">로스율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r) => {
              const loss = lossOf(r);
              const diff = r.actual - r.theo;
              return (
                <tr key={r.ym}>
                  <td className="px-3 py-2 font-medium text-stone-800 whitespace-nowrap">
                    {r.ym.slice(0, 4)}.{r.ym.slice(5)}
                    {r.ym === defaultMonth && <span className="ml-1 text-[10px] text-stone-400">진행중</span>}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-stone-500">
                    {r.roasted.toLocaleString("ko-KR")}
                    {r.noRecipe > 0 && <span className="block text-[10px] text-amber-600">레시피 없음 {r.noRecipe}kg</span>}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-stone-500">
                    {Math.round(r.needGreen).toLocaleString("ko-KR")}
                    {r.actualKg && (
                      <span className="block text-[10px] text-stone-400">실제 {r.actualKg.toLocaleString("ko-KR")}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{won(r.theo)}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold">
                    {r.actual ? won(r.actual) : <span className="font-normal text-stone-300">미입력</span>}
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums ${diff > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    {r.actual ? `${diff > 0 ? "+" : ""}${won(diff)}` : ""}
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums ${ratioTone(r.actual, r.theo)}`}>
                    {r.actual && r.theo ? pctText(r.actual / r.theo) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {pctText(loss.v)}
                    {loss.v !== null && (
                      <span className="block text-[10px] text-stone-400">{loss.measured ? "실측" : "금액 역산"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold text-stone-800">
                <td className="px-3 py-2">누계</td>
                <td className="px-2 py-2 text-right tabular-nums">{sum.roasted.toLocaleString("ko-KR")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{Math.round(sum.needGreen).toLocaleString("ko-KR")}</td>
                <td className="px-2 py-2 text-right tabular-nums">{won(sum.theo)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{won(sum.actual)}</td>
                <td className={`px-2 py-2 text-right tabular-nums ${sum.actual - sum.theo > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                  {sum.actual ? `${sum.actual - sum.theo > 0 ? "+" : ""}${won(sum.actual - sum.theo)}` : ""}
                </td>
                <td className={`px-2 py-2 text-right tabular-nums ${ratioTone(sum.actual, sum.theo)}`}>
                  {sum.actual && sum.theo ? pctText(sum.actual / sum.theo) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{pctText(lossOf(sum).v)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {shown.length > 0 && (
        <div className="border-t border-stone-100 px-4 py-2">
          <div className="text-[11px] font-semibold text-stone-500 mb-1">이 구간 생두 결제 내역</div>
          <ul className="divide-y divide-stone-100">
            {shown.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-1.5 text-xs text-stone-600">
                <span className="w-[76px] shrink-0 text-stone-400">{p.paidOn}</span>
                <span className="w-[62px] shrink-0">{p.forMonth.slice(5)}월분</span>
                <span className="min-w-0 flex-1 truncate">
                  {[p.supplier, p.kg ? `${p.kg}kg` : "", p.vatIncluded ? "VAT포함" : "", p.memo].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="shrink-0 font-semibold">{won(p.amount)}</span>
                <button onClick={() => remove(p)} className="shrink-0 text-stone-300 hover:text-rose-600">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="px-4 py-2 text-[11px] text-stone-400 leading-relaxed">
        ※ 희연재+푸르파파 <b>합산 출고량</b> 기준(생두는 한 번에 사니까). 이론 생두원가 = 출고 kg × 레시피 생두단가 × (1+로스율,
        설정 평균 {avgLoss.toFixed(0)}%). <b>실제/이론</b>이 110%를 넘으면 빨강(로스·재고·단가 확인), 90% 미만이면 주황(재고 소진
        또는 결제 지연). 로스율은 생두 kg을 넣으면 <b>실측</b>, 없으면 결제액÷(로스 없는 원가)로 <b>역산</b>한 추정치예요.
        재고가 쌓이거나 줄면 월별로 들쭉날쭉하니 <b>누계</b>로 보는 게 정확해요.
      </div>
    </div>
  );
}
