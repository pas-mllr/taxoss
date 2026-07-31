import "server-only";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  facets,
  portfolioScopeFacets,
  portfolios,
  projectFacets,
  projects,
  projectStats,
  stars,
} from "@/lib/db/schema";
import { getProjectEvidence } from "@/lib/evaluation-data";
import { listOwnedPortfolioProjects } from "@/lib/db/portfolio-repository";
import {
  PORTFOLIO_DECISION_STATES,
  type PortfolioDecisionState,
  type PortfolioWorkspace,
  type WorkspaceEvidence,
} from "@/lib/portfolio-model";
import { projectHref } from "@/lib/sources";

export async function ensurePortfolioForUser(userId: string): Promise<{
  id: number;
  userId: string;
  name: string;
  description: string | null;
  version: number;
}> {
  await db
    .insert(portfolios)
    .values({ userId })
    .onConflictDoNothing({ target: portfolios.userId });
  const portfolio = await db
    .select({
      id: portfolios.id,
      userId: portfolios.userId,
      name: portfolios.name,
      description: portfolios.description,
      version: portfolios.version,
    })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  if (!portfolio[0]) throw new Error("Could not create portfolio.");
  return portfolio[0];
}

function groupFacetRows(
  rows: { projectId: number; kind: string; slug: string }[],
): Map<number, { jurisdictions: string[]; domains: string[]; processes: string[] }> {
  const grouped = new Map<
    number,
    { jurisdictions: string[]; domains: string[]; processes: string[] }
  >();
  for (const row of rows) {
    const item = grouped.get(row.projectId) ?? {
      jurisdictions: [],
      domains: [],
      processes: [],
    };
    if (row.kind === "jurisdiction") item.jurisdictions.push(row.slug);
    if (row.kind === "subject") item.domains.push(row.slug);
    if (row.kind === "process") item.processes.push(row.slug);
    grouped.set(row.projectId, item);
  }
  return grouped;
}

function evidenceForClient(
  evidence: Awaited<ReturnType<typeof getProjectEvidence>>,
): WorkspaceEvidence {
  return {
    repositoryActivity: {
      state: evidence.signals.repositoryActivity.state,
      pushedAt:
        evidence.signals.repositoryActivity.pushedAt?.toISOString() ?? null,
      observedAt:
        evidence.signals.repositoryActivity.observedAt?.toISOString() ?? null,
    },
    legalCurrency: evidence.signals.legalCurrency.state,
    productionReadiness: evidence.signals.productionReadiness.state,
    scorecard: evidence.signals.scorecard,
    evaluation: evidence.evaluation
      ? {
          legalScope: evidence.evaluation.legalScope,
          legalAsOf: evidence.evaluation.legalAsOf,
          publisherKind: evidence.evaluation.publisherKind,
          publisherName: evidence.evaluation.publisherName,
          licenseConfidence: evidence.evaluation.licenseConfidence,
          editorialNote: evidence.evaluation.editorialNote,
          reviewState: evidence.evaluation.reviewState,
          reviewedAt:
            evidence.evaluation.lastReviewedAt?.toISOString() ?? null,
        }
      : null,
    sources: evidence.sources.map((source) => ({
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      dimension: source.dimension,
      observedOn: source.observedOn,
    })),
    mandates: evidence.mandates.map((mandate) => ({
      slug: mandate.slug,
      name: mandate.name,
      relationship: mandate.relationship,
      coverageNote: mandate.coverageNote,
      nextPhase: mandate.nextPhase,
    })),
  };
}

export async function getPortfolioWorkspace(
  userId: string,
): Promise<PortfolioWorkspace> {
  const portfolio = await ensurePortfolioForUser(userId);
  const [
    optionRows,
    scopeRows,
    projectRows,
    shortlistRows,
    catalogProjectRows,
    catalogFacetRows,
  ] =
    await Promise.all([
      db
        .select({
          id: facets.id,
          kind: facets.kind,
          slug: facets.slug,
          name: facets.name,
        })
        .from(facets)
        .where(inArray(facets.kind, ["jurisdiction", "subject", "process"]))
        .orderBy(asc(facets.sort)),
      db
        .select({ facetId: portfolioScopeFacets.facetId })
        .from(portfolioScopeFacets)
        .where(eq(portfolioScopeFacets.portfolioId, portfolio.id)),
      listOwnedPortfolioProjects(db, userId),
      db
        .select({
          projectId: projects.id,
          owner: projects.owner,
          repo: projects.repo,
          name: projects.name,
          source: projects.source,
          sourceType: projects.sourceType,
          archived: sql<boolean>`coalesce(${projectStats.archived}, 0)`,
        })
        .from(stars)
        .innerJoin(projects, eq(projects.id, stars.projectId))
        .leftJoin(projectStats, eq(projectStats.projectId, projects.id))
        .where(eq(stars.userId, userId))
        .orderBy(asc(projects.owner), asc(projects.repo)),
      db
        .select({
          projectId: projects.id,
          owner: projects.owner,
          repo: projects.repo,
          name: projects.name,
          source: projects.source,
          sourceType: projects.sourceType,
        })
        .from(projects)
        .leftJoin(projectStats, eq(projectStats.projectId, projects.id))
        .where(sql`coalesce(${projectStats.archived}, 0) = 0`)
        .orderBy(asc(projects.owner), asc(projects.repo)),
      db
        .select({
          projectId: projectFacets.projectId,
          kind: facets.kind,
          slug: facets.slug,
        })
        .from(projectFacets)
        .innerJoin(facets, eq(facets.id, projectFacets.facetId))
        .innerJoin(projects, eq(projects.id, projectFacets.projectId))
        .where(inArray(facets.kind, ["jurisdiction", "subject", "process"]))
        .orderBy(asc(facets.sort)),
    ]);

  const groupedFacets = groupFacetRows(catalogFacetRows);
  const evidence = await Promise.all(
    projectRows.map((project) => getProjectEvidence(project.projectId)),
  );
  const shortlistEvidence = await Promise.all(
    shortlistRows.map((project) => getProjectEvidence(project.projectId)),
  );

  return {
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description ?? "",
      version: portfolio.version,
    },
    options: {
      jurisdictions: optionRows.filter((facet) => facet.kind === "jurisdiction"),
      domains: optionRows.filter((facet) => facet.kind === "subject"),
      processes: optionRows.filter((facet) => facet.kind === "process"),
    },
    selectedScopeFacetIds: scopeRows.map((row) => row.facetId),
    projects: projectRows.map((project, index) => {
      const assigned = groupedFacets.get(project.projectId) ?? {
        jurisdictions: [],
        domains: [],
        processes: [],
      };
      return {
        id: project.projectId,
        owner: project.owner,
        repo: project.repo,
        name: project.name,
        source: project.source,
        sourceType: project.sourceType,
        href: projectHref(project),
        archived: Boolean(project.archived),
        portfolioMember: true,
        version: project.version,
        decisionState: PORTFOLIO_DECISION_STATES.includes(
          project.decisionState as PortfolioDecisionState,
        )
          ? (project.decisionState as PortfolioDecisionState)
          : "candidate",
        notes: project.notes ?? "",
        ...assigned,
        evidence: evidenceForClient(evidence[index]),
      };
    }),
    shortlist: shortlistRows.map((project, index) => {
      const assigned = groupedFacets.get(project.projectId) ?? {
        jurisdictions: [],
        domains: [],
        processes: [],
      };
      return {
        id: project.projectId,
        owner: project.owner,
        repo: project.repo,
        name: project.name,
        source: project.source,
        sourceType: project.sourceType,
        href: projectHref(project),
        archived: Boolean(project.archived),
        portfolioMember: false,
        version: 0,
        decisionState: "candidate",
        notes: "",
        ...assigned,
        evidence: evidenceForClient(shortlistEvidence[index]),
      };
    }),
    catalog: catalogProjectRows.map((project) => ({
      id: project.projectId,
      owner: project.owner,
      repo: project.repo,
      name: project.name,
      href: projectHref(project),
      ...(groupedFacets.get(project.projectId) ?? {
        jurisdictions: [],
        domains: [],
        processes: [],
      }),
    })),
  };
}
