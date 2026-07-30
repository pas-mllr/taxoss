import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Imprint",
  description: "Site information for TaxOSS.",
};

// TODO(owner): replace the placeholder address and KVK number below with the
// real business details before going live.
export default function ImprintPage() {
  return (
    <div className="container">
      <div className="narrow stack-24 prose">
        <div className="section-head">
          <span className="eyebrow">Site information</span>
          <h1 className="display-m">Imprint.</h1>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Operator</h3>
          <p className="body">Lurn Digital</p>
          <p className="body">[Street address]</p>
          <p className="body">[Postal code, City], Netherlands</p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Contact</h3>
          <p className="body">
            E-Mail:{" "}
            <a href="mailto:pascal@lurn.digital" className="accent">
              pascal@lurn.digital
            </a>
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Business register</h3>
          <p className="body">
            Registered with the Dutch Chamber of Commerce (KVK)
          </p>
          <p className="body">KVK number: [00000000]</p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Editorial responsibility</h3>
          <p className="body">Lurn Digital</p>
          <p className="body">[Street address]</p>
          <p className="body">[Postal code, City], Netherlands</p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Liability for content</h3>
          <p className="body">
            We take care to keep the information on this site accurate, but the
            index aggregates public data from third-party sources and we cannot
            guarantee its completeness or timeliness. Nothing on this site is
            tax advice.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Liability for links</h3>
          <p className="body">
            This website links to external third-party websites and
            repositories, the contents of which we have no influence on. The
            respective provider or operator of the linked pages is responsible
            for their content.
          </p>
        </div>

        <div className="stack-8">
          <h3 style={{ fontSize: 15 }}>Attribution</h3>
          <p className="body">
            TaxOSS is built on the MIT-licensed{" "}
            <a
              href="https://github.com/eigenweltlabs/legaloss"
              className="accent"
              target="_blank"
              rel="noreferrer"
            >
              LegalOSS
            </a>{" "}
            codebase by Eigenwelt Labs.
          </p>
        </div>
      </div>
    </div>
  );
}
