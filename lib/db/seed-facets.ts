/** Filter facets: jurisdictions and tax subjects. Upserted on every boot
 * (like CATEGORY_SEED), so renames/reorders reach existing databases. */

export type FacetKind = "jurisdiction" | "subject";

export const FACET_SEED: {
  kind: FacetKind;
  slug: string;
  name: string;
}[] = [
  // ===== Jurisdictions (sorted: supranational first, then A-Z) =====
  { kind: "jurisdiction", slug: "global", name: "Global / Multi-country" },
  { kind: "jurisdiction", slug: "eu", name: "European Union" },
  { kind: "jurisdiction", slug: "au", name: "Australia" },
  { kind: "jurisdiction", slug: "br", name: "Brazil" },
  { kind: "jurisdiction", slug: "ca", name: "Canada" },
  { kind: "jurisdiction", slug: "fr", name: "France" },
  { kind: "jurisdiction", slug: "de", name: "Germany" },
  { kind: "jurisdiction", slug: "in", name: "India" },
  { kind: "jurisdiction", slug: "it", name: "Italy" },
  { kind: "jurisdiction", slug: "jp", name: "Japan" },
  { kind: "jurisdiction", slug: "nl", name: "Netherlands" },
  { kind: "jurisdiction", slug: "nz", name: "New Zealand" },
  { kind: "jurisdiction", slug: "no", name: "Norway" },
  { kind: "jurisdiction", slug: "pl", name: "Poland" },
  { kind: "jurisdiction", slug: "es", name: "Spain" },
  { kind: "jurisdiction", slug: "tn", name: "Tunisia" },
  { kind: "jurisdiction", slug: "tr", name: "Turkey" },
  { kind: "jurisdiction", slug: "uk", name: "United Kingdom" },
  { kind: "jurisdiction", slug: "us", name: "United States" },

  // ===== Tax subjects =====
  { kind: "subject", slug: "personal-tax", name: "Personal Income Tax" },
  { kind: "subject", slug: "corporate-tax", name: "Corporate Income Tax" },
  { kind: "subject", slug: "vat-gst-sales", name: "VAT, GST & Sales Tax" },
  { kind: "subject", slug: "payroll-employment", name: "Payroll & Employment Tax" },
  { kind: "subject", slug: "e-invoicing-ctc", name: "E-Invoicing & Digital Reporting" },
  { kind: "subject", slug: "crypto-capital-gains", name: "Crypto & Capital Gains" },
  { kind: "subject", slug: "transfer-pricing-intl", name: "Transfer Pricing & International" },
  { kind: "subject", slug: "customs-trade", name: "Customs & Trade" },
  { kind: "subject", slug: "rd-incentives", name: "R&D Credits & Incentives" },
  { kind: "subject", slug: "property-tax", name: "Property & Vehicle Tax" },
  { kind: "subject", slug: "audit-controversy", name: "Tax Audit & Controversy" },
  { kind: "subject", slug: "policy-research", name: "Tax Policy & Research" },
];
