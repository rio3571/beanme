"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { won } from "@/lib/format";
import { SUPPLIER } from "@/lib/supplier";
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
  setManualCash,
} from "../roasting/actions";

export type MonthAgg = {
  orderRevenue: number;
  manualRevenue: number;
  cashRevenue: number; // 주문 중 현금(부가세 없음) 거래처 매출
  kg: Record<string, number>;
  oemKg: number; // OEM(가공 위탁) kg — 가공비 계산에서 제외
};
export type PuEntry = {
  id: string;
  account: string;
  qtys: Record<string, number>;
  roastDate: string;
  amount: number;
  cash?: boolean; // 현금 매출(희연재 수기)
  oem?: boolean; // OEM(가공 위탁) — 직접 로스팅 안 함
};
export type HyDetailRow = {
  account: string;
  kg: Record<string, number>;
  revenue: number;
};

type Brand = "희연재" | "푸르파파" | "합산";

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
  const [period, setPeriod] = useState<"월" | "분기">("월");
  const [showCfg, setShowCfg] = useState(false);
  const [saving, startSave] = useTransition();
  const [, startAct] = useTransition();
  const [saved, setSaved] = useState(false);

  // 푸르파파 입력 폼
  const [puAccount, setPuAccount] = useState("");
  const [puVals, setPuVals] = useState<Record<string, string>>({});
  const [puAmount, setPuAmount] = useState("");
  const [puOem, setPuOem] = useState(false); // OEM(가공 위탁) 행
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

  function shiftPeriod(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const step = period === "분기" ? delta * 3 : delta;
    const d = new Date(Date.UTC(y, m - 1 + step, 1));
    setMonth(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }

  const productNames = cfg.recipes.map((r) => r.name);

  // 입력된 총 kg (OEM 단가 계산용)
  const puTotalKg = productNames.reduce(
    (s, p) => s + Math.round(Number(puVals[p]) || 0),
    0
  );
  // 판매단가 × kg = 자동 매출(공급가).
  // OEM은 품목 구분 없이 OEM 단가(부가세 포함) 적용 → 공급가로 환산해 저장.
  const puAuto = puOem
    ? Math.round((puTotalKg * (cfg.oemPrice ?? 0)) / 1.1)
    : productNames.reduce(
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
    const oem = puOem;
    setPuAccount("");
    setPuVals({});
    setPuAmount("");
    setPuOem(false);
    addManualRoast({
      account: puAccount.trim(),
      qtys,
      roastDate: `${month}-15`,
      amount: amt,
      brand: "푸르파파",
      oem,
    }).then(refresh);
  }

  // ── 수익 계산 (편집 중 cfg 기준 실시간) ──
  const cost = productCostMap(cfg);
  const pkgPerKg = packagingPerKg(cfg);
  // 기간(월/분기) 집계 대상 월 키
  const [pY, pM] = month.split("-").map(Number);
  const qIdx = Math.floor((pM - 1) / 3); // 0=1분기 .. 3=4분기
  const periodKeys =
    period === "월"
      ? [month]
      : [1, 2, 3].map((i) => `${pY}-${String(qIdx * 3 + i).padStart(2, "0")}`);
  const periodLabel =
    period === "월" ? fmtMonth(month) : `${pY}년 ${qIdx + 1}분기`;
  const aggMonths = (src: Record<string, MonthAgg>): MonthAgg => {
    const out: MonthAgg = {
      orderRevenue: 0,
      manualRevenue: 0,
      cashRevenue: 0,
      kg: {},
      oemKg: 0,
    };
    for (const k of periodKeys) {
      const m = src[k];
      if (!m) continue;
      out.orderRevenue += m.orderRevenue;
      out.manualRevenue += m.manualRevenue;
      out.cashRevenue += m.cashRevenue;
      out.oemKg += m.oemKg ?? 0;
      for (const [p, v] of Object.entries(m.kg)) out.kg[p] = (out.kg[p] ?? 0) + v;
    }
    return out;
  };
  const mdHY = aggMonths(monthHY);
  const mdPU = aggMonths(monthPU);

  const calc = (m: MonthAgg, shareRatio: number, isPu: boolean) => {
    // 희연재 입력가 = 순공급가 취급 / 푸르파파 = 부가세 포함가
    const grossRevenue = m.orderRevenue + m.manualRevenue;
    const netRevenue = isPu ? Math.round(grossRevenue / 1.1) : grossRevenue; // 부가세 제외 순매출
    const cash = m.cashRevenue; // 현금(부가세 없음) = 대표님 개인 수익
    const bizRevenue = Math.max(0, netRevenue - cash); // 회사 매출(현금 제외 · 과세 순액)
    const vat = Math.round(bizRevenue * 0.1); // 내야 할 부가세
    const totalKg = Object.values(m.kg).reduce((s, v) => s + v, 0);
    const beanCost = Object.keys(m.kg).reduce(
      (s, p) => s + (m.kg[p] ?? 0) * (cost[p] ?? 0),
      0
    );
    const pkgCost = Math.round(totalKg * pkgPerKg);
    // OEM(가공 위탁)분은 직접 로스팅하지 않으므로 가공비 대상에서 제외
    const oemKg = m.oemKg ?? 0;
    const procCost = Math.round(Math.max(0, totalKg - oemKg) * cfg.processing);
    const fix = Math.round(fixedTotal(cfg) * shareRatio);
    // 실질이익 = 회사 매출(현금 제외) − 전체 원가(현금 판매분 원가 포함).
    // 부가세(내야 할 것)·현금(개인 수익)은 수익에서 제외.
    const profit = bizRevenue - beanCost - pkgCost - fix - procCost;
    return {
      grossRevenue,
      netRevenue,
      cash,
      bizRevenue,
      vat,
      totalKg,
      oemKg,
      beanCost,
      pkgCost,
      procCost,
      fix,
      profit,
      margin: bizRevenue > 0 ? (profit / bizRevenue) * 100 : 0,
    };
  };
  type Res = ReturnType<typeof calc>;

  const resHY = calc(mdHY, cfg.fixed.hyShare, false);
  const resPU = calc(mdPU, 1 - cfg.fixed.hyShare, true);
  const resSum: Res = {
    grossRevenue: resHY.grossRevenue + resPU.grossRevenue,
    netRevenue: resHY.netRevenue + resPU.netRevenue,
    cash: resHY.cash + resPU.cash,
    bizRevenue: resHY.bizRevenue + resPU.bizRevenue,
    vat: resHY.vat + resPU.vat,
    totalKg: resHY.totalKg + resPU.totalKg,
    oemKg: resHY.oemKg + resPU.oemKg,
    beanCost: resHY.beanCost + resPU.beanCost,
    pkgCost: resHY.pkgCost + resPU.pkgCost,
    procCost: resHY.procCost + resPU.procCost,
    fix: resHY.fix + resPU.fix,
    profit: resHY.profit + resPU.profit,
    margin:
      resHY.bizRevenue + resPU.bizRevenue > 0
        ? ((resHY.profit + resPU.profit) /
            (resHY.bizRevenue + resPU.bizRevenue)) *
          100
        : 0,
  };

  // 합산용 kg 병합 (품목 표시용)
  const mergedKg: Record<string, number> = {};
  for (const src of [mdHY.kg, mdPU.kg])
    for (const [p, v] of Object.entries(src))
      mergedKg[p] = (mergedKg[p] ?? 0) + v;
  const mdSum: MonthAgg = {
    orderRevenue: mdHY.orderRevenue + mdPU.orderRevenue,
    manualRevenue: mdHY.manualRevenue + mdPU.manualRevenue,
    cashRevenue: mdHY.cashRevenue + mdPU.cashRevenue,
    kg: mergedKg,
    oemKg: mdHY.oemKg + mdPU.oemKg,
  };

  const share =
    brand === "희연재"
      ? cfg.fixed.hyShare
      : brand === "푸르파파"
      ? 1 - cfg.fixed.hyShare
      : 1;
  const md = brand === "희연재" ? mdHY : brand === "푸르파파" ? mdPU : mdSum;
  const res = brand === "희연재" ? resHY : brand === "푸르파파" ? resPU : resSum;
  const { cash, bizRevenue, vat, totalKg, beanCost, pkgCost, procCost, fix, profit, margin } =
    res;
  const products = [...new Set([...productNames, ...Object.keys(md.kg)])];
  const roastH = cfg.roastSpeed > 0 ? totalKg / cfg.roastSpeed : 0;
  const packH = cfg.packSpeed > 0 ? totalKg / cfg.packSpeed : 0;

  // 브랜드별 정산 표시값 (회사 매출=공급가·현금 제외 / 부가세=내야 할 것 / 현금=개인)
  const hyBiz = resHY.bizRevenue,
    hyVat = resHY.vat,
    hyCash = resHY.cash;
  const puBiz = resPU.bizRevenue,
    puVat = resPU.vat,
    puCash = resPU.cash;
  const hyBilled = hyBiz + hyVat + hyCash; // 실제 청구·수령 합계(참고)
  const puBilled = puBiz + puVat + puCash;
  const vatToPay = hyVat + puVat; // 내야 할 부가세 합계
  const cashPersonal = hyCash + puCash; // 현금 개인 수익 합계

  // 예상 세금 (합산 실질이익 기준 · 참고용) — 법인세 9%/19% 누진 + 지방소득세 10%
  const sumProfit = resHY.profit + resPU.profit;
  const taxBase = Math.max(0, sumProfit);
  const corpTax = Math.round(
    Math.min(taxBase, 200_000_000) * 0.09 +
      Math.max(0, taxBase - 200_000_000) * 0.19
  );
  const localTax = Math.round(corpTax * 0.1);
  const afterTax = sumProfit - corpTax - localTax;

  const inPeriod = (rd: string) => periodKeys.some((k) => rd.startsWith(k));
  const monthPu = puEntries.filter((e) => inPeriod(e.roastDate));
  const monthHyManual = hyManual.filter((e) => inPeriod(e.roastDate));
  const hyRows =
    period === "월"
      ? hyDetail[month] ?? []
      : (() => {
          const merged = new Map<string, HyDetailRow>();
          for (const k of periodKeys)
            for (const r of hyDetail[k] ?? []) {
              let m = merged.get(r.account);
              if (!m) {
                m = { account: r.account, kg: {}, revenue: 0 };
                merged.set(r.account, m);
              }
              m.revenue += r.revenue;
              for (const [p, v] of Object.entries(r.kg))
                m.kg[p] = (m.kg[p] ?? 0) + v;
            }
          return [...merged.values()].sort((a, b) => b.revenue - a.revenue);
        })();

  function printSettlement() {
    const now = new Date();
    const issued = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}.${String(now.getDate()).padStart(2, "0")}`;
    const row = (l: string, hy: number, pu: number) =>
      `<tr><td>${l}</td><td class="r">${won(hy)}</td><td class="r">${won(
        pu
      )}</td><td class="r b">${won(hy + pu)}</td></tr>`;
    const neg = (l: string, hy: number, pu: number) =>
      `<tr><td>${l}</td><td class="r n">-${won(hy)}</td><td class="r n">-${won(
        pu
      )}</td><td class="r n">-${won(hy + pu)}</td></tr>`;
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>로스팅 정산서 · ${periodLabel}</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#1c1917;padding:26px 30px;font-size:13px;}
h1{font-size:22px;font-weight:800;letter-spacing:-0.5px;}
.sub{color:#78716c;font-size:12px;margin-top:4px;}
.supplier{margin:16px 0;border:1px solid #e7e5e4;border-radius:8px;padding:11px 14px;font-size:12px;line-height:1.7;background:#fafaf9;}
.supplier b{color:#292524;}
h2{font-size:14px;font-weight:700;margin:20px 0 4px;}
table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12.5px;}
th{background:#292524;color:#fff;padding:8px 10px;text-align:left;font-weight:600;}
th.r,td.r{text-align:right;}
td{padding:8px 10px;border-bottom:1px solid #e7e5e4;}
td.b{font-weight:700;}
tr.total td{background:#f5f5f4;font-weight:800;border-top:2px solid #292524;}
tr.em td{background:#ecfdf5;font-weight:700;}
.n{color:#b91c1c;}
.foot{margin-top:18px;font-size:11px;color:#78716c;line-height:1.6;border-top:1px solid #e7e5e4;padding-top:10px;}
.issued{text-align:right;margin-top:12px;font-size:12px;color:#57534e;}
@media print{body{padding:0;}@page{size:A4;margin:16mm;}}
</style></head><body>
<h1>로스팅 정산서</h1>
<div class="sub">${periodLabel} · 희연재 + 푸르파파 합산</div>
<div class="supplier"><b>${SUPPLIER.name}</b> (${SUPPLIER.ceo}) · 사업자 ${
      SUPPLIER.bizNo
    }<br>${SUPPLIER.address}<br>${SUPPLIER.bizType} / ${SUPPLIER.bizItem}${
      SUPPLIER.email ? ` · ${SUPPLIER.email}` : ""
    }</div>
<h2>회사 수익</h2>
<table><thead><tr><th>항목</th><th class="r">희연재</th><th class="r">푸르파파</th><th class="r">합계</th></tr></thead><tbody>
${row("회사 매출(공급가·현금 제외)", hyBiz, puBiz)}
${neg("원두원가", resHY.beanCost, resPU.beanCost)}
${neg("포장재", resHY.pkgCost, resPU.pkgCost)}
${neg("가공비", resHY.procCost, resPU.procCost)}
${neg("고정비", resHY.fix, resPU.fix)}
<tr class="total"><td>실질이익</td><td class="r">${won(resHY.profit)}</td><td class="r">${won(
      resPU.profit
    )}</td><td class="r">${won(resHY.profit + resPU.profit)}</td></tr>
</tbody></table>
<h2>따로 빼둘 것 (수익 아님)</h2>
<table><thead><tr><th>항목</th><th class="r">희연재</th><th class="r">푸르파파</th><th class="r">합계</th></tr></thead><tbody>
${row("내야 할 부가세(10%)", hyVat, puVat)}
${row("현금 매출(대표님 개인)", hyCash, puCash)}
<tr class="em"><td>실제 청구·수령 합계</td><td class="r">${won(hyBilled)}</td><td class="r">${won(
      puBilled
    )}</td><td class="r">${won(hyBilled + puBilled)}</td></tr>
</tbody></table>
<h2>예상 세금 · 세후 이익 (참고)</h2>
<table><tbody>
<tr><td>과세소득 (실질이익)</td><td class="r">${won(taxBase)}</td></tr>
<tr><td>법인세 (2억↓ 9% · 초과 19%)</td><td class="r n">-${won(corpTax)}</td></tr>
<tr><td>지방소득세 (법인세의 10%)</td><td class="r n">-${won(localTax)}</td></tr>
<tr class="total"><td>세후 이익</td><td class="r">${won(afterTax)}</td></tr>
</tbody></table>
<div class="foot">※ 실질이익 = 회사 매출(공급가·현금 제외) − 전체 원가. 부가세(과세분 10%)와 현금 매출(대표님 개인)은 수익에서 빼서 따로 표시했고, 현금 판매분의 원가는 회사 비용에 그대로 반영됩니다. 세금은 참고용 추정치이며, 실제 세액은 인건비·감가상각·세액공제·중간예납 등으로 달라집니다. 법인세는 사업연도 기준 연 1회 신고 — 정확한 신고는 세무사 확인 권장.</div>
<div class="issued">발행일 ${issued}</div>
</body></html>`;
    const w = window.open("", "_blank", "width=820,height=1040");
    if (!w) {
      alert("팝업이 차단됐어요. 팝업 허용 후 다시 시도해주세요.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

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
            {(["희연재", "푸르파파", "합산"] as Brand[]).map((b) => (
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
          <div className="flex rounded-lg border border-stone-300 overflow-hidden text-xs">
            {(["월", "분기"] as const).map((pv) => (
              <button
                key={pv}
                onClick={() => setPeriod(pv)}
                className={`px-2.5 py-1 font-medium ${
                  period === pv
                    ? "bg-stone-700 text-white"
                    : "bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {pv}
              </button>
            ))}
          </div>
          <button
            onClick={() => shiftPeriod(-1)}
            className="h-8 w-8 rounded-md border border-stone-300 text-stone-500 hover:bg-stone-100"
          >
            ‹
          </button>
          <span className="font-bold text-stone-800 tabular-nums min-w-[92px] text-center">
            {periodLabel}
          </span>
          <button
            onClick={() => shiftPeriod(1)}
            className="h-8 w-8 rounded-md border border-stone-300 text-stone-500 hover:bg-stone-100"
          >
            ›
          </button>
        </div>
      </div>

      {/* 수익 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        {metric(
          "매출 (회사)",
          won(bizRevenue),
          "bg-emerald-50 border-emerald-100",
          cash > 0 ? `현금 ${won(cash)} 제외 · VAT 별도` : "공급가 · VAT 별도"
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
      {/* 따로 빼둘 것: 내야 할 부가세 · 현금(개인 수익) */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {metric(
          "📌 내야 할 부가세",
          won(vat),
          "bg-sky-50 border-sky-200",
          "수익 아님 · 따로 빼둘 금액"
        )}
        {metric(
          "💵 현금 수익 (개인)",
          won(cash),
          "bg-violet-50 border-violet-200",
          "원가 0 · 대표님 몫 · 이익서 제외"
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
          품목별 · {brand} · {periodLabel}
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

      {/* 합산 정산 표 (합산 탭) — 부가세 한눈에 */}
      {brand === "합산" && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-stone-100 font-semibold text-stone-700 text-sm flex items-center justify-between gap-2">
            <span>🧾 브랜드별 정산 · {periodLabel}</span>
            <button
              onClick={printSettlement}
              className="text-xs font-semibold text-amber-700 border border-amber-200 rounded-md px-2.5 py-1 hover:bg-amber-50 whitespace-nowrap"
            >
              🖨 정산서 출력
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-200 text-xs text-stone-500">
                  <th className="px-3 py-2 text-left">항목</th>
                  <th className="px-2 py-2 text-right">희연재</th>
                  <th className="px-2 py-2 text-right">푸르파파</th>
                  <th className="px-2 py-2 text-right">합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr className="bg-emerald-50/40">
                  <td className="px-3 py-2 font-semibold text-stone-700">
                    회사 매출{" "}
                    <span className="text-[11px] text-stone-400">
                      (공급가 · 현금 제외)
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-medium">
                    {won(hyBiz)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-medium">
                    {won(puBiz)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-bold text-emerald-700">
                    {won(hyBiz + puBiz)}
                  </td>
                </tr>
                {(
                  [
                    ["원두원가", resHY.beanCost, resPU.beanCost],
                    ["포장재", resHY.pkgCost, resPU.pkgCost],
                    ["가공비", resHY.procCost, resPU.procCost],
                    ["고정비", resHY.fix, resPU.fix],
                  ] as [string, number, number][]
                ).map(([label, hy, pu]) => (
                  <tr key={label}>
                    <td className="px-3 py-2 text-stone-600">{label}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-rose-600">
                      -{won(hy)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-rose-600">
                      -{won(pu)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-rose-600">
                      -{won(hy + pu)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-200 bg-stone-50 font-bold text-stone-800">
                  <td className="px-3 py-2">실질이익</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {won(resHY.profit)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {won(resPU.profit)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-emerald-700">
                    {won(resHY.profit + resPU.profit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {/* 따로 빼둘 것 (수익 아님) */}
          <div className="border-t border-stone-100 overflow-x-auto">
            <div className="px-3 pt-2 text-[11px] font-semibold text-stone-500">
              따로 빼둘 것 (수익 아님)
            </div>
            <table className="w-full text-sm border-collapse">
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="px-3 py-2 text-stone-600">
                    📌 내야 할 부가세{" "}
                    <span className="text-[11px] text-stone-400">(10%)</span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{won(hyVat)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{won(puVat)}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold text-sky-700">
                    {won(vatToPay)}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-stone-600">
                    💵 현금 매출{" "}
                    <span className="text-[11px] text-stone-400">
                      (대표님 개인 · 이익서 제외)
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {hyCash ? won(hyCash) : "·"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {puCash ? won(puCash) : "·"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold text-violet-700">
                    {cashPersonal ? won(cashPersonal) : "·"}
                  </td>
                </tr>
                <tr className="text-stone-400 text-xs">
                  <td className="px-3 py-2">참고 · 실제 청구·수령 합계</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {won(hyBilled)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {won(puBilled)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {won(hyBilled + puBilled)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[11px] text-stone-400 leading-relaxed">
            ※ 실질이익 = <b>회사 매출(공급가·현금 제외) − 전체 원가</b>. 부가세(과세분 10%)와
            현금 매출(대표님 개인)은 수익에서 빼서 따로 표시했어요.{" "}
            <b>현금 판매분의 원가는 회사 비용에 그대로 반영</b>됩니다.
          </div>
        </div>
      )}

      {/* 예상 세금 · 세후 이익 (합산 탭 · 참고용) */}
      {brand === "합산" && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-stone-100 font-semibold text-stone-700 text-sm flex items-center gap-2">
            <span>📊 예상 세금 · 세후 이익</span>
            <span className="text-[11px] font-normal text-stone-400">참고용 · {periodLabel}</span>
          </div>
          <div className="p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">과세소득 (실질이익)</span>
              <span className="font-medium tabular-nums">{won(taxBase)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">
                법인세{" "}
                <span className="text-[11px] text-stone-400">(2억↓ 9% · 초과 19%)</span>
              </span>
              <span className="tabular-nums text-rose-600">-{won(corpTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">
                지방소득세{" "}
                <span className="text-[11px] text-stone-400">(법인세의 10%)</span>
              </span>
              <span className="tabular-nums text-rose-600">-{won(localTax)}</span>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 mt-1">
              <span className="font-semibold text-stone-700">세후 이익</span>
              <span
                className={`font-bold tabular-nums ${
                  afterTax >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {won(afterTax)}
              </span>
            </div>
          </div>
          <div className="px-4 pb-3 text-[11px] text-stone-400 leading-relaxed">
            ※ <b>참고용 추정치</b>예요. 이 달 실질이익만으로 계산한 대략값이라,
            실제 세액은 다른 손금·인건비·감가상각·세액공제·중간예납 등으로 달라져요.
            법인세는 <b>사업연도 기준 연 1회 신고</b>(분기 부가세 신고와 별개) — 정확한 신고는 세무사 확인 권장.
          </div>
        </div>
      )}

      {/* 거래처별 주문내역 (희연재 탭) */}
      {brand === "희연재" && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-stone-100 font-semibold text-stone-700 text-sm flex items-center justify-between">
            <span>📋 거래처별 주문내역 · {periodLabel}</span>
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
            ✍️ 수기 주문 · 총금액 입력 · {periodLabel}
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
                    {e.cash && (
                      <span className="mr-1 text-[10px] font-bold text-violet-700 bg-violet-100 rounded px-1 py-0.5 align-middle">
                        현금
                      </span>
                    )}
                    {e.account || "(수기)"}
                  </span>
                  <span className="flex-1 text-xs text-stone-500 truncate">
                    {kgs || "—"}
                  </span>
                  <button
                    onClick={() => setManualCash(e.id, !e.cash).then(refresh)}
                    title="현금 매출 표시 (대표님 개인 수익)"
                    className={`text-xs font-semibold rounded-md px-2 py-1 border whitespace-nowrap ${
                      e.cash
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "bg-white border-stone-300 text-stone-500 hover:border-violet-400"
                    }`}
                  >
                    현금
                  </button>
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
              로스팅에서 수기로 넣은 주문이에요. 총금액(매출)을 입력하면 매출·수익에 반영되고,{" "}
              <b className="text-violet-600">현금</b> 표시하면 대표님 개인 수익으로 빠져요.
            </div>
          </div>
        </div>
      )}

      {/* 푸르파파 납품 입력 (푸르파파 탭에서만) */}
      {brand === "푸르파파" && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
          <div className="px-4 py-2.5 border-b border-stone-100 font-semibold text-stone-700 text-sm">
            ✍️ 푸르파파 납품 입력 · {periodLabel}
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
              <label className="flex items-center gap-1.5 text-sm text-stone-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={puOem}
                  onChange={(e) => setPuOem(e.target.checked)}
                  className="w-4 h-4 accent-sky-600"
                />
                <span className={puOem ? "font-semibold text-sky-700" : ""}>
                  OEM(가공)
                </span>
              </label>
              <button
                onClick={addPu}
                className="h-9 rounded-lg bg-amber-700 text-white text-sm font-semibold px-5 hover:bg-amber-800"
              >
                추가
              </button>
            </div>
            {puAuto > 0 && (
              <div className="text-xs text-stone-500 mb-2">
                {puOem ? (
                  <>
                    <b className="text-sky-700">OEM 가공 위탁</b> · {puTotalKg}kg ×{" "}
                    {won(cfg.oemPrice ?? 0)}(부가세 포함) ={" "}
                    <b className="text-sky-700">
                      {won(Math.round(puTotalKg * (cfg.oemPrice ?? 0)))}
                    </b>{" "}
                    · 공급가 {won(puAuto)}
                    <span className="text-stone-400">
                      {" "}
                      (직접 로스팅 아님 → 가공비 계산에서 제외)
                    </span>
                  </>
                ) : (
                  <>
                    판매단가 자동 매출 공급가 <b>{won(puAuto)}</b> · 부가세{" "}
                    {won(Math.round(puAuto * 0.1))} ·{" "}
                    <b className="text-amber-700">
                      부가세 포함 {won(Math.round(puAuto * 1.1))}
                    </b>
                    <span className="text-stone-400">
                      {" "}
                      (매출칸 비우면 공급가 기준 자동 적용 · 매출 집계는 부가세 포함)
                    </span>
                  </>
                )}
              </div>
            )}

            {monthPu.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {monthPu.map((e) => (
                  <span
                    key={e.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                      e.oem
                        ? "bg-sky-50 border-sky-200 text-sky-800"
                        : "bg-stone-100 border-stone-200 text-stone-700"
                    }`}
                  >
                    {e.oem && <b className="text-sky-700">OEM</b>}
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
                    ["oemPrice", "OEM단가(원/kg·VAT포함)"],
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
