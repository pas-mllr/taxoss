import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  facets,
  mandatePhases,
  mandates,
  mandateSources,
} from "@/lib/db/schema";
import {
  mandateReviewState,
  sortMandatePhases,
  type MandateReviewState,
} from "@/lib/mandates";

export type MandatePhaseRecord = typeof mandatePhases.$inferSelect;
export type MandateSourceRecord = typeof mandateSources.$inferSelect;

export type MandateRecord = typeof mandates.$inferSelect & {
  jurisdictionSlug: string;
  jurisdictionName: string;
  reviewState: MandateReviewState;
  phases: MandatePhaseRecord[];
  sources: MandateSourceRecord[];
};

export async function listMandates(options: {
  includeDrafts?: boolean;
  jurisdiction?: string;
  lifecycle?: string;
  reviewState?: MandateReviewState;
} = {}): Promise<MandateRecord[]> {
  const conditions = [];
  if (!options.includeDrafts) conditions.push(eq(mandates.status, "published"));
  if (options.jurisdiction) conditions.push(eq(facets.slug, options.jurisdiction));
  if (options.lifecycle) conditions.push(eq(mandates.lifecycle, options.lifecycle));

  const rows = await db
    .select({
      mandate: mandates,
      jurisdictionSlug: facets.slug,
      jurisdictionName: facets.name,
    })
    .from(mandates)
    .innerJoin(facets, eq(facets.id, mandates.jurisdictionFacetId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(facets.sort), asc(mandates.name));

  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.mandate.id);
  const [phases, sources] = await Promise.all([
    db
      .select()
      .from(mandatePhases)
      .where(inArray(mandatePhases.mandateId, ids))
      .orderBy(asc(mandatePhases.effectiveFrom), asc(mandatePhases.sort)),
    db
      .select()
      .from(mandateSources)
      .where(inArray(mandateSources.mandateId, ids))
      .orderBy(asc(mandateSources.id)),
  ]);

  const result = rows.map(({ mandate, jurisdictionSlug, jurisdictionName }) => ({
    ...mandate,
    jurisdictionSlug,
    jurisdictionName,
    reviewState: mandateReviewState(
      mandate.lastReviewedAt,
      mandate.reviewDueAt,
    ),
    phases: sortMandatePhases(
      phases.filter((phase) => phase.mandateId === mandate.id),
    ),
    sources: sources.filter((source) => source.mandateId === mandate.id),
  }));

  return options.reviewState
    ? result.filter((mandate) => mandate.reviewState === options.reviewState)
    : result;
}

export async function getMandateBySlug(
  slug: string,
  options: { includeDrafts?: boolean } = {},
): Promise<MandateRecord | null> {
  const rows = await listMandates({ includeDrafts: options.includeDrafts });
  return rows.find((mandate) => mandate.slug === slug) ?? null;
}