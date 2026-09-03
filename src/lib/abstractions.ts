/**
 * Generalized Revenue Recovery Control Plane Architectural Abstractions
 * 
 * RazorRecovery connects multiple revenue risk sources (Payment Failures, Checkout Abandonments, Systemic Leaks)
 * through a unified recovery engine. This module defines core extensible interfaces for future adapters.
 */

export type RevenueRiskType =
  | "PAYMENT_FAILURE"
  | "CHECKOUT_ABANDONMENT"
  | "SYSTEMIC_PAYMENT_DEGRADATION"
  // Architectural extension points:
  | "SUBSCRIPTION_FAILURE"
  | "MANDATE_FAILURE"
  | "RECEIVABLE_OVERDUE"
  | "PROMISE_TO_PAY_MISSED";

export type RecoveryChannel =
  | "PAYMENT_LINK"
  | "EMAIL"
  | "SMS"
  | "WHATSAPP"
  | "VOICE"
  | "IN_APP";

export type RecoveryStrategyType =
  | "NO_ACTION"
  | "PAYMENT_LINK"
  | "RETRY"
  | "MESSAGE"
  | "PAYMENT_LINK_WITH_VOUCHER"
  | "ESCALATE";

export interface RevenueRiskEvent {
  id: string;
  type: RevenueRiskType;
  source: string;
  merchantId: string;
  storeId: string;
  customerId: string;
  orderId?: string;
  amount: number; // minor units (INR paise)
  currency: string;
  context: Record<string, any>;
  timestamp: Date;
}

export interface RevenueRiskSourceAdapter {
  sourceName: string;
  supportedTypes: RevenueRiskType[];
  normalizeEvent(rawEvent: any): Promise<RevenueRiskEvent>;
}

export interface RecoveryStrategyAdapter {
  strategyType: RecoveryStrategyType;
  supportedChannels: RecoveryChannel[];
  calculateExpectedNetRecovery(context: {
    riskAmount: number;
    recoveryProbability: number;
    incentiveCost: number;
  }): number;
}
