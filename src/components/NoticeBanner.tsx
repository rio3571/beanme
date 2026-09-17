import { TONE_STYLE, isVisible, type Notice } from "@/lib/notice";

/**
 * 거래처가 포털에 들어오자마자 보는 공지 배너.
 * 서버 컴포넌트 — 페이지에서 getNotice() 한 결과를 그대로 넘긴다.
 */
export default function NoticeBanner({ notice }: { notice: Notice }) {
  if (!isVisible(notice)) return null;

  const s = TONE_STYLE[notice.tone];
  const title = notice.title.trim();
  const body = notice.body.trim();

  return (
    <div className={`rounded-xl border-2 ${s.box} px-4 py-3.5 mb-4`}>
      <div className="flex items-start gap-2.5">
        <span
          className={`${s.badge} text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5`}
        >
          {s.label}
        </span>
        <div className="min-w-0">
          {title && (
            <div className={`font-bold ${s.title} leading-snug`}>{title}</div>
          )}
          {body && (
            <div
              className={`text-sm ${s.body} mt-1 leading-relaxed whitespace-pre-line`}
            >
              {body}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
