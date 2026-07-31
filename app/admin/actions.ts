"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  facets,
  mandatePhases,
  mandates,
  mandateSources,
  projectEvaluationSources,
  projectEvaluations,
  projectMandates,
  projects,
  users,
} from "@/lib/db/schema";
import { isAdminUser } from "@/lib/admin";
import {
  evaluationArchiveSchema,
  evaluationFormSchema,
  evaluationPublishSchema,
  mandateArchiveSchema,
  mandateFormSchema,
  mandatePublishSchema,
  type EvaluationFormInput,
  type MandateFormInput,
} from "@/lib/evidence-forms";
import { ensureCurrentUser } from "@/lib/users";
import { projectHref } from "@/lib/sources";
import {
  EvidenceVersionConflict,
  nextEvidenceVersion,
} from "@/lib/evidence-version";

type ActionError = { ok: false; error: string; conflict?: boolean };
type SaveResult = {
  ok: true;
  id: number;
  version: number;
  status: "draft" | "published" | "archived";
};

function fail(error: string, conflict = false): ActionError {
  return { ok: false, error, ...(conflict && { conflict: true }) };
}

async function adminReviewer(): Promise<
  { id: string; name: string } | ActionError
> {
  const userId = await ensureCurrentUser();
  if (!userId || !isAdminUser(userId)) return fail("Only site admins can edit evidence.");
  const row = await db
    .select({ name: users.name, username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return { id: userId, name: row[0]?.name ?? row[0]?.username ?? userId };
}

function reviewDue(now: Date): Date {
  return new Date(now.getTime() + 92 * 86_400_000);
}

async function persistMandate(
  input: MandateFormInput,
  publish: boolean,
): Promise<SaveResult | ActionError> {
  const reviewer = await adminReviewer();
  if ("ok" in reviewer) return reviewer;
  const body = (publish ? mandatePublishSchema : mandateFormSchema).safeParse(input);
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid mandate.");
  const data = body.data;
  const jurisdiction = await db
    .select({ id: facets.id })
    .from(facets)
    .where(
      and(
        eq(facets.id, data.jurisdictionFacetId),
        eq(facets.kind, "jurisdiction"),
      ),
    )
    .limit(1);
  if (!jurisdiction[0]) return fail("Select a valid jurisdiction.");
  const now = new Date();

  try {
    const saved = db.transaction((tx) => {
      const current = data.id
        ? tx
            .select({ version: mandates.version, slug: mandates.slug })
            .from(mandates)
            .where(eq(mandates.id, data.id))
            .limit(1)
            .get()
        : null;
      if (data.id && !current) throw new Error("Mandate not found.");
      if (current && current.slug !== data.slug) {
        throw new Error("Existing mandate slugs cannot be changed.");
      }
      const version = nextEvidenceVersion(
        current?.version ?? null,
        data.expectedVersion,
      );
      const values = {
        jurisdictionFacetId: data.jurisdictionFacetId,
        slug: data.slug,
        name: data.name,
        summary: data.summary,
        legalBasis: data.legalBasis || null,
        scope: data.scope,
        exceptions: data.exceptions,
        lifecycle: data.lifecycle,
        status: publish ? "published" : "draft",
        publishedAt: publish ? now : null,
        version,
        updatedAt: now,
        ...(publish
          ? {
              reviewerId: reviewer.id,
              reviewerName: reviewer.name,
              lastReviewedAt: now,
              reviewDueAt: reviewDue(now),
            }
          : {}),
      } as const;

      const mandateId = data.id
        ? (tx
            .update(mandates)
            .set(values)
            .where(
              and(
                eq(mandates.id, data.id),
                eq(mandates.version, data.expectedVersion),
              ),
            )
            .returning({ id: mandates.id })
            .get()?.id ?? 0)
        : tx
            .insert(mandates)
            .values({ ...values, createdAt: now })
            .returning({ id: mandates.id })
            .get().id;
      if (!mandateId) throw new Error("VERSION_CONFLICT");

      tx.delete(mandateSources)
        .where(eq(mandateSources.mandateId, mandateId))
        .run();
      tx.delete(mandatePhases)
        .where(eq(mandatePhases.mandateId, mandateId))
        .run();

      const insertedPhases = tx
        .insert(mandatePhases)
        .values(
          data.phases.map((phase) => ({
            mandateId,
            ...phase,
            effectiveTo: phase.effectiveTo || null,
          })),
        )
        .returning({ id: mandatePhases.id, slug: mandatePhases.slug })
        .all();
      const phaseIds = new Map(insertedPhases.map((phase) => [phase.slug, phase.id]));
      tx.insert(mandateSources)
        .values(
          data.sources.map((source) => ({
            mandateId,
            phaseId: source.phaseSlug ? (phaseIds.get(source.phaseSlug) ?? null) : null,
            kind: source.kind,
            title: source.title,
            publisher: source.publisher,
            url: source.url,
            citation: source.citation || null,
            publishedOn: source.publishedOn || null,
            accessedOn: source.accessedOn,
            supports: source.supports,
          })),
        )
        .run();

      return { id: mandateId, version };
    });

    revalidatePath("/admin/mandates");
    revalidatePath("/stack");
    revalidatePath("/radar");
    revalidatePath("/jurisdictions");
    revalidatePath(`/mandates/${data.slug}`);
    return {
      ok: true,
      ...saved,
      status: publish ? "published" : "draft",
    };
  } catch (error) {
    if (error instanceof EvidenceVersionConflict || (error instanceof Error && error.message === "VERSION_CONFLICT")) {
      return fail("This mandate changed in another session. Reload before saving.", true);
    }
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      return fail("That mandate slug is already in use.");
    }
    return fail(error instanceof Error ? error.message : "Could not save mandate.");
  }
}

export async function saveMandateDraft(input: MandateFormInput) {
  return persistMandate(input, false);
}

export async function publishMandate(input: MandateFormInput) {
  return persistMandate(input, true);
}

export async function archiveMandate(input: {
  id: number;
  expectedVersion: number;
}): Promise<SaveResult | ActionError> {
  const reviewer = await adminReviewer();
  if ("ok" in reviewer) return reviewer;
  const parsed = mandateArchiveSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid mandate archive request.");
  const data = parsed.data;
  const version = nextEvidenceVersion(data.expectedVersion, data.expectedVersion);
  const updated = await db
    .update(mandates)
    .set({ status: "archived", version, updatedAt: new Date() })
    .where(
      and(eq(mandates.id, data.id), eq(mandates.version, data.expectedVersion)),
    )
    .returning({ id: mandates.id, version: mandates.version });
  if (!updated[0]) return fail("This mandate changed in another session. Reload first.", true);
  revalidatePath("/admin/mandates");
  revalidatePath("/stack");
  revalidatePath("/radar");
  return { ok: true, ...updated[0], status: "archived" };
}

async function persistEvaluation(
  input: EvaluationFormInput,
  publish: boolean,
): Promise<SaveResult | ActionError> {
  const reviewer = await adminReviewer();
  if ("ok" in reviewer) return reviewer;
  const body = (publish ? evaluationPublishSchema : evaluationFormSchema).safeParse(
    input,
  );
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid evaluation.");
  const data = body.data;
  const project = await db
    .select({ id: projects.id, source: projects.source, sourceType: projects.sourceType, owner: projects.owner, repo: projects.repo })
    .from(projects)
    .where(eq(projects.id, data.projectId))
    .limit(1);
  if (!project[0]) return fail("Project not found.");
  const now = new Date();

  try {
    const version = db.transaction((tx) => {
      const current = tx
        .select({ version: projectEvaluations.version })
        .from(projectEvaluations)
        .where(eq(projectEvaluations.projectId, data.projectId))
        .limit(1)
        .get();
      const nextVersion = nextEvidenceVersion(
        current?.version ?? null,
        data.expectedVersion,
      );
      const values = {
        status: publish ? "published" : "draft",
        legalCurrency: data.legalCurrency,
        legalAsOf: data.legalAsOf || null,
        legalScope: data.legalScope || null,
        productionReadiness: data.productionReadiness,
        publisherKind: data.publisherKind,
        publisherName: data.publisherName || null,
        publisherRelationship: data.publisherRelationship || null,
        licenseConfidence: data.licenseConfidence,
        documentation: data.documentation,
        automatedTests: data.automatedTests,
        releaseDiscipline: data.releaseDiscipline,
        securityProcess: data.securityProcess,
        deploymentOperability: data.deploymentOperability,
        dataHandling: data.dataHandling,
        governanceContinuity: data.governanceContinuity,
        supportPath: data.supportPath,
        editorialNote: data.editorialNote || null,
        publishedAt: publish ? now : null,
        version: nextVersion,
        updatedAt: now,
        ...(publish
          ? {
              reviewerId: reviewer.id,
              reviewerName: reviewer.name,
              lastReviewedAt: now,
              reviewDueAt: reviewDue(now),
            }
          : {}),
      } as const;

      if (current) {
        const changed = tx
          .update(projectEvaluations)
          .set(values)
          .where(
            and(
              eq(projectEvaluations.projectId, data.projectId),
              eq(projectEvaluations.version, data.expectedVersion),
            ),
          )
          .run().changes;
        if (!changed) throw new Error("VERSION_CONFLICT");
      } else {
        tx.insert(projectEvaluations)
          .values({ projectId: data.projectId, ...values, createdAt: now })
          .run();
      }

      tx.delete(projectEvaluationSources)
        .where(eq(projectEvaluationSources.projectId, data.projectId))
        .run();
      if (data.sources.length > 0) {
        tx.insert(projectEvaluationSources)
          .values(
            data.sources.map((source) => ({
              projectId: data.projectId,
              ...source,
              citation: source.citation || null,
            })),
          )
          .run();
      }

      tx.delete(projectMandates)
        .where(eq(projectMandates.projectId, data.projectId))
        .run();
      if (data.mandates.length > 0) {
        tx.insert(projectMandates)
          .values(
            data.mandates.map((mandate) => ({
              projectId: data.projectId,
              mandateId: mandate.mandateId,
              relationship: mandate.relationship,
              coverageNote: mandate.coverageNote || null,
            })),
          )
          .onConflictDoNothing()
          .run();
      }
      return nextVersion;
    });

    revalidatePath("/admin/evaluations");
    revalidatePath(projectHref(project[0]));
    return {
      ok: true,
      id: data.projectId,
      version,
      status: publish ? "published" : "draft",
    };
  } catch (error) {
    if (error instanceof EvidenceVersionConflict || (error instanceof Error && error.message === "VERSION_CONFLICT")) {
      return fail("This evaluation changed in another session. Reload before saving.", true);
    }
    return fail(error instanceof Error ? error.message : "Could not save evaluation.");
  }
}

export async function saveProjectEvaluationDraft(input: EvaluationFormInput) {
  return persistEvaluation(input, false);
}

export async function publishProjectEvaluation(input: EvaluationFormInput) {
  return persistEvaluation(input, true);
}

export async function archiveProjectEvaluation(input: {
  projectId: number;
  expectedVersion: number;
}): Promise<SaveResult | ActionError> {
  const reviewer = await adminReviewer();
  if ("ok" in reviewer) return reviewer;
  const parsed = evaluationArchiveSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid evaluation archive request.");
  const data = parsed.data;
  const version = nextEvidenceVersion(data.expectedVersion, data.expectedVersion);
  const project = await db
    .select({
      id: projects.id,
      source: projects.source,
      sourceType: projects.sourceType,
      owner: projects.owner,
      repo: projects.repo,
    })
    .from(projects)
    .where(eq(projects.id, data.projectId))
    .limit(1);
  if (!project[0]) return fail("Project not found.");
  const updated = await db
    .update(projectEvaluations)
    .set({
      status: "archived",
      version,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectEvaluations.projectId, data.projectId),
        eq(projectEvaluations.version, data.expectedVersion),
      ),
    )
    .returning({ id: projectEvaluations.projectId, version: projectEvaluations.version });
  if (!updated[0]) {
    return fail("This evaluation changed in another session. Reload first.", true);
  }
  revalidatePath("/admin/evaluations");
  revalidatePath(projectHref(project[0]));
  return { ok: true, ...updated[0], status: "archived" };
}