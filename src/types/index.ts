// === 취향 유형 (B2C 결과) ===
export type BeenType = "BRIGHT" | "BALANCE" | "DEEP" | "AROMA";

// === 진입 경로 ===
export type PathType = "b2c" | "pro" | "office";
export type CustomerType = "b2c" | "b2b_pro" | "b2b_office";
export type OrderType = "subscription" | "oneshot";

// === 설문 (B2C·Pro·Office 공통) ===
export type QuizOptionUI = "list" | "grid" | "chip";

export interface QuizOption {
  label: string;
  desc?: string;
  tags?: string[];   // B2C 태그 집계용
  val?: string;      // B2B 답변 식별자
}

export interface QuizQuestion {
  id: string;
  q: string;
  sub?: string;
  type?: QuizOptionUI;   // 옵션 렌더 방식 (B2B 혼용용)
  section?: string;       // B2B 섹션 라벨
  opts: QuizOption[];
}

// === 블렌드 (B2C 추천 결과) ===
export interface BlendRatio {
  origin: string;
  percent: number;
  color: string;
}

export interface Blend {
  type: BeenType;
  name: string;
  tagline: string;
  badgeText: string;
  badgeColor: string;
  badgeTextColor: string;
  ratio: BlendRatio[];
  flavors: string[];
  roast: string;
}

// === 진입 카드 (랜딩) ===
export interface PathCard {
  path: PathType;
  badge: string;        // "B2C" 등
  title: string;
  desc: string;
  bullet: string[];
  primaryColor: string; // 진입 색상 hex
  badgeColor: string;
  badgeTextColor: string;
}
