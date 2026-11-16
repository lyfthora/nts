import { SubscriptionStatus } from "../types/models";

// La lista de estados vive en un módulo compartido con el main process.
export { getSubscriptionStatusKind } from "../../shared/subscriptionStatus";

/**
 * Mensaje a mostrar cuando el backend rechaza una operación premium.
 * Devuelve null cuando el código de error no es de suscripción.
 */
export function getPremiumRejectionMessage(
  code: string | null | undefined,
  feature: "export" | "import",
): string | null {
  if (code === "PREMIUM_REQUIRED") {
    return `Premium feature — subscribe to ${feature} notes`;
  }
  if (code === "SUBSCRIPTION_UNVERIFIED") {
    return "Couldn't verify your subscription. Check your connection and try again.";
  }
  return null;
}

export function getSubscriptionAction(status: SubscriptionStatus["status"]) {
  if (status === "active") {
    return {
      label: "Pay",
      mode: "portal" as const,
    };
  }

  // Un pago rechazado se resuelve actualizando el método de pago en el portal.
  if (status === "past_due") {
    return {
      label: "Update payment",
      mode: "portal" as const,
    };
  }

  return {
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

  if (status.status === "past_due") {
    return "Payment failed — update your payment method to keep your subscription.";
  }

  if (status.status === "expired") {
    const trialEndDate = formatSubscriptionDate(status.trialEndsAt);
    return trialEndDate
      ? `Trial ended on ${trialEndDate}`
      : "Your trial has ended";
  }

  return null;
}
