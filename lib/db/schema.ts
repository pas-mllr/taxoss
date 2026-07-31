import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/** Mirror of the Clerk user, upserted lazily on first authenticated write. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  username: text("username"),
  name: text("name"),
  imageUrl: text("image_url"),
  githubLogin: text("github_login"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Where the repo lives: "github" or "huggingface". */
    source: text("source").notNull().default("github"),
    /** For Hugging Face: "model" | "dataset" | "space". Null for GitHub. */
    sourceType: text("source_type"),
    /** Canonical owner/repo as returned by the source API. */
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    /**
     * Uniqueness key. GitHub keeps the bare lower(owner/repo) it always had;
     * Hugging Face is prefixed lower(hf:type:owner/name) so a GitHub repo and
     * an HF repo of the same name never collide.
     */
    fullNameKey: text("full_name_key").notNull(),
    name: text("name").notNull(),
    /** Short editorial description; editable by the claimant only. */
    tagline: text("tagline"),
    websiteUrl: text("website_url"),
    /** Longer maintainer-authored writeup, shown above the GitHub README. */
    maintainerNote: text("maintainer_note"),
    submittedById: text("submitted_by_id").references(() => users.id),
    claimedById: text("claimed_by_id").references(() => users.id),
    claimedAt: integer("claimed_at", { mode: "timestamp" }),
    /** Editorial pick, set by site admins; drives the homepage rotator and newsletter. */
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    featuredAt: integer("featured_at", { mode: "timestamp" }),
    /** Set when a featured project has gone out in a newsletter issue. */
    featuredAnnouncedAt: integer("featured_announced_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("projects_full_name_key_unique").on(t.fullNameKey),
    index("projects_claimed_by_idx").on(t.claimedById),
    index("projects_featured_idx").on(t.featured),
  ],
);

/** Cached GitHub repository stats, refreshed when stale. 1:1 with projects. */
export const projectStats = sqliteTable("project_stats", {
  projectId: integer("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  /** GitHub stargazers, or Hugging Face likes. */
  stars: integer("stars").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  openIssues: integer("open_issues").notNull().default(0),
  subscribers: integer("subscribers").notNull().default(0),
  /** Hugging Face all-time downloads. 0 for GitHub. */
  downloads: integer("downloads").notNull().default(0),
  language: text("language"),
  licenseSpdx: text("license_spdx"),
  licenseName: text("license_name"),
  topics: text("topics", { mode: "json" }).$type<string[]>().notNull().default([]),
  description: text("description"),
  homepage: text("homepage"),
  defaultBranch: text("default_branch"),
  pushedAt: integer("pushed_at", { mode: "timestamp" }),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Cached README rendered to HTML by GitHub. Kept apart from stats to keep list queries light. */
export const projectReadmes = sqliteTable("project_readmes", {
  projectId: integer("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  html: text("html"),
  /** Maintainer-authored override (sanitized HTML); shown instead of the GitHub README when set. */
  customHtml: text("custom_html"),
  customUpdatedAt: integer("custom_updated_at", { mode: "timestamp" }),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Contributor = {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
};

/** Cached GitHub contributor list (top page, bots excluded). 1:1 with projects. */
export const projectContributors = sqliteTable("project_contributors", {
  projectId: integer("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  data: text("data", { mode: "json" }).$type<Contributor[]>().notNull().default([]),
  /** Total contributor count is unknown past the first page; this flags "100+". */
  hasMore: integer("has_more", { mode: "boolean" }).notNull().default(false),
  fetchedAt: integer("fetched_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  blurb: text("blurb"),
  sort: integer("sort").notNull().default(0),
});

export const projectCategories = sqliteTable(
  "project_categories",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.categoryId] })],
);

/**
 * Orthogonal filter facets: jurisdiction ("which country's tax system") and
 * subject ("which tax domain"). Kept apart from categories, which answer
 * "what kind of tool". One table, discriminated by kind, so adding a third
 * facet dimension later is a seed change rather than a migration.
 */
export const facets = sqliteTable(
  "facets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind").notNull(), // 'jurisdiction' | 'subject'
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("facets_kind_slug_unique").on(t.kind, t.slug)],
);

export const projectFacets = sqliteTable(
  "project_facets",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    facetId: integer("facet_id")
      .notNull()
      .references(() => facets.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.facetId] })],
);

/** One private multinational workspace per user. */
export const portfolios = sqliteTable(
  "portfolios",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("My tax portfolio"),
    description: text("description"),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("portfolios_user_unique").on(t.userId)],
);

export const portfolioScopeFacets = sqliteTable(
  "portfolio_scope_facets",
  {
    portfolioId: integer("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    facetId: integer("facet_id")
      .notNull()
      .references(() => facets.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.portfolioId, t.facetId] }),
    index("portfolio_scope_facets_facet_idx").on(t.facetId),
  ],
);

export const portfolioProjects = sqliteTable(
  "portfolio_projects",
  {
    portfolioId: integer("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    decisionState: text("decision_state").notNull().default("candidate"),
    notes: text("notes"),
    version: integer("version").notNull().default(1),
    removedAt: integer("removed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.portfolioId, t.projectId] }),
    index("portfolio_projects_project_idx").on(t.projectId),
  ],
);

/** Admin-reviewed regulatory obligation with phased dates and primary sources. */
export const mandates = sqliteTable(
  "mandates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    jurisdictionFacetId: integer("jurisdiction_facet_id")
      .notNull()
      .references(() => facets.id),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    legalBasis: text("legal_basis"),
    scope: text("scope").notNull(),
    exceptions: text("exceptions").notNull(),
    lifecycle: text("lifecycle").notNull().default("ahead"),
    status: text("status").notNull().default("draft"),
    reviewerId: text("reviewer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewerName: text("reviewer_name"),
    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp" }),
    reviewDueAt: integer("review_due_at", { mode: "timestamp" }),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("mandates_slug_unique").on(t.slug),
    index("mandates_jurisdiction_idx").on(t.jurisdictionFacetId),
    index("mandates_status_idx").on(t.status),
    index("mandates_review_due_idx").on(t.reviewDueAt),
  ],
);

export const mandatePhases = sqliteTable(
  "mandate_phases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mandateId: integer("mandate_id")
      .notNull()
      .references(() => mandates.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    phaseType: text("phase_type").notNull().default("obligation"),
    /** Date-only ISO value (YYYY-MM-DD), intentionally not a timestamp. */
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    scope: text("scope").notNull(),
    exceptions: text("exceptions").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [
    uniqueIndex("mandate_phases_mandate_slug_unique").on(t.mandateId, t.slug),
    index("mandate_phases_mandate_idx").on(t.mandateId),
    index("mandate_phases_effective_idx").on(t.effectiveFrom),
  ],
);

export const mandateSources = sqliteTable(
  "mandate_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mandateId: integer("mandate_id")
      .notNull()
      .references(() => mandates.id, { onDelete: "cascade" }),
    phaseId: integer("phase_id").references(() => mandatePhases.id, {
      onDelete: "cascade",
    }),
    kind: text("kind").notNull().default("primary"),
    title: text("title").notNull(),
    publisher: text("publisher").notNull(),
    url: text("url").notNull(),
    citation: text("citation"),
    publishedOn: text("published_on"),
    accessedOn: text("accessed_on").notNull(),
    supports: text("supports", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("mandate_sources_mandate_idx").on(t.mandateId),
    index("mandate_sources_phase_idx").on(t.phaseId),
  ],
);

export const projectMandates = sqliteTable(
  "project_mandates",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mandateId: integer("mandate_id")
      .notNull()
      .references(() => mandates.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
    coverageNote: text("coverage_note"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.mandateId, t.relationship] }),
    index("project_mandates_mandate_idx").on(t.mandateId),
  ],
);

/** Evidence-based editorial assessment. No composite score is stored or shown. */
export const projectEvaluations = sqliteTable(
  "project_evaluations",
  {
    projectId: integer("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    legalCurrency: text("legal_currency").notNull().default("unreviewed"),
    legalAsOf: text("legal_as_of"),
    legalScope: text("legal_scope"),
    productionReadiness: text("production_readiness")
      .notNull()
      .default("unreviewed"),
    publisherKind: text("publisher_kind").notNull().default("unknown"),
    publisherName: text("publisher_name"),
    publisherRelationship: text("publisher_relationship"),
    licenseConfidence: text("license_confidence")
      .notNull()
      .default("unreviewed"),
    documentation: text("documentation").notNull().default("unreviewed"),
    automatedTests: text("automated_tests").notNull().default("unreviewed"),
    releaseDiscipline: text("release_discipline").notNull().default("unreviewed"),
    securityProcess: text("security_process").notNull().default("unreviewed"),
    deploymentOperability: text("deployment_operability")
      .notNull()
      .default("unreviewed"),
    dataHandling: text("data_handling").notNull().default("unreviewed"),
    governanceContinuity: text("governance_continuity")
      .notNull()
      .default("unreviewed"),
    supportPath: text("support_path").notNull().default("unreviewed"),
    editorialNote: text("editorial_note"),
    reviewerId: text("reviewer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewerName: text("reviewer_name"),
    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp" }),
    reviewDueAt: integer("review_due_at", { mode: "timestamp" }),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("project_evaluations_status_idx").on(t.status),
    index("project_evaluations_review_due_idx").on(t.reviewDueAt),
  ],
);

export const projectEvaluationSources = sqliteTable(
  "project_evaluation_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectEvaluations.projectId, { onDelete: "cascade" }),
    dimension: text("dimension").notNull(),
    kind: text("kind").notNull().default("primary"),
    title: text("title").notNull(),
    publisher: text("publisher").notNull(),
    url: text("url").notNull(),
    citation: text("citation"),
    observedOn: text("observed_on").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("project_evaluation_sources_project_idx").on(t.projectId)],
);

/**
 * GitHub releases per project, harvested by the radar refresh endpoint.
 * Powers the /radar "what's new" page; one row per (project, tag).
 */
export const projectReleases = sqliteTable(
  "project_releases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    name: text("name"),
    url: text("url").notNull(),
    prerelease: integer("prerelease", { mode: "boolean" }).notNull().default(false),
    publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("project_releases_project_tag_unique").on(t.projectId, t.tag),
    index("project_releases_published_idx").on(t.publishedAt),
  ],
);

/** Site-level stars ("endorsements"), independent of GitHub stargazers. */
export const stars = sqliteTable(
  "stars",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("comments_project_idx").on(t.projectId)],
);

/** One structured review per user per project: 1–5 rating plus text. */
export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("reviews_project_user_unique").on(t.projectId, t.userId),
    index("reviews_project_idx").on(t.projectId),
  ],
);

/**
 * GitHub accounts the claimant has granted maintainer rights to. Matched
 * against the login of a member's connected GitHub account, so the grant takes
 * effect the moment that person signs in with GitHub — no claim flow needed.
 */
export const projectMaintainers = sqliteTable(
  "project_maintainers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** Stored lowercased; GitHub logins are case-insensitive. */
    githubLogin: text("github_login").notNull(),
    addedById: text("added_by_id").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("project_maintainers_project_login_unique").on(
      t.projectId,
      t.githubLogin,
    ),
    index("project_maintainers_login_idx").on(t.githubLogin),
  ],
);

/** Audit log of successful ownership claims. Current claimant lives on projects.claimedById. */
export const claims = sqliteTable(
  "claims",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    githubLogin: text("github_login").notNull(),
    /** "owner-match" (repo owner is the user) or "admin-permission" (org repo, admin rights). */
    method: text("method").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("claims_project_idx").on(t.projectId)],
);
