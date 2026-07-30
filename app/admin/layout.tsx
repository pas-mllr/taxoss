import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Single gate for everything under /admin. 404 rather than 403: the routes'
 * existence is not worth advertising. Server actions re-check admin rights
 * independently, so this is navigation, not the security boundary.
 *
 * Each page renders its own standard header (eyebrow + title + tabs), so the
 * layout stays a pure gate — a lone floating eyebrow here read as broken.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!isAdminUser(userId)) notFound();

  return <div className="container">{children}</div>;
}
