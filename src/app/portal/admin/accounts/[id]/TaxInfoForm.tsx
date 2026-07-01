"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAccountTax } from "../../actions";
import { VAT_LABEL, type VatMode } from "@/lib/vat";

type Vals = {
  businessNo: string;
  address: string;
  ceo: string;
  bizType: string;
  bizItem: string;
  email: string;
};

export default function TaxInfoForm({
  accountId,
  companyName,
  vat,
  initial,
}: {
  accountId: string;
  companyName: string;
  vat: VatMode;
  initial: Vals;
}) {
  const router = useRouter();
  const [v, setV] = useState<Vals>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof Vals) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  // 세금계산서 발행 필수: 사업자번호·대표자명·이메일 (상호는 거래처 이름 사용)
  const missing = [
    !v.businessNo.trim() && "사업자번호",
    !v.ceo.trim() && "대표자명",
    !v.email.trim() && "세금계산서 이메일",
  ].filter(Boolean) as string[];
  const ready = missing.length === 0;

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await updateAccountTax(accountId, v);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const field = (
    label: string,
    key: keyof Vals,
    placeholder = "",
    required = false
  ) => (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      <input
        value={v[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="w-full h-9 rounded-lg border border-stone-300 px-2.5 text-sm text-stone-800 outline-none focus:border-amber-600"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-stone-800">🧾 세금계산서 정보</div>
        {saving ? (
          <span className="text-xs text-stone-400">저장 중…</span>
        ) : saved ? (
          <span className="text-xs text-green-600 font-medium">저장됐어요 ✅</span>
        ) : null}
      </div>

      {vat === "cash" ? (
        <p className="text-xs text-rose-600 mb-3">
          이 거래처는 <b>{VAT_LABEL[vat]}</b> — 세금계산서 대상이 아니에요. (필요 시에만 입력)
        </p>
      ) : (
        <p className="text-xs text-stone-500 mb-3">
          발행에 필요한 공급받는자 정보예요. 상호는 <b>{companyName}</b>(거래처 이름)로 들어가요.
        </p>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {field("사업자번호", "businessNo", "000-00-00000", true)}
        {field("대표자명", "ceo", "홍길동", true)}
        {field("세금계산서 이메일", "email", "tax@example.com", true)}
        {field("업태", "bizType", "예: 도소매")}
        {field("종목", "bizItem", "예: 커피")}
        {field("주소", "address", "사업장 주소")}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span
          className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
            ready
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {ready ? "발행 준비 완료 ✅" : `부족: ${missing.join(", ")}`}
        </span>
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto rounded-xl bg-amber-700 text-white font-semibold px-5 py-2 text-sm hover:bg-amber-800 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}
