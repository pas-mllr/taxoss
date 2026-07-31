/**
 * Editorial copy for the jurisdiction landing pages. Slugs must match the
 * jurisdiction facets in lib/db/seed-facets.ts — the page 404s on anything
 * else, and the index only renders facets that have an entry here.
 *
 * `intro` describes the open-source landscape; `missing` names the gap we'd
 * most like someone to fill. Both are plain sentences, no markdown.
 */

export type JurisdictionContent = {
  /** One-line page subtitle, also the meta description. */
  lede: string;
  intro: string;
  missing: string;
};

export const JURISDICTION_CONTENT: Record<string, JurisdictionContent> = {
  global: {
    lede: "Engines, standards, and rules-as-code frameworks built to work across borders.",
    intro:
      "The multi-country layer is where open-source tax is strongest: rules-as-code frameworks like OpenFisca and Catala model legislation as executable logic, GOBL normalizes invoices and tax documents into one schema, and benchmark suites measure how well AI models actually do tax. These are the foundations national projects build on.",
    missing:
      "A maintained, openly licensed dataset of worldwide VAT/GST rates and thresholds — every commercial provider treats this as the product, so the open ecosystem keeps re-scraping it.",
  },
  eu: {
    lede: "VAT validation, EN 16931 e-invoicing, and the plumbing of the single market.",
    intro:
      "EU-level open source clusters around two things every business touches: VAT number validation against VIES, and the EN 16931 e-invoicing standard that ViDA will push into every member state. Libraries here handle MOSS/OSS VAT rules, structured invoice formats, and cross-border compliance so national tools don't have to.",
    missing:
      "ViDA makes cross-border B2B digital reporting effective in 2030 and aligns legacy domestic systems by 2035. There is no open reference implementation of those requirements yet.",
  },
  au: {
    lede: "ATO-adjacent datasets and community tooling for Australian tax.",
    intro:
      "Australia's open-source footprint is mostly data and community tooling: scraped ATO guidance for training and retrieval, and crypto tax calculators that understand Australian CGT rules. The Standard Business Reporting APIs exist but sit behind registration walls, which keeps lodgment tooling closed.",
    missing:
      "Open GST/BAS preparation tooling — the ATO's SBR gateway is documented but gated, so nobody has shipped an open lodgment path.",
  },
  br: {
    lede: "The NF-e ecosystem — Brazil's mandatory e-invoicing, in four languages.",
    intro:
      "Brazil mandated electronic invoicing before almost anyone, and the open-source response is deep: mature NF-e/NFS-e libraries in Java, Python, TypeScript, and .NET handle signing, transmission, and the SEFAZ web services. If you integrate with Brazilian tax authorities, you build on these.",
    missing:
      "The 2026 CBS/IBS consumption-tax reform is the largest rewrite of Brazilian tax in decades, and open tooling for the new regime is only beginning to appear.",
  },
  ca: {
    lede: "Crypto cost-basis and community calculators for Canadian rules.",
    intro:
      "Canadian coverage rides along in multi-country tools — crypto cost-basis engines with CRA-compliant methods, and benefit/tax calculators that model federal and provincial rules. Dedicated Canadian projects are rare.",
    missing:
      "Open NETFILE/EFILE tooling. The certification process is closed, so open-source personal filing for Canada effectively can't exist yet — rules modeling and pre-filing preparation are where contributions land.",
  },
  fr: {
    lede: "Rules-as-code at national scale: OpenFisca, Catala, and open legal data.",
    intro:
      "France is the strongest argument that tax law can be open infrastructure. OpenFisca-France models the socio-fiscal system as code and powers official simulators; Catala, born from academic work with the DGFiP, compiles annotated law into verified implementations; and the BOFiP administrative doctrine is available as open data with embeddings trained on it.",
    missing:
      "A polished consumer filing experience on top of OpenFisca — the rules engine exists, but nobody has shipped the TurboTax-shaped thing on top of it.",
  },
  de: {
    lede: "The ELSTER ecosystem, payroll rules-as-code, and a German tax LLM.",
    intro:
      "German open source works around a closed core: the fiscal authority's ERiC library handles actual submission, and open projects wrap it, automate it, or model the rules beside it. That includes Rust bindings for ERiC, MCP servers that give AI agents ELSTER access, GETTSIM's transparent model of the tax-benefit system, ZUGFeRD/XRechnung e-invoicing libraries, and a fine-tuned Steuer-LLM.",
    missing:
      "A fully open ERiC replacement. Submission to ELSTER still requires the closed-source library, which caps how open any German filing tool can be.",
  },
  in: {
    lede: "GST compliance tooling for the world's largest indirect-tax overhaul.",
    intro:
      "India's GST regime generates enormous compliance volume — e-invoicing, e-way bills, return filing — and the open response centers on ERP-integrated compliance suites that speak the GSTN's protocols. The pace of regulatory change keeps these projects unusually active.",
    missing:
      "Open income-tax (ITR) preparation tooling — the indirect side is covered, the direct side is not.",
  },
  it: {
    lede: "FatturaPA and the SDI: structured e-invoicing libraries for Italy.",
    intro:
      "Italy runs all B2B invoicing through the Sistema di Interscambio, and open-source libraries cover the FatturaPA format end to end — generation, validation, digital signature, and transmission. It's a focused ecosystem doing one mandatory thing well.",
    missing:
      "Anything beyond e-invoicing. IRPEF/IRES rules modeling, declaration tooling, and Agenzia delle Entrate integrations are open-source deserts.",
  },
  jp: {
    lede: "e-Tax automation and AI agents for Japanese filing.",
    intro:
      "Japan's open-source tax scene is young but pointed in an interesting direction: AI agents that automate the national e-Tax system for individual filing, working around interfaces that were never designed for programmatic access.",
    missing:
      "Almost everything — invoice-system (tekisei seikyūsho) tooling, corporate tax logic, and NTA API clients are all open territory.",
  },
  nl: {
    lede: "Agent skills, vehicle tax, and income calculators for the Dutch system.",
    intro:
      "Dutch open source is pragmatic and small: agent skills that encode ZZP tax workflows, calculators for income tax and motorrijtuigenbelasting, and tooling shaped by the reality that the Belastingdienst exposes no public filing APIs.",
    missing:
      "Open aangifte tooling. Filing runs through closed government channels, so the open ecosystem stops at calculation and preparation — a rules-as-code model of Box 1/2/3 would be a real contribution.",
  },
  nz: {
    lede: "Aotearoa's tax and benefit system as executable rules.",
    intro:
      "New Zealand's presence is rules-as-code done properly: OpenFisca Aotearoa models tax and benefit legislation as open, testable logic, with roots in the government's own Better Rules experiments.",
    missing:
      "IRD gateway tooling and anything touching actual filing — the modeling layer exists, the transaction layer doesn't.",
  },
  no: {
    lede: "Skatteetaten tooling and MCP access to Norwegian tax data.",
    intro:
      "Norway pairs a famously digital tax administration with a small open ecosystem: tooling that works with Skatteetaten's data and services, including MCP servers that let AI agents query Norwegian tax information.",
    missing:
      "Broader Skatteetaten API clients — the administration publishes real APIs, and most of them still lack open wrappers.",
  },
  pl: {
    lede: "KSeF: Poland's national e-invoicing system, with official open source.",
    intro:
      "Poland is the rare case where the tax authority itself ships open source: the Ministry of Finance publishes official KSeF API tooling on GitHub, alongside community clients. With mandatory KSeF e-invoicing arriving in 2026, this ecosystem is about to matter to every business in Poland.",
    missing:
      "Higher-level integrations — the API layer is covered, but open ERP connectors and validation tooling for the KSeF 2.0 schema are still thin.",
  },
  es: {
    lede: "VeriFactu, Facturae, and SII: Spain's anti-fraud invoicing stack.",
    intro:
      "Spain's billing-system rules require covered software to create integrity-protected records; VERI*FACTU transmission is one permitted mode rather than an external product certification. The rules triggered open implementations for SIF compliance, Facturae generation, and SII reporting in PHP, Go, and .NET.",
    missing:
      "Open Renta (personal income tax) tooling — AEAT's filing side remains closed, and nobody models IRPF rules openly yet.",
  },
  tn: {
    lede: "Tunisia's tax-benefit system in OpenFisca.",
    intro:
      "Tunisia is on the map through OpenFisca-Tunisia, which models the country's tax and benefit rules as open code — one of the few African tax systems with any open-source representation at all.",
    missing:
      "Everything else, and that generalizes: African tax systems are the least-covered in open source worldwide. One OpenFisca country package is a start, not an ecosystem.",
  },
  tr: {
    lede: "e-Fatura and e-Arşiv clients for Turkey's GİB portals.",
    intro:
      "Turkish open source concentrates on the GİB's electronic invoicing portals: community libraries that automate e-Fatura and e-Arşiv issuance where official tooling is portal-only. Practical, reverse-engineered, and widely used.",
    missing:
      "Official API stability and anything touching direct taxes — the invoicing clients track undocumented portals, and beyond invoicing there's nothing open.",
  },
  uk: {
    lede: "PolicyEngine, HMRC crypto rules, and capital gains done right.",
    intro:
      "The UK combines serious policy modeling with serious personal tooling: PolicyEngine-UK simulates reforms to the tax and benefit system, while crypto and capital-gains calculators implement HMRC's share-matching rules (same-day, bed-and-breakfast) that generic tools get wrong.",
    missing:
      "Open Making Tax Digital bridging software — MTD mandates digital filing through recognized software, and the recognition process has kept open source out.",
  },
  us: {
    lede: "The IRS published Direct File's Tax Year 2024 code, now an archived reference.",
    intro:
      "The United States has the deepest catalog here. The IRS's Direct File release exposed a real federal filing implementation, but the repository is now archived, may contain unpatched vulnerabilities, and should not be used in production. Around that historical reference are community filing engines, Form 1040 libraries, crypto cost-basis tools, policy models, and MCP servers.",
    missing:
      "Maintained filing implementations and state coverage. Federal reference material is unusually rich, but most state systems have no open implementation.",
  },
};
