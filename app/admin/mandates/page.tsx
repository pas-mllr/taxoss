import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { facets } from "@/lib/db/schema";
import { listMandates } from "@/lib/mandate-data";
import { AdminMandates } from "@/components/admin-mandates";
import { AdminTabs } from "@/components/admin-tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mandates",
  robots: { index: false, follow: false },
};

export default async function AdminMandatesPage() {
  const [records, jurisdictions] = await Promise.all([
    listMandates({ includeDrafts: true }),
    db
      .select({ id: facets.id, slug: facets.slug, name: facets.name })
      .from(facets)
      .where(eq(facets.kind, "jurisdiction"))
      .orderBy(facets.sort),
  ]);

  return (
    <div className="admin-wide">
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1 className="display-m">Mandates.</h1>
        <p className="body-l">
          Draft legal facts, attach primary sources, and publish only after review.
          Ordinary saves never renew the review date.
        </p>
      </div>
      <AdminTabs />
      <AdminMandates records={records} jurisdictions={jurisdictions} />
    </div>
  );
}