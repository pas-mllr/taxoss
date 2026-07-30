import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { facets, projectFacets } from "@/lib/db/schema";
import { autoFacets } from "@/lib/auto-facets";

/**
 * Replace a project's facet assignments for one kind ("jurisdiction" or
 * "subject") with the given slugs. Unknown slugs are ignored.
 */
export async function setFacets(
  projectId: number,
  kind: "jurisdiction" | "subject",
  slugs: string[],
): Promise<number> {
  const rows = slugs.length
    ? await db
        .select({ id: facets.id })
        .from(facets)
        .where(and(eq(facets.kind, kind), inArray(facets.slug, slugs)))
    : [];
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
): Promise<void> {
  const { jurisdictions, subjects } = autoFacets(topics, description, repoName);
  if (jurisdictions.length) await setFacets(projectId, "jurisdiction", jurisdictions);
  if (subjects.length) await setFacets(projectId, "subject", subjects);
}
