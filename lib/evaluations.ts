import { projectHealth } from "@/lib/health";

export const LEGAL_CURRENCY_STATES = [
  "unreviewed",
  "current",
  "partial",
  "outdated",
  "not-applicable",
] as const;
export type LegalCurrencyState = (typeof LEGAL_CURRENCY_STATES)[number];

export const PRODUCTION_READINESS_STATES = [
  "unreviewed",
  "experimental",
  "pilot",
  "production-evidence",
  "not-applicable",
] as const;
export type ProductionReadinessState =
  (typeof PRODUCTION_READINESS_STATES)[number];

export const RUBRIC_STATES = [
  "unreviewed",
  "limited",
  "documented",
  "strong",
  "not-applicable",
] as const;
export type RubricState = (typeof RUBRIC_STATES)[number];

export const SCORECARD_DIMENSIONS = [
  "documentation",
  "automatedTests",
  "releaseDiscipline",
  "securityProcess",
  "deploymentOperability",
  "dataHandling",
  "governanceContinuity",
  "supportPath",
] as const;
export type ScorecardDimension = (typeof SCORECARD_DIMENSIONS)[number];
export type ProjectScorecard = Record<ScorecardDimension, RubricState>;

export const PUBLISHER_KINDS = [
  "unknown",
  "tax-authority",
  "government",
  "company",
  "nonprofit",
  "academic",
  "community",
  "individual",
] as const;
export type PublisherKind = (typeof PUBLISHER_KINDS)[number];

export const LICENSE_CONFIDENCE_STATES = [
  "unreviewed",
  "host-detected",
  "declared",
  "reviewed",
  "conflict",
] as const;
export type LicenseConfidenceState =
  (typeof LICENSE_CONFIDENCE_STATES)[number];

export const PROJECT_MANDATE_RELATIONSHIPS = [
  "implements",
  "validates",
  "transmits-files",
  "reference",
] as const;
export type ProjectMandateRelationship =
  (typeof PROJECT_MANDATE_RELATIONSHIPS)[number];

export type ProjectEvaluationValue = {
  legalCurrency: LegalCurrencyState;
  productionReadiness: ProductionReadinessState;
  scorecard: ProjectScorecard;
};

export function emptyProjectScorecard(): ProjectScorecard {
  return Object.fromEntries(
    SCORECARD_DIMENSIONS.map((dimension) => [dimension, "unreviewed"]),
  ) as ProjectScorecard;
}

export function emptyProjectEvaluation(): ProjectEvaluationValue {
  return {
    legalCurrency: "unreviewed",
    productionReadiness: "unreviewed",
    scorecard: emptyProjectScorecard(),
  };
}

export type RepositoryActivityState =
  | "active"
  | "maintained"
  | "quiet"
  | "stale"
  | "archived"
  | "unknown";

export type ProjectSignalBundle = {
  repositoryActivity: {
    state: RepositoryActivityState;
    pushedAt: Date | null;
    observedAt: Date | null;
  };
  legalCurrency: { state: LegalCurrencyState };
  productionReadiness: { state: ProductionReadinessState };
  scorecard: ProjectScorecard;
};

export function buildProjectSignalBundle(input: {
  pushedAt: Date | null;
  archived: boolean;
  statsFetchedAt: Date | null;
  evaluation: ProjectEvaluationValue | null;
  observedAt?: number;
}): ProjectSignalBundle {
  const observedAt = input.observedAt ?? Date.now();
  const health = input.archived
    ? null
    : projectHealth(input.pushedAt, observedAt);
  const evaluation = input.evaluation ?? emptyProjectEvaluation();

  return {
    repositoryActivity: {
      state: input.archived ? "archived" : (health?.key ?? "unknown"),
      pushedAt: input.pushedAt,
      observedAt: input.statsFetchedAt,
    },
    legalCurrency: { state: evaluation.legalCurrency },
    productionReadiness: { state: evaluation.productionReadiness },
    scorecard: evaluation.scorecard,
  };
}