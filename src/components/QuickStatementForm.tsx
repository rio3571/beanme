"use client";

import { useMemo, useState } from "react";
import StatementView, { type StmtRow } from "@/components/StatementView";
import { VAT_MODES, VAT_LABEL, DEFAULT_VAT, type VatMode } from "@/lib/vat";

type Row = {
  id: string;
  date: string;
  name: string;
  qty: string;
  unitPrice: string;
};

function todayISO() {
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return k.toISOString().slice(0, 10);
}

function defaultPeriodLabel() {
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월`;
}

function newRow(): Row {
  return {
    id: Math.random().toString(36).slice(2),
    date: todayISO(),
    name: "",
    qty: "1",
    unitPrice: "",
  };
}

export default function QuickStatementForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessNo, setBusinessNo] = useState("");
  const [address, setAddress] = useState("");
  const [bank, setBank] = useState("");
  const [periodLabel, setPeriodLabel] = useState(defaultPeriodLabel());
  const [vatMode, setVatMode] = useState<VatMode>(DEFAULT_VAT);
  const [rows, setRows] = useState<Row[]>([newRow()]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }
  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  const stmtRows: StmtRow[] = useMemo(
    () =>
      rows
        .filter((r) => r.name.trim() || Number(r.unitPrice) > 0)
        .map((r) => {
          const qty = Number(r.qty) || 0;
          const unitPrice = Number(r.unitPrice) || 0;
          return {
            date: r.date || todayISO(),
            name: r.name.trim() || "-",
            unit: "",
            qty,
            unitPrice,
            amount: qty * unitPrice,
          };
        }),
    [rows]
  );

  const total = useMemo(
    () => stmtRows.reduce((sum, r) => sum + r.amount, 0),
    [stmtRows]
  );

  const monthYm = useMemo(() => {
    const first = rows[0]?.date || todayISO();
    return first.slice(0, 7);
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
        <div className="text-xs font-bold text-amber-700 mb-3">거래처 정보 (수기 입력)</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="거래처명 *"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="담당자 (선택)"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="연락처 (선택)"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            value={businessNo}
            onChange={(e) => setBusinessNo(e.target.value)}
            placeholder="사업자번호 (선택)"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="주소 (선택)"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="입금계좌 (선택, 명세서에 표시됨)"
            rows={2}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs text-stone-500 block mb-1">기간 표시</label>
            <input
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="예: 2026년 7월"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500 block mb-1">부가세 모드</label>
            <select
              value={vatMode}
              onChange={(e) => setVatMode(e.target.value as VatMode)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
            >
              {VAT_MODES.map((m) => (
                <option key={m} value={m}>
                  {VAT_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5">
        <div className="text-xs font-bold text-amber-700 mb-3">품목</div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap gap-2 items-center bg-stone-50 border border-stone-200 rounded-lg p-2">
              <input
                type="date"
                value={r.date}
                onChange={(e) => updateRow(r.id, { date: e.target.value })}
                className="rounded-md border border-stone-300 px-2 py-1.5 text-sm w-[140px]"
              />
              <input
                value={r.name}
                onChange={(e) => updateRow(r.id, { name: e.target.value })}
                placeholder="품목명"
                className="rounded-md border border-stone-300 px-2 py-1.5 text-sm flex-1 min-w-[120px]"
              />
              <input
                type="number"
                value={r.qty}
                onChange={(e) => updateRow(r.id, { qty: e.target.value })}
                placeholder="수량"
                className="rounded-md border border-stone-300 px-2 py-1.5 text-sm w-[80px]"
              />
              <input
                type="number"
                value={r.unitPrice}
                onChange={(e) => updateRow(r.id, { unitPrice: e.target.value })}
                placeholder="단가"
                className="rounded-md border border-stone-300 px-2 py-1.5 text-sm w-[110px]"
              />
              <span className="text-sm text-stone-500 w-[110px] text-right">
                {((Number(r.qty) || 0) * (Number(r.unitPrice) || 0)).toLocaleString("ko-KR")}원
              </span>
              <button
                onClick={() => removeRow(r.id)}
                disabled={rows.length === 1}
                className="text-stone-400 hover:text-red-600 disabled:opacity-30 text-sm px-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addRow}
          className="mt-3 rounded-lg border border-dashed border-stone-300 text-stone-500 hover:text-stone-700 hover:border-stone-400 text-sm px-4 py-2"
        >
          + 품목 추가
        </button>
      </div>

      <StatementView
        buyer={
          companyName.trim()
            ? {
                company_name: companyName.trim(),
                contact_name: contactName.trim() || null,
                phone: phone.trim() || null,
                business_no: businessNo.trim() || null,
                address: address.trim() || null,
                bank: bank.trim() || null,
              }
            : null
        }
        monthYm={monthYm}
        rows={stmtRows}
        total={total}
        vatMode={vatMode}
        periodLabel={periodLabel}
      />
    </div>
  );
}
