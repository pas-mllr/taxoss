import { and, asc, eq, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export function listOwnedPortfolioProjects(
  database: BetterSQLite3Database<typeof schema>,
  userId: string,
) {
  return database
    .select({
      projectId: schema.projects.id,
      owner: schema.projects.owner,
      repo: schema.projects.repo,
      name: schema.projects.name,
      source: schema.projects.source,
      sourceType: schema.projects.sourceType,
      version: schema.portfolioProjects.version,
      decisionState: schema.portfolioProjects.decisionState,
      notes: schema.portfolioProjects.notes,
      archived: sql<boolean>`coalesce(${schema.projectStats.archived}, 0)`,
    })
    .from(schema.portfolioProjects)
    .innerJoin(
      schema.portfolios,
      eq(schema.portfolios.id, schema.portfolioProjects.portfolioId),
    )
    .innerJoin(
      schema.projects,
      eq(schema.projects.id, schema.portfolioProjects.projectId),
    )
    .leftJoin(
      schema.projectStats,
      eq(schema.projectStats.projectId, schema.projects.id),
    )
    .where(
      and(
        eq(schema.portfolios.userId, userId),
        sql`${schema.portfolioProjects.removedAt} IS NULL`,
      ),
    )
    .orderBy(asc(schema.projects.owner), asc(schema.projects.repo))
    .all();
}

export function addShortlistedPortfolioProject(
  database: BetterSQLite3Database<typeof schema>,
  userId: string,
  projectId: number,
): "added" | "not-shortlisted" | "portfolio-missing" {
  return database.transaction((tx) => {
    const portfolio = tx
      .select({ id: schema.portfolios.id })
      .from(schema.portfolios)
      .where(eq(schema.portfolios.userId, userId))
      .limit(1)
      .get();
    if (!portfolio) return "portfolio-missing";
    const shortlisted = tx
      .select({ projectId: schema.stars.projectId })
      .from(schema.stars)
      .where(
        and(
          eq(schema.stars.userId, userId),
          eq(schema.stars.projectId, projectId),
        ),
      )
      .limit(1)
      .get();
    if (!shortlisted) return "not-shortlisted";
    const existing = tx
      .select({ version: schema.portfolioProjects.version })
      .from(schema.portfolioProjects)
      .where(
        and(
          eq(schema.portfolioProjects.portfolioId, portfolio.id),
          eq(schema.portfolioProjects.projectId, projectId),
        ),
      )
      .limit(1)
      .get();
    if (existing) {
      tx.update(schema.portfolioProjects)
        .set({
          decisionState: "candidate",
          notes: null,
          removedAt: null,
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.portfolioProjects.portfolioId, portfolio.id),
            eq(schema.portfolioProjects.projectId, projectId),
            sql`${schema.portfolioProjects.removedAt} IS NOT NULL`,
          ),
        )
        .run();
    } else {
      tx.insert(schema.portfolioProjects)
        .values({ portfolioId: portfolio.id, projectId })
        .run();
    }
    return "added";
  });
}

export function updateOwnedPortfolioProject(
  database: BetterSQLite3Database<typeof schema>,
  userId: string,
  input: {
    projectId: number;
    expectedVersion: number;
    decisionState: string;
    notes: string | null;
  },
): number | null {
  const nextVersion = input.expectedVersion + 1;
  const changed = database
    .update(schema.portfolioProjects)
    .set({
      decisionState: input.decisionState,
      notes: input.notes,
      version: nextVersion,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.portfolioProjects.projectId, input.projectId),
        eq(schema.portfolioProjects.version, input.expectedVersion),
        sql`${schema.portfolioProjects.removedAt} IS NULL`,
        eq(
          schema.portfolioProjects.portfolioId,
          database
            .select({ id: schema.portfolios.id })
            .from(schema.portfolios)
            .where(eq(schema.portfolios.userId, userId)),
        ),
      ),
    )
    .run();
  return changed.changes ? nextVersion : null;
}

export function removeOwnedPortfolioProject(
  database: BetterSQLite3Database<typeof schema>,
  userId: string,
  projectId: number,
  expectedVersion: number,
): boolean {
  return Boolean(
    database
      .update(schema.portfolioProjects)
      .set({
        removedAt: new Date(),
        version: expectedVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.portfolioProjects.projectId, projectId),
          eq(schema.portfolioProjects.version, expectedVersion),
          sql`${schema.portfolioProjects.removedAt} IS NULL`,
          eq(
            schema.portfolioProjects.portfolioId,
            database
              .select({ id: schema.portfolios.id })
              .from(schema.portfolios)
              .where(eq(schema.portfolios.userId, userId)),
          ),
        ),
      )
      .run().changes,
  );
}
