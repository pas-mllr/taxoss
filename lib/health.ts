/**
 * Maintenance health, derived from the last push. Tax software lives on an
 * annual cycle — many perfectly good tools update once per filing season —
 * so the bands are generous: a repo isn't "stale" until it has slept
 * through a full season and then some.
 */

export type HealthKey = "active" | "maintained" | "quiet" | "stale";

const DAY = 86_400_000;

const BANDS: { key: HealthKey; label: string; maxDays: number; hint: string }[] = [
  { key: "active", label: "Active", maxDays: 30, hint: "pushed within the last month" },
  { key: "maintained", label: "Maintained", maxDays: 183, hint: "pushed within the last 6 months" },
  { key: "quiet", label: "Quiet", maxDays: 548, hint: "no push in over 6 months" },
  { key: "stale", label: "Stale", maxDays: Infinity, hint: "no push in over 18 months" },
];

export function projectHealth(pushedAt: Date | null) {
  if (!pushedAt) return null;
  const days = (Date.now() - pushedAt.getTime()) / DAY;
  const band = BANDS.find((b) => days <= b.maxDays) ?? BANDS[BANDS.length - 1];
  return { ...band, title: `${band.label} — ${band.hint}` };
}
