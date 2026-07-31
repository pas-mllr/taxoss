import type { Metadata } from "next";
import { listProjectEvaluationsForAdmin } from "@/lib/evaluation-data";
import { listMandates } from "@/lib/mandate-data";
import { AdminEvaluations } from "@/components/admin-evaluations";
import { AdminTabs } from "@/components/admin-tabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evaluations",
  robots: { index: false, follow: false },
};

export default async function AdminEvaluationsPage() {
  const [rows, mandateRows] = await Promise.all([
    listProjectEvaluationsForAdmin(),
    listMandates({ includeDrafts: true }),
  ]);
  const mandates = mandateRows.map((mandate) => ({
    id: mandate.id,
    name: mandate.name,
    jurisdictionName: mandate.jurisdictionName,
  }));

  return (
    <div className="admin-wide">
      <div className="section-head">
        <span className="eyebrow">Admin</span>
        <h1 className="display-m">Evaluations.</h1>
        <p className="body-l">
          Record evidence by dimension. Repository activity, legal currency, and
          production readiness remain separate signals.
        </p>
      </div>
      <AdminTabs />
      <AdminEvaluations rows={rows} mandates={mandates} />
    </div>
  );
}