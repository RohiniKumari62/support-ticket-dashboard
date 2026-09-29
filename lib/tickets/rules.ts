import type { Plan, Priority } from "@/types/ticket";

/**
 * Enterprise priority floor rule:
 * Enterprise tickets are never lower than P1 (P2 or P3 become P1; P0 and P1 remain unchanged).
 * Pro and free tickets are unaffected.
 * Null priority returns null.
 */
export function applyEnterpriseFloor(
  plan: Plan | null | undefined,
  priority: Priority | null | undefined
): Priority | null {
  if (!priority) {
    return null;
  }

  if (plan === "enterprise") {
    if (priority === "P2" || priority === "P3") {
      return "P1";
    }
  }

  return priority;
}
