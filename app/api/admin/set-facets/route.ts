import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { isAdminRequest } from "@/lib/admin-token";
import { setFacets } from "@/lib/facets";
import { hfKey } from "@/lib/huggingface";
import { detectSource } from "@/lib/index-repo";

/**
 * Token-gated facet assignment for site admins — the curated counterpart to
 * the provisional auto-tagging that runs at index time. POST
 * { assignments: [{ repo, jurisdictions?, subjects?, processes? }] } with
 * "Authorization: Bearer $ADMIN_API_TOKEN". Replaces each project's facets
 * of the given kinds wholesale; omitted kinds are left untouched. Unknown
 * facet slugs are ignored, unknown repos reported per row. Empty or unknown
 * domain/process sets become explicit Unclassified assignments.
 */

const bodySchema = z.object({
  assignments: z
    .array(
      z.object({
        repo: z.string().min(1),
        jurisdictions: z.array(z.string()).max(4).optional(),
        subjects: z.array(z.string()).max(4).optional(),
        processes: z.array(z.string()).max(8).optional(),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const body = bodySchema.safeParse(payload);
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const results: { repo: string; status: "set" | "missing" | "error" }[] = [];
  for (const a of body.data.assignments) {
    const detected = detectSource(a.repo);
    if (!detected) {
      results.push({ repo: a.repo, status: "error" });
      continue;
    }
    const key =
      detected.source === "huggingface"
        ? hfKey(detected.type, detected.owner, detected.repo)
        : `${detected.owner}/${detected.repo}`.toLowerCase();
    const row = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.fullNameKey, key))
      .limit(1);
    const projectId = row[0]?.id;
    if (!projectId) {
      results.push({ repo: a.repo, status: "missing" });
      continue;
    }
    if (a.jurisdictions) await setFacets(projectId, "jurisdiction", a.jurisdictions);
    if (a.subjects) await setFacets(projectId, "subject", a.subjects);
    if (a.processes) await setFacets(projectId, "process", a.processes);
    results.push({ repo: a.repo, status: "set" });
  }

  revalidatePath("/");
  return NextResponse.json({
    results,
    set: results.filter((r) => r.status === "set").length,
    missing: results.filter((r) => r.status === "missing").length,
  });
}
