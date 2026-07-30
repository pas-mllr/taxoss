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
            .describe("Tax subject facet slug, e.g. vat-gst-sales, personal-tax (see list_facets)"),
          sort: z.enum(SORT_VALUES).optional().describe("Ranking; default site-stars"),
          limit: z.number().int().min(1).max(50).optional().describe("Max results, default 10"),
        }),
      },
      async ({ query, category, jurisdiction, subject, sort, limit }) => {
        const { items, total } = await listProjects({
          q: query,
          categorySlug: category,
          jurisdiction,
          subject,
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
          "Get one project's full record: stats, license, categories, jurisdictions, and tax subjects. Accepts GitHub owner/name or a huggingface.co URL.",
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

        const [cats, facetRows] = await Promise.all([
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
        ]);

        const { id: _id, ...rest } = p;
        return text({
          ...rest,
          categories: cats,
          jurisdictions: facetRows
            .filter((f) => f.kind === "jurisdiction")
            .map((f) => ({ slug: f.slug, name: f.name })),
          subjects: facetRows
            .filter((f) => f.kind === "subject")
            .map((f) => ({ slug: f.slug, name: f.name })),
          page: `${SITE_URL}${projectHref(p)}`,
          repoUrl: sourceExternalUrl(p),
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
        description: "List all jurisdiction and tax-subject facets with project counts.",
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
        });
      },
    );
  },
  {
    serverInfo: { name: "taxoss", version: "1.0.0" },
    instructions:
      "TaxOSS indexes open-source tax software: engines, filing tools, e-invoicing libraries, MCP servers, AI models, and datasets across 19 jurisdictions. Use search_projects to find tools, list_categories/list_facets to discover filter values, and get_project for full details.",
  },
);

export { handler as GET, handler as POST, handler as DELETE };
