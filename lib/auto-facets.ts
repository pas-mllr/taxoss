/**
 * Provisional jurisdiction, tax-domain, and process tagging for new submissions, derived
 * from GitHub topics, description, and repo name — same approach as
 * lib/auto-categories.ts. Curated assignments (admin set-facets endpoint)
 * replace these wholesale, so precision beats recall here: no rule at all is
 * better than a wrong one, and "global" is never guessed.
 */

const JURISDICTION_RULES: [slug: string, pattern: RegExp][] = [
  ["us", /\birs\b|\bform 1040\b|\b1040\b|\bunited states\b|\bus (federal|state|tax|expat)\b|\bfreetaxusa\b|\bform 8949\b|\beitc\b|\bqsbs\b|\bnexus\b/i],
  ["uk", /\bhmrc\b|\buk\b|\bunited kingdom\b|\bself.?assessment\b|\bsection 104\b|\bmaking tax digital\b/i],
  ["de", /\belster\b|\bsteuer|\bfinanzamt\b|\bustva\b|\bzugferd\b|\bxrechnung\b|\bgerman/i],
  ["fr", /\bimp[oô]ts?\b|\bbofip\b|\bfactur-?x\b|\bfrench\b|\bfrance\b|\bquotient familial\b/i],
  ["nl", /\bbelasting|\baangifte\b|\bdutch\b|\bnederland|\bbtw\b/i],
  ["es", /\baeat\b|\bverifactu\b|\bfacturae\b|\bspanish\b|\bspain\b|\bespa[nñ]a\b/i],
  ["it", /\bfattura ?(elettronica|pa)\b|\bitalian\b|\bitaly\b|\bagenzia delle entrate\b/i],
  ["pl", /\bksef\b|\bjpk\b|\bpolish\b|\bpoland\b|\bpodat(ek|ki)\b/i],
  ["br", /\bnf-?s?e\b|\bsped\b|\breceita federal\b|\bbrasil|\bbrazil|\bnota fiscal\b|\bcnpj\b/i],
  ["no", /\bskatteetaten\b|\bnorwegian\b|\bnorway\b|\bskattemelding\b|\bmva\b|\baltinn\b/i],
  ["tr", /\be-?fatura\b|\be-?ar[sş]iv\b|\bgib\b|\bturkish\b|\bturkey\b|\bvergi\b/i],
  ["jp", /確定申告|\be-?tax\b|\bjapan(ese)?\b/i],
  ["in", /\bindia\b|\bindian\b|\bitr\b|\btds\b|\bgstin\b|\bgst (return|compliance|india)\b/i],
  ["au", /\bato\b|\baustralia|\bbusiness activity statement\b/i],
  ["nz", /\baotearoa\b|\bnew zealand\b/i],
  ["ca", /\bcanada\b|\bcanadian\b|\bcra\b/i],
  ["tn", /\btunisia\b|\btunisie\b/i],
  ["eu", /\bvies\b|\bpeppol\b|\ben ?16931\b|\beu vat\b|\beuropean\b|\bdac7\b|\bintrastat\b/i],
];

const SUBJECT_RULES: [slug: string, pattern: RegExp][] = [
  ["pillar-two", /\bpillar (two|2)\b|\bglobal minimum tax\b|\bglobe\b|\bqualified domestic minimum top.?up tax\b|\bqdmtt\b/i],
  ["tax-provision-ias12", /\bias ?12\b|\btax provision\b|\bdeferred tax\b|\bcurrent tax expense\b/i],
  ["cbcr", /\bcbcr\b|\bcountry.by.country report(ing)?\b|\bform 8975\b/i],
  ["withholding", /\bwithholding tax\b|\bwht\b|\btds\b|\btax withheld\b/i],
  ["vat-gst-sales", /\bvat\b|\bgst\b|\bsales tax\b|\bbtw\b|\bumsatzsteuer\b|\bustva\b|\bindirect tax\b|\bmva\b|\biva\b/i],
  ["personal-tax", /\bincome tax\b|\b1040\b|\bpersonal tax\b|\bself.?assessment\b|\btax return\b|\bitr\b|\baangifte\b|\bsteuererkl|\bimp[oô]t sur le revenu\b|確定申告/i],
  ["corporate-tax", /\bcorporate (income )?tax\b|\bcorporation tax\b|\bpillar (two|2)\b|\bcbcr?\b|\bvennootschaps|\bk[oö]rperschaft/i],
  ["payroll-employment", /\bpayroll\b|\bwithholding\b|\bwage tax\b|\bsocial (security|contributions?)\b|\bpaye\b|\bloonheffing\b/i],
  ["e-invoicing-ctc", /\be-?invoic|\binvoic|\bpeppol\b|\bzugferd\b|\bfactur|\bxrechnung\b|\bnf-?s?e\b|\bksef\b|\bverifactu\b|\bclearance\b|\bfatura\b/i],
  ["crypto-capital-gains", /\bcrypto|\bcapital gains?\b|\bcost basis\b|\bbitcoin\b|\bdefi\b|\bstaking\b/i],
  ["transfer-pricing-intl", /\btransfer pricing\b|\bbeps\b|\barm'?s length\b|\btax treat(y|ies)\b/i],
  ["customs-trade", /\bcustoms\b|\bhs code\b|\btariff|\bduty calculation\b/i],
  ["rd-incentives", /\br&d tax\b|\bresearch (and|&) development\b|\btax credits?\b|\bwbso\b/i],
  ["property-tax", /\bproperty tax\b|\bgrundsteuer\b|\bmotorrijtuigenbelasting\b|\bvehicle tax\b/i],
  ["audit-controversy", /\btax (audit|litigation|controversy|penalt)/i],
  ["policy-research", /\bmicrosimulation\b|\btax.?benefit\b|\bpolicy (analysis|model)\b|\bbenchmark|\bdatasets?\b|\bcorpus\b|\blegislation as code\b/i],
];

const PROCESS_RULES: [slug: string, pattern: RegExp][] = [
  ["interpret", /\binterpret|\bresearch|\blaw|\blegislat|\bstatute|\bruling|\bregulation|\brag\b|\bretrieval\b|\bnlp\b/i],
  ["calculate", /\bcalculat|\bcompute|\bengine|\bmicrosim|\brate lookup|\btax.?benefit\b/i],
  ["prepare", /\bprepar|\bworkpaper|\breturn|\binvoic|\bbookkeep|\bledger|\breconcil/i],
  ["validate", /\bvalidat|\bschema|\bcheck|\btest suite|\bbenchmark|\bverify/i],
  ["report", /\breport|\bcbcr\b|\bsa[f-]?t\b|\bdac7\b|\bfatca\b|\bcrs\b/i],
  ["file", /\be-?fil|\bsubmit|\btransmit|\bclearance|\btax return\b/i],
  ["archive", /\barchiv|\bretention|\brecord.?keep|\baudit trail\b/i],
  ["monitor-defend", /\bmonitor|\baudit|\bcontrovers|\bdefen[cd]|\blitigation|\bnotice|\bpenalt/i],
];

const PROCESS_ORDER = PROCESS_RULES.map(([slug]) => slug);

const CATEGORY_PROCESS_MAP: Record<string, string[]> = {
  platforms: ["interpret", "prepare"],
  "agent-skills": ["interpret", "prepare"],
  "mcp-servers": ["interpret"],
  "tax-prep-filing": ["prepare", "validate", "file"],
  "vat-gst": ["calculate", "validate", "report"],
  invoicing: ["prepare", "validate", "report", "file"],
  payroll: ["calculate", "prepare", "report", "file"],
  accounting: ["prepare", "report", "archive"],
  "tax-engines": ["calculate", "validate"],
  "rules-as-code": ["interpret", "calculate", "validate"],
  "tax-data": ["interpret", "monitor-defend"],
  "tax-ai": ["interpret", "prepare"],
  "rag-retrieval": ["interpret"],
  compliance: ["validate", "report", "file", "monitor-defend"],
  "transfer-pricing": ["calculate", "prepare", "report", "monitor-defend"],
  "crypto-gains": ["calculate", "prepare", "report"],
  "policy-microsim": ["interpret", "calculate"],
  "local-ai": ["interpret", "prepare"],
  "benchmarks-datasets": ["validate"],
  "curated-lists": ["interpret"],
};

export function processesForCategories(categorySlugs: string[]): string[] {
  const processes = new Set<string>();
  for (const category of categorySlugs) {
    for (const process of CATEGORY_PROCESS_MAP[category] ?? []) processes.add(process);
  }
  return PROCESS_ORDER.filter((process) => processes.has(process));
}

export function workspaceBackfillFacets(
  topics: string[],
  description: string | null,
  repoName: string,
  categorySlugs: string[],
): { subjects: string[]; processes: string[] } {
  const haystack = `${topics.join(" ")} ${description ?? ""} ${repoName}`.toLowerCase();
  const subjects: string[] = [];
  if (
    [
      "pillar two",
      "pillar 2",
      "global minimum tax",
      "globe",
      "qdmtt",
      "qualified domestic minimum top-up tax",
      "qualified domestic minimum top up tax",
    ].some(
      (term) => haystack.includes(term),
    )
  ) {
    subjects.push("pillar-two");
  }
  if (["ias 12", "tax provision", "deferred tax"].some((term) => haystack.includes(term))) {
    subjects.push("tax-provision-ias12");
  }
  if (
    ["cbcr", "country-by-country", "country by country", "form 8975"].some(
      (term) => haystack.includes(term),
    )
  ) {
    subjects.push("cbcr");
  }
  if (["withholding tax", " wht ", "tds"].some((term) => haystack.includes(term))) {
    subjects.push("withholding");
  }
  return { subjects, processes: processesForCategories(categorySlugs) };
}

function match(rules: [string, RegExp][], haystack: string, cap: number): string[] {
  return rules
    .filter(([, re]) => re.test(haystack))
    .map(([slug]) => slug)
    .slice(0, cap);
}

export function autoFacets(
  topics: string[],
  description: string | null,
  repoName: string,
  categorySlugs: string[] = [],
): { jurisdictions: string[]; subjects: string[]; processes: string[] } {
  const haystack = `${topics.join(" ")} ${description ?? ""} ${repoName}`;
  const processes = new Set(match(PROCESS_RULES, haystack, 8));
  for (const process of processesForCategories(categorySlugs)) processes.add(process);
  return {
    jurisdictions: match(JURISDICTION_RULES, haystack, 3),
    subjects: match(SUBJECT_RULES, haystack, 3),
    processes: [...processes]
      .sort((left, right) => PROCESS_ORDER.indexOf(left) - PROCESS_ORDER.indexOf(right))
      .slice(0, 4),
  };
}
