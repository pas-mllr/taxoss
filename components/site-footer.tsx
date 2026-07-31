import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter-form";
import { areEditorialPagesEnabled } from "@/lib/site-features";

export function SiteFooter() {
  const editorialPagesEnabled = areEditorialPagesEnabled();

  return (
    <footer className="site-footer">
      <div className="container footer-newsletter">
        <NewsletterForm />
      </div>
      <div className="container footer-inner">
        <span className="footer-brand">TaxOSS</span>
        <nav className="footer-links">
          <Link href="/">Directory</Link>
          {editorialPagesEnabled && <Link href="/stack">Stack</Link>}
          {editorialPagesEnabled && <Link href="/insights">Insights</Link>}
          <Link href="/submit">Submit</Link>
          <Link href="/mcp">MCP</Link>
          <Link href="/about">About</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/imprint">Imprint</Link>
        </nav>
        <span className="footer-credit">
          © {new Date().getFullYear()} · Built by{" "}
          <a href="https://lurn.digital" target="_blank" rel="noreferrer">
            Lurn Digital
          </a>
        </span>
      </div>
    </footer>
  );
}
