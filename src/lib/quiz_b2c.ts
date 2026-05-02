import type { BeenType } from "@/types";

/**
 * 사용자가 선택한 옵션들의 태그를 집계해 BeenType 반환.
 * @param answers 각 문항에서 선택한 옵션의 tags 배열 (string[][])
 *
 * 집계:
 *  BRIGHT  = bright + fruity
 *  DEEP    = dark + strong
 *  BALANCE = balanced + mild + nutty
 *  AROMA   = floral + aroma
 *
 * 동점 시: BALANCE 우선 → BRIGHT → DEEP → AROMA
 */
export function getBeenType(answers: string[][]): BeenType {
  const count: Record<string, number> = {};
  for (const tags of answers) {
    for (const t of tags) {
      count[t] = (count[t] ?? 0) + 1;
    }
  }

  const scores = {
    BRIGHT: (count.bright ?? 0) + (count.fruity ?? 0),
    BALANCE: (count.balanced ?? 0) + (count.mild ?? 0) + (count.nutty ?? 0),
    DEEP: (count.dark ?? 0) + (count.strong ?? 0),
    AROMA: (count.floral ?? 0) + (count.aroma ?? 0),
  };

  const max = Math.max(scores.BRIGHT, scores.BALANCE, scores.DEEP, scores.AROMA);

  if (scores.BALANCE === max) return "BALANCE";
  if (scores.BRIGHT === max) return "BRIGHT";
  if (scores.DEEP === max) return "DEEP";
  return "AROMA";
}
