import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How TaxOSS handles accounts, private workspace, and newsletter data.",
};

export default function PrivacyPage() {
  return (
    <div className="container">
      <div className="narrow stack-24 prose">
        <div className="section-head">
          <span className="eyebrow">Privacy</span>
          <h1 className="display-m">What we collect, plainly.</h1>
          <p className="body-l">
            TaxOSS is operated by Lurn Digital, Netherlands — see the{" "}
            <Link href="/imprint" className="accent">
              imprint
            </Link>
            . Browsing the index needs no account.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Analytics</h3>
          <p className="body">
            We do not use product analytics, advertising trackers, session
            replay, or analytics cookies. Your browser may store your theme
            preference and whether you dismissed the newsletter invitation;
            neither value identifies you or leaves your device.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Accounts</h3>
          <p className="body">
            Sign-in is handled by Clerk. We store your Clerk user id, display
            name, avatar, and — if you connect GitHub for a maintainer claim —
            your public GitHub login. The claim flow reads only your public
            identity and repository permission level; it has no repository
            scopes. Contact us to delete this local account mirror.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Newsletter</h3>
          <p className="body">
            The featured-projects newsletter runs on Brevo. Subscribing stores
            your email address there; every issue carries an unsubscribe link,
            and unsubscribing removes you from the list. Your address is used
            for nothing else.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Private workspace</h3>
          <p className="body">
            Signed-in members can keep one private portfolio containing scope
            selections, shortlisted projects, decision states, and notes. This
            data is tied to your account, visible only to you, excluded from
            search indexing and the public MCP API, and included only when you
            request your authenticated CSV export. Deleting your local account
            mirror also deletes its portfolio records.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Project data</h3>
          <p className="body">
            Everything shown about a project — stars, forks, issues, license,
            README, contributors — is public data fetched from the GitHub API
            and cached server-side. Nothing is scraped from private sources.
            Maintainers can have their project removed by contacting us.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Hosting</h3>
          <p className="body">
            The site runs on Microsoft Azure in the West Europe region
            (Netherlands). Standard server logs (IP address, request path,
            timestamp) exist briefly for operations and abuse prevention.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Your rights</h3>
          <p className="body">
            Under the GDPR you can request access, correction, deletion, and
            portability of your data, and you can object to processing. Write
            to{" "}
            <a href="mailto:pascal@lurn.digital" className="accent">
              pascal@lurn.digital
            </a>{" "}
            and we&apos;ll sort it out. You can also complain to a supervisory
            authority; for the Netherlands that is the Autoriteit
            Persoonsgegevens.
          </p>
        </div>
      </div>
    </div>
  );
}
