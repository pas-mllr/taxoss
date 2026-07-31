export class EvidenceVersionConflict extends Error {
  constructor() {
    super("VERSION_CONFLICT");
  }
}

export function nextEvidenceVersion(
  currentVersion: number | null,
  expectedVersion: number,
): number {
  const current = currentVersion ?? 0;
  if (current !== expectedVersion) throw new EvidenceVersionConflict();
  return current + 1;
}