import type { BeenType, CustomerType } from "./index";

export type OrderFrequency = "monthly" | "biweekly" | "weekly";
export type OrderAmount =
  | "200g"
  | "500g"
  | "1kg"
  | "5kg"
  | "8kg"
  | "10kg"
  | "custom";
export type GrindType = "whole" | "espresso" | "drip";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "delivered"
  | "cancelled";

export interface SubscriptionPlan {
  frequency: OrderFrequency;
  amount: OrderAmount;
  customAmount?: number; // grams (amount === "custom" 일 때)
  blendType: BeenType | string;
  customerType: CustomerType;
  isB2B: boolean;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
  company?: string;
}

export interface Order {
  id: string;
  createdAt: Date;
  customer: Customer;
  plan: SubscriptionPlan;
  status: OrderStatus;
  grind: GrindType;
  memo?: string;
}
