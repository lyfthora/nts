import { SubscriptionStatus } from "../types/models";

export function getSubscriptionStatusKind(
  status: SubscriptionStatus["status"],
) {
  if (["active", "trial", "trialing"].includes(status))
    return "access" as const;
  if (["expired", "canceled", "unpaid", "incomplete"].includes(status))
    return "blocked" as const;
  return "warning" as const;
}

export function canAccessApp(status: SubscriptionStatus["status"]) {
  return getSubscriptionStatusKind(status) === "access";
}

export function getSubscriptionAction(status: SubscriptionStatus["status"]) {
  return status === "active"
    ? {
        label: "Manage subscription",
        mode: "portal" as const,
      }
    : {
        label: "Subscribe",
        mode: "checkout" as const,
      };
}

export function formatSubscriptionDate(dateString: string | null) {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getDaysRemaining(dateString: string | null) {
  if (!dateString) return null;

  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

export function getSubscriptionSummary(status: SubscriptionStatus) {
  if (status.status === "active") {
    const renewalDate = formatSubscriptionDate(status.currentPeriodEnd);
    if (!renewalDate) return null;

    return status.cancelAtPeriodEnd
      ? `Access active until ${renewalDate}`
      : `Next renewal on ${renewalDate}`;
  }

  if (status.status === "trial" || status.status === "trialing") {
    const daysRemaining = getDaysRemaining(status.trialEndsAt);
    const trialEndDate = formatSubscriptionDate(status.trialEndsAt);

    if (daysRemaining === null || !trialEndDate) return null;
    if (daysRemaining === 0) return `Trial ends today (${trialEndDate})`;
    if (daysRemaining === 1)
      return `1 day left in your trial · ends ${trialEndDate}`;
    return `${daysRemaining} days left in your trial · ends ${trialEndDate}`;
  }

  if (status.status === "expired") {
    const trialEndDate = formatSubscriptionDate(status.trialEndsAt);
    return trialEndDate
      ? `Trial ended on ${trialEndDate}`
      : "Your trial has ended";
  }

  return null;
}
