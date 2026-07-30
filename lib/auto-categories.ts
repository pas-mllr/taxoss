/**
 * Provisional categorization for community submissions, derived from GitHub
 * topics + description. Maintainers refine categories after claiming — the
 * submit flow itself takes no curation input.
 */
const RULES: [slug: string, pattern: RegExp][] = [
  ["mcp-servers", /\bmcp\b|\bmodel context protocol\b/i],
  ["agent-skills", /\bagent skills?\b|\bskill\.?md\b|\bskill (packs?|library|collection)\b|\bclaude (code |)(skills?|plugins?)\b/i],
  ["rules-as-code", /\brules.as.code\b|\bcomputational law\b|\bcatala\b|\bopenfisca\b|\bpolicyengine\b/i],
  ["rag-retrieval", /\brag\b|\bretrieval\b|\bembeddings?\b|\bvector (search|store|db)\b|\bsemantic search\b/i],
  ["curated-lists", /\bawesome\b|\bcurated list\b|\blandscape\b/i],
  ["tax-prep-filing", /\btax (return|prep|filing)\b|\be-?fil(e|ing)\b|\bform 1040\b|\bdirect file\b|\bself.?assessment\b|\baangifte\b|\bsteuererkl/i],
  ["vat-gst", /\bvat\b|\bgst\b|\bsales tax\b|\bindirect tax\b|\bhst\b|\bbtw\b|\bumsatzsteuer\b|\btax.?id\b|\bvies\b/i],
  ["invoicing", /\binvoic|\be-?invoic|\bpeppol\b|\bubl\b|\bzugferd\b|\bfactur-?x\b|\bxrechnung\b|\bbilling\b/i],
  ["payroll", /\bpayroll\b|\bwithholding\b|\bwage tax\b|\bsocial (security|contributions?)\b|\bpaye\b|\bloonheffing\b/i],
  ["accounting", /\baccounting\b|\bbookkeeping\b|\bledger\b|\berp\b|\bdouble.?entry\b|\bplain.?text accounting\b/i],
  ["tax-engines", /\btax.?(calculator|engine|calculation)\b|\bcompute.* tax\b|\btax comput/i],
  ["tax-data", /\btax (data|law|code|statute|corpus|rates?|forms?)\b|\bstatutes?\b|\blegislation\b|\brevenue (rulings?|service)\b|\birs\b|\bhmrc\b/i],
  ["compliance", /\bcompliance\b|\bsaf-?t\b|\bcountry.by.country\b|\bcbcr?\b|\bdac7\b|\bfatca\b|\bcrs\b|\bregulat|\baml\b|\bkyc\b/i],
  ["transfer-pricing", /\btransfer pricing\b|\btax treat(y|ies)\b|\bcross.?border\b|\bbeps\b|\bpillar (one|two|1|2)\b/i],
  ["crypto-gains", /\bcrypto\b|\bcapital gains?\b|\bportfolio\b|\bbitcoin\b|\bdefi\b|\bcost basis\b/i],
  ["policy-microsim", /\bmicrosimulation\b|\btax.?benefit\b|\bpolicy (analysis|model)\b|\bmicrosim\b/i],
  ["tax-ai", /\btax.?(ai|nlp|llm)\b|\bmachine learning\b|\blanguage model|\bnlp\b|\bllm\b|\brag\b/i],
  ["local-ai", /\blocal.?(ai|llm|first)\b|\bon.?device\b|\boffline\b|\bollama\b|\bllama.?cpp\b|\bself.?host/i],
  ["benchmarks-datasets", /\bbenchmark|\bdatasets?\b|\bcorpus\b|\beval(uation)?s?\b/i],
];

export function autoCategorize(
  topics: string[],
  description: string | null,
  repoName: string,
): string[] {
  const haystack = `${topics.join(" ")} ${description ?? ""} ${repoName}`;
  return RULES.filter(([, re]) => re.test(haystack))
    .map(([slug]) => slug)
    .slice(0, 3);
}
