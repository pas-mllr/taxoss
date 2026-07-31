/**
 * Editorial content for the Jurisdictions atlas — the story-first world map
 * of open-source tax software, written for tax professionals and leaders.
 *
 * Every jurisdiction slug in FACET_SEED must appear in exactly one section;
 * the page renders whatever the DB has, grouped by these lists.
 */

export type AtlasSection = {
  id: string;
  title: string;
  intro: string;
  slugs: string[];
};

export const ATLAS_SECTIONS: AtlasSection[] = [
  {
    id: "deep",
    title: "Where you can build a full stack",
    intro:
      "Eight ecosystems with real depth — engines, invoice formats, filing lineage, AI tooling, and the data underneath. If your footprint touches these, open source is a serious option at almost every layer, not a curiosity.",
    slugs: ["global", "eu", "us", "de", "fr", "es", "br", "uk"],
  },
  {
    id: "mandate-made",
    title: "Where mandates built the ecosystem",
    intro:
      "These ecosystems exist because a clearance regime forced them into existence: when every invoice must pass through a government platform, libraries follow within months. The tooling is excellent exactly where the mandate points — and thin everywhere it doesn't.",
    slugs: ["pl", "it", "in", "tr"],
  },
  {
    id: "pockets",
    title: "Pockets of coverage",
    intro:
      "A few real tools each — an agent skill pack here, a rules-as-code model there — maintained by small communities against closed government interfaces. Useful if they hit your exact need; honest gaps everywhere else.",
    slugs: ["nl", "no", "jp", "ca", "au", "nz"],
  },
  {
    id: "frontier",
    title: "The frontier",
    intro:
      "One OpenFisca country package is currently the entire African continent's representation in this index. Most of Asia, the Middle East, and Latin America beyond Brazil is blank — not because there's no tax software there, but because it isn't open or we haven't found it. If you know a project in any local language, submitting it takes a minute.",
    slugs: ["tn"],
  },
];

export type AtlasPattern = { title: string; body: string };

/** The two patterns that explain most of the map. */
export const ATLAS_PATTERNS: AtlasPattern[] = [
  {
    title: "Governments now ship open source",
    body: "The IRS published the Tax Year 2024 Direct File code, now archived as a historical reference. Poland's Ministry of Finance maintains official KSeF tooling on GitHub. France's OpenFisca powers state-run simulators, and New Zealand piloted rules-as-code inside government. Authority publication is strong provenance evidence, but maintenance, security, support, and production fitness still require separate review.",
  },
  {
    title: "The closed-API ceiling",
    body: "The pattern that repeats in almost every jurisdiction: open source thrives at calculation, formats, and preparation — then stops at submission, because the filing channel is gated. Germany's ERiC library is closed, the Dutch Belastingdienst exposes no public filing API, Canada's NETFILE certification is closed, MTD requires recognised software. Plan for open source to carry you to the last mile, and treat the filing step as its own decision.",
  },
];
