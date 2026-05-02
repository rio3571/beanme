// === 취향 유형 ===
export type BeenType = "BRIGHT" | "BALANCE" | "DEEP" | "AROMA";

// === 설문 ===
export interface QuizOption {
  label: string;
  desc?: string;
  tags: string[];
}

export interface QuizQuestion {
  id: string;
  q: string;
  sub?: string;
  opts: QuizOption[];
}

// === 블렌드 ===
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
  badgTextColor: string;
  ratio: BlendRatio[];
  flavors: string[];
  roast: string;
}

// === 주문 / 구독 (Phase 4) ===
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type SubscriptionInterval = "weekly" | "biweekly" | "monthly";
export type SubscriptionAmount = 200 | 500 | 1000;
export type GrindType = "wholebean" | "espresso" | "drip";
export type BulkAmount = 5000 | 8000 | 10000 | number;

export interface SubscriptionPlan {
  interval: SubscriptionInterval;
  amountGrams: SubscriptionAmount;
}

export interface BulkOrder {
  amountGrams: BulkAmount;
  grind: GrindType;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
}

export interface Order {
  id: string;
  customer: Customer;
  blendType: BeenType;
  isB2B: boolean; // true: 정량구매 / false: 정기구독
  subscription?: SubscriptionPlan;
  bulk?: BulkOrder;
  status: OrderStatus;
  createdAt: string;
}
