"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import questionsData from "../../../../data/questions_gift.json";
import packagesData from "../../../../data/packages_gift.json";
import blendsData from "../../../../data/blends_b2c.json";
import { getGiftBlend, getGiftMessage, blendKeyToType } from "@/lib/quiz_gift";
import type {
  GiftQuestion,
  GiftPackage,
  GiftAnswers,
  Blend,
  GiftBudget,
} from "@/types";

const questions = questionsData as GiftQuestion[];
const packages = packagesData as GiftPackage[];
const blends = blendsData as Blend[];

const PINK = "#D4537E";
const PURPLE = "#7F77DD";
const PINK_LIGHT = "#FBEAF0";
const PINK_TEXT = "#72243E";
const GRADIENT = `linear-gradient(135deg, ${PINK} 0%, ${PURPLE} 100%)`;

export default function GiftQuizPage() {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<GiftAnswers>({});
  const [showResult, setShowResult] = useState(false);

  const total = questions.length;
  const current = questions[idx];

  // 패키지 단계: 예산에 맞는 패키지만 필터
  const visiblePackages = useMemo(() => {
    if (current?.type !== "package") return [];
    const budget = answers.budget as GiftBudget | undefined;
    return packages.filter((p) => p.budget === budget);
  }, [current, answers.budget]);

  const currentValue = current ? answers[current.key as keyof GiftAnswers] : undefined;
  const progress = Math.round(
    ((idx + (currentValue ? 1 : 0)) / total) * 100
  );
  const isLast = idx === total - 1;

  function setAnswer(key: string, val: string) {
    setAnswers((a) => ({ ...a, [key]: val }));
  }

  function handleNext() {
    if (!currentValue) return;
    if (isLast) {
      setShowResult(true);
    } else {
      setIdx(idx + 1);
    }
  }

  function handleBack() {
    if (idx > 0) setIdx(idx - 1);
  }

  function handleRetry() {
    setIdx(0);
    setAnswers({});
    setShowResult(false);
  }

  if (showResult) {
    return <GiftResult answers={answers} onRetry={handleRetry} />;
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* 진행 바 (그라디언트) */}
      <div className="w-full h-1.5 bg-zinc-100">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundImage: GRADIENT }}
        />
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-5 py-8 flex flex-col">
        <p className="text-sm font-medium mb-3" style={{ color: PINK }}>
          Q{idx + 1} / {total}
        </p>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2 leading-snug">
          {current.q}
        </h2>
        {current.sub && (
          <p className="text-sm text-zinc-500 mb-8">{current.sub}</p>
        )}

        {/* 옵션 렌더 */}
        <div className="mb-8">
          {current.type === "grid" && (
            <div className="grid grid-cols-2 gap-3">
              {current.opts.map((opt) => {
                const v = opt.val ?? opt.label;
                const active = currentValue === v;
                return (
                  <button
                    key={v}
                    onClick={() => setAnswer(current.key, v)}
                    className="p-4 text-left rounded-2xl border-2 transition"
                    style={
                      active
                        ? { borderColor: PINK, backgroundColor: PINK_LIGHT }
                        : { borderColor: "#E4E4E7", backgroundColor: "#FFFFFF" }
                    }
                  >
                    <p
                      className="font-medium text-sm"
                      style={{ color: active ? PINK_TEXT : "#27272A" }}
                    >
                      {opt.label}
                    </p>
                    {opt.desc && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: active ? PINK_TEXT : "#71717A" }}
                      >
                        {opt.desc}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "list" && (
            <div className="space-y-3">
              {current.opts.map((opt) => {
                const v = opt.val ?? opt.label;
                const active = currentValue === v;
                return (
                  <button
                    key={v}
                    onClick={() => setAnswer(current.key, v)}
                    className="w-full p-5 text-left rounded-2xl border-2 transition"
                    style={
                      active
                        ? { borderColor: PINK, backgroundColor: PINK_LIGHT }
                        : { borderColor: "#E4E4E7", backgroundColor: "#FFFFFF" }
                    }
                  >
                    <p
                      className="font-medium"
                      style={{ color: active ? PINK_TEXT : "#27272A" }}
                    >
                      {opt.label}
                    </p>
                    {opt.desc && (
                      <p
                        className="text-sm mt-1"
                        style={{ color: active ? PINK_TEXT : "#71717A" }}
                      >
                        {opt.desc}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "chip" && (
            <div className="grid grid-cols-2 gap-2">
              {current.opts.map((opt) => {
                const v = opt.val ?? opt.label;
                const active = currentValue === v;
                return (
                  <button
                    key={v}
                    onClick={() => setAnswer(current.key, v)}
                    className="py-3 px-4 rounded-xl text-sm font-medium border-2 transition"
                    style={
                      active
                        ? {
                            borderColor: PINK,
                            backgroundColor: PINK_LIGHT,
                            color: PINK_TEXT,
                          }
                        : {
                            borderColor: "#E4E4E7",
                            backgroundColor: "#FFFFFF",
                            color: "#3F3F46",
                          }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {current.type === "package" && (
            <div className="space-y-3">
              {visiblePackages.map((pkg) => {
                const active = currentValue === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setAnswer(current.key, pkg.id)}
                    className="w-full p-5 text-left rounded-2xl border-2 transition"
                    style={
                      active
                        ? { borderColor: PINK, backgroundColor: PINK_LIGHT }
                        : { borderColor: "#E4E4E7", backgroundColor: "#FFFFFF" }
                    }
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p
                          className="font-bold"
                          style={{ color: active ? PINK_TEXT : "#27272A" }}
                        >
                          {pkg.name}
                        </p>
                        {pkg.popular && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundImage: GRADIENT }}
                          >
                            BEST
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-zinc-900">
                        ₩{pkg.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.items.map((item, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-full"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 점 인디케이터 */}
        <div className="flex justify-center gap-1.5 mb-6">
          {questions.map((q, i) => (
            <span
              key={i}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === idx ? "24px" : "8px",
                backgroundImage:
                  i === idx
                    ? GRADIENT
                    : answers[q.key as keyof GiftAnswers]
                      ? "none"
                      : "none",
                backgroundColor:
                  i === idx
                    ? "transparent"
                    : answers[q.key as keyof GiftAnswers]
                      ? PINK_LIGHT
                      : "#E4E4E7",
              }}
            />
          ))}
        </div>

        {/* 버튼 */}
        <div className="mt-auto flex gap-3">
          {idx > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 transition"
            >
              이전
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!currentValue}
            className="flex-[2] py-4 rounded-2xl font-medium text-white transition shadow-sm"
            style={
              !currentValue
                ? {
                    backgroundColor: "#E4E4E7",
                    color: "#A1A1AA",
                    cursor: "not-allowed",
                  }
                : { backgroundImage: GRADIENT }
            }
          >
            {isLast ? "선물 추천 받기" : "다음"}
          </button>
        </div>
      </div>
    </main>
  );
}

function GiftResult({
  answers,
  onRetry,
}: {
  answers: GiftAnswers;
  onRetry: () => void;
}) {
  const router = useRouter();
  const blendKey = getGiftBlend(answers);
  const blendType = blendKeyToType(blendKey);
  const blend = blends.find((b) => b.type === blendType)!;
  const pkg = packages.find((p) => p.id === answers.package);
  const message = getGiftMessage(answers.occasion);
  const [quizResultId, setQuizResultId] = useState<string | null>(null);

  // 백그라운드 저장
  useEffect(() => {
    fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathType: "gift",
        answers,
        resultType: blendType,
        blendName: blend.name,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.quizResultId && setQuizResultId(d.quizResultId))
      .catch((e) => console.warn("[quiz save]", e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleOrder() {
    const params = new URLSearchParams({
      type: blendType,
      pkg: answers.package ?? "",
      occasion: answers.occasion ?? "",
      ...(quizResultId ? { qid: quizResultId } : {}),
    });
    router.push(`/order/gift?${params}`);
  }

  return (
    <main
      className="min-h-screen py-10 px-5"
      style={{
        background:
          "linear-gradient(180deg, #FBEAF0 0%, #F2EFFD 50%, #FFFFFF 100%)",
      }}
    >
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium mb-2" style={{ color: PINK }}>
            받는 사람에게 드리는 선물
          </p>
          <h1 className="text-3xl font-bold text-zinc-900 leading-tight">
            취향 저격 완료
          </h1>
        </div>

        {/* 블렌드 카드 */}
        <Section title="추천 블렌드">
          <div className="text-center mb-4">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider"
              style={{
                backgroundColor: blend.badgeColor,
                color: blend.badgeTextColor,
              }}
            >
              {blend.badgeText}
            </span>
          </div>
          <h3 className="text-xl font-bold text-zinc-900 text-center mb-1">
            {blend.name}
          </h3>
          <p className="text-sm text-zinc-600 text-center mb-4">
            {blend.tagline}
          </p>
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            {blend.ratio.map((r, i) => (
              <div
                key={i}
                style={{
                  width: `${r.percent}%`,
                  backgroundColor: r.color,
                }}
              />
            ))}
          </div>
          <ul className="space-y-1.5 mb-4">
            {blend.ratio.map((r, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-zinc-700">{r.origin}</span>
                <span className="font-semibold text-zinc-900">{r.percent}%</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            {blend.flavors.map((f, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-full"
              >
                {f}
              </span>
            ))}
          </div>
        </Section>

        {/* 패키지 카드 (핑크 강조) */}
        {pkg && (
          <div
            className="rounded-2xl p-6 mb-4 border-2"
            style={{ borderColor: PINK, backgroundColor: "#FFFFFF" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-900">{pkg.name}</h3>
                {pkg.popular && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundImage: GRADIENT }}
                  >
                    BEST
                  </span>
                )}
              </div>
              <p className="font-bold text-zinc-900">
                ₩{pkg.price.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pkg.items.map((item, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-full"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 손편지 미리보기 */}
        <div
          className="rounded-2xl p-6 mb-8 bg-white border-l-4"
          style={{ borderLeftColor: PINK }}
        >
          <p className="text-xs font-semibold text-zinc-500 mb-2 tracking-wide">
            손편지 카드 미리보기
          </p>
          <p className="text-sm text-zinc-700 italic leading-relaxed">
            {message}
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={handleOrder}
            className="w-full py-4 text-white text-center rounded-2xl font-medium shadow-sm transition hover:opacity-90"
            style={{ backgroundImage: GRADIENT }}
          >
            지금 선물 주문하기
          </button>
          <button
            onClick={onRetry}
            className="w-full py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 transition"
          >
            다시 고르기
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 mb-4">
      <h3 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}
