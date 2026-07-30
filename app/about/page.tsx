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

      <div className="stack-24 prose">
        <section className="social-section">
          <div className="social-head">
            <h2>Claiming a project</h2>
          </div>
          <p className="body" style={{ maxWidth: 680 }}>
            A project page belongs to whoever can prove they control the
            repository. There are two ways to prove it, both about a minute.
            Sign in, open the project page, hit &quot;Claim this project&quot;,
            and pick one.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 14,
              marginTop: 16,
            }}
          >
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                Connect the account
              </h4>
              <ol className="body" style={{ margin: 0, paddingLeft: 22 }}>
                <li>
                  Link the GitHub or Hugging Face account behind the repository.
                </li>
                <li>
                  Verify. We ask the source whether your account controls the
                  repo — GitHub admin permission, or a matching Hugging Face
                  identity. One click, checked server-side.
                </li>
              </ol>
              <p className="body" style={{ marginTop: 10 }}>
                For GitHub and for personal Hugging Face repos this reads your
                public identity only, no repository scopes.
              </p>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                Or publish a token — no account access at all
              </h4>
              <ol className="body" style={{ margin: 0, paddingLeft: 22 }}>
                <li>
                  The claim page shows you a token. It is tied to your account
                  and that one project, so nobody else&apos;s token will work
                  and yours is worthless anywhere else.
                </li>
                <li>
                  Commit it to a file called{" "}
                  <span className="mono">taxoss-verify.txt</span> at the root of
                  the repository, on the default branch. Pasting the same line
                  anywhere in the README works just as well.
                </li>
                <li>
                  Come back and verify. We fetch the file the way any visitor
                  would — anonymously, over the public URL. Delete it afterwards
                  if you like; the claim stays.
                </li>
              </ol>
            </div>
          </div>

          <p className="body" style={{ maxWidth: 680, marginTop: 16 }}>
            The token route exists because Hugging Face has no read-only
            &quot;which organizations am I in&quot; scope: the only scope that
            proves membership also grants read access to an account&apos;s
            private repositories. Publishing a token in a repository you already
            control proves the same thing and grants us nothing.
          </p>
          <p className="body" style={{ maxWidth: 680 }}>
            If neither route fits — a protected default branch, an organization
            that blocks OAuth apps, a handover between maintainers — email{" "}
            <a href="mailto:pascal@lurn.digital" className="accent">
              pascal@lurn.digital
            </a>{" "}
            and we&apos;ll verify it by hand.
          </p>
          <p className="body" style={{ maxWidth: 680 }}>
            Verified maintainers get the maintainer mark and can edit the
            project&apos;s name, tagline, website, and categories. Everyone else
            can star, review, and comment.
          </p>
        </section>

        <section className="social-section">
          <div className="social-head">
            <h2>Stay in the loop</h2>
          </div>
          <p className="body" style={{ maxWidth: 680 }}>
            Every few weeks we send one email listing the newly featured
            open-source tax projects. No noise, unsubscribe any time.
          </p>
          <NewsletterForm />
        </section>

        <div className="cluster" style={{ paddingTop: 8 }}>
          <Link href="/" className="btn btn-primary">
            Browse the index
          </Link>
          <Link href="/submit" className="btn btn-secondary">
            Submit a project
          </Link>
        </div>
      </div>
    </div>
  );
}
