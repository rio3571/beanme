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
  path: PathType | "gift";
  badge: string;        // "B2C" 등
  title: string;
  desc: string;
  bullet: string[];
  primaryColor: string; // 진입 색상 hex
  badgeColor: string;
  badgeTextColor: string;
  gradient?: string;     // 옵션: 카드 테두리 그라디언트 (선물 카드용)
}

// === 선물 ===
export type GiftBudget = "s" | "m" | "l" | "xl";
export type BlendKey = "bright" | "balance" | "deep" | "aroma";
export type GiftQuestionType = "grid" | "list" | "chip" | "package";

export interface GiftQuestion {
  id: string;
  q: string;
  sub?: string;
  type: GiftQuestionType;
  key: string;     // 답변을 저장할 키 (relation/style/vibe/occasion/budget/package)
  opts: GiftQuestionOption[];
}

export interface GiftQuestionOption {
  label: string;
  desc?: string;
  val?: string;     // 식별용 (없으면 label 사용)
}

export interface GiftAnswers {
  relation?: string;
  style?: string;
  vibe?: string;
  occasion?: string;
  budget?: GiftBudget;
  package?: string;  // 패키지 id
}

export interface GiftPackage {
  id: string;
  budget: GiftBudget;
  name: string;
  price: number;     // 원 단위
  items: string[];   // 구성품
  popular: boolean;  // BEST 뱃지
}
