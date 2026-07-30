import Link from "next/link";
import type { Metadata } from "next";
import { NewsletterForm } from "@/components/newsletter-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">About</span>
        <h1 className="display-m">How this works.</h1>
        <p className="body-l" style={{ maxWidth: 620 }}>
          TaxOSS is a small index of open-source tax software. Every entry is a
          real GitHub repository, its stats come straight from GitHub, and each
          repository can be listed exactly once. Browsing needs no account.
        </p>
      </div>

      <section className="social-section">
        <div className="social-head">
          <h2>Claiming a project</h2>
        </div>
        <p className="body" style={{ maxWidth: 680, marginBottom: 20 }}>
          A project page belongs to whoever can prove they control the
          repository. Sign in, open the project page, hit &quot;Claim this
          project&quot;, and pick a route — each takes about a minute.
        </p>

        <div className="project-grid">
          <div className="card" style={{ padding: 22 }}>
            <span className="eyebrow" style={{ marginBottom: 12 }}>
              Route one
            </span>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
              Connect the account
            </h3>
            <p className="body" style={{ marginBottom: 10 }}>
              Link the GitHub or Hugging Face account behind the repository and
              verify. We ask the source whether your account controls the repo
              — GitHub admin permission, or a matching Hugging Face identity.
              One click, checked server-side.
            </p>
            <p className="form-hint" style={{ margin: 0 }}>
              Reads your public identity only — no repository scopes.
            </p>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <span className="eyebrow" style={{ marginBottom: 12 }}>
              Route two
            </span>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
              Publish a token
            </h3>
            <p className="body" style={{ marginBottom: 10 }}>
              The claim page shows a token tied to your account and that one
              project. Commit it as <span className="mono">taxoss-verify.txt</span>{" "}
              at the repository root — or paste the line anywhere in the README
              — and verify. We fetch it anonymously, like any visitor. Delete
              it afterwards; the claim stays.
            </p>
            <p className="form-hint" style={{ margin: 0 }}>
              No account access at all — publishing in a repo you control
              proves control and grants us nothing.
            </p>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <span className="eyebrow" style={{ marginBottom: 12 }}>
              Neither fits?
            </span>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
              We&apos;ll verify by hand
            </h3>
            <p className="body" style={{ marginBottom: 10 }}>
              A protected default branch, an organization that blocks OAuth
              apps, a handover between maintainers — email{" "}
              <a href="mailto:pascal@lurn.digital" className="accent">
                pascal@lurn.digital
              </a>{" "}
              and we&apos;ll sort it out manually.
            </p>
            <p className="form-hint" style={{ margin: 0 }}>
              Manual grants are logged separately, so they stay distinguishable
              from self-verified claims.
            </p>
          </div>
        </div>

        <p className="body" style={{ maxWidth: 680, marginTop: 20 }}>
          Verified maintainers get the maintainer mark and can edit the
          project&apos;s name, tagline, website, and categories. Everyone else
          can star, review, and comment.
        </p>
      </section>

      <div className="claim-band">
        <div className="stack-4">
          <span className="eyebrow">Stay in the loop</span>
          <p>
            Every few weeks we send one email listing the newly featured
            open-source tax projects. No noise, unsubscribe any time.
          </p>
        </div>
        <NewsletterForm />
      </div>

      <div className="cluster" style={{ marginTop: 28 }}>
        <Link href="/" className="btn btn-primary">
          Browse the index
        </Link>
        <Link href="/submit" className="btn btn-secondary">
          Submit a project
        </Link>
      </div>
    </div>
  );
}
