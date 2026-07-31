import { z } from "zod";
import {
  LEGAL_CURRENCY_STATES,
  LICENSE_CONFIDENCE_STATES,
  PRODUCTION_READINESS_STATES,
  PROJECT_MANDATE_RELATIONSHIPS,
  PUBLISHER_KINDS,
  RUBRIC_STATES,
} from "@/lib/evaluations";
import { parseDateOnlyUtc } from "@/lib/time";

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable();
const externalUrl = z
  .string()
  .trim()
  .url()
  .max(1000)
  .refine(
    (value) => {
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    { message: "Use an HTTP or HTTPS URL." },
  );
const dateOnly = z.string().refine((value) => {
  try {
    parseDateOnlyUtc(value);
    return true;
  } catch {
    return false;
  }
}, "Use a valid YYYY-MM-DD date.");
const optionalDateOnly = z.union([dateOnly, z.literal(""), z.null()]).optional();
const currentDateOnly = () => new Date().toISOString().slice(0, 10);

export const mandateFormSchema = z.object({
  id: z.number().int().positive().optional(),
  expectedVersion: z.number().int().min(0),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  jurisdictionFacetId: z.number().int().positive(),
  name: requiredText(160),
  summary: requiredText(1200),
  legalBasis: optionalText(2000),
  scope: requiredText(3000),
  exceptions: requiredText(3000),
  lifecycle: z.enum(["ahead", "in-force", "phased", "historical"]),
  phases: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        label: requiredText(180),
        phaseType: requiredText(60),
        effectiveFrom: dateOnly,
        effectiveTo: optionalDateOnly,
        scope: requiredText(2000),
        exceptions: requiredText(2000),
        sort: z.number().int().min(0).max(100),
      }),
    )
    .min(1)
    .max(20),
  sources: z
    .array(
      z.object({
        phaseSlug: optionalText(80),
        kind: z.enum(["primary", "secondary"]),
        title: requiredText(240),
        publisher: requiredText(160),
        url: externalUrl,
        citation: optionalText(2000),
        publishedOn: optionalDateOnly,
        accessedOn: dateOnly,
        supports: z.array(z.string().trim().min(1).max(80)).max(20),
      }),
    )
    .min(1)
    .max(20),
}).superRefine((data, context) => {
  const phaseSlugs = new Set<string>();
  data.phases.forEach((phase, index) => {
    if (phaseSlugs.has(phase.slug)) {
      context.addIssue({
        code: "custom",
        message: "Phase slugs must be unique.",
        path: ["phases", index, "slug"],
      });
    }
    phaseSlugs.add(phase.slug);
    if (
      phase.effectiveTo &&
      phase.effectiveTo < phase.effectiveFrom
    ) {
      context.addIssue({
        code: "custom",
        message: "A phase cannot end before it starts.",
        path: ["phases", index, "effectiveTo"],
      });
    }
  });
  data.sources.forEach((source, index) => {
    if (source.phaseSlug && !phaseSlugs.has(source.phaseSlug)) {
      context.addIssue({
        code: "custom",
        message: `Source phase ${source.phaseSlug} does not exist.`,
        path: ["sources", index, "phaseSlug"],
      });
    }
    if (source.publishedOn && source.publishedOn > source.accessedOn) {
      context.addIssue({
        code: "custom",
        message: "A source cannot be accessed before it was published.",
        path: ["sources", index, "accessedOn"],
      });
    }
    if (source.accessedOn > currentDateOnly()) {
      context.addIssue({
        code: "custom",
        message: "A source access date cannot be in the future.",
        path: ["sources", index, "accessedOn"],
      });
    }
    if (source.publishedOn && source.publishedOn > currentDateOnly()) {
      context.addIssue({
        code: "custom",
        message: "A source publication date cannot be in the future.",
        path: ["sources", index, "publishedOn"],
      });
    }
  });
});
export type MandateFormInput = z.infer<typeof mandateFormSchema>;

export const mandatePublishSchema = mandateFormSchema.superRefine(
  (data, context) => {
    if (!data.sources.some((source) => source.kind === "primary")) {
      context.addIssue({
        code: "custom",
        message: "Publish requires at least one primary source.",
        path: ["sources"],
      });
    }
  },
);

const evidenceDimension = z.enum([
  "general",
  "legal-currency",
  "production-readiness",
  "publisher-provenance",
  "license",
  "documentation",
  "automatedTests",
  "releaseDiscipline",
  "securityProcess",
  "deploymentOperability",
  "dataHandling",
  "governanceContinuity",
  "supportPath",
]);

export const evaluationFormSchema = z.object({
  projectId: z.number().int().positive(),
  expectedVersion: z.number().int().min(0),
  legalCurrency: z.enum(LEGAL_CURRENCY_STATES),
  legalAsOf: optionalDateOnly,
  legalScope: optionalText(3000),
  productionReadiness: z.enum(PRODUCTION_READINESS_STATES),
  publisherKind: z.enum(PUBLISHER_KINDS),
  publisherName: optionalText(240),
  publisherRelationship: optionalText(1000),
  licenseConfidence: z.enum(LICENSE_CONFIDENCE_STATES),
  documentation: z.enum(RUBRIC_STATES),
  automatedTests: z.enum(RUBRIC_STATES),
  releaseDiscipline: z.enum(RUBRIC_STATES),
  securityProcess: z.enum(RUBRIC_STATES),
  deploymentOperability: z.enum(RUBRIC_STATES),
  dataHandling: z.enum(RUBRIC_STATES),
  governanceContinuity: z.enum(RUBRIC_STATES),
  supportPath: z.enum(RUBRIC_STATES),
  editorialNote: optionalText(5000),
  sources: z
    .array(
      z.object({
        dimension: evidenceDimension,
        kind: z.enum(["primary", "secondary"]),
        title: requiredText(240),
        publisher: requiredText(160),
        url: externalUrl,
        citation: optionalText(2000),
        observedOn: dateOnly,
      }),
    )
    .max(30),
  mandates: z
    .array(
      z.object({
        mandateId: z.number().int().positive(),
        relationship: z.enum(PROJECT_MANDATE_RELATIONSHIPS),
        coverageNote: optionalText(2000),
      }),
    )
    .max(30),
}).superRefine((data, context) => {
  data.sources.forEach((source, index) => {
    if (source.observedOn > currentDateOnly()) {
      context.addIssue({
        code: "custom",
        message: "An evidence observation date cannot be in the future.",
        path: ["sources", index, "observedOn"],
      });
    }
  });
  const relationships = new Set<string>();
  data.mandates.forEach((mandate, index) => {
    const key = `${mandate.mandateId}:${mandate.relationship}`;
    if (relationships.has(key)) {
      context.addIssue({
        code: "custom",
        message: "Duplicate mandate relationship.",
        path: ["mandates", index],
      });
    }
    relationships.add(key);
  });
});
export type EvaluationFormInput = z.infer<typeof evaluationFormSchema>;

export const mandateArchiveSchema = z.object({
  id: z.number().int().positive(),
  expectedVersion: z.number().int().positive(),
});

export const evaluationArchiveSchema = z.object({
  projectId: z.number().int().positive(),
  expectedVersion: z.number().int().positive(),
});

export const evaluationPublishSchema = evaluationFormSchema.superRefine(
  (data, context) => {
    if (!data.sources.some((source) => source.kind === "primary")) {
      context.addIssue({
        code: "custom",
        message: "Publish requires at least one primary evidence source.",
        path: ["sources"],
      });
    }
    const hasConclusion =
      data.legalCurrency !== "unreviewed" ||
      data.productionReadiness !== "unreviewed" ||
      data.publisherKind !== "unknown" ||
      data.licenseConfidence !== "unreviewed" ||
      [
        data.documentation,
        data.automatedTests,
        data.releaseDiscipline,
        data.securityProcess,
        data.deploymentOperability,
        data.dataHandling,
        data.governanceContinuity,
        data.supportPath,
      ].some((state) => state !== "unreviewed");
    if (!hasConclusion) {
      context.addIssue({
        code: "custom",
        message: "Publish requires at least one reviewed assessment dimension.",
        path: ["legalCurrency"],
      });
    }
  },
);