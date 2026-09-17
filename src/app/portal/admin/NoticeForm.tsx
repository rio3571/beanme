"use client";

import { useState, useTransition } from "react";
import { saveNotice } from "./actions";
import {
  TONE_LABEL,
  TONE_STYLE,
  type Notice,
  type NoticeTone,
} from "@/lib/notice";

const PRESETS: { label: string; title: string; body: string; tone: NoticeTone }[] =
  [
    {
      label: "추석 휴무",
      tone: "holiday",
      title: "추석 연휴 배송 안내",
      body:
        "연휴 기간에는 로스팅과 배송이 쉽니다.\n" +
        "연휴 전 물량이 필요하시면 미리 주문 부탁드립니다.",
    },
    {
      label: "설 휴무",
      tone: "holiday",
      title: "설 연휴 배송 안내",
      body:
        "연휴 기간에는 로스팅과 배송이 쉽니다.\n" +
        "연휴 전 물량이 필요하시면 미리 주문 부탁드립니다.",
    },
    {
      label: "주문 마감 변경",
      tone: "warn",
      title: "이번 주 주문 마감 시간이 다릅니다",
      body: "평소보다 마감이 빠릅니다. 주문 시간을 확인해 주세요.",
    },
  ];

export default function NoticeForm({ initial }: { initial: Notice }) {
  const [on, setOn] = useState(initial.on);
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [tone, setTone] = useState<NoticeTone>(initial.tone);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const s = TONE_STYLE[tone];

  function submit(nextOn?: boolean) {
    const useOn = nextOn ?? on;
    setMsg(null);
    startTransition(async () => {
      const res = await saveNotice({ on: useOn, title, body, tone });
      if (res.ok) {
        setOn(useOn);
        setMsg(useOn ? "공지를 띄웠습니다." : "공지를 내렸습니다.");
      } else {
        setMsg(res.error ?? "저장 실패");
      }
    });
  }

  function applyPreset(p: (typeof PRESETS)[number]) {
    setTitle(p.title);
    setBody(p.body);
    setTone(p.tone);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="font-bold text-stone-800">거래처 공지</span>
          {on ? (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-600 text-white">
              띄우는 중
            </span>
          ) : (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-500">
              꺼짐
            </span>
          )}
        </span>
        <span className="text-stone-400 text-sm">{open ? "닫기" : "열기"}</span>
      </button>

      {on && !open && title.trim() && (
        <div className="px-4 pb-3 -mt-1 text-sm text-stone-500 truncate">
          {title}
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 border-t border-stone-100 pt-4">
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-xs text-stone-400 self-center mr-1">
              빠른 작성
            </span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-xs px-2.5 py-1 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="block mb-3">
            <span className="text-xs font-medium text-stone-500">제목</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="추석 연휴 배송 안내"
              className="w-full mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-800"
            />
          </label>

          <label className="block mb-3">
            <span className="text-xs font-medium text-stone-500">내용</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="연휴 기간에는 로스팅과 배송이 쉽니다."
              className="w-full mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-800"
            />
          </label>

          <label className="block mb-4">
            <span className="text-xs font-medium text-stone-500">색상</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as NoticeTone)}
              className="w-full mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-800"
            >
              {(Object.keys(TONE_LABEL) as NoticeTone[]).map((t) => (
                <option key={t} value={t}>
                  {TONE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <div className="text-xs text-stone-400 mb-1.5">
            거래처에게 이렇게 보입니다
          </div>
          <div className={`rounded-xl border-2 ${s.box} px-4 py-3.5 mb-4`}>
            <div className="flex items-start gap-2.5">
              <span
                className={`${s.badge} text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5`}
              >
                {s.label}
              </span>
              <div className="min-w-0">
                {title.trim() ? (
                  <div className={`font-bold ${s.title} leading-snug`}>
                    {title}
                  </div>
                ) : (
                  <div className="font-bold text-stone-300">제목</div>
                )}
                {body.trim() && (
                  <div
                    className={`text-sm ${s.body} mt-1 leading-relaxed whitespace-pre-line`}
                  >
                    {body}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={pending || (!title.trim() && !body.trim())}
              className="rounded-lg bg-stone-900 text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-40"
            >
              {pending ? "저장 중..." : on ? "수정해서 다시 띄우기" : "공지 띄우기"}
            </button>
            {on && (
              <button
                type="button"
                onClick={() => submit(false)}
                disabled={pending}
                className="rounded-lg border border-stone-300 text-stone-600 text-sm font-semibold px-4 py-2.5 disabled:opacity-40"
              >
                내리기
              </button>
            )}
            {msg && <span className="text-sm text-stone-500">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
