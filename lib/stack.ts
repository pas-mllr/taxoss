/**
 * Editorial content for the Stack page — the problem-first map of the index,
 * written for tax professionals and tax leaders rather than developers.
 *
 * Every category slug in CATEGORY_SEED must appear in exactly one section;
 * the page renders whatever the DB has, grouped by these lists, and falls
 * back to the A-Z index for anything unmapped.
 */

export type StackSection = {
  id: string;
  title: string;
  intro: string;
  /** One honest line: when open source fits here, and when it doesn't. */
  fit: string;
  categorySlugs: string[];
};

export const STACK_SECTIONS: StackSection[] = [
  {
    id: "mandates",
    title: "Meet a mandate",
    intro:
      "Governments are rewiring tax compliance around real-time, structured data — e-invoicing clearance, digital reporting, certified billing software. This is the decade's compliance story, and much of the plumbing that meets it is open: invoice format libraries, VAT validation, and reporting standards you can read, audit, and embed.",
    fit: "Open source fits the format and transmission layer — the mandate logic itself. It won't give you the surrounding workflow, archiving, or liability cover a vendor contracts for.",
    categorySlugs: ["invoicing", "vat-gst", "compliance"],
  },
  {
    id: "ai",
    title: "Put AI to work — without shipping your data away",
    intro:
      "Every tax leader is being asked for an AI plan. The open-source answer has a structural advantage the vendors can't match: tools your team runs on infrastructure you control, so client data and filings never leave the building. MCP servers give AI agents governed access to tax systems; skills and local models make the workflows portable and private.",
    fit: "Open source fits experimentation and data-sensitive deployment. It doesn't fit teams with nobody to run it — hosted AI with a data-processing agreement may serve them better.",
    categorySlugs: [
      "platforms",
      "agent-skills",
      "mcp-servers",
      "tax-ai",
      "rag-retrieval",
      "local-ai",
    ],
  },
  {
    id: "compute",
    title: "Compute it right",
    intro:
      "Tax logic in a spreadsheet is a liability; tax logic in a black-box SaaS is a dependency. The middle path is tax law as inspectable code — engines and rules-as-code frameworks where every rate, threshold, and rule is visible, versioned, and testable. Several national administrations already work this way.",
    fit: "Open source fits when correctness must be auditable — you can read the rule that produced the number. It doesn't fit if nobody owns keeping the rules current when the law changes.",
    categorySlugs: ["tax-engines", "rules-as-code", "payroll"],
  },
  {
    id: "filing",
    title: "File and prepare",
    intro:
      "The most visible layer, and the most uneven. The United States has the IRS's own Direct File in the open; crypto cost-basis tooling is genuinely strong everywhere; but in much of Europe consumer filing stops at closed government APIs. What exists is here — including the accounting layer underneath it.",
    fit: "Open source fits preparation, calculation, and crypto reporting today. Actual submission depends on the jurisdiction — where filing channels are closed, no license can open them.",
    categorySlugs: ["tax-prep-filing", "crypto-gains", "accounting"],
  },
  {
    id: "research",
    title: "Understand and shape the law",
    intro:
      "Tax law as data: statute corpora, rate scrapers, microsimulation models that score reform proposals, and the benchmarks that measure whether AI actually understands any of it. This is where policy teams, researchers, and the serious end of tax AI meet.",
    fit: "Open source fits research and policy analysis outright — the transparency is the point. Treat community-maintained legal corpora as a starting point, not as advice.",
    categorySlugs: [
      "tax-data",
      "policy-microsim",
      "transfer-pricing",
      "benchmarks-datasets",
      "curated-lists",
    ],
  },
];

export type Mandate = {
  /** Jurisdiction facet slug — links to /jurisdictions/[slug]. */
  jur: string;
  jurLabel: string;
  name: string;
  when: string;
  status: "live" | "ahead";
  note: string;
};

/** The compliance calendar, newest obligations first. Reviewed 2026-07. */
export const MANDATES: Mandate[] = [
  {
    jur: "es",
    jurLabel: "Spain",
    name: "VeriFactu",
    when: "Jan 2026 · companies — Jul 2026 · self-employed",
    status: "live",
    note: "Certified billing software with hash-chained, tamper-evident records.",
  },
  {
    jur: "pl",
    jurLabel: "Poland",
    name: "KSeF e-invoicing",
    when: "Feb 2026 · large — Apr 2026 · all businesses",
    status: "live",
    note: "All B2B invoices clear through the national KSeF platform.",
  },
  {
    jur: "uk",
    jurLabel: "United Kingdom",
    name: "MTD for Income Tax",
    when: "Apr 2026 · income over £50k",
    status: "live",
    note: "Quarterly digital records and filing through recognised software.",
  },
  {
    jur: "fr",
    jurLabel: "France",
    name: "E-invoicing reform",
    when: "Sep 2026 · receive (all) — Sep 2027 · issue (all)",
    status: "ahead",
    note: "Structured invoices via accredited platforms (PDP), Factur-X among the formats.",
  },
  {
    jur: "de",
    jurLabel: "Germany",
    name: "E-Rechnung issuance",
    when: "2027–2028 · phased by turnover",
    status: "ahead",
    note: "B2B structured invoicing (XRechnung/ZUGFeRD); receiving is already mandatory.",
  },
  {
    jur: "br",
    jurLabel: "Brazil",
    name: "CBS/IBS reform",
    when: "2026 pilot → 2033 full",
    status: "ahead",
    note: "The largest consumption-tax rewrite in decades, on top of NF-e rails.",
  },
  {
    jur: "eu",
    jurLabel: "European Union",
    name: "ViDA digital reporting",
    when: "2030–2035",
    status: "ahead",
    note: "EN 16931 e-invoicing and digital reporting across all member states.",
  },
];

export type EvalPoint = { title: string; body: string };

/** The four questions to ask before adopting any tool in the index. */
export const EVAL_POINTS: EvalPoint[] = [
  {
    title: "License",
    body: "Every listing shows its license. Permissive (MIT, Apache-2.0) embeds anywhere; copyleft (GPL, AGPL) obliges you to share changes — fine for internal use, a real decision for products.",
  },
  {
    title: "Maintenance",
    body: "The colored pill on every card reads the repository's pulse: Active (pushed within a month), Maintained (six months), Quiet, Stale. Tax tools live on annual cycles — Quiet isn't dead, but Stale code meets this year's law at your risk.",
  },
  {
    title: "Coverage",
    body: "Tax software doesn't travel. Check the jurisdiction and tax-subject tags before anything else — a brilliant German ELSTER library is worth nothing in Madrid.",
  },
  {
    title: "Who maintains it",
    body: "A tax authority (IRS, Polish Ministry of Finance), a company with a business on top, or a lone maintainer — each is a different risk profile. Claimed projects here are verifiably run by their maintainers.",
  },
];
