/** Filter facets: jurisdictions, tax domains, and process stages. Upserted on every boot
 * (like CATEGORY_SEED), so renames/reorders reach existing databases. */

export type FacetKind = "jurisdiction" | "subject" | "process";

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
  { kind: "subject", slug: "pillar-two", name: "Pillar Two & Global Minimum Tax" },
  { kind: "subject", slug: "tax-provision-ias12", name: "IAS 12 & Tax Provision" },
  { kind: "subject", slug: "cbcr", name: "Country-by-Country Reporting" },
  { kind: "subject", slug: "withholding", name: "Withholding Tax" },
  { kind: "subject", slug: "unclassified", name: "Unclassified" },

  // ===== Process stages =====
  { kind: "process", slug: "interpret", name: "Interpret" },
  { kind: "process", slug: "calculate", name: "Calculate" },
  { kind: "process", slug: "prepare", name: "Prepare" },
  { kind: "process", slug: "validate", name: "Validate" },
  { kind: "process", slug: "report", name: "Report" },
  { kind: "process", slug: "file", name: "File" },
  { kind: "process", slug: "archive", name: "Archive" },
  { kind: "process", slug: "monitor-defend", name: "Monitor & Defend" },
  { kind: "process", slug: "unclassified", name: "Unclassified" },
];
