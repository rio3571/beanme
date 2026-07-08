"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { won } from "@/lib/format";
import {
  productCostMap,
  packagingPerKg,
  fixedTotal,
  recipeCost,
  type RoastConfig,
} from "@/lib/roastConfig";
import {
  saveRoastConfig,
  addManualRoast,
  removeManualRoast,
  updateManualAmount,
} from "../roasting/actions";

export type MonthAgg = {
  orderRevenue: number;
  manualRevenue: number;
  kg: Record<string, number>;
};
export type PuEntry = {
  id: string;
  account: string;
  qtys: Record<string, number>;
  roastDate: string;
  amount: number;
};
export type HyDetailRow = {
  account: string;
  kg: Record<string, number>;
  revenue: number;
};

type Brand = "희연재" | "푸르파파";

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  return y && m ? `${y}년 ${Number(m)}월` : ym;
}

export default function ProfitView({
  config,
  monthHY,
  monthPU,
  puEntries,
  hyManual,
  hyDetail,
  months,
  defaultMonth,
}: {
  config: RoastConfig;
  monthHY: Record<string, MonthAgg>;
  monthPU: Record<string, MonthAgg>;
  puEntries: PuEntry[];
  hyManual: PuEntry[];
  hyDetail: Record<string, HyDetailRow[]>;
  months: string[];
  defaultMonth: string;
}) {
  const router = useRouter();
  const [cfg, setCfg] = useState<RoastConfig>(config);
  const [brand, setBrand] = useState<Brand>("희연재");
  const [month, setMonth] = useState(defaultMonth);
  const [showCfg, setShowCfg] = useState(false);
  const [saving, startSave] = useTransition();
  const [, startAct] = useTransition();
  const [saved, setSaved] = useState(false);

  // 푸르파파 입력 폼
  const [puAccount, setPuAccount] = useState("");
  const [puVals, setPuVals] = useState<Record<string, string>>({});
  const [puAmount, setPuAmount] = useState("");
  // 희연재 수기 총금액 편집
  const [hyAmt, setHyAmt] = useState<Record<string, string>>({});

  const update = (fn: (c: RoastConfig) => void) =>
    setCfg((prev) => {
      const c: RoastConfig = structuredClone(prev);
      fn(c);
      return c;
    });
  const refresh = () => startAct(() => router.refresh());

  function save() {
    setSaved(false);
    startSave(async () => {
      const res = await saveRoastConfig(cfg);
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }

  const productNames = cfg.recipes.map((r) => r.name);

  // 판매단가 × kg = 자동 매출
  const puAuto = productNames.reduce(
    (s, p) => s + Math.round(Number(puVals[p]) || 0) * (cfg.sellPrice[p] ?? 0),
    0
  );

  function addPu() {
    const qtys: Record<string, number> = {};
    for (const p of productNames) {
      const q = Math.round(Number(puVals[p]) || 0);
      if (q > 0) qtys[p] = q;
    }
    // 매출: 직접 입력 있으면 그 값, 없으면 판매단가 자동 계산
    const manual = puAmount.trim()
      ? Math.max(0, Math.round(Number(puAmount) || 0))
      : 0;
    const amt = manual || Math.round(puAuto);
    if (Object.keys(qtys).length === 0 && amt === 0) return;
    setPuAccount("");
    setPuVals({});
    setPuAmount("");
    addManualRoast({
      account: puAccount.trim(),
      qtys,
      roastDate: `${month}-15`,
      amount: amt,
      brand: "푸르파파",
    }).then(refresh);
  }

  // ── 수익 계산 (편집 중 cfg 기준 실시간) ──
  const cost = productCostMap(cfg);
  const pkgPerKg = packagingPerKg(cfg);
  const share = brand === "희연재" ? cfg.fixed.hyShare : 1 - cfg.fixed.hyShare;
  const fix = Math.round(fixedTotal(cfg) * share);
  const md =
    (brand === "희연재" ? monthHY[month] : monthPU[month]) ?? {
      orderRevenue: 0,
      manualRevenue: 0,
      kg: {},
    };
  const products = [...new Set([...productNames, ...Object.keys(md.kg)])];
  const revenue = md.orderRevenue + md.manualRevenue;
  const totalKg = Object.values(md.kg).reduce((s, v) => s + v, 0);
  const beanCost = products.reduce(
    (s, p) => s + (md.kg[p] ?? 0) * (cost[p] ?? 0),
    0
  );
  const pkgCost = Math.round(totalKg * pkgPerKg);
  const procCost = Math.round(totalKg * cfg.processing);
  const profit = revenue - beanCost - pkgCost - fix - procCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const roastH = cfg.roastSpeed > 0 ? totalKg / cfg.roastSpeed : 0;
  const packH = cfg.packSpeed > 0 ? totalKg / cfg.packSpeed : 0;

  const monthPu = puEntries.filter((e) => e.roastDate.startsWith(month));
  const hyRows = hyDetail[month] ?? [];
  const monthHyManual = hyManual.filter((e) => e.roastDate.startsWith(month));

  const metric = (
    label: string,
    value: string,
    tone = "bg-white border-stone-200",
    sub?: string
  ) => (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-bold text-stone-800 mt-0.5 leading-tight">
        {value}
      </div>
      {sub && <div className="text-[11px] text-stone-400">{sub}</div>}
    </div>
  );

  return (
    <div>
      {/* 헤더: 브랜드 + 월 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-stone-800">로스팅 수익</h1>
          <div className="flex rounded-lg border border-stone-300 overflow-hidden text-sm">
            {(["희연재", "푸르파파"] as Brand[]).map((b) => (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className={`px-3 py-1 font-medium ${
                  brand === b
                    ? "bg-amber-700 text-white"
                    : "bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            className="h-8 w-8 rounded-md border border-stone-300 text-stone-500 hover:bg-stone-100"
          >
            ‹
          </button>
          <span className="font-bold text-stone-800 tabular-nums min-w-[92px] text-center">
            {fmtMonth(month)}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="h-8 w-8 rounded-md border border-stone-300 text-stone-500 hover:bg-stone-100"
          >
            ›
          </button>
        </div>
      </div>

      {/* 수익 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        {metric(
          "매출 (부가세 포함)",
          won(revenue),
          "bg-emerald-50 border-emerald-100",
          brand === "희연재"
            ? `주문 ${won(md.orderRevenue)} + 수기 ${won(md.manualRevenue)}`
            : `납품 ${won(md.manualRevenue)}`
        )}
        {metric(
          "실질이익",
          won(profit),
          profit >= 0 ? "bg-amber-50 border-amber-100" : "bg-rose-50 border-rose-200",
          `${totalKg}kg`
        )}
        {metric("이익률", `${margin.toFixed(1)}%`)}
        {metric(
          "노동시간",
          `${(roastH + packH).toFixed(1)}h`,
          "bg-white border-stone-200",
          `로스팅 ${roastH.toFixed(1)} + 포장 ${packH.toFixed(1)}`
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        {metric("원두원가", won(beanCost))}
        {metric("포장재", won(pkgCost), "bg-white border-stone-200", `${pkgPerKg}원/kg`)}
        {metric(
          `고정비(${brand})`,
          won(fix),
          "bg-white border-stone-200",
          `월 ${(share * 100).toFixed(0)}% 반영`
        )}
        {metric("가공비", won(procCost), "bg-white border-stone-200", cfg.processing ? `${cfg.processing}원/kg` : "—")}
      </div>

      {/* 품목별 */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
        <div className="px-4 py-2.5 border-b border-stone-100 font-semibold text-stone-700 text-sm">
          품목별 · {brand} · {fmtMonth(month)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-stone-50/70 border-b border-stone-200 text-xs text-stone-500">
                <th className="px-3 py-2 text-left">품목</th>
                <th className="px-2 py-2 text-right">수량</th>
                <th className="px-2 py-2 text-right">원두원가/kg</th>
                <th className="px-2 py-2 text-right">원두원가</th>
                <th className="px-2 py-2 text-right">포장재</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((p) => {
                const kg = md.kg[p] ?? 0;
                if (kg <= 0) return null;
                return (
                  <tr key={p}>
                    <td className="px-3 py-2 font-medium text-stone-800">{p}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{kg}kg</td>
                    <td className="px-2 py-2 text-right tabular-nums text-stone-500">
                      {won(cost[p] ?? 0)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {won(kg * (cost[p] ?? 0))}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-stone-500">
                      {won(kg * pkgPerKg)}
                    </td>
                  </tr>
                );
              })}
              {totalKg === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-5 text-center text-stone-400">
                    이 달 {brand} 내역이 없어요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 거래처별 주문내역 (희연재 탭) */}
      {brand === "희연재" && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-stone-100 font-semibold text-stone-700 text-sm flex items-center justify-between">
            <span>📋 거래처별 주문내역 · {fmtMonth(month)}</span>
            <span className="text-xs font-normal text-stone-400">
              {hyRows.length}곳
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-200 text-xs text-stone-500">
                  <th className="px-3 py-2 text-left">거래처</th>
                  {productNames.map((p) => (
                    <th
                      key={p}
                      className="px-2 py-2 text-right whitespace-nowrap"
                    >
                      {p}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right">합계</th>
                  <th className="px-2 py-2 text-right">매출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {hyRows.map((r, i) => {
                  const rowKg = Object.values(r.kg).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-stone-800 whitespace-nowrap">
                        {r.account}
                      </td>
                      {productNames.map((p) => (
                        <td
                          key={p}
                          className="px-2 py-2 text-right tabular-nums text-stone-600"
                        >
                          {r.kg[p] ? r.kg[p] : "·"}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right tabular-nums font-medium">
                        {rowKg}kg
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold text-stone-800">
                        {won(r.revenue)}
                      </td>
                    </tr>
                  );
                })}
                {hyRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={productNames.length + 3}
                      className="px-3 py-5 text-center text-stone-400"
                    >
                      이 달 주문내역이 없어요.
                    </td>
                  </tr>
                )}
              </tbody>
              {hyRows.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold text-stone-800">
                    <td className="px-3 py-2">합계</td>
                    {productNames.map((p) => {
                      const t = hyRows.reduce((s, r) => s + (r.kg[p] ?? 0), 0);
                      return (
                        <td
                          key={p}
                          className="px-2 py-2 text-right tabular-nums"
                        >
                          {t ? `${t}kg` : "·"}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-right tabular-nums">
                      {hyRows.reduce(
                        (s, r) =>
                          s + Object.values(r.kg).reduce((a, b) => a + b, 0),
                        0
                      )}
                      kg
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-emerald-700">
                      {won(hyRows.reduce((s, r) => s + r.revenue, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 희연재 수기 주문 총금액 입력 (희연재 탭) */}
      {brand === "희연재" && monthHyManual.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-stone-100 font-semibold text-stone-700 text-sm">
            ✍️ 수기 주문 · 총금액 입력 · {fmtMonth(month)}
          </div>
          <div className="p-3 space-y-2">
            {monthHyManual.map((e) => {
              const kgs = Object.entries(e.qtys)
                .map(([p, q]) => `${p} ${q}`)
                .join(" · ");
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-2 bg-stone-50 rounded-lg border border-stone-200 px-3 py-2"
                >
                  <span className="text-sm font-medium text-stone-800 min-w-[80px] truncate">
                    {e.account || "(수기)"}
                  </span>
                  <span className="flex-1 text-xs text-stone-500 truncate">
                    {kgs || "—"}
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    defaultValue={e.amount || ""}
                    placeholder="총금액"
                    onChange={(ev) =>
                      setHyAmt((v) => ({ ...v, [e.id]: ev.target.value }))
                    }
                    className="w-28 h-8 text-right rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
                  />
                  <span className="text-xs text-stone-400">원</span>
                  <button
                    onClick={() =>
                      updateManualAmount(
                        e.id,
                        Math.round(Number(hyAmt[e.id] ?? e.amount) || 0)
                      ).then(refresh)
                    }
                    className="text-xs font-semibold text-amber-700 border border-amber-200 rounded-md px-2 py-1 hover:bg-amber-50"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => removeManualRoast(e.id).then(refresh)}
                    className="text-stone-400 hover:text-rose-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <div className="text-[11px] text-stone-400">
              로스팅에서 수기로 넣은 주문이에요. 여기서 총금액(매출)을 입력하면 매출·수익에 바로 반영돼요.
            </div>
          </div>
        </div>
      )}

      {/* 푸르파파 납품 입력 (푸르파파 탭에서만) */}
      {brand === "푸르파파" && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-stone-100 font-semibold text-stone-700 text-sm">
            ✍️ 푸르파파 납품 입력 · {fmtMonth(month)}
          </div>
          <div className="p-3">
            <div className="flex flex-wrap items-end gap-2 mb-3">
              <input
                value={puAccount}
                onChange={(e) => setPuAccount(e.target.value)}
                placeholder="거래처 (선택)"
                className="h-9 w-32 rounded-lg border border-stone-300 px-2.5 text-sm outline-none focus:border-amber-600"
              />
              {productNames.map((p) => (
                <div key={p} className="flex items-center gap-1">
                  <span className="text-xs text-stone-500">{p}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={puVals[p] ?? ""}
                    onChange={(e) =>
                      setPuVals((v) => ({ ...v, [p]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addPu()}
                    placeholder="0"
                    className="w-14 h-9 text-right rounded-lg border border-stone-300 px-1.5 text-sm outline-none focus:border-amber-600"
                  />
                </div>
              ))}
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-500">매출</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={puAmount}
                  onChange={(e) => setPuAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPu()}
                  placeholder={puAuto ? puAuto.toLocaleString() : "0"}
                  className="w-24 h-9 text-right rounded-lg border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
                />
                <span className="text-xs text-stone-400">원</span>
              </div>
              <button
                onClick={addPu}
                className="h-9 rounded-lg bg-amber-700 text-white text-sm font-semibold px-5 hover:bg-amber-800"
              >
                추가
              </button>
            </div>
            {puAuto > 0 && (
              <div className="text-xs text-stone-500 mb-2">
                판매단가 자동 매출 <b className="text-amber-700">{won(puAuto)}</b>{" "}
                <span className="text-stone-400">
                  (매출칸 비우면 자동 적용 · 아래 원가 설정에서 단가 수정)
                </span>
              </div>
            )}

            {monthPu.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {monthPu.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs text-stone-700"
                  >
                    {e.account ? `${e.account} · ` : ""}
                    {Object.entries(e.qtys)
                      .map(([p, q]) => `${p} ${q}`)
                      .join(" · ")}
                    {e.amount > 0 ? ` · ${e.amount.toLocaleString()}원` : ""}
                    <button
                      onClick={() => removeManualRoast(e.id).then(refresh)}
                      className="text-stone-400 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 원가 설정 (공통) ── */}
      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setShowCfg((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100"
        >
          <span className="font-semibold text-stone-700 text-sm">
            ⚙️ 원가 설정 (생두단가 · 레시피 · 고정비 · 포장재)
          </span>
          <span className="text-xs text-stone-400">
            {showCfg ? "▲ 접기" : "▼ 펼치기"}
          </span>
        </button>

        {showCfg && (
          <div className="bg-white p-4 space-y-5">
            {/* 생두 단가 */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-stone-700 text-sm">
                  🌱 생두 단가 (원/kg)
                </h3>
                <button
                  onClick={() =>
                    update((c) => c.beans.push({ name: "새 생두", price: 0 }))
                  }
                  className="text-xs text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50"
                >
                  + 생두
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {cfg.beans.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-stone-50 rounded-lg border border-stone-200 px-2.5 py-1.5"
                  >
                    <input
                      value={b.name}
                      onChange={(e) =>
                        update((c) => {
                          c.beans[i].name = e.target.value;
                        })
                      }
                      className="flex-1 min-w-0 h-8 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
                    />
                    <input
                      type="number"
                      value={b.price}
                      onChange={(e) =>
                        update((c) => {
                          c.beans[i].price = Number(e.target.value) || 0;
                        })
                      }
                      className="w-24 h-8 text-right rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
                    />
                    <button
                      onClick={() =>
                        update((c) => {
                          c.beans.splice(i, 1);
                        })
                      }
                      className="text-stone-400 hover:text-rose-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* 레시피 */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-stone-700 text-sm">
                  📋 레시피 (블렌드 · 로스율)
                </h3>
                <button
                  onClick={() =>
                    update((c) =>
                      c.recipes.push({
                        name: "새 원두",
                        lossRate: 20,
                        ingredients: [{ bean: c.beans[0]?.name ?? "", ratio: 100 }],
                      })
                    )
                  }
                  className="text-xs text-emerald-700 border border-emerald-200 rounded-lg px-2 py-1 hover:bg-emerald-50"
                >
                  + 원두
                </button>
              </div>
              <div className="space-y-2">
                {cfg.recipes.map((r, ri) => (
                  <div key={ri} className="rounded-lg border border-stone-200 p-2.5">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={r.name}
                        onChange={(e) =>
                          update((c) => {
                            c.recipes[ri].name = e.target.value;
                          })
                        }
                        className="w-24 h-8 rounded-md border border-stone-300 px-2 text-sm font-semibold outline-none focus:border-amber-600"
                      />
                      <span className="text-xs text-stone-500">로스율</span>
                      <input
                        type="number"
                        value={r.lossRate}
                        onChange={(e) =>
                          update((c) => {
                            c.recipes[ri].lossRate = Number(e.target.value) || 0;
                          })
                        }
                        className="w-16 h-8 text-right rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
                      />
                      <span className="text-xs text-stone-400">%</span>
                      <span className="ml-auto text-sm font-bold text-amber-700">
                        {won(recipeCost(cfg, r))}/kg
                      </span>
                      <button
                        onClick={() =>
                          update((c) => {
                            c.recipes.splice(ri, 1);
                          })
                        }
                        className="text-stone-400 hover:text-rose-600 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {r.ingredients.map((ing, ii) => (
                        <div key={ii} className="flex items-center gap-2">
                          <select
                            value={ing.bean}
                            onChange={(e) =>
                              update((c) => {
                                c.recipes[ri].ingredients[ii].bean =
                                  e.target.value;
                              })
                            }
                            className="h-8 rounded-md border border-stone-300 px-2 text-sm bg-white outline-none focus:border-amber-600"
                          >
                            <option value="">생두 선택</option>
                            {cfg.beans.map((b) => (
                              <option key={b.name} value={b.name}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={ing.ratio}
                            onChange={(e) =>
                              update((c) => {
                                c.recipes[ri].ingredients[ii].ratio =
                                  Number(e.target.value) || 0;
                              })
                            }
                            className="w-16 h-8 text-right rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
                          />
                          <span className="text-xs text-stone-400">%</span>
                          <button
                            onClick={() =>
                              update((c) => {
                                c.recipes[ri].ingredients.splice(ii, 1);
                              })
                            }
                            className="text-stone-400 hover:text-rose-600 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          update((c) =>
                            c.recipes[ri].ingredients.push({
                              bean: c.beans[0]?.name ?? "",
                              ratio: 0,
                            })
                          )
                        }
                        className="text-xs text-stone-500 border border-stone-200 rounded-lg px-2 py-1 hover:bg-stone-50"
                      >
                        + 재료
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 판매단가 (푸르파파) */}
            <section>
              <h3 className="font-semibold text-stone-700 text-sm mb-2">
                💰 판매단가 · 푸르파파 (원/kg · 부가세 별도)
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {productNames.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-stone-500 truncate">{p}</span>
                    <input
                      type="number"
                      value={cfg.sellPrice[p] ?? 0}
                      onChange={(e) =>
                        update((c) => {
                          c.sellPrice[p] = Number(e.target.value) || 0;
                        })
                      }
                      className="flex-1 h-8 text-right rounded-md border border-stone-300 px-2 outline-none focus:border-amber-600"
                    />
                    <span className="text-xs text-stone-400">원</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-stone-400 mt-1.5">
                푸르파파 납품 입력 시 kg × 이 단가로 매출 자동 계산돼요.
              </div>
            </section>

            {/* 고정비 */}
            <section>
              <h3 className="font-semibold text-stone-700 text-sm mb-2">
                🏭 월 고정비
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["rent", "공장 월세"],
                    ["elec", "전기세"],
                    ["gas", "가스비"],
                    ["etc", "기타"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-stone-500">{label}</span>
                    <input
                      type="number"
                      value={cfg.fixed[k]}
                      onChange={(e) =>
                        update((c) => {
                          c.fixed[k] = Number(e.target.value) || 0;
                        })
                      }
                      className="flex-1 h-8 text-right rounded-md border border-stone-300 px-2 outline-none focus:border-amber-600"
                    />
                    <span className="text-xs text-stone-400">원</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-stone-500">희연재 반영</span>
                  <input
                    type="number"
                    value={Math.round(cfg.fixed.hyShare * 1000) / 10}
                    onChange={(e) =>
                      update((c) => {
                        c.fixed.hyShare = (Number(e.target.value) || 0) / 100;
                      })
                    }
                    className="flex-1 h-8 text-right rounded-md border border-stone-300 px-2 outline-none focus:border-amber-600"
                  />
                  <span className="text-xs text-stone-400">%</span>
                </label>
              </div>
              <div className="text-xs text-stone-500 mt-1.5">
                합계 {won(fixedTotal(cfg))} · 희연재{" "}
                {won(Math.round(fixedTotal(cfg) * cfg.fixed.hyShare))} · 푸르파파{" "}
                {won(Math.round(fixedTotal(cfg) * (1 - cfg.fixed.hyShare)))}
              </div>
            </section>

            {/* 포장재·속도·가공비 */}
            <section>
              <h3 className="font-semibold text-stone-700 text-sm mb-2">
                📦 포장재 · 속도 · 가공비
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["bag", "봉투(원/개)"],
                    ["box", "20kg박스(원/개)"],
                    ["roastSpeed", "로스팅(kg/h)"],
                    ["packSpeed", "포장(kg/h)"],
                    ["processing", "가공비(원/kg)"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <span className="w-28 text-stone-500">{label}</span>
                    <input
                      type="number"
                      value={cfg[k]}
                      onChange={(e) =>
                        update((c) => {
                          c[k] = Number(e.target.value) || 0;
                        })
                      }
                      className="flex-1 h-8 text-right rounded-md border border-stone-300 px-2 outline-none focus:border-amber-600"
                    />
                  </label>
                ))}
              </div>
              <div className="text-xs text-stone-500 mt-1.5">
                포장재 합계 <b>{pkgPerKg}원/kg</b> (봉투 {cfg.bag} + 박스{" "}
                {Math.round(cfg.box / 20)})
              </div>
            </section>

            <div className="flex items-center gap-2 pt-1">
              {saved && (
                <span className="text-sm text-green-600 font-medium">
                  저장됐어요 ✅
                </span>
              )}
              <button
                onClick={save}
                disabled={saving}
                className="ml-auto rounded-xl bg-amber-700 text-white font-semibold px-6 py-2.5 text-sm hover:bg-amber-800 disabled:opacity-50"
              >
                {saving ? "저장 중…" : "원가 설정 저장"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
