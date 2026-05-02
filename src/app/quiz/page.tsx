"use client";

import { useState } from "react";
import Link from "next/link";
import questionsData from "../../../data/questions.json";
import blendsData from "../../../data/blends.json";
import { getBeenType } from "@/lib/quiz";
import type { QuizQuestion, Blend, BeenType } from "@/types";

const questions = questionsData as QuizQuestion[];
const blends = blendsData as Blend[];

type Stage = "quiz" | "result";

export default function QuizPage() {
  const [stage, setStage] = useState<Stage>("quiz");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<BeenType | null>(null);

  const total = questions.length;
  const current = questions[idx];
  const progress = Math.round(((idx + (selected !== null ? 1 : 0)) / total) * 100);
  const isLast = idx === total - 1;

  function handleNext() {
    if (selected === null) return;
    const newAnswers = [...answers, current.opts[selected].tags];
    if (isLast) {
      const type = getBeenType(newAnswers);
      setResult(type);
      setStage("result");
    } else {
      setAnswers(newAnswers);
      setIdx(idx + 1);
      setSelected(null);
    }
  }

  function handleBack() {
    if (idx === 0) return;
    setIdx(idx - 1);
    setAnswers(answers.slice(0, -1));
    setSelected(null);
  }

  function handleRetry() {
    setStage("quiz");
    setIdx(0);
    setAnswers([]);
    setSelected(null);
    setResult(null);
  }

  // ===== 결과 화면 =====
  if (stage === "result" && result) {
    const blend = blends.find((b) => b.type === result)!;
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-10 px-5">
        <div className="max-w-md mx-auto">
          {/* 배지 */}
          <div className="text-center mb-6">
            <span
              className="inline-block px-4 py-1 rounded-full text-sm font-bold tracking-wider"
              style={{
                backgroundColor: blend.badgeColor,
                color: blend.badgTextColor,
              }}
            >
              {blend.badgeText}
            </span>
          </div>

          {/* 이름 + 태그라인 */}
          <h1 className="text-3xl font-bold text-zinc-900 text-center mb-2">
            {blend.name}
          </h1>
          <p className="text-center text-zinc-600 mb-8">{blend.tagline}</p>

          {/* 원산지 비율 차트 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 mb-4 tracking-wide">
              원산지 비율
            </h3>
            {/* 가로 누적 바 */}
            <div className="flex h-3 rounded-full overflow-hidden mb-4">
              {blend.ratio.map((r, i) => (
                <div
                  key={i}
                  style={{
                    width: `${r.percent}%`,
                    backgroundColor: r.color,
                  }}
                  title={`${r.origin} ${r.percent}%`}
                />
              ))}
            </div>
            {/* 범례 */}
            <ul className="space-y-2">
              {blend.ratio.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="text-zinc-700">{r.origin}</span>
                  </div>
                  <span className="font-semibold text-zinc-900">
                    {r.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 로스팅 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 mb-2 tracking-wide">
              로스팅
            </h3>
            <p className="text-zinc-900 font-medium">{blend.roast}</p>
          </div>

          {/* 플레이버 노트 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 mb-8">
            <h3 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">
              플레이버 노트
            </h3>
            <div className="flex flex-wrap gap-2">
              {blend.flavors.map((f, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Link
              href={`/order?type=${blend.type}`}
              className="block w-full py-4 bg-emerald-700 text-white text-center rounded-2xl font-medium hover:bg-emerald-800 transition shadow-sm"
            >
              이 블렌드 구독하기
            </Link>
            <button
              onClick={handleRetry}
              className="block w-full py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 transition"
            >
              다시 테스트하기
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ===== 설문 화면 =====
  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* 진행 바 */}
      <div className="w-full h-1.5 bg-zinc-100">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-5 py-8 flex flex-col">
        {/* 문항 번호 */}
        <p className="text-sm font-medium text-emerald-700 mb-3">
          Q{idx + 1} / {total}
        </p>

        {/* 질문 */}
        <h2 className="text-2xl font-bold text-zinc-900 mb-2 leading-snug">
          {current.q}
        </h2>
        {current.sub && (
          <p className="text-sm text-zinc-500 mb-8">{current.sub}</p>
        )}
        {!current.sub && <div className="mb-8" />}

        {/* 선택지 */}
        <div className="space-y-3 mb-8">
          {current.opts.map((opt, i) => {
            const isSelected = selected === i;
            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full p-5 text-left rounded-2xl border-2 transition ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <p
                  className={`font-medium ${
                    isSelected ? "text-emerald-900" : "text-zinc-800"
                  }`}
                >
                  {opt.label}
                </p>
                {opt.desc && (
                  <p
                    className={`text-sm mt-1 ${
                      isSelected ? "text-emerald-700" : "text-zinc-500"
                    }`}
                  >
                    {opt.desc}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* 점 인디케이터 */}
        <div className="flex justify-center gap-1.5 mb-6">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === idx
                  ? "w-6 bg-emerald-500"
                  : i < idx
                    ? "w-2 bg-emerald-300"
                    : "w-2 bg-zinc-200"
              }`}
            />
          ))}
        </div>

        {/* 버튼 영역 */}
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
            disabled={selected === null}
            className={`flex-[2] py-4 rounded-2xl font-medium transition shadow-sm ${
              selected === null
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-emerald-700 text-white hover:bg-emerald-800"
            }`}
          >
            {isLast ? "내 원두 보기" : "다음"}
          </button>
        </div>
      </div>
    </main>
  );
}
