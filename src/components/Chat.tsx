"use client";

import { useState, useRef, useEffect } from "react";
import { sendMessage, type MsgRow } from "@/app/portal/messages";
import { kst } from "@/lib/format";

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [list.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const res = await sendMessage(accountId, body);
    setSending(false);
    if (res.ok && res.message) {
      setList((l) => [...l, res.message!]);
      setText("");
    }
  }

  return (
    <div className="pb-20 max-w-2xl mx-auto">
      <div className="space-y-2">
        {list.length === 0 && (
          <p className="text-center text-stone-400 text-sm py-12">
            첫 메시지를 남겨보세요. 대화처럼 주고받을 수 있어요.
          </p>
        )}
        {list.map((m) => {
          const isMine = m.sender === role;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  isMine ? "bg-amber-700 text-white" : "bg-white border border-stone-200 text-stone-800"
                }`}
              >
                <div className="text-[11px] opacity-70 mb-0.5">
                  {m.sender === "admin" ? "희연재" : "거래처"} · {kst(m.created_at)}
                </div>
                <div className="whitespace-pre-wrap">{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="메시지 입력…"
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-stone-800 outline-none focus:border-amber-600"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="rounded-xl bg-amber-700 text-white font-semibold px-5 disabled:opacity-40"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
