"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ThreadRow = {
  id: string;
  company_name: string;
  last_body: string | null;
  last_sender: string | null;
  last_at: string | null;
  unread: number;
};

/** '10/12' · 오늘이면 '오후 3:20' */
function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const sameDay = d.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  if (sameDay) {
    const h = d.getUTCHours();
    const ap = h < 12 ? "오전" : "오후";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${ap} ${hh}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
  const y = d.getUTCFullYear();
  const thisYear = now.getUTCFullYear();
  const md = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return y === thisYear ? md : `${String(y).slice(2)}.${md}`;
}

/**
 * 거래처가 늘면 카드가 깔려서 찾기 어려웠다.
 * 한 줄 목록 + 검색 + "안 읽음만" 으로 훑기 쉽게 바꿨다.
 */
export default function MessageList({ rows }: { rows: ThreadRow[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "talked">("all");

  const unreadTotal = rows.reduce((s, r) => s + r.unread, 0);
  const talkedCount = rows.filter((r) => r.last_at).length;

  const shown = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "unread" && r.unread === 0) return false;
      if (tab === "talked" && !r.last_at) return false;
      if (!kw) return true;
      return (
        r.company_name.toLowerCase().includes(kw) ||
        (r.last_body ?? "").toLowerCase().includes(kw)
      );
    });
  }, [rows, q, tab, ]);

  const TABS = [
    { k: "all" as const, label: `전체 ${rows.length}` },
    { k: "unread" as const, label: `안 읽음 ${unreadTotal}` },
    { k: "talked" as const, label: `대화 있음 ${talkedCount}` },
  ];

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="거래처명 · 내용 검색"
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-base text-stone-800 outline-none focus:border-amber-600 mb-2.5"
      />

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5">
        {TABS.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold border ${
              tab === t.k
                ? "bg-amber-700 border-amber-700 text-white"
                : "bg-white border-stone-300 text-stone-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-stone-400 text-center py-16 text-sm">
          {q ? "검색 결과가 없어요." : "해당하는 거래처가 없어요."}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {shown.map((r) => (
            <Link
              key={r.id}
              href={`/portal/admin/messages/${r.id}`}
              className="flex items-center gap-3 px-4 py-3.5 border-t border-stone-100 first:border-t-0 active:bg-stone-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`truncate ${
                      r.unread > 0
                        ? "font-bold text-stone-900"
                        : "font-semibold text-stone-700"
                    }`}
                  >
                    {r.company_name}
                  </span>
                  {r.unread > 0 && (
                    <span className="shrink-0 text-[11px] font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
                      {r.unread}
                    </span>
                  )}
                </div>
                <div
                  className={`text-sm truncate mt-0.5 ${
                    r.unread > 0 ? "text-stone-700" : "text-stone-400"
                  }`}
                >
                  {r.last_body ? (
                    <>
                      {r.last_sender === "admin" && (
                        <span className="text-stone-400">나: </span>
                      )}
                      {r.last_body}
                    </>
                  ) : (
                    <span className="text-stone-300">메시지 없음</span>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-stone-400 tabular-nums">
                {when(r.last_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
