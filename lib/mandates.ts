export type MandateReviewState = "unreviewed" | "current" | "overdue";

export function mandateReviewState(
  lastReviewedAt: Date | null,
  reviewDueAt: Date | null,
  observedAt = Date.now(),
): MandateReviewState {
  if (!lastReviewedAt) return "unreviewed";
  if (reviewDueAt && reviewDueAt.getTime() < observedAt) return "overdue";
  return "current";
}

export function sortMandatePhases<
  T extends { effectiveFrom: string; sort: number },
>(phases: T[]): T[] {
  return [...phases].sort(
    (left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom) ||
      left.sort - right.sort,
  );
}