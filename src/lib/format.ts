export function won(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("ko-KR") + "원";
}

/** UTC 타임스탬프 → KST(한국시간) 문자열. 서버 타임존과 무관하게 정확. */
export function kst(ts: string | null | undefined): string {
  if (!ts) return "-";
  const d = new Date(ts);
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${k.getUTCFullYear()}.${p(k.getUTCMonth() + 1)}.${p(
    k.getUTCDate()
  )} ${p(k.getUTCHours())}:${p(k.getUTCMinutes())}`;
}

export const STATUS_LABEL: Record<string, string> = {
  requested: "접수",
  confirmed: "확인",
  shipped: "출고",
  done: "완료",
  canceled: "취소",
};
