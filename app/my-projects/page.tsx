import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { listProjects } from "@/lib/projects";
import { currentGithubLogin } from "@/lib/maintainers";
import { getPortfolioWorkspace } from "@/lib/portfolio";
import { ensureCurrentUser } from "@/lib/users";
import { ProjectCard } from "@/components/project-card";
import { WorkspacePortfolio } from "@/components/workspace-portfolio";
import { IconShield, IconStar } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace",
  // A personal list has nothing to offer a crawler.
  robots: { index: false, follow: false },
};

type Tab = "maintained" | "shortlist" | "portfolio";

function Tabs({ active }: { active: Tab }) {
  return (
    <nav className="admin-tabs" aria-label="Workspace sections">
      <Link
        href="/my-projects"
        className={`glass-chip${active === "maintained" ? " is-active" : ""}`}
      >
        Maintained
      </Link>
      <Link
        href="/my-projects?tab=shortlist"
        className={`glass-chip${active === "shortlist" ? " is-active" : ""}`}
      >
        Shortlist
      </Link>
      <Link
        href="/my-projects?tab=portfolio"
        className={`glass-chip${active === "portfolio" ? " is-active" : ""}`}
      >
        Portfolio
      </Link>
    </nav>
  );
}

export default async function MyProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const requestedTab = typeof params.tab === "string" ? params.tab : "";
  const tab: Tab =
    requestedTab === "portfolio"
      ? "portfolio"
      : requestedTab === "shortlist" || requestedTab === "starred"
        ? "shortlist"
        : "maintained";
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="container">
        <div className="narrow">
          <div className="section-head">
            <span className="eyebrow">Private workspace</span>
            <h1 className="display-m">Workspace.</h1>
          </div>
          <div className="empty-state">
            <div className="es-icon">
              <IconStar />
            </div>
            <h4>Sign in to open your workspace</h4>
            <p>
              Your maintained projects, shortlist, portfolio scope, decisions,
              and notes are kept per account.
            </p>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent("/my-projects")}`}
              className="btn btn-primary"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "portfolio") {
    const workspaceUserId = await ensureCurrentUser();
    if (!workspaceUserId) return null;
    const workspace = await getPortfolioWorkspace(workspaceUserId);

    return (
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Private workspace</span>
          <div className="row">
            <h1 className="display-m">Workspace.</h1>
            <span className="meta-mono">
              {workspace.projects.length} portfolio project
              {workspace.projects.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="body-l" style={{ maxWidth: 620 }}>
            Map your multinational scope, record private decisions, compare
            evidence, and export a dated decision record. Nobody else sees this page.
          </p>
        </div>
        <Tabs active={tab} />
        <WorkspacePortfolio workspace={workspace} shortlist={workspace.shortlist} />
      </div>
    );
  }

  const { items } =
    tab === "shortlist"
      ? await listProjects({
          userId,
          starredByUserId: userId,
          sort: "recently-starred",
        })
      : await listProjects({
          userId,
          maintainedBy: { userId, githubLogin: await currentGithubLogin() },
          sort: "stars",
        });

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Private workspace</span>
        <div className="row">
          <h1 className="display-m">Workspace.</h1>
          <span className="meta-mono">
            {items.length} project{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="body-l" style={{ maxWidth: 620 }}>
          {tab === "maintained"
            ? "The projects you maintain on TaxOSS — claimed by you, or granted to your GitHub account by a claimant. Nobody else sees this page."
            : "Your shortlisted candidates, most recent first. Stars remain separate from portfolio membership, private notes, and decision states."}
        </p>
      </div>

      <Tabs active={tab} />

      {items.length > 0 ? (
        <div className="project-grid">
          {items.map((p) => (
            <ProjectCard key={p.id} project={p} signedIn />
          ))}
        </div>
      ) : tab === "maintained" ? (
        <div className="empty-state">
          <div className="es-icon">
            <IconShield />
          </div>
          <h4>You don&apos;t maintain anything here yet</h4>
          <p>
            Claim a project you own from its page — the &ldquo;Claim this
            project&rdquo; button verifies control through GitHub — and it
            lands here, ready to edit.
          </p>
          <Link href="/" className="btn btn-primary">
            Find your project
          </Link>
        </div>
      ) : (
        <div className="empty-state">
          <div className="es-icon">
            <IconStar />
          </div>
          <h4>No shortlist yet</h4>
          <p>
            Star any project card or project page to add it to this private
            shortlist, then move selected candidates into your portfolio.
          </p>
          <Link href="/" className="btn btn-primary">
            Browse the index
          </Link>
        </div>
      )}
    </div>
  );
}
