/**
 * Dynamic Cycle Year utility.
 * Replaces hardcoded 2026 references across the application.
 */

export function getCurrentCycleYear(referenceDate: Date = new Date()): number {
  return referenceDate.getFullYear();
}
