import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  claims,
  mandatePhases,
  mandates,
  projectEvaluationSources,
  projectEvaluations,
  projectMandates,
  projects,
  projectStats,
} from "@/lib/db/schema";
import {
  buildProjectSignalBundle,
  emptyProjectScorecard,
  LEGAL_CURRENCY_STATES,
  PRODUCTION_READINESS_STATES,
  RUBRIC_STATES,
  SCORECARD_DIMENSIONS,
  type LegalCurrencyState,
  type ProductionReadinessState,
  type ProjectScorecard,
  type ProjectSignalBundle,
} from "@/lib/evaluations";
import { mandateReviewState, type MandateReviewState } from "@/lib/mandates";

function oneOf<T extends readonly string[]>(
  values: T,
  value: string,
  fallback: T[number],
): T[number] {
  return values.includes(value) ? (value as T[number]) : fallback;
}

function scorecardFromRow(
  row: typeof projectEvaluations.$inferSelect,
): ProjectScorecard {
  return Object.fromEntries(
    SCORECARD_DIMENSIONS.map((dimension) => [
      dimension,
      oneOf(RUBRIC_STATES, row[dimension], "unreviewed"),
    ]),
  ) as ProjectScorecard;
}

export type ProjectEvidence = {
  evaluation: (typeof projectEvaluations.$inferSelect & {
    reviewState: MandateReviewState;
  }) | null;
  signals: ProjectSignalBundle;
  sources: (typeof projectEvaluationSources.$inferSelect)[];
  mandates: {
    mandateId: number;
    slug: string;
    name: string;
    relationship: string;
    coverageNote: string | null;
    nextPhase: { label: string; effectiveFrom: string } | null;
  }[];
  claimProvenance: {
    method: string;
    verifiedAt: Date;
  } | null;
};

export async function getProjectEvidence(
  projectId: number,
  options: { includeDrafts?: boolean } = {},
): Promise<ProjectEvidence> {
  const [baseRows, evaluationRows, sources, mandateRows, claimRows] =
    await Promise.all([
      db
        .select({
          pushedAt: projectStats.pushedAt,
          archived: projectStats.archived,
          statsFetchedAt: projectStats.fetchedAt,
        })
        .from(projects)
        .leftJoin(projectStats, eq(projectStats.projectId, projects.id))
        .where(eq(projects.id, projectId))
        .limit(1),
      db
        .select()
        .from(projectEvaluations)
        .where(
          and(
            eq(projectEvaluations.projectId, projectId),
            options.includeDrafts
              ? undefined
              : eq(projectEvaluations.status, "published"),
          ),
        )
        .limit(1),
      db
        .select()
        .from(projectEvaluationSources)
        .where(eq(projectEvaluationSources.projectId, projectId))
        .orderBy(asc(projectEvaluationSources.dimension), asc(projectEvaluationSources.id)),
      db
        .select({
          mandateId: mandates.id,
          slug: mandates.slug,
          name: mandates.name,
          relationship: projectMandates.relationship,
          coverageNote: projectMandates.coverageNote,
          phaseLabel: mandatePhases.label,
          phaseDate: mandatePhases.effectiveFrom,
        })
        .from(projectMandates)
        .innerJoin(mandates, eq(mandates.id, projectMandates.mandateId))
        .leftJoin(mandatePhases, eq(mandatePhases.mandateId, mandates.id))
        .where(
          and(
            eq(projectMandates.projectId, projectId),
            options.includeDrafts ? undefined : eq(mandates.status, "published"),
          ),
        )
        .orderBy(asc(mandates.name), asc(mandatePhases.effectiveFrom)),
      db
        .select({
          method: claims.method,
          verifiedAt: claims.createdAt,
        })
        .from(claims)
        .innerJoin(
          projects,
          and(
            eq(projects.id, claims.projectId),
            eq(projects.claimedById, claims.userId),
          ),
        )
        .where(eq(claims.projectId, projectId))
        .orderBy(desc(claims.createdAt), desc(claims.id))
        .limit(1),
    ]);

  const evaluation = evaluationRows[0] ?? null;
  const base = baseRows[0] ?? null;
  const legalCurrency: LegalCurrencyState = evaluation
    ? oneOf(LEGAL_CURRENCY_STATES, evaluation.legalCurrency, "unreviewed")
    : "unreviewed";
  const productionReadiness: ProductionReadinessState = evaluation
    ? oneOf(
        PRODUCTION_READINESS_STATES,
        evaluation.productionReadiness,
        "unreviewed",
      )
    : "unreviewed";
  const scorecard: ProjectScorecard = evaluation
    ? scorecardFromRow(evaluation)
    : emptyProjectScorecard();

  const groupedMandates = new Map<
    string,
    ProjectEvidence["mandates"][number]
  >();
  const today = new Date().toISOString().slice(0, 10);
  for (const row of mandateRows) {
    const key = `${row.mandateId}:${row.relationship}`;
    const current = groupedMandates.get(key);
    if (!current) {
      groupedMandates.set(key, {
        mandateId: row.mandateId,
        slug: row.slug,
        name: row.name,
        relationship: row.relationship,
        coverageNote: row.coverageNote,
        nextPhase:
          row.phaseDate && row.phaseDate >= today
            ? { label: row.phaseLabel ?? "Next phase", effectiveFrom: row.phaseDate }
            : null,
      });
    } else if (
      !current.nextPhase &&
      row.phaseDate &&
      row.phaseDate >= today
    ) {
      current.nextPhase = {
        label: row.phaseLabel ?? "Next phase",
        effectiveFrom: row.phaseDate,
      };
    }
  }

  return {
    evaluation: evaluation
      ? {
          ...evaluation,
          reviewState: mandateReviewState(
            evaluation.lastReviewedAt,
            evaluation.reviewDueAt,
          ),
        }
      : null,
    signals: buildProjectSignalBundle({
      pushedAt: base?.pushedAt ?? null,
      archived: Boolean(base?.archived),
      statsFetchedAt: base?.statsFetchedAt ?? null,
      evaluation: { legalCurrency, productionReadiness, scorecard },
    }),
    sources: evaluation ? sources : [],
    mandates:
      evaluation || options.includeDrafts ? [...groupedMandates.values()] : [],
    claimProvenance: claimRows[0] ?? null,
  };
}

export type AdminEvaluationRow = {
  projectId: number;
  owner: string;
  repo: string;
  source: string;
  sourceType: string | null;
  name: string;
  evaluation: typeof projectEvaluations.$inferSelect | null;
  sources: (typeof projectEvaluationSources.$inferSelect)[];
  mandates: {
    mandateId: number;
    name: string;
    relationship: string;
    coverageNote: string | null;
  }[];
};

export async function listProjectEvaluationsForAdmin(): Promise<AdminEvaluationRow[]> {
  const rows = await db
    .select({
      projectId: projects.id,
      owner: projects.owner,
      repo: projects.repo,
      source: projects.source,
      sourceType: projects.sourceType,
      name: projects.name,
      evaluation: projectEvaluations,
    })
    .from(projects)
    .leftJoin(projectEvaluations, eq(projectEvaluations.projectId, projects.id))
    .orderBy(asc(projects.owner), asc(projects.repo));
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.projectId);
  const [sources, relationships] = await Promise.all([
    db
      .select()
      .from(projectEvaluationSources)
      .where(inArray(projectEvaluationSources.projectId, ids))
      .orderBy(asc(projectEvaluationSources.dimension), asc(projectEvaluationSources.id)),
    db
      .select({
        projectId: projectMandates.projectId,
        mandateId: projectMandates.mandateId,
        name: mandates.name,
        relationship: projectMandates.relationship,
        coverageNote: projectMandates.coverageNote,
      })
      .from(projectMandates)
      .innerJoin(mandates, eq(mandates.id, projectMandates.mandateId))
      .where(inArray(projectMandates.projectId, ids))
      .orderBy(asc(mandates.name)),
  ]);
  return rows.map((row) => ({
    ...row,
    sources: sources.filter((source) => source.projectId === row.projectId),
    mandates: relationships
      .filter((relationship) => relationship.projectId === row.projectId)
      .map((relationship) => ({
        mandateId: relationship.mandateId,
        name: relationship.name,
        relationship: relationship.relationship,
        coverageNote: relationship.coverageNote,
      })),
  }));
}