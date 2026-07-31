import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type EvaluationSeed = {
  fullNameKey: string;
  legalCurrency: string;
  legalAsOf: string | null;
  legalScope: string;
  productionReadiness: string;
  publisherKind: string;
  publisherName: string;
  publisherRelationship: string;
  licenseConfidence: string;
  scorecard: {
    documentation: string;
    automatedTests: string;
    releaseDiscipline: string;
    securityProcess: string;
    deploymentOperability: string;
    dataHandling: string;
    governanceContinuity: string;
    supportPath: string;
  };
  editorialNote: string;
  sources: {
    dimension: string;
    title: string;
    publisher: string;
    url: string;
    citation: string;
  }[];
  mandates?: {
    mandateSlug: string;
    relationship: string;
    coverageNote: string;
  }[];
};

export const PROJECT_EVALUATION_SEED: EvaluationSeed[] = [
  {
    fullNameKey: "catalalang/catala",
    legalCurrency: "not-applicable",
    legalAsOf: null,
    legalScope:
      "Catala is a language and compiler for implementing legislation; legal currency belongs to each law implementation, not the framework itself.",
    productionReadiness: "experimental",
    publisherKind: "academic",
    publisherName: "Inria / Catala contributors",
    publisherRelationship:
      "The repository describes Catala as an Inria research project developed with legal professionals.",
    licenseConfidence: "declared",
    scorecard: {
      documentation: "strong",
      automatedTests: "documented",
      releaseDiscipline: "documented",
      securityProcess: "unreviewed",
      deploymentOperability: "documented",
      dataHandling: "not-applicable",
      governanceContinuity: "documented",
      supportPath: "documented",
    },
    editorialNote:
      "The framework is highly relevant for auditable rules-as-code work, but its own README says the compiler remains unstable. Evaluate the specific law package and generated application separately.",
    sources: [
      {
        dimension: "general",
        title: "Catala repository README",
        publisher: "CatalaLang",
        url: "https://github.com/CatalaLang/catala",
        citation:
          "Documents the research-project status, limitations, Apache-2.0 license, test suite, tooling, and intended legislative-programming use.",
      },
      {
        dimension: "documentation",
        title: "The Catala Book",
        publisher: "Catala project",
        url: "https://book.catala-lang.org/",
        citation: "Public tutorials, installation guidance, and language reference.",
      },
    ],
  },
  {
    fullNameKey: "invopop/gobl",
    legalCurrency: "partial",
    legalAsOf: "2026-07-31",
    legalScope:
      "GOBL provides a global invoice schema and jurisdiction-specific addons. Currency and completeness vary by addon and supported local regime.",
    productionReadiness: "pilot",
    publisherKind: "company",
    publisherName: "Invopop and contributors",
    publisherRelationship:
      "Invopop develops GOBL publicly and provides documentation, community support, and companion tooling.",
    licenseConfidence: "declared",
    scorecard: {
      documentation: "strong",
      automatedTests: "strong",
      releaseDiscipline: "strong",
      securityProcess: "unreviewed",
      deploymentOperability: "documented",
      dataHandling: "not-applicable",
      governanceContinuity: "documented",
      supportPath: "documented",
    },
    editorialNote:
      "A strong candidate for a canonical invoice and validation layer. Adoption still requires addon-by-addon legal coverage review, integration controls, archiving, and submission-channel decisions.",
    sources: [
      {
        dimension: "general",
        title: "GOBL repository README",
        publisher: "Invopop",
        url: "https://github.com/invopop/gobl",
        citation:
          "Documents schemas, calculations, validation, addons, Apache-2.0 licensing, companion projects, tests, and releases.",
      },
      {
        dimension: "documentation",
        title: "GOBL documentation",
        publisher: "Invopop",
        url: "https://docs.gobl.org/",
        citation: "Public implementation and schema documentation.",
      },
    ],
  },
  {
    fullNameKey: "irs-public/direct-file",
    legalCurrency: "outdated",
    legalAsOf: "2024-12-31",
    legalScope:
      "The published logic was developed for Tax Year 2024 federal filing and is not a current filing implementation.",
    productionReadiness: "not-applicable",
    publisherKind: "tax-authority",
    publisherName: "Internal Revenue Service",
    publisherRelationship:
      "The repository states that Direct File was developed by an in-house IRS team with government and vendor support.",
    licenseConfidence: "declared",
    scorecard: {
      documentation: "strong",
      automatedTests: "documented",
      releaseDiscipline: "limited",
      securityProcess: "limited",
      deploymentOperability: "limited",
      dataHandling: "documented",
      governanceContinuity: "limited",
      supportPath: "limited",
    },
    editorialNote:
      "Historical reference only. The repository is archived, may contain unpatched or unknown vulnerabilities, and explicitly says it should not be used in production systems.",
    sources: [
      {
        dimension: "general",
        title: "Direct File repository README",
        publisher: "IRS-Public",
        url: "https://github.com/IRS-Public/direct-file",
        citation:
          "States Tax Year 2024 scope, archive status, vulnerability warning, production-use prohibition, and excluded sensitive code/data.",
      },
    ],
  },
  {
    fullNameKey: "cirfmf/ksef-api",
    legalCurrency: "current",
    legalAsOf: "2026-07-31",
    legalScope:
      "Official KSeF API tooling and technical reference for Poland's national structured-invoice system; taxpayer and transaction applicability remains governed by the official KSeF rules.",
    productionReadiness: "pilot",
    publisherKind: "tax-authority",
    publisherName: "Polish Ministry of Finance",
    publisherRelationship:
      "The repository is published by the Ministry of Finance's official GitHub organization for KSeF API materials.",
    licenseConfidence: "declared",
    scorecard: {
      documentation: "strong",
      automatedTests: "documented",
      releaseDiscipline: "strong",
      securityProcess: "unreviewed",
      deploymentOperability: "documented",
      dataHandling: "documented",
      governanceContinuity: "strong",
      supportPath: "documented",
    },
    editorialNote:
      "Authority publication is strong provenance evidence, not a substitute for integration testing, credentials, business-process controls, exception handling, or operational support.",
    sources: [
      {
        dimension: "general",
        title: "Official KSeF API repository",
        publisher: "Polish Ministry of Finance",
        url: "https://github.com/CIRFMF/ksef-api",
        citation: "Official API documentation, examples, releases, and technical materials.",
      },
      {
        dimension: "legal-currency",
        title: "Scope of mandatory KSeF",
        publisher: "Polish Ministry of Finance",
        url: "https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/zakres-obowiazkowego-ksef/",
        citation: "Current dates, taxpayer scope, transaction exclusions, and temporary relief.",
      },
    ],
    mandates: [
      {
        mandateSlug: "poland-ksef",
        relationship: "reference",
        coverageNote:
          "Official API and technical reference for the KSeF platform; it does not by itself provide an end-to-end compliant business process.",
      },
    ],
  },
];

const REVIEWED_AT = new Date("2026-07-31T12:00:00Z");
const REVIEW_DUE_AT = new Date("2026-10-31T12:00:00Z");

export function seedProjectEvaluations(
  database: BetterSQLite3Database<typeof schema>,
): void {
  for (const seed of PROJECT_EVALUATION_SEED) {
    const project = database
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.fullNameKey, seed.fullNameKey))
      .limit(1)
      .get();
    if (!project) continue;

    database.transaction((tx) => {
      const inserted = tx
        .insert(schema.projectEvaluations)
        .values({
          projectId: project.id,
          status: "published",
          legalCurrency: seed.legalCurrency,
          legalAsOf: seed.legalAsOf,
          legalScope: seed.legalScope,
          productionReadiness: seed.productionReadiness,
          publisherKind: seed.publisherKind,
          publisherName: seed.publisherName,
          publisherRelationship: seed.publisherRelationship,
          licenseConfidence: seed.licenseConfidence,
          ...seed.scorecard,
          editorialNote: seed.editorialNote,
          reviewerName: "TaxOSS editorial review",
          lastReviewedAt: REVIEWED_AT,
          reviewDueAt: REVIEW_DUE_AT,
          publishedAt: REVIEWED_AT,
        })
        .onConflictDoNothing()
        .returning({ projectId: schema.projectEvaluations.projectId })
        .get();
      if (!inserted) return;

      for (const source of seed.sources) {
        tx.insert(schema.projectEvaluationSources)
          .values({
            projectId: project.id,
            kind: "primary",
            ...source,
            observedOn: "2026-07-31",
          })
          .run();
      }

      for (const relationship of seed.mandates ?? []) {
        const mandate = tx
          .select({ id: schema.mandates.id })
          .from(schema.mandates)
          .where(eq(schema.mandates.slug, relationship.mandateSlug))
          .limit(1)
          .get();
        if (!mandate) continue;
        tx.insert(schema.projectMandates)
          .values({
            projectId: project.id,
            mandateId: mandate.id,
            relationship: relationship.relationship,
            coverageNote: relationship.coverageNote,
          })
          .run();
      }
    });
  }
}