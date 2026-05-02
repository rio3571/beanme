"use client";

import { useState } from "react";
import type { QuizQuestion, QuizOption } from "@/types";

export interface QuizTheme {
  primary: string;       // hex (예: "#1D9E75")
  primaryDark: string;   // hex (호버용)
  selectedBg: string;    // hex (선택 시 배경, 연한 톤)
  selectedText: string;  // hex (선택 시 텍스트)
  sectionText: string;   // hex (섹션 라벨)
}

interface Props {
  questions: QuizQuestion[];
  theme: QuizTheme;
  finishLabel: string; // "내 원두 보기" 등
  onComplete: (selected: QuizOption[]) => void;
}

/**
 * B2C/Pro/Office 공통 설문 진행 컴포넌트.
 * - 진행 바 / 섹션 라벨(B2B) / 점 인디케이터
 * - 옵션 타입(list/grid/chip)에 따라 레이아웃 변경
 * - 마지막 문항 버튼 텍스트는 finishLabel
 */
export function QuizRunner({ questions, theme, finishLabel, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [selectedIdxs, setSelectedIdxs] = useState<(number | null)[]>(
    () => Array(questions.length).fill(null)
  );

  if (!questions || questions.length === 0) return null;

  const total = questions.length;
  const current = questions[idx];
  const selected = selectedIdxs[idx];
  const progress = Math.round(((idx + (selected !== null ? 1 : 0)) / total) * 100);
  const isLast = idx === total - 1;
  const optionType = current.type ?? "list";

  function handleSelect(i: number) {
    const next = [...selectedIdxs];
    next[idx] = i;
    setSelectedIdxs(next);
  }

  function handleNext() {
    if (selected === null) return;
    if (isLast) {
      const final: QuizOption[] = selectedIdxs.map((si, qi) => questions[qi].opts[si!]);
      onComplete(final);
    } else {
      setIdx(idx + 1);
    }
  }

  function handleBack() {
    if (idx > 0) setIdx(idx - 1);
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* 진행 바 */}
      <div className="w-full h-1.5 bg-zinc-100">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: theme.primary }}
        />
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-5 py-8 flex flex-col">
        {/* 상단: 문항 번호 + 섹션 라벨 */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: theme.primary }}>
            Q{idx + 1} / {total}
          </p>
          {current.section && (
            <p
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{ backgroundColor: theme.selectedBg, color: theme.sectionText }}
            >
              {current.section}
            </p>
          )}
        </div>

        {/* 질문 + 부제 */}
        <h2 className="text-2xl font-bold text-zinc-900 mb-2 leading-snug">
          {current.q}
        </h2>
        {current.sub ? (
          <p className="text-sm text-zinc-500 mb-8">{current.sub}</p>
        ) : (
          <div className="mb-8" />
        )}

        {/* 선택지 */}
        {optionType === "grid" ? (
          <div className="grid grid-cols-2 gap-3 mb-8">
            {current.opts.map((opt, i) => (
              <OptionCard
                key={i}
                opt={opt}
                active={selected === i}
                onClick={() => handleSelect(i)}
                theme={theme}
                compact
              />
            ))}
          </div>
        ) : optionType === "chip" ? (
          <div className="grid grid-cols-2 gap-2 mb-8">
            {current.opts.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className="py-3 px-4 rounded-xl text-sm font-medium border-2 transition"
                style={
                  selected === i
                    ? {
                        borderColor: theme.primary,
                        backgroundColor: theme.selectedBg,
                        color: theme.selectedText,
                      }
                    : { borderColor: "#E4E4E7", backgroundColor: "#FFFFFF", color: "#3F3F46" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {current.opts.map((opt, i) => (
              <OptionCard
                key={i}
                opt={opt}
                active={selected === i}
                onClick={() => handleSelect(i)}
                theme={theme}
              />
            ))}
          </div>
        )}

        {/* 점 인디케이터 */}
        <div className="flex justify-center gap-1.5 mb-6">
          {questions.map((_, i) => (
            <span
              key={i}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === idx ? "24px" : "8px",
                backgroundColor:
                  i === idx
                    ? theme.primary
                    : selectedIdxs[i] !== null
                      ? theme.selectedBg
                      : "#E4E4E7",
              }}
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
            className="flex-[2] py-4 rounded-2xl font-medium transition shadow-sm text-white"
            style={
              selected === null
                ? { backgroundColor: "#E4E4E7", color: "#A1A1AA", cursor: "not-allowed" }
                : { backgroundColor: theme.primary }
            }
          >
            {isLast ? finishLabel : "다음"}
          </button>
        </div>
      </div>
    </main>
  );
}

function OptionCard({
  opt,
  active,
  onClick,
  theme,
  compact,
}: {
  opt: QuizOption;
  active: boolean;
  onClick: () => void;
  theme: QuizTheme;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border-2 transition ${compact ? "p-4" : "p-5"}`}
      style={
        active
          ? {
              borderColor: theme.primary,
              backgroundColor: theme.selectedBg,
            }
          : {
              borderColor: "#E4E4E7",
              backgroundColor: "#FFFFFF",
            }
      }
    >
      <p
        className={`font-medium ${compact ? "text-sm" : ""}`}
        style={{ color: active ? theme.selectedText : "#27272A" }}
      >
        {opt.label}
      </p>
      {opt.desc && (
        <p
          className="text-xs mt-1"
          style={{ color: active ? theme.selectedText : "#71717A" }}
        >
          {opt.desc}
        </p>
      )}
    </button>
  );
}
