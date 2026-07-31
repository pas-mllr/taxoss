import { createMcpHandler } from "mcp-handler";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  categories,
  facets,
  projectCategories,
  projectFacets,
  projects,
  projectStats,
} from "@/lib/db/schema";
import { listProjects, type SortKey } from "@/lib/projects";
import { getProjectEvidence } from "@/lib/evaluation-data";
import { getMandateBySlug, listMandates } from "@/lib/mandate-data";
import { hfKey } from "@/lib/huggingface";
import { detectSource } from "@/lib/index-repo";
import { projectHref, sourceExternalUrl } from "@/lib/sources";
import { SITE_URL } from "@/lib/site";

/**
 * TaxOSS MCP server — read-only discovery tools over the index, served as
 * stateless streamable HTTP at /api/mcp. No auth: it exposes nothing the
 * public site doesn't.
 */

const SORT_VALUES = ["site-stars", "stars", "rating", "newest", "active"] as const;
const REVIEW_STATES = ["unreviewed", "current", "overdue"] as const;

function text(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_projects",
      {
        title: "Search TaxOSS",
        description:
          "Search the TaxOSS index of open-source tax software. All filters combine (AND). Returns compact project summaries with links.",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("Free-text search over name, tagline, and description"),
          category: z
            .string()
            .optional()
            .describe(
              "Category slug, e.g. mcp-servers, tax-engines, invoicing (see list_categories)",
            ),
          jurisdiction: z
            .string()
            .optional()
            .describe("Jurisdiction facet slug, e.g. us, de, eu, global (see list_facets)"),
          subject: z
            .string()
            .optional()
            .describe("Tax domain facet slug, e.g. vat-gst-sales, pillar-two (see list_facets)"),
          process: z
            .string()
            .optional()
            .describe("Process facet slug, e.g. interpret, validate, file (see list_facets)"),
          sort: z.enum(SORT_VALUES).optional().describe("Ranking; default site-stars"),
          limit: z.number().int().min(1).max(50).optional().describe("Max results, default 10"),
        }),
      },
      async ({ query, category, jurisdiction, subject, process, sort, limit }) => {
        const { items, total } = await listProjects({
          q: query,
          categorySlug: category,
          jurisdiction,
          subject,
          process,
          sort: (sort as SortKey) ?? "site-stars",
          limit: limit ?? 10,
        });
        return text({
          total,
          results: items.map((p) => ({
            name: `${p.owner}/${p.repo}`,
            source: p.source,
            description: p.tagline ?? p.description,
            stars: p.ghStars,
            language: p.language,
            license: p.licenseSpdx,
            lastPush: p.pushedAt,
            categories: p.categories.map((c) => c.slug),
            page: `${SITE_URL}${projectHref(p)}`,
            repo: sourceExternalUrl(p),
          })),
        });
      },
    );

    server.registerTool(
      "get_project",
      {
        title: "Get a TaxOSS project",
        description:
          "Get one project's full record: stats, license, categories, jurisdictions, tax domains, and evidence. Accepts GitHub owner/name or a huggingface.co URL.",
        inputSchema: z.object({
          repo: z
            .string()
            .describe(
              'e.g. "IRS-Public/direct-file" or "https://huggingface.co/datasets/louisbrulenaudet/bofip"',
            ),
        }),
      },
      async ({ repo }) => {
        const detected = detectSource(repo);
        if (!detected) return text({ error: "Unrecognized repo reference." });
        const key =
          detected.source === "huggingface"
            ? hfKey(detected.type, detected.owner, detected.repo)
            : `${detected.owner}/${detected.repo}`.toLowerCase();
        const rows = await db
          .select({
            id: projects.id,
            source: projects.source,
            sourceType: projects.sourceType,
            owner: projects.owner,
            repo: projects.repo,
            tagline: projects.tagline,
            websiteUrl: projects.websiteUrl,
            description: projectStats.description,
            language: projectStats.language,
            license: projectStats.licenseSpdx,
            stars: projectStats.stars,
            forks: projectStats.forks,
            downloads: projectStats.downloads,
            openIssues: projectStats.openIssues,
            pushedAt: projectStats.pushedAt,
            archived: projectStats.archived,
            topics: projectStats.topics,
          })
          .from(projects)
          .leftJoin(projectStats, eq(projectStats.projectId, projects.id))
          .where(eq(projects.fullNameKey, key))
          .limit(1);
        const p = rows[0];
        if (!p) return text({ error: `${repo} is not in the TaxOSS index.` });

        const [cats, facetRows, evidence] = await Promise.all([
          db
            .select({ slug: categories.slug, name: categories.name })
            .from(projectCategories)
            .innerJoin(categories, eq(categories.id, projectCategories.categoryId))
            .where(eq(projectCategories.projectId, p.id)),
          db
            .select({ kind: facets.kind, slug: facets.slug, name: facets.name })
            .from(projectFacets)
            .innerJoin(facets, eq(facets.id, projectFacets.facetId))
            .where(eq(projectFacets.projectId, p.id)),
          getProjectEvidence(p.id),
        ]);

        return text({
          source: p.source,
          sourceType: p.sourceType,
          owner: p.owner,
          repo: p.repo,
          tagline: p.tagline,
          websiteUrl: p.websiteUrl,
          description: p.description,
          language: p.language,
          license: p.license,
          stars: p.stars,
          forks: p.forks,
          downloads: p.downloads,
          openIssues: p.openIssues,
          pushedAt: p.pushedAt,
          archived: p.archived,
          topics: p.topics,
          categories: cats,
          jurisdictions: facetRows
            .filter((f) => f.kind === "jurisdiction")
            .map((f) => ({ slug: f.slug, name: f.name })),
          subjects: facetRows
            .filter((f) => f.kind === "subject")
            .map((f) => ({ slug: f.slug, name: f.name })),
          domains: facetRows
            .filter((f) => f.kind === "subject")
            .map((f) => ({ slug: f.slug, name: f.name })),
          processes: facetRows
            .filter((f) => f.kind === "process")
            .map((f) => ({ slug: f.slug, name: f.name })),
          signals: evidence.signals,
          assessment: evidence.evaluation
            ? {
                legalScope: evidence.evaluation.legalScope,
                legalAsOf: evidence.evaluation.legalAsOf,
                publisherKind: evidence.evaluation.publisherKind,
                publisherName: evidence.evaluation.publisherName,
                publisherRelationship:
                  evidence.evaluation.publisherRelationship,
                licenseConfidence: evidence.evaluation.licenseConfidence,
                editorialNote: evidence.evaluation.editorialNote,
                reviewState: evidence.evaluation.reviewState,
                reviewedAt: evidence.evaluation.lastReviewedAt,
                reviewedBy: evidence.evaluation.reviewerName,
              }
            : null,
          scorecard: evidence.signals.scorecard,
          evidence: evidence.sources.map((source) => ({
            dimension: source.dimension,
            title: source.title,
            publisher: source.publisher,
            url: source.url,
            observedOn: source.observedOn,
          })),
          mandates: evidence.mandates,
          claimProvenance: evidence.claimProvenance,
          assessmentDisclaimer:
            "Evidence-based editorial assessment, not certification or legal advice.",
          page: `${SITE_URL}${projectHref(p)}`,
          repoUrl: sourceExternalUrl(p),
        });
      },
    );

    server.registerTool(
      "list_mandates",
      {
        title: "List TaxOSS mandates",
        description:
          "List published, source-backed tax mandate records with phases, scope, exceptions, and review state.",
        inputSchema: z.object({
          jurisdiction: z
            .string()
            .optional()
            .describe("Jurisdiction slug, e.g. es, pl, uk, eu"),
          lifecycle: z
            .string()
            .optional()
            .describe("Lifecycle such as ahead, in-force, phased, or historical"),
          reviewState: z
            .enum(REVIEW_STATES)
            .optional()
            .describe("Editorial review freshness"),
        }),
      },
      async ({ jurisdiction, lifecycle, reviewState }) => {
        const rows = await listMandates({
          jurisdiction,
          lifecycle,
          reviewState,
        });
        return text(
          rows.map((mandate) => ({
            slug: mandate.slug,
            name: mandate.name,
            jurisdiction: {
              slug: mandate.jurisdictionSlug,
              name: mandate.jurisdictionName,
            },
            summary: mandate.summary,
            lifecycle: mandate.lifecycle,
            reviewState: mandate.reviewState,
            reviewedAt: mandate.lastReviewedAt,
            phases: mandate.phases.map((phase) => ({
              label: phase.label,
              type: phase.phaseType,
              effectiveFrom: phase.effectiveFrom,
              effectiveTo: phase.effectiveTo,
            })),
            page: `${SITE_URL}/mandates/${mandate.slug}`,
          })),
        );
      },
    );

    server.registerTool(
      "get_mandate",
      {
        title: "Get a TaxOSS mandate",
        description:
          "Get one published mandate's legal basis, applicability, phases, exceptions, classified sources, and review metadata.",
        inputSchema: z.object({
          slug: z.string().describe("Mandate slug from list_mandates"),
        }),
      },
      async ({ slug }) => {
        const mandate = await getMandateBySlug(slug);
        if (!mandate) return text({ error: `${slug} is not a published mandate.` });
        return text({
          slug: mandate.slug,
          name: mandate.name,
          jurisdiction: {
            slug: mandate.jurisdictionSlug,
            name: mandate.jurisdictionName,
          },
          summary: mandate.summary,
          legalBasis: mandate.legalBasis,
          scope: mandate.scope,
          exceptions: mandate.exceptions,
          lifecycle: mandate.lifecycle,
          reviewState: mandate.reviewState,
          reviewedAt: mandate.lastReviewedAt,
          reviewDueAt: mandate.reviewDueAt,
          reviewedBy: mandate.reviewerName,
          phases: mandate.phases.map((phase) => ({
            slug: phase.slug,
            label: phase.label,
            type: phase.phaseType,
            effectiveFrom: phase.effectiveFrom,
            effectiveTo: phase.effectiveTo,
            scope: phase.scope,
            exceptions: phase.exceptions,
          })),
          sources: mandate.sources.map((source) => {
            const phase = source.phaseId
              ? mandate.phases.find((item) => item.id === source.phaseId)
              : null;
            return {
              kind: source.kind,
              title: source.title,
              publisher: source.publisher,
              url: source.url,
              citation: source.citation,
              publishedOn: source.publishedOn,
              accessedOn: source.accessedOn,
              supports: source.supports,
              phase: phase
                ? { slug: phase.slug, label: phase.label }
                : null,
            };
          }),
          disclaimer:
            "Editorial research record, not legal advice or a statement that software makes an organization compliant.",
          page: `${SITE_URL}/mandates/${mandate.slug}`,
        });
      },
    );

    server.registerTool(
      "list_categories",
      {
        title: "List TaxOSS categories",
        description: "List all TaxOSS categories (tool types) with project counts.",
        inputSchema: z.object({}),
      },
      async () => {
        const rows = await db
          .select({
            slug: categories.slug,
            name: categories.name,
            blurb: categories.blurb,
            count: sql<number>`(select count(*) from ${projectCategories} where ${projectCategories.categoryId} = ${categories.id})`,
          })
          .from(categories)
          .orderBy(categories.sort);
        return text(rows);
      },
    );

    server.registerTool(
      "list_facets",
      {
        title: "List TaxOSS facets",
        description: "List all jurisdiction, tax-domain, and process facets with project counts.",
        inputSchema: z.object({}),
      },
      async () => {
        const rows = await db
          .select({
            kind: facets.kind,
            slug: facets.slug,
            name: facets.name,
            count: sql<number>`(select count(*) from ${projectFacets} where ${projectFacets.facetId} = ${facets.id})`,
          })
          .from(facets)
          .orderBy(facets.sort);
        return text({
          jurisdictions: rows.filter((r) => r.kind === "jurisdiction"),
          subjects: rows.filter((r) => r.kind === "subject"),
          processes: rows.filter((r) => r.kind === "process"),
        });
      },
    );
  },
  {
    serverInfo: { name: "taxoss", version: "1.2.0" },
    instructions:
      "TaxOSS indexes open-source tax software and source-backed tax mandate records. Use search_projects to find tools, list_categories/list_facets to discover filter values, get_project for project evidence, and list_mandates/get_mandate for reviewed regulatory context. Assessments are editorial research, not certification or legal advice.",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
