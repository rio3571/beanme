import type { GiftAnswers, BlendKey } from "@/types";

/**
 * 선물 답변 → 추천 블렌드 결정.
 * 우선순위 순 (위에 매칭되면 종료):
 *  1. specialty 또는 trendy/romantic → aroma
 *  2. black 또는 energetic/practical → deep
 *  3. calm/warm 또는 unsure 또는 parent/client → balance
 *  4. fallback → bright
 */
export function getGiftBlend(answers: GiftAnswers): BlendKey {
  const { style, vibe, relation } = answers;

  // 1. AROMA
  if (style === "specialty" || vibe === "trendy" || vibe === "romantic") {
    return "aroma";
  }
  // 2. DEEP
  if (style === "black" || vibe === "energetic" || vibe === "practical") {
    return "deep";
  }
  // 3. BALANCE
  if (
    vibe === "calm" ||
    vibe === "warm" ||
    style === "unsure" ||
    relation === "parent" ||
    relation === "client"
  ) {
    return "balance";
  }
  // 4. fallback
  return "bright";
}

/**
 * occasion → 손편지 카드 기본 메시지 반환.
 * 사용자가 직접 수정 가능 (주문 페이지에서 textarea).
 */
export function getGiftMessage(occasion?: string): string {
  switch (occasion) {
    case "birthday":
      return "생일 축하해 🎂 오늘 하루는 네가 좋아하는 향기로 가득하길 바라며, 네 취향에 딱 맞는 원두 골라봤어.";
    case "thanks":
      return "고마운 마음을 커피 한 잔에 담았어요. 좋은 향기와 함께 잠깐이라도 쉬어가시길 바랍니다.";
    case "celebrate":
      return "축하해! 🎉 특별한 날에 특별한 한 잔 — 네 취향 저격해봤는데 어때?";
    case "random":
      return "갑자기 생각나서. 별 이유 없어도 선물할 수 있는 거잖아 ☕";
    case "anniversary":
      return "소중한 날을 기억하며 준비했어요. 향기로운 시간이 되길 바랍니다 🍀";
    case "business":
      return "감사한 마음을 담아 준비했습니다. 좋은 향기와 함께 잠깐의 여유를 드리고 싶었습니다.";
    default:
      return "마음을 담아 준비했어요. 향기로운 시간이 되길 바랍니다.";
  }
}

/** BlendKey('bright') → BeenType('BRIGHT') 매핑 헬퍼 */
export function blendKeyToType(k: BlendKey): "BRIGHT" | "BALANCE" | "DEEP" | "AROMA" {
  switch (k) {
    case "bright": return "BRIGHT";
    case "balance": return "BALANCE";
    case "deep": return "DEEP";
    case "aroma": return "AROMA";
  }
}
