import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter-form";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-newsletter">
        <NewsletterForm />
      </div>
      <div className="container footer-inner">
        <span className="footer-brand">TaxOSS</span>
        <nav className="footer-links">
          <Link href="/">Directory</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/submit">Submit</Link>
          <Link href="/about">About</Link>
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
