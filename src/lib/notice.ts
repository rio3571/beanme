// 거래처 포털 공지 (명절 배송 안내 등 그때그때 한 줄 공지).
//
// 저장 위치: roast_config 테이블의 id=2 행.
//   id=1 = 로스팅 원가설정(RoastConfig), id=2 = 공지.
// 단일행 jsonb 테이블을 재사용해서 새 테이블(DDL) 없이 동작한다.
// 공지가 여러 건 필요해지면 그때 b2b_notices 테이블로 옮길 것.

import { createAdminClient } from "@/lib/supabaseAdmin";

export const NOTICE_ROW_ID = 2;

export type NoticeTone = "holiday" | "warn" | "info";

export type Notice = {
  on: boolean;
  title: string;
  body: string;
  tone: NoticeTone;
  updatedAt: string | null;
};

export const EMPTY_NOTICE: Notice = {
  on: false,
  title: "",
  body: "",
  tone: "holiday",
  updatedAt: null,
};

export const TONE_LABEL: Record<NoticeTone, string> = {
  holiday: "명절·휴무 (빨강)",
  warn: "주의 (주황)",
  info: "일반 안내 (초록)",
};

/** 배너 색상. 포털의 기존 배너(입금계좌 amber, 이월 red)와 같은 톤 체계. */
export const TONE_STYLE: Record<
  NoticeTone,
  { box: string; badge: string; title: string; body: string; label: string }
> = {
  holiday: {
    box: "bg-red-50 border-red-300",
    badge: "bg-red-600 text-white",
    title: "text-red-900",
    body: "text-red-800",
    label: "공지",
  },
  warn: {
    box: "bg-amber-50 border-amber-300",
    badge: "bg-amber-500 text-white",
    title: "text-amber-900",
    body: "text-amber-800",
    label: "안내",
  },
  info: {
    box: "bg-emerald-50 border-emerald-300",
    badge: "bg-emerald-600 text-white",
    title: "text-emerald-900",
    body: "text-emerald-800",
    label: "안내",
  },
};

function normalize(raw: unknown): Notice {
  if (!raw || typeof raw !== "object") return { ...EMPTY_NOTICE };
  const r = raw as Partial<Notice>;
  const tone: NoticeTone =
    r.tone === "warn" || r.tone === "info" || r.tone === "holiday"
      ? r.tone
      : "holiday";
  return {
    on: r.on === true,
    title: typeof r.title === "string" ? r.title : "",
    body: typeof r.body === "string" ? r.body : "",
    tone,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
  };
}

/**
 * 현재 공지. 테이블/행이 없거나 조회에 실패해도 빈 공지를 돌려준다
 * (공지 때문에 포털이 깨지면 안 되므로).
 */
export async function getNotice(): Promise<Notice> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("roast_config")
      .select("data")
      .eq("id", NOTICE_ROW_ID)
      .maybeSingle();
    return normalize(data?.data);
  } catch {
    return { ...EMPTY_NOTICE };
  }
}

/** 실제로 화면에 띄울 공지인지 (켜져 있고 내용이 있을 때만). */
export function isVisible(n: Notice): boolean {
  return n.on && (n.title.trim().length > 0 || n.body.trim().length > 0);
}
