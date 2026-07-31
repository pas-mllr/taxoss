import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluationArchiveSchema,
  evaluationFormSchema,
  evaluationPublishSchema,
  mandateArchiveSchema,
  mandateFormSchema,
  mandatePublishSchema,
} from "./evidence-forms";

const mandate = {
  expectedVersion: 0,
  slug: "test-mandate",
  jurisdictionFacetId: 1,
  name: "Test mandate",
  summary: "Summary",
  legalBasis: "Legal basis",
  scope: "Scope",
  exceptions: "No exceptions recorded.",
  lifecycle: "ahead" as const,
  phases: [
    {
      slug: "first-phase",
      label: "First phase",
      phaseType: "obligation",
      effectiveFrom: "2027-01-01",
      effectiveTo: "",
      scope: "Phase scope",
      exceptions: "No exceptions recorded.",
      sort: 0,
    },
  ],
  sources: [
    {
      phaseSlug: "first-phase",
      kind: "primary" as const,
      title: "Authority guidance",
      publisher: "Tax authority",
      url: "https://example.com/guidance",
      citation: "Supports dates and scope.",
      publishedOn: "2026-01-01",
      accessedOn: "2026-07-31",
      supports: ["dates", "scope"],
    },
  ],
};

const evaluation = {
  projectId: 1,
  expectedVersion: 0,
  legalCurrency: "unreviewed" as const,
  legalAsOf: "",
  legalScope: "",
  productionReadiness: "unreviewed" as const,
  publisherKind: "unknown" as const,
  publisherName: "",
  publisherRelationship: "",
  licenseConfidence: "unreviewed" as const,
  documentation: "unreviewed" as const,
  automatedTests: "unreviewed" as const,
  releaseDiscipline: "unreviewed" as const,
  securityProcess: "unreviewed" as const,
  deploymentOperability: "unreviewed" as const,
  dataHandling: "unreviewed" as const,
  governanceContinuity: "unreviewed" as const,
  supportPath: "unreviewed" as const,
  editorialNote: "",
  sources: [],
  mandates: [],
};

test("mandate publication requires primary evidence", () => {
  assert.equal(mandatePublishSchema.safeParse(mandate).success, true);
  const secondaryOnly = {
    ...mandate,
    sources: mandate.sources.map((source) => ({
      ...source,
      kind: "secondary" as const,
    })),
  };
  assert.equal(mandateFormSchema.safeParse(secondaryOnly).success, true);
  assert.equal(mandatePublishSchema.safeParse(secondaryOnly).success, false);
});

test("mandate sources must reference a unique existing phase", () => {
  const missingPhase = {
    ...mandate,
    sources: mandate.sources.map((source) => ({
      ...source,
      phaseSlug: "removed-phase",
    })),
  };
  assert.equal(mandateFormSchema.safeParse(missingPhase).success, false);

  const duplicatePhase = {
    ...mandate,
    phases: [...mandate.phases, { ...mandate.phases[0], label: "Duplicate" }],
  };
  assert.equal(mandateFormSchema.safeParse(duplicatePhase).success, false);
});

test("mandate dates must preserve real-world chronology", () => {
  assert.equal(
    mandateFormSchema.safeParse({
      ...mandate,
      phases: mandate.phases.map((phase) => ({
        ...phase,
        effectiveTo: "2026-12-31",
      })),
    }).success,
    false,
  );
  assert.equal(
    mandateFormSchema.safeParse({
      ...mandate,
      sources: mandate.sources.map((source) => ({
        ...source,
        publishedOn: "2099-01-01",
        accessedOn: "2099-01-02",
      })),
    }).success,
    false,
  );
  assert.equal(
    mandateFormSchema.safeParse({
      ...mandate,
      sources: mandate.sources.map((source) => ({
        ...source,
        publishedOn: "2026-08-01",
      })),
    }).success,
    false,
  );
});

test("evaluation drafts may be empty but publication requires primary evidence", () => {
  assert.equal(evaluationFormSchema.safeParse(evaluation).success, true);
  assert.equal(evaluationPublishSchema.safeParse(evaluation).success, false);

  const sourced = {
    ...evaluation,
    documentation: "documented" as const,
    sources: [
      {
        dimension: "general" as const,
        kind: "primary" as const,
        title: "Repository",
        publisher: "Maintainer",
        url: "https://example.com/repository",
        citation: "Project-controlled evidence.",
        observedOn: "2026-07-31",
      },
    ],
  };
  assert.equal(evaluationPublishSchema.safeParse(sourced).success, true);
  assert.equal(
    evaluationFormSchema.safeParse({
      ...sourced,
      sources: sourced.sources.map((source) => ({
        ...source,
        observedOn: "2099-01-01",
      })),
    }).success,
    false,
  );
  assert.equal(
    evaluationPublishSchema.safeParse({
      ...sourced,
      documentation: "unreviewed",
    }).success,
    false,
  );
  assert.equal(
    evaluationPublishSchema.safeParse({
      ...sourced,
      sources: sourced.sources.map((source) => ({
        ...source,
        url: "javascript:alert(1)",
      })),
    }).success,
    false,
  );
  assert.doesNotThrow(() =>
    evaluationFormSchema.safeParse({
      ...sourced,
      sources: sourced.sources.map((source) => ({ ...source, url: "" })),
    }),
  );
});

test("evaluation mandate relationships must be unique", () => {
  const relationship = {
    mandateId: 1,
    relationship: "reference" as const,
    coverageNote: "First note",
  };
  assert.equal(
    evaluationFormSchema.safeParse({
      ...evaluation,
      mandates: [relationship, { ...relationship, coverageNote: "Second note" }],
    }).success,
    false,
  );
});

test("archive payloads reject malformed runtime values", () => {
  assert.equal(mandateArchiveSchema.safeParse(null).success, false);
  assert.equal(
    mandateArchiveSchema.safeParse({ id: 1, expectedVersion: "1.0" }).success,
    false,
  );
  assert.equal(evaluationArchiveSchema.safeParse(null).success, false);
  assert.equal(
    evaluationArchiveSchema.safeParse({
      projectId: 1,
      expectedVersion: "1.0",
    }).success,
    false,
  );
});