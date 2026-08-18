export type AlertSeverity = "critical" | "urgent" | "reminder";

export function shouldCreateDeadlineAlert(daysRemaining: number, reminderDays: number[]) {
  return daysRemaining >= 0 && (daysRemaining <= 1 || reminderDays.includes(daysRemaining));
}

export function alertSeverity(daysRemaining: number): AlertSeverity {
  if (daysRemaining <= 1) return "critical";
  if (daysRemaining <= 3) return "urgent";
  return "reminder";
}

export function separateDecisionTags(firstId: number, secondId: number) {
  if (firstId === secondId) throw new Error("Duplicate decisions require two different purchases.");
  return { first: `guard:separate:${secondId}`, second: `guard:separate:${firstId}` };
}
