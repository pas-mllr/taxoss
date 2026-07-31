const DAY = 86_400_000;

export function dateDaysAgo(days: number, observedAt = Date.now()): Date {
  return new Date(observedAt - days * DAY);
}

export function parseDateOnlyUtc(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid date-only value: ${value}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return date;
}

export function formatDateOnly(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnlyUtc(value));
}

export function daysUntilDateOnly(value: string, observedAt = Date.now()): number {
  const observed = new Date(observedAt);
  const observedDay = Date.UTC(
    observed.getUTCFullYear(),
    observed.getUTCMonth(),
    observed.getUTCDate(),
  );
  return Math.round((parseDateOnlyUtc(value).getTime() - observedDay) / DAY);
}