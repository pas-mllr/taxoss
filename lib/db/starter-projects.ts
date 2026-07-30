/** Optional first-boot content: real repos, curated categories. */
export const STARTER_PROJECTS: { repo: string; categories: string[] }[] = [
  { repo: "PolicyEngine/policyengine-us", categories: ["policy-microsim", "rules-as-code"] },
  { repo: "PSLmodels/Tax-Calculator", categories: ["policy-microsim", "tax-engines"] },
  { repo: "openfisca/openfisca-core", categories: ["rules-as-code", "policy-microsim"] },
  { repo: "openfisca/openfisca-france", categories: ["rules-as-code"] },
  { repo: "ustaxes/UsTaxes", categories: ["tax-prep-filing"] },
  { repo: "CatalaLang/catala", categories: ["rules-as-code"] },
  { repo: "ZUGFeRD/mustangproject", categories: ["invoicing"] },
  { repo: "invoiceninja/invoiceninja", categories: ["invoicing", "accounting"] },
  { repo: "arthurdejong/python-stdnum", categories: ["vat-gst"] },
  { repo: "rotki/rotki", categories: ["crypto-gains", "accounting"] },
  { repo: "BittyTax/BittyTax", categories: ["crypto-gains", "tax-prep-filing"] },
  { repo: "frappe/erpnext", categories: ["accounting"] },
];
