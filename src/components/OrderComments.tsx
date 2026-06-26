"use client";

import { useState } from "react";
import { addOrderComment, type CommentRow } from "@/app/portal/comments";
import { kst } from "@/lib/format";

export default function OrderComments({
  orderId,
  role,
  initial,
}: {
  orderId: string;
  role: "admin" | "buyer";
  initial: CommentRow[];
}) {
  const [list, setList] = useState<CommentRow[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(initial.length > 0);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const res = await addOrderComment(orderId, body);
    setSending(false);
    if (res.ok && res.comment) {
      setList((l) => [...l, res.comment!]);
      setText("");
    }
  }

  const mine = role; // 내 메시지 정렬용 (admin/buyer)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-sm text-amber-700 font-medium"
      >
        💬 코멘트 / 문의 {list.length > 0 ? `(${list.length})` : "남기기"}
      </button>
    );
  }

  return (
    <div className="mt-3 border-t border-stone-100 pt-3">
      <div className="space-y-2 mb-2">
        {list.length === 0 && (
          <p className="text-xs text-stone-400">
            아직 코멘트가 없어요. 주문 관련 문의를 남겨보세요.
          </p>
        )}
        {list.map((c) => {
          const isMine = c.sender === mine;
          return (
            <div
              key={c.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  isMine
                    ? "bg-amber-700 text-white"
                    : "bg-stone-100 text-stone-800"
                }`}
              >
                <div className="text-[11px] opacity-70 mb-0.5">
                  {c.sender === "admin" ? "희연재" : "거래처"} · {kst(c.created_at)}
                </div>
                <div className="whitespace-pre-wrap">{c.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="코멘트 입력…"
          className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-amber-600"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="rounded-xl bg-amber-700 text-white text-sm font-semibold px-4 disabled:opacity-40"
        >
          {sending ? "…" : "전송"}
        </button>
      </div>
    </div>
  );
}
