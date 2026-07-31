import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projects, projectStats } from "@/lib/db/schema";
import { SITE_URL } from "@/lib/site";
import { projectHref } from "@/lib/sources";
import { JURISDICTION_CONTENT } from "@/lib/jurisdictions";
import { listMandates } from "@/lib/mandate-data";

export const dynamic = "force-dynamic";

/** DB-driven sitemap: every project page plus the browsing surfaces. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projectRows, categoryRows, mandateRows] = await Promise.all([
    db
      .select({
        source: projects.source,
        sourceType: projects.sourceType,
        owner: projects.owner,
        repo: projects.repo,
        updatedAt: projects.updatedAt,
        pushedAt: projectStats.pushedAt,
      })
      .from(projects)
      .leftJoin(projectStats, eq(projectStats.projectId, projects.id)),
    db.select({ slug: categories.slug }).from(categories),
    listMandates(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/stack`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/insights`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/jurisdictions`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/methodology`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/radar`, changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE_URL}/mcp`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categoryRows.map((c) => ({
    url: `${SITE_URL}/?category=${c.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const jurisdictionEntries: MetadataRoute.Sitemap = Object.keys(
    JURISDICTION_CONTENT,
  ).map((slug) => ({
    url: `${SITE_URL}/jurisdictions/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const mandateEntries: MetadataRoute.Sitemap = mandateRows.map((mandate) => ({
    url: `${SITE_URL}/mandates/${mandate.slug}`,
    lastModified: mandate.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const projectEntries: MetadataRoute.Sitemap = projectRows.map((p) => ({
    url: `${SITE_URL}${projectHref(p)}`,
    lastModified: p.pushedAt ?? p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...jurisdictionEntries,
    ...mandateEntries,
    ...projectEntries,
  ];
}
