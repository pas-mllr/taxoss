import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, reviews, users } from "@/lib/db/schema";
import { isAdminRequest } from "@/lib/admin-token";
import { hfKey } from "@/lib/huggingface";
import { detectSource } from "@/lib/index-repo";
import { projectHref } from "@/lib/sources";

/**
 * Token-gated review seeding for site admins. POST
 * { reviews: [{ repo, user: { id, name }, rating, title?, body, daysAgo? }] }
 * with "Authorization: Bearer $ADMIN_API_TOKEN".
 *
 * Upserts the author into users and the review onto (project, user) — reruns
 * update text in place rather than duplicating. daysAgo backdates createdAt
 * so a batch doesn't land as one same-minute wall.
 */

const bodySchema = z.object({
  reviews: z
    .array(
      z.object({
        repo: z.string().min(1),
        user: z.object({
          id: z.string().min(1).max(64),
          name: z.string().min(1).max(80),
        }),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(120).optional(),
        body: z.string().min(1).max(2000),
        daysAgo: z.number().int().min(0).max(365).optional(),
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
  const touched: string[] = [];

  for (const r of body.data.reviews) {
    const detected = detectSource(r.repo);
    if (!detected) {
      results.push({ repo: r.repo, status: "error" });
      continue;
    }
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
      })
      .from(projects)
      .where(eq(projects.fullNameKey, key))
      .limit(1);
    const project = rows[0];
    if (!project) {
      results.push({ repo: r.repo, status: "missing" });
      continue;
    }

    await db
      .insert(users)
      .values({ id: r.user.id, name: r.user.name })
      .onConflictDoUpdate({
        target: users.id,
        set: { name: r.user.name, updatedAt: sql`(unixepoch())` },
      });

    const createdAt = new Date(Date.now() - (r.daysAgo ?? 0) * 86_400_000);
    await db
      .insert(reviews)
      .values({
        projectId: project.id,
        userId: r.user.id,
        rating: r.rating,
        title: r.title ?? null,
        body: r.body,
        createdAt,
      })
      .onConflictDoUpdate({
        target: [reviews.projectId, reviews.userId],
        set: {
          rating: r.rating,
          title: r.title ?? null,
          body: r.body,
          updatedAt: sql`(unixepoch())`,
        },
      });

    touched.push(projectHref(project));
    results.push({ repo: r.repo, status: "set" });
  }

  for (const path of new Set(touched)) revalidatePath(path);
  revalidatePath("/");

  return NextResponse.json({
    set: results.filter((r) => r.status === "set").length,
    missing: results.filter((r) => r.status === "missing").length,
    errors: results.filter((r) => r.status === "error").length,
    results: results.filter((r) => r.status !== "set"),
  });
}
