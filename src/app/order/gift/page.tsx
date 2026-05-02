"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import packagesData from "../../../../data/packages_gift.json";
import blendsData from "../../../../data/blends_b2c.json";
import { getGiftMessage } from "@/lib/quiz_gift";
import type { GiftPackage, Blend, BeenType } from "@/types";

const packages = packagesData as GiftPackage[];
const blends = blendsData as Blend[];

const PINK = "#D4537E";
const PURPLE = "#7F77DD";
const GRADIENT = `linear-gradient(135deg, ${PINK} 0%, ${PURPLE} 100%)`;

const MAX_MESSAGE_LEN = 150;

function GiftOrderBody() {
  const params = useSearchParams();
  const typeParam = (params.get("type") || "BALANCE") as BeenType;
  const pkgId = params.get("pkg") || "";
  const occasion = params.get("occasion") || "";

  const blend = blends.find((b) => b.type === typeParam) ?? blends[1];
  const pkg = packages.find((p) => p.id === pkgId) ?? packages[0];

  // 보내는 사람
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderEmail, setSenderEmail] = useState("");

  // 받는 사람
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientAddressDetail, setRecipientAddressDetail] = useState("");

  // 손편지
  const [message, setMessage] = useState(() => getGiftMessage(occasion));

  // 배송
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }, []);
  const [deliveryDate, setDeliveryDate] = useState(minDate);
  const [fastDelivery, setFastDelivery] = useState(false);

  const shippingFee = pkg.price >= 30000 ? 0 : 3000;
  const total = pkg.price + shippingFee;

  const isValid =
    senderName.trim() &&
    senderPhone.trim() &&
    recipientName.trim() &&
    recipientPhone.trim() &&
    recipientAddress.trim();

  function handleSubmit() {
    const payload = {
      blend: { type: blend.type, name: blend.name },
      package: { id: pkg.id, name: pkg.name, price: pkg.price },
      occasion,
      sender: { name: senderName, phone: senderPhone, email: senderEmail },
      recipient: {
        name: recipientName,
        phone: recipientPhone,
        address: recipientAddress,
        addressDetail: recipientAddressDetail,
      },
      message,
      deliveryDate,
      fastDelivery,
      shippingFee,
      total,
    };
    console.log("[GIFT ORDER]", payload);
    alert(
      "주문이 접수됐어요. (결제 모듈은 다음 단계에서 연결 예정)\n\n" +
        `총 ${total.toLocaleString()}원`
    );
  }

  return (
    <main
      className="min-h-screen pb-32"
      style={{
        background:
          "linear-gradient(180deg, #FBEAF0 0%, #F2EFFD 30%, #FFFFFF 100%)",
      }}
    >
      <div className="max-w-md mx-auto px-5 py-8">
        {/* 헤더 */}
        <Link
          href="/quiz/gift"
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← 추천 결과로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 mt-3 mb-2">
          선물 주문하기
        </h1>
        <p className="text-sm text-zinc-600 mb-6">
          {blend.name} · {pkg.name}
        </p>

        {/* 보내는 사람 */}
        <Section title="보내는 사람">
          <Field
            label="이름"
            required
            value={senderName}
            onChange={setSenderName}
            placeholder="홍길동"
          />
          <Field
            label="연락처"
            required
            value={senderPhone}
            onChange={(v) => setSenderPhone(v.replace(/[^0-9-]/g, ""))}
            placeholder="010-1234-5678"
            inputMode="tel"
          />
          <Field
            label="이메일"
            value={senderEmail}
            onChange={setSenderEmail}
            placeholder="주문 확인용 (선택)"
            inputMode="email"
          />
        </Section>

        {/* 받는 사람 */}
        <Section title="받는 사람">
          <Field
            label="이름"
            required
            value={recipientName}
            onChange={setRecipientName}
            placeholder="받는 분 성함"
          />
          <Field
            label="연락처"
            required
            value={recipientPhone}
            onChange={(v) => setRecipientPhone(v.replace(/[^0-9-]/g, ""))}
            placeholder="010-1234-5678"
            inputMode="tel"
          />
          <Field
            label="배송지 (도로명)"
            required
            value={recipientAddress}
            onChange={setRecipientAddress}
            placeholder="서울시 강남구 ..."
          />
          <Field
            label="상세 주소"
            value={recipientAddressDetail}
            onChange={setRecipientAddressDetail}
            placeholder="동/호수, 입력 안내 등"
          />
        </Section>

        {/* 손편지 카드 */}
        <Section title="손편지 카드 메시지">
          <textarea
            value={message}
            onChange={(e) => {
              const v = e.target.value.slice(0, MAX_MESSAGE_LEN);
              setMessage(v);
            }}
            rows={5}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none resize-none text-sm leading-relaxed"
            style={{ borderColor: message ? PINK : undefined }}
            placeholder="받는 분께 전할 메시지"
          />
          <div className="text-right text-xs text-zinc-500 mt-1">
            {message.length} / {MAX_MESSAGE_LEN}
          </div>
        </Section>

        {/* 배송 */}
        <Section title="배송 옵션">
          <label className="block text-xs font-medium text-zinc-600 mb-1">
            희망 배송일
          </label>
          <input
            type="date"
            min={minDate}
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none mb-3"
          />
          <label className="flex items-start gap-2 p-3 rounded-xl border border-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              checked={fastDelivery}
              onChange={(e) => setFastDelivery(e.target.checked)}
              className="mt-0.5"
              style={{ accentColor: PINK }}
            />
            <div>
              <p className="text-sm font-medium text-zinc-900">빠른 배송</p>
              <p className="text-xs text-zinc-500">
                당일 로스팅 → 익일 배송 (+3,000원)
              </p>
            </div>
          </label>
        </Section>

        {/* 주문 요약 */}
        <Section title="주문 요약">
          <ul className="space-y-2 text-sm mb-4">
            <li className="flex justify-between">
              <span className="text-zinc-500">패키지</span>
              <span className="text-zinc-900 font-medium">{pkg.name}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-zinc-500">패키지 가격</span>
              <span className="text-zinc-900">
                {pkg.price.toLocaleString()}원
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-zinc-500">배송비</span>
              <span className="text-zinc-900">
                {shippingFee === 0
                  ? "무료 (3만원 이상)"
                  : `${shippingFee.toLocaleString()}원`}
              </span>
            </li>
            {fastDelivery && (
              <li className="flex justify-between">
                <span className="text-zinc-500">빠른 배송</span>
                <span className="text-zinc-900">+3,000원</span>
              </li>
            )}
          </ul>
          <div className="border-t border-zinc-100 pt-3 flex justify-between items-baseline">
            <span className="text-zinc-700 text-sm">총 결제 금액</span>
            <span className="text-2xl font-bold text-zinc-900">
              {(total + (fastDelivery ? 3000 : 0)).toLocaleString()}원
            </span>
          </div>
        </Section>
      </div>

      {/* 하단 고정 CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-5 py-4"
        style={{ boxShadow: "0 -2px 10px rgba(0,0,0,0.04)" }}
      >
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full py-4 text-white rounded-2xl font-medium transition shadow-sm"
            style={
              !isValid
                ? {
                    backgroundColor: "#E4E4E7",
                    color: "#A1A1AA",
                    cursor: "not-allowed",
                  }
                : { backgroundImage: GRADIENT }
            }
          >
            {isValid
              ? `주문 확정하기 — ${(total + (fastDelivery ? 3000 : 0)).toLocaleString()}원`
              : "필수 정보를 입력해주세요"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 mb-4">
      <h3 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: "text" | "tel" | "email" | "numeric";
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-zinc-600 mb-1">
        {label}
        {required && <span style={{ color: PINK }}> *</span>}
      </label>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-zinc-900 text-sm focus:outline-none"
        style={{ borderColor: value ? PINK : undefined }}
      />
    </div>
  );
}

export default function GiftOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-zinc-500">로딩 중...</p>
        </main>
      }
    >
      <GiftOrderBody />
    </Suspense>
  );
}
