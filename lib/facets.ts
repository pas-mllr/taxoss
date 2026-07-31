import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { facets, projectFacets } from "@/lib/db/schema";
import { autoFacets } from "@/lib/auto-facets";
import type { FacetKind } from "@/lib/db/seed-facets";

/**
 * Replace a project's facet assignments for one kind with the given slugs.
 * Unknown slugs are ignored.
 */
export async function setFacets(
  projectId: number,
  kind: FacetKind,
  slugs: string[],
): Promise<number> {
  let rows = slugs.length
    ? await db
        .select({ id: facets.id })
        .from(facets)
        .where(and(eq(facets.kind, kind), inArray(facets.slug, slugs)))
    : [];
  if (kind !== "jurisdiction" && rows.length === 0) {
    rows = await db
      .select({ id: facets.id })
      .from(facets)
      .where(and(eq(facets.kind, kind), eq(facets.slug, "unclassified")))
      .limit(1);
  }
  const kindIds = db
    .select({ id: facets.id })
    .from(facets)
    .where(eq(facets.kind, kind));
  await db
    .delete(projectFacets)
    .where(
      and(
        eq(projectFacets.projectId, projectId),
        inArray(projectFacets.facetId, kindIds),
      ),
    );
  if (rows.length > 0) {
    await db
      .insert(projectFacets)
      .values(rows.map((r) => ({ projectId, facetId: r.id })))
      .onConflictDoNothing();
  }
  return rows.length;
}

/** Provisional facet tagging for freshly indexed projects. */
export async function autoAssignFacets(
  projectId: number,
  topics: string[],
  description: string | null,
  repoName: string,
  categorySlugs: string[] = [],
): Promise<void> {
  const { jurisdictions, subjects, processes } = autoFacets(
    topics,
    description,
    repoName,
    categorySlugs,
  );
  if (jurisdictions.length) await setFacets(projectId, "jurisdiction", jurisdictions);
  await setFacets(projectId, "subject", subjects.length ? subjects : ["unclassified"]);
  await setFacets(projectId, "process", processes.length ? processes : ["unclassified"]);
}
