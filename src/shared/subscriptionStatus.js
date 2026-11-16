// Clasificación de estados de suscripción compartida por main y renderer.
// Es la única lista: si cambia un estado premium, cambia acá y nada más.
const PREMIUM_STATUSES = ["active", "trial", "trialing"];
const BLOCKED_STATUSES = ["expired", "canceled", "unpaid", "incomplete"];

function hasPremiumAccess(status) {
  return PREMIUM_STATUSES.includes(status);
}

function getSubscriptionStatusKind(status) {
  if (hasPremiumAccess(status)) return "access";
  if (BLOCKED_STATUSES.includes(status)) return "blocked";
  // "past_due" (pago rechazado) y cualquier estado desconocido: necesita
  // atención y no habilita acceso.
  return "warning";
}

module.exports = {
  PREMIUM_STATUSES,
  BLOCKED_STATUSES,
  hasPremiumAccess,
  getSubscriptionStatusKind,
};
