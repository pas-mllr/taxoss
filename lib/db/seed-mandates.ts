import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type MandateSeed = {
  slug: string;
  jurisdiction: string;
  name: string;
  summary: string;
  legalBasis: string;
  scope: string;
  exceptions: string;
  lifecycle: "ahead" | "in-force" | "phased";
  phases: {
    slug: string;
    label: string;
    phaseType: string;
    effectiveFrom: string;
    scope: string;
    exceptions: string;
  }[];
  sources: {
    title: string;
    publisher: string;
    url: string;
    supports: string[];
  }[];
};

export const MANDATE_SEED: MandateSeed[] = [
  {
    slug: "spain-sif-verifactu",
    jurisdiction: "es",
    name: "Billing-system rules (VERI*FACTU)",
    summary:
      "Covered billing systems must create integrity-protected records; VERI*FACTU transmission is one permitted mode rather than a product certification.",
    legalBasis:
      "Royal Decree 1007/2023, Order HAC/1177/2024, and the deadline amendment in Royal Decree-Law 15/2025.",
    scope: "Taxpayers covered by Spain's computerized billing-system regulation.",
    exceptions:
      "Applicability depends on taxpayer and invoicing-system scope; the official rules and exclusions control.",
    lifecycle: "ahead",
    phases: [
      {
        slug: "corporate-tax-filers",
        label: "Corporate Income Tax filers",
        phaseType: "operate",
        effectiveFrom: "2027-01-01",
        scope: "Entities that file Corporate Income Tax returns.",
        exceptions: "Use the statutory scope and exclusions in the SIF regulation.",
      },
      {
        slug: "other-covered-taxpayers",
        label: "Other covered taxpayers",
        phaseType: "operate",
        effectiveFrom: "2027-07-01",
        scope: "Other taxpayers within the SIF regulation.",
        exceptions: "Use the statutory scope and exclusions in the SIF regulation.",
      },
    ],
    sources: [
      {
        title: "Information note: extension of the SIF adaptation deadline",
        publisher: "Spanish Tax Agency",
        url: "https://sede.agenciatributaria.gob.es/Sede/en_gb/iva/sistemas-informaticos-facturacion-verifactu/nota-informativa-ampliacion-plazo-adaptacion-facturacion.html",
        supports: ["dates", "scope", "testing-period"],
      },
    ],
  },
  {
    slug: "poland-ksef",
    jurisdiction: "pl",
    name: "KSeF e-invoicing",
    summary:
      "Receiving is mandatory and issuance is phased, with taxpayer and transaction exclusions plus temporary small-taxpayer relief.",
    legalBasis: "Mandatory KSeF framework under Poland's VAT legislation.",
    scope: "Polish structured invoices within mandatory KSeF scope.",
    exceptions:
      "B2C, specified non-established suppliers, special schemes, transaction exclusions, and temporary 2026 relief may apply.",
    lifecycle: "in-force",
    phases: [
      {
        slug: "largest-taxpayers",
        label: "Largest taxpayers issue through KSeF",
        phaseType: "issue",
        effectiveFrom: "2026-02-01",
        scope: "Taxpayers above the official PLN 200 million 2024 sales threshold.",
        exceptions: "Official taxpayer and transaction exclusions remain applicable.",
      },
      {
        slug: "receiving",
        label: "Receiving through KSeF",
        phaseType: "receive",
        effectiveFrom: "2026-02-01",
        scope: "Recipients within mandatory KSeF scope.",
        exceptions: "Official scope rules remain applicable.",
      },
      {
        slug: "most-others",
        label: "Most other taxpayers issue through KSeF",
        phaseType: "issue",
        effectiveFrom: "2026-04-01",
        scope: "Other taxpayers within mandatory KSeF scope.",
        exceptions:
          "Temporary relief applies through 2026 when monthly invoiced gross sales do not exceed PLN 10,000.",
      },
      {
        slug: "small-taxpayer-relief-ends",
        label: "Temporary small-taxpayer issuance relief ends",
        phaseType: "transition",
        effectiveFrom: "2027-01-01",
        scope: "Taxpayers using the 2026 PLN 10,000 monthly relief.",
        exceptions: "Other statutory exclusions remain applicable.",
      },
    ],
    sources: [
      {
        title: "Scope of mandatory KSeF",
        publisher: "Polish Ministry of Finance",
        url: "https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/zakres-obowiazkowego-ksef/",
        supports: ["dates", "scope", "exceptions", "receiving"],
      },
    ],
  },
  {
    slug: "uk-mtd-income-tax",
    jurisdiction: "uk",
    name: "MTD for Income Tax",
    summary:
      "Sole traders and landlords keep digital records and submit quarterly updates through compatible software; the annual return remains.",
    legalBasis: "Making Tax Digital for Income Tax legislation and HMRC guidance.",
    scope: "Qualifying gross self-employment and property income above the phased threshold.",
    exceptions: "Digital-exclusion and other statutory exemptions may apply; partnerships follow a later timetable.",
    lifecycle: "in-force",
    phases: [
      {
        slug: "over-50000",
        label: "Qualifying income over GBP 50,000",
        phaseType: "report",
        effectiveFrom: "2026-04-06",
        scope: "Sole traders and landlords over the GBP 50,000 qualifying-income threshold.",
        exceptions: "HMRC exemptions and qualifying-income rules apply.",
      },
      {
        slug: "over-30000",
        label: "Qualifying income over GBP 30,000",
        phaseType: "report",
        effectiveFrom: "2027-04-06",
        scope: "Sole traders and landlords over the GBP 30,000 qualifying-income threshold.",
        exceptions: "HMRC exemptions and qualifying-income rules apply.",
      },
      {
        slug: "over-20000",
        label: "Qualifying income over GBP 20,000",
        phaseType: "report",
        effectiveFrom: "2028-04-06",
        scope: "Sole traders and landlords over the GBP 20,000 qualifying-income threshold.",
        exceptions: "HMRC exemptions and qualifying-income rules apply.",
      },
    ],
    sources: [
      {
        title: "Find out if and when you need to use MTD for Income Tax",
        publisher: "HM Revenue & Customs",
        url: "https://www.gov.uk/guidance/find-out-if-and-when-you-need-to-use-making-tax-digital-for-income-tax",
        supports: ["dates", "thresholds", "scope", "exemptions"],
      },
    ],
  },
  {
    slug: "france-e-invoicing",
    jurisdiction: "fr",
    name: "E-invoicing and e-reporting reform",
    summary:
      "Domestic B2B e-invoicing and transaction/payment e-reporting phase in through approved platforms.",
    legalBasis: "French electronic invoicing and e-reporting reform legislation.",
    scope: "French businesses within domestic B2B e-invoicing and e-reporting scope.",
    exceptions: "E-invoicing and e-reporting scope differ by transaction; official rules control.",
    lifecycle: "ahead",
    phases: [
      {
        slug: "receive-all",
        label: "All businesses receive e-invoices",
        phaseType: "receive",
        effectiveFrom: "2026-09-01",
        scope: "All businesses, where the supplier must issue electronically.",
        exceptions: "Official transaction-scope rules apply.",
      },
      {
        slug: "large-eti-issue-report",
        label: "Large companies and ETIs issue and e-report",
        phaseType: "issue-report",
        effectiveFrom: "2026-09-01",
        scope: "Large companies and intermediate-sized enterprises.",
        exceptions: "Official transaction-scope rules apply.",
      },
      {
        slug: "sme-micro-issue-report",
        label: "SMEs and micro-enterprises issue and e-report",
        phaseType: "issue-report",
        effectiveFrom: "2027-09-01",
        scope: "Small, medium, and micro-enterprises.",
        exceptions: "Official transaction-scope rules apply.",
      },
    ],
    sources: [
      {
        title: "When am I affected by the electronic invoicing reform?",
        publisher: "French tax administration",
        url: "https://www.impots.gouv.fr/professionnel/questions/partir-de-quand-suis-je-concerne-par-la-reforme-de-la-facturation",
        supports: ["dates", "business-size", "receiving", "issuing", "e-reporting"],
      },
    ],
  },
  {
    slug: "germany-e-rechnung",
    jurisdiction: "de",
    name: "E-Rechnung",
    summary:
      "Domestic B2B businesses must receive structured invoices, while issuance transition relief ends in phases.",
    legalBasis: "Section 14 UStG electronic-invoice rules and related BMF guidance.",
    scope: "Qualifying domestic B2B transactions between German businesses.",
    exceptions: "B2C, specified exempt supplies, low-value invoices, transport tickets, and small-business supplies may be excluded.",
    lifecycle: "phased",
    phases: [
      {
        slug: "receiving",
        label: "Businesses can receive structured e-invoices",
        phaseType: "receive",
        effectiveFrom: "2025-01-01",
        scope: "Domestic businesses within the receiving rule.",
        exceptions: "Official receiving scope applies.",
      },
      {
        slug: "general-issuance",
        label: "General issuance transition ends",
        phaseType: "issue",
        effectiveFrom: "2027-01-01",
        scope: "Domestic B2B issuers not using extended small-business transition relief.",
        exceptions: "Prior-year turnover at or below EUR 800,000 may extend relief through 2027.",
      },
      {
        slug: "small-issuer-transition-ends",
        label: "Extended issuance transition ends",
        phaseType: "issue",
        effectiveFrom: "2028-01-01",
        scope: "Domestic B2B issuers within the extended turnover-based relief.",
        exceptions: "Permanent statutory exceptions remain applicable.",
      },
    ],
    sources: [
      {
        title: "Questions and answers on mandatory e-invoicing",
        publisher: "German Federal Ministry of Finance",
        url: "https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html",
        supports: ["dates", "scope", "exceptions", "formats", "archiving"],
      },
    ],
  },
  {
    slug: "brazil-cbs-ibs",
    jurisdiction: "br",
    name: "CBS/IBS consumption-tax reform",
    summary:
      "IBS/CBS document fields become operational before the tax replacement and rate transition completes in 2033.",
    legalBasis: "Brazilian consumption-tax reform constitutional and complementary legislation.",
    scope: "Regular-regime businesses and electronic fiscal documents within IBS/CBS scope.",
    exceptions: "Regime-specific rules and accessory-obligation relief apply under official legislation.",
    lifecycle: "phased",
    phases: [
      {
        slug: "document-fields",
        label: "IBS/CBS document fields enforced",
        phaseType: "document",
        effectiveFrom: "2026-08-03",
        scope: "Regular-regime electronic fiscal documents.",
        exceptions: "Official regime and document-specific rules apply.",
      },
      {
        slug: "cbs-charging",
        label: "CBS charging begins and PIS/COFINS end",
        phaseType: "tax-transition",
        effectiveFrom: "2027-01-01",
        scope: "Taxpayers within the CBS transition.",
        exceptions: "Transitional rates and special regimes apply.",
      },
      {
        slug: "full-model",
        label: "New consumption-tax model fully effective",
        phaseType: "tax-transition",
        effectiveFrom: "2033-01-01",
        scope: "Full CBS/IBS model after the ICMS/ISS transition.",
        exceptions: "Special regimes and statutory exceptions remain applicable.",
      },
    ],
    sources: [
      {
        title: "Mandatory IBS/CBS fields from 3 August",
        publisher: "IBS Management Committee",
        url: "https://cgibs.gov.br/novo-marco-da-reforma-tributaria-inicia-em-03-de-agosto-com-preenchimento-obrigatorio-dos-campos-relativos-ao-ibs-e-a-cbs",
        supports: ["document-fields", "date", "system-rejection"],
      },
      {
        title: "Understand the consumption-tax reform",
        publisher: "Brazilian Federal Revenue Service",
        url: "https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda",
        supports: ["transition", "rates", "tax-replacement", "2033"],
      },
    ],
  },
  {
    slug: "eu-vida",
    jurisdiction: "eu",
    name: "VAT in the Digital Age (ViDA)",
    summary:
      "ViDA phases OSS, platform, single-registration, and cross-border B2B digital-reporting measures through 2035.",
    legalBasis: "Directive (EU) 2025/516, Regulation (EU) 2025/517, and Implementing Regulation (EU) 2025/518.",
    scope: "EU VAT rules across the ViDA pillars; each phase has distinct transaction and taxpayer scope.",
    exceptions: "ViDA's 2030 digital reporting is cross-border B2B, not a universal domestic B2B mandate.",
    lifecycle: "ahead",
    phases: [
      {
        slug: "oss-clarifications",
        label: "OSS/IOSS clarifications",
        phaseType: "registration",
        effectiveFrom: "2027-01-01",
        scope: "Users of the relevant OSS and IOSS schemes.",
        exceptions: "Measure-specific rules apply.",
      },
      {
        slug: "platform-single-registration",
        label: "Platform and single-registration measures",
        phaseType: "platform-registration",
        effectiveFrom: "2028-07-01",
        scope: "Covered platforms and businesses within single VAT registration measures.",
        exceptions: "Measure-specific rules apply.",
      },
      {
        slug: "cross-border-drr",
        label: "Cross-border B2B digital reporting",
        phaseType: "report",
        effectiveFrom: "2030-07-01",
        scope: "Cross-border B2B transactions within the EU digital-reporting requirement.",
        exceptions: "This phase is not a universal domestic B2B reporting mandate.",
      },
      {
        slug: "domestic-alignment",
        label: "Legacy domestic real-time systems align",
        phaseType: "alignment",
        effectiveFrom: "2035-01-01",
        scope: "Member States with pre-existing domestic real-time reporting obligations.",
        exceptions: "Applies to the alignment obligation described in ViDA.",
      },
    ],
    sources: [
      {
        title: "VAT in the Digital Age",
        publisher: "European Commission",
        url: "https://taxation-customs.ec.europa.eu/taxation/vat/vat-digital-age-vida_en",
        supports: ["legal-acts", "dates", "pillars", "scope"],
      },
    ],
  },
];

const REVIEWED_AT = new Date("2026-07-31T12:00:00Z");
const REVIEW_DUE_AT = new Date("2026-10-31T12:00:00Z");

export function seedMandates(
  database: BetterSQLite3Database<typeof schema>,
): void {
  for (const seed of MANDATE_SEED) {
    const jurisdiction = database
      .select({ id: schema.facets.id })
      .from(schema.facets)
      .where(
        and(
          eq(schema.facets.kind, "jurisdiction"),
          eq(schema.facets.slug, seed.jurisdiction),
        ),
      )
      .limit(1)
      .get();
    if (!jurisdiction) continue;

    database.transaction((tx) => {
      const mandate = tx
        .insert(schema.mandates)
        .values({
          slug: seed.slug,
          jurisdictionFacetId: jurisdiction.id,
          name: seed.name,
          summary: seed.summary,
          legalBasis: seed.legalBasis,
          scope: seed.scope,
          exceptions: seed.exceptions,
          lifecycle: seed.lifecycle,
          status: "published",
          reviewerName: "TaxOSS editorial review",
          lastReviewedAt: REVIEWED_AT,
          reviewDueAt: REVIEW_DUE_AT,
          publishedAt: REVIEWED_AT,
        })
        .onConflictDoNothing()
        .returning({ id: schema.mandates.id })
        .get();
      if (!mandate) return;

      for (const [sort, phase] of seed.phases.entries()) {
        tx.insert(schema.mandatePhases)
          .values({ mandateId: mandate.id, ...phase, exceptions: phase.exceptions, sort })
          .run();
      }

      for (const source of seed.sources) {
        tx.insert(schema.mandateSources)
          .values({
            mandateId: mandate.id,
            kind: "primary",
            ...source,
            accessedOn: "2026-07-31",
          })
          .run();
      }
    });
  }
}