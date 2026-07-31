"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  facets,
  portfolioScopeFacets,
  portfolios,
} from "@/lib/db/schema";
import {
  addShortlistedPortfolioProject,
  removeOwnedPortfolioProject,
  updateOwnedPortfolioProject,
} from "@/lib/db/portfolio-repository";
import {
  PORTFOLIO_DECISION_STATES,
} from "@/lib/portfolio-model";
import { ensurePortfolioForUser } from "@/lib/portfolio";
import { ensureCurrentUser } from "@/lib/users";

type WorkspaceActionResult =
  | { ok: true; version?: number }
  | { ok: false; error: string; conflict?: boolean };

function fail(error: string, conflict = false): WorkspaceActionResult {
  return { ok: false, error, ...(conflict && { conflict: true }) };
}

const settingsSchema = z.object({
  expectedVersion: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000),
  scopeFacetIds: z.array(z.number().int().positive()).max(60),
});

export async function savePortfolioSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<WorkspaceActionResult> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to edit your workspace.");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid portfolio settings.");
  }
  const data = parsed.data;
  const portfolio = await ensurePortfolioForUser(userId);
  const uniqueFacetIds = [...new Set(data.scopeFacetIds)];
  const validFacets = uniqueFacetIds.length
    ? await db
        .select({ id: facets.id })
        .from(facets)
        .where(
          and(
            inArray(facets.id, uniqueFacetIds),
            inArray(facets.kind, ["jurisdiction", "subject"]),
          ),
        )
    : [];
  if (validFacets.length !== uniqueFacetIds.length) {
    return fail("Portfolio scope contains an invalid facet.");
  }

  try {
    const version = db.transaction((tx) => {
      const nextVersion = data.expectedVersion + 1;
      const changed = tx
        .update(portfolios)
        .set({
          name: data.name,
          description: data.description || null,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(portfolios.id, portfolio.id),
            eq(portfolios.userId, userId),
            eq(portfolios.version, data.expectedVersion),
          ),
        )
        .run().changes;
      if (!changed) throw new Error("VERSION_CONFLICT");

      tx.delete(portfolioScopeFacets)
        .where(eq(portfolioScopeFacets.portfolioId, portfolio.id))
        .run();
      if (validFacets.length > 0) {
        tx.insert(portfolioScopeFacets)
          .values(
            validFacets.map((facet) => ({
              portfolioId: portfolio.id,
              facetId: facet.id,
            })),
          )
          .run();
      }
      return nextVersion;
    });
    revalidatePath("/my-projects");
    return { ok: true, version };
  } catch (error) {
    if (error instanceof Error && error.message === "VERSION_CONFLICT") {
      return fail("This portfolio changed in another session. Reload first.", true);
    }
    return fail(error instanceof Error ? error.message : "Could not save portfolio.");
  }
}

const projectSchema = z.object({ projectId: z.number().int().positive() });

export async function addPortfolioProject(
  input: z.infer<typeof projectSchema>,
): Promise<WorkspaceActionResult> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to edit your workspace.");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid project.");
  await ensurePortfolioForUser(userId);
  const result = addShortlistedPortfolioProject(
    db,
    userId,
    parsed.data.projectId,
  );
  if (result !== "added") {
    return fail(
      result === "not-shortlisted"
        ? "Star this project before adding it to your portfolio."
        : "Could not find your portfolio.",
    );
  }
  revalidatePath("/my-projects");
  return { ok: true };
}

const projectUpdateSchema = projectSchema.extend({
  expectedVersion: z.number().int().positive(),
  decisionState: z.enum(PORTFOLIO_DECISION_STATES),
  notes: z.string().trim().max(4000),
});

export async function updatePortfolioProject(
  input: z.infer<typeof projectUpdateSchema>,
): Promise<WorkspaceActionResult> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to edit your workspace.");
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid project decision.");
  }
  await ensurePortfolioForUser(userId);
  const version = updateOwnedPortfolioProject(db, userId, {
    projectId: parsed.data.projectId,
    expectedVersion: parsed.data.expectedVersion,
    decisionState: parsed.data.decisionState,
    notes: parsed.data.notes || null,
  });
  if (!version) {
    return fail("This decision changed in another session. Reload first.", true);
  }
  revalidatePath("/my-projects");
  return { ok: true, version };
}

const projectRemoveSchema = projectSchema.extend({
  expectedVersion: z.number().int().positive(),
});

export async function removePortfolioProject(
  input: z.infer<typeof projectRemoveSchema>,
): Promise<WorkspaceActionResult> {
  const userId = await ensureCurrentUser();
  if (!userId) return fail("Sign in to edit your workspace.");
  const parsed = projectRemoveSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid project.");
  await ensurePortfolioForUser(userId);
  const removed = removeOwnedPortfolioProject(
    db,
    userId,
    parsed.data.projectId,
    parsed.data.expectedVersion,
  );
  if (!removed) {
    return fail("This decision changed in another session. Reload first.", true);
  }
  revalidatePath("/my-projects");
  return { ok: true };
}
