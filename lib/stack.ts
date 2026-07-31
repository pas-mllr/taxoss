/**
 * Stable editorial structure for the problem-first Stack page. Regulatory
 * facts live in the reviewed mandate tables and are not duplicated here.
 */

export type StackSection = {
  id: string;
  title: string;
  intro: string;
  fit: string;
  categorySlugs: string[];
};

export const STACK_SECTIONS: StackSection[] = [
  {
    id: "mandates",
    title: "Meet a mandate",
    intro:
      "Governments are rewiring tax compliance around real-time, structured data — e-invoicing clearance, digital reporting, and regulated billing systems. This is the decade's compliance story, and much of the plumbing that meets it is open: invoice format libraries, VAT validation, and reporting standards you can read, audit, and embed.",
    fit: "Open source fits the format and transmission layer — the mandate logic itself. It won't give you the surrounding workflow, archiving, or liability cover a vendor contracts for.",
    categorySlugs: ["invoicing", "vat-gst", "compliance"],
  },
  {
    id: "ai",
    title: "Put AI to work — with deployment you control",
    intro:
      "Every tax leader is being asked for an AI plan. Open-source tools can run on infrastructure your team controls, but data location still depends on model endpoints, connectors, telemetry, and configuration. MCP servers can give AI agents governed access to tax systems; skills and local models make workflows more inspectable and portable.",
    fit: "Open source fits experimentation and data-sensitive deployment when somebody owns the data-flow review and operations. It doesn't fit teams with nobody to run it — hosted AI with a data-processing agreement may serve them better.",
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
      "The most visible layer, and the most uneven. The IRS published its Tax Year 2024 Direct File code as an archived historical reference; crypto cost-basis tooling remains genuinely strong; but in much of Europe consumer filing stops at closed government APIs. What exists is here — including the accounting layer underneath it.",
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

export type EvalPoint = { title: string; body: string };

export const EVAL_POINTS: EvalPoint[] = [
  {
    title: "License",
    body: "Listings show host-detected license metadata when available. Permissive licenses still carry notice, patent, or trademark conditions; copyleft obligations depend on distribution and, for AGPL, network use. Review the actual text and dependency licenses.",
  },
  {
    title: "Maintenance",
    body: "The colored pill reads repository activity only: Active (pushed within a month), Maintained (six months), Quiet, Stale. It does not establish legal currency, security, support, or production readiness.",
  },
  {
    title: "Coverage",
    body: "Tax software doesn't travel. Check the jurisdiction and tax-subject tags before anything else — a brilliant German ELSTER library is worth nothing in Madrid.",
  },
  {
    title: "Who maintains it",
    body: "A tax authority, a company, or a lone maintainer creates a different continuity profile. A verified maintainer proves control of the repository page; authority publication proves provenance, not security, support, approval, or production fitness.",
  },
];
