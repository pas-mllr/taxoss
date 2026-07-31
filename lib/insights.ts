/**
 * The state of open tax — the six theses on /insights, written for tax
 * professionals, tax leadership, and tax authorities. Each thesis renders
 * with a live evidence line computed from the index (see app/insights),
 * so the argument stays tethered to verifiable numbers.
 */

export type Takeaway = { audience: string; text: string };

export type Thesis = {
  id: string;
  title: string;
  paragraphs: string[];
  takeaways: Takeaway[];
};

export const THESES: Thesis[] = [
  {
    id: "mandates",
    title: "Mandates, not markets, build open tax software",
    paragraphs: [
      "Ask what creates open-source tax code and the answer in this index is unambiguous: compliance deadlines. E-invoicing and digital reporting form the largest subject cluster here — libraries written in Portuguese for Brazil's NF-e, in Polish for KSeF, in Spanish for VeriFactu, in Turkish for e-Fatura, in Italian for the SDI. Spain's VeriFactu regulation produced three open implementations within a year of the technical specification. Brazil, which mandated e-invoicing before almost anyone, now has mature libraries in four programming languages.",
      "The mechanism is simple: a clearance mandate gives thousands of businesses the exact same plumbing problem on the exact same deadline, and nobody wants to write an XML signer alone. Commercial vendors serve the top of that market; open source absorbs the rest — and then the vendors quietly build on it too.",
      "The predictive value is what makes this useful: France's September 2026 milestone is already generating Factur-X tooling, and ViDA — one obligation across every EU member state — is set to trigger the largest wave of open compliance code yet written.",
    ],
    takeaways: [
      {
        audience: "If you run a tax function",
        text: "Check the open layer before commissioning mandate plumbing — for the format-and-validation layer of any e-invoicing mandate, shared open code is now the default starting point, not the exception.",
      },
      {
        audience: "If you're a tax authority",
        text: "Your specification's clarity directly determines how fast an ecosystem forms around your mandate. Publish schemas, test suites, and sandboxes early — the market will write much of the tooling for you.",
      },
    ],
  },
  {
    id: "authority-code",
    title: "When the authority ships code, an ecosystem follows",
    paragraphs: [
      "The deepest jurisdiction in this index is the United States, shaped in part by the IRS publishing the Tax Year 2024 Direct File code. That repository is now archived and explicitly unsuitable for production, but remains a consequential historical reference. Poland's Ministry of Finance maintains official KSeF API tooling on GitHub, and community clients formed around it within months. France's OpenFisca began as state-adjacent infrastructure and became the world's most-forked rules-as-code framework, with country packages from New Zealand to Tunisia.",
      "Now look at Germany: an energetic community — ELSTER bindings, MCP servers, payroll rules-as-code, a fine-tuned tax LLM — permanently capped by one closed component, the ERiC submission library. The community's response is telling: Rust bindings around the binary, browser automation around the portal. The same pattern holds in Turkey, where open clients track undocumented government portals, and the Netherlands, where filing tooling simply stops.",
      "The comparison is a controlled experiment, and the result reads like policy advice: authorities that publish reference implementations multiply private compliance investment; authorities that keep the core closed convert that same energy into reverse-engineering.",
    ],
    takeaways: [
      {
        audience: "If you're a tax authority",
        text: "Direct File and KSeF show that publishing code is no longer exotic. A reference implementation can accelerate compliance tooling, provided its maintenance lifecycle and intended use are explicit.",
      },
      {
        audience: "If you run a tax function",
        text: "Treat authority authorship as provenance evidence, not production approval. Verify current maintenance, legal scope, security, support, and intended use separately.",
      },
    ],
  },
  {
    id: "ai-open-first",
    title: "Tax AI is being built open-first — a historical reversal",
    paragraphs: [
      "Every previous generation of tax software arrived closed: vendors first, open source trailing by a decade if at all. The AI layer is inverting that order. In this index the agent-and-AI cluster spans MCP servers exposing ELSTER, Skatteetaten, and commercial platforms to AI agents; portable skill packs encoding national tax workflows; a fine-tuned German Steuer-LLM; French tax-law embeddings; and open benchmarks that measure whether frontier models can actually compute tax — the unglamorous work that vendors publish least.",
      "Three forces drive the reversal. The protocols are open standards, so the plumbing is naturally shared. The community iterates faster than vendor release cycles in a space that is reinventing itself quarterly. And tax data is exactly the kind of data nobody wants to send to a third-party model — which makes self-hosted, inspectable AI a structural fit rather than an ideological preference.",
      "The practical consequence: for the first time, the experimental frontier of tax technology is publicly inspectable. You can watch the agent layer being built, tool by tool, on this site's Radar.",
    ],
    takeaways: [
      {
        audience: "If you run a tax function",
        text: "Your AI pilot layer can be open and self-hosted even while your core stack stays vendor. Confirm every model endpoint, connector, log, and telemetry path before concluding that data stays in-house.",
      },
      {
        audience: "If you advise clients",
        text: "The open benchmarks are your reality check: before trusting any model with tax work, look at how models actually score on tax-specific evaluations.",
      },
    ],
  },
  {
    id: "two-ecosystems",
    title: "The commercial and open ecosystems barely touch",
    paragraphs: [
      "Map the roughly five hundred vendors of the commercial taxtech landscape against this index and the overlap is close to zero: a handful of thin API client libraries, and nothing that computes, validates, or files. That is not an accident of maturity — it is the business model. In commercial taxtech, the moat is content: the rates, rules, forms, and jurisdiction coverage that vendors sell subscriptions to. Nobody open-sources their moat.",
      "So open tax software has a fundamentally different supply side: tax authorities publishing infrastructure, academics building policy models, practitioners scratching their own itch, and businesses sharing mandate plumbing. It's the inverse of most software categories, where vendors seed the open ecosystem.",
      "This changes how the ecosystem should be evaluated. Open tax tools are not 'vendor products minus the price tag' — they are a parallel system with different strengths (transparency, jurisdictional depth in odd places, speed after mandates) and different risks (maintenance, liability, coverage gaps). Judging them by a vendor RFP checklist misreads both.",
    ],
    takeaways: [
      {
        audience: "If you run a tax function",
        text: "Evaluate open tools on their own terms — license, maintenance pulse, coverage, and who stands behind the code. The Stack page carries the four-question framework.",
      },
      {
        audience: "If you're a vendor",
        text: "The open layer underneath you is gaining authority-published anchors. The durable position is building on and contributing to useful shared infrastructure without overstating what provenance guarantees.",
      },
    ],
  },
  {
    id: "last-mile",
    title: "Open source stops at the last mile — the channel, not the license",
    paragraphs: [
      "Count the index by function and a lopsided picture appears: calculation engines, format libraries, and validators vastly outnumber tools that actually file. The scarcity is not for lack of demand — personal filing is the most-wanted tax software on earth. It's the channel: in most jurisdictions the submission interface is closed, certified, or simply absent.",
      "The workarounds are the diagnosis. Japan's leading open filing tool drives the e-Tax website by browser automation. An American MCP server fills in a commercial filing product the same way. Germany's ecosystem wraps a closed binary it cannot see inside. When skilled engineers resort to scripting government websites, the message isn't ingenuity — it's that the front door is locked.",
      "When the IRS released Direct File, it exposed unusually deep filing architecture and tax logic for public study. The code is now archived rather than a production option, but it still shows what an ecosystem can learn when a filing implementation is opened.",
    ],
    takeaways: [
      {
        audience: "If you're a tax authority",
        text: "An open, documented filing API is worth more to compliance than another portal redesign. The evidence is one click away in every jurisdiction on this site.",
      },
      {
        audience: "If you run a tax function",
        text: "Plan around the ceiling: expect open tooling to carry preparation and validation, and treat the submission step as its own build-or-buy decision per jurisdiction.",
      },
    ],
  },
  {
    id: "blank-map",
    title: "The map is mostly blank — and that's the opportunity",
    paragraphs: [
      "Nineteen jurisdictions have a presence in this index. One OpenFisca country package represents the entire African continent. Most of Asia, the Middle East, and Latin America beyond Brazil is unmapped — not because no tax software exists there, but because what exists is closed, or published in languages and forums that English-language landscape scans never reach.",
      "The projects here from Japan, Turkey, Poland, and Brazil were found by searching in Japanese, Turkish, Polish, and Portuguese. That's a sampling method most industry reports don't use — and a strong hint that the real map is bigger than anyone's version of it, including ours.",
      "For funders, development organizations, and tax administrations in unmapped regions, the blank space is the point: rules-as-code for one country's income tax is a bounded, provable project with the entire OpenFisca and Catala toolchain waiting. The frontier is not technical.",
    ],
    takeaways: [
      {
        audience: "If you work in tax anywhere on the blank map",
        text: "One indexed project changes your jurisdiction's visibility. If you know open tax software in any language, submitting it takes a minute.",
      },
      {
        audience: "If you fund tax capacity",
        text: "Open rules-as-code is infrastructure with a proven playbook and compounding returns — and it is dramatically underfunded outside the OECD.",
      },
    ],
  },
];
