export type SubscriptionStatusValue =
  | "trial"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "expired";

export declare const PREMIUM_STATUSES: readonly SubscriptionStatusValue[];
export declare const BLOCKED_STATUSES: readonly SubscriptionStatusValue[];
export declare function hasPremiumAccess(status: string | null | undefined): boolean;
export declare function getSubscriptionStatusKind(
  status: string,
): "access" | "blocked" | "warning";
