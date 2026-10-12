"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage, type MsgRow } from "@/app/portal/messages";

/** 'YYYY-MM-DD' (KST) */
function dayKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/** '오후 3:20' */
function clock(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ap = h < 12 ? "오전" : "오후";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${ap} ${hh}:${String(m).padStart(2, "0")}`;
}

/** '10월 12일 일요일' · 오늘/어제는 그렇게 */
function dayLabel(key: string): string {
  const today = dayKey(new Date().toISOString());
  const y = new Date(new Date(today).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  if (key === today) return "오늘";
  if (key === y) return "어제";
  const [, mm, dd] = key.split("-").map(Number);
  const w = ["일", "월", "화", "수", "목", "금", "토"][
    new Date(key + "T00:00:00Z").getUTCDay()
  ];
  return `${mm}월 ${dd}일 ${w}요일`;
}

export default function Chat({
  accountId,
  role,
  initial,
}: {
  accountId: string;
  role: "admin" | "buyer";
  initial: MsgRow[];
}) {
  const [list, setList] = useState<MsgRow[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  // 입력 줄 수에 맞춰 높이 조절 (긴 문의를 한 줄 칸에 쓰기 불편해서)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [text]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await sendMessage(accountId, body);
    setSending(false);
    if (res.ok && res.message) {
      setList((l) => [...l, res.message!]);
      setText("");
    }
  }

  return (
    <div className="max-w-2xl mx-auto" style={{ paddingBottom: 96 }}>
      {list.length === 0 && (
        <p className="text-center text-stone-400 text-sm py-16">
          첫 메시지를 남겨보세요.
          <br />
          대화처럼 주고받을 수 있어요.
        </p>
      )}

      <div className="space-y-0.5">
        {list.map((m, i) => {
          const prev = list[i - 1];
          const next = list[i + 1];
          const isMine = m.sender === role;

          // 날짜가 바뀌면 구분선
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);

          // 같은 사람이 같은 분에 연달아 보낸 건 묶는다 (시간은 마지막에 한 번만)
          const sameAsNext =
            next &&
            next.sender === m.sender &&
            dayKey(next.created_at) === dayKey(m.created_at) &&
            clock(next.created_at) === clock(m.created_at);
          const sameAsPrev =
            prev &&
            prev.sender === m.sender &&
            dayKey(prev.created_at) === dayKey(m.created_at);

          return (
            <div key={m.id}>
              {newDay && (
                <div className="flex items-center gap-3 py-4">
                  <div className="h-px flex-1 bg-stone-200" />
                  <span className="text-[11px] font-semibold text-stone-400">
                    {dayLabel(dayKey(m.created_at))}
                  </span>
                  <div className="h-px flex-1 bg-stone-200" />
                </div>
              )}

              {!sameAsPrev && (
                <div
                  className={`text-[11px] font-semibold text-stone-400 mb-1 ${
                    isMine ? "text-right pr-1" : "pl-1"
                  }`}
                >
                  {m.sender === "admin" ? "희연재" : "거래처"}
                </div>
              )}

              <div
                className={`flex items-end gap-1.5 ${
                  isMine ? "justify-end" : "justify-start"
                } ${sameAsPrev ? "mt-0.5" : ""}`}
              >
                {isMine && !sameAsNext && (
                  <span className="text-[10px] text-stone-400 pb-0.5 shrink-0">
                    {clock(m.created_at)}
                  </span>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                    isMine
                      ? "bg-amber-700 text-white rounded-2xl rounded-br-md"
                      : "bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-bl-md"
                  }`}
                >
                  {m.body}
                </div>
                {!isMine && !sameAsNext && (
                  <span className="text-[10px] text-stone-400 pb-0.5 shrink-0">
                    {clock(m.created_at)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 pt-2.5"
        style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <textarea
            ref={taRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="메시지 입력…  (줄바꿈은 Shift+Enter)"
            className="flex-1 resize-none rounded-2xl border border-stone-300 px-4 py-2.5 text-base text-stone-800 outline-none focus:border-amber-600 leading-relaxed"
            style={{ maxHeight: 140 }}
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="rounded-2xl bg-amber-700 text-white font-bold px-5 py-2.5 shrink-0 disabled:opacity-40"
            style={{ minHeight: 44 }}
          >
            {sending ? "…" : "전송"}
          </button>
        </div>
      </div>
    </div>
  );
}
