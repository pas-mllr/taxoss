import Link from "next/link";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, projectCategories, projects, projectStats } from "@/lib/db/schema";
import { ACTIVE_WINDOW_DAYS } from "@/lib/projects";
import { formatCount } from "@/lib/format";
import { EVAL_POINTS, MANDATES, STACK_SECTIONS } from "@/lib/stack";
import { IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Stack",
  description:
    "The open-source tax stack, explained: e-invoicing mandates, AI without data leaving the building, tax engines, filing tools, and law as data — with the projects that cover each.",
};

type CatCard = {
  slug: string;
  name: string;
  blurb: string | null;
  count: number;
  active: number;
  top: { name: string; stars: number }[];
};

const PERSONAS = [
  {
    title: "I lead a tax function",
    body: "Your next board question is on this page: the compliance calendar, and an AI plan that keeps data in-house.",
    links: [
      { href: "#calendar", label: "The calendar" },
      { href: "#ai", label: "The AI stack" },
    ],
  },
  {
    title: "I advise clients",
    body: "What's filable with open tools today, what each mandate changes, and how to judge a tool before relying on it.",
    links: [
      { href: "#filing", label: "Filing tools" },
      { href: "#evaluate", label: "How to evaluate" },
    ],
  },
  {
    title: "I build software",
    body: "Engines with inspectable rules, law as data, and the compliance plumbing you'd rather not write twice.",
    links: [
      { href: "#compute", label: "Engines & rules" },
      { href: "#research", label: "Law as data" },
    ],
  },
];

export default async function StackPage() {
  const [cats, rows] = await Promise.all([
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        blurb: categories.blurb,
      })
      .from(categories)
      .orderBy(categories.sort),
    db
      .select({
        categoryId: projectCategories.categoryId,
        name: projects.name,
        stars: projectStats.stars,
        pushedAt: projectStats.pushedAt,
      })
      .from(projectCategories)
      .innerJoin(projects, eq(projects.id, projectCategories.projectId))
      .leftJoin(projectStats, eq(projectStats.projectId, projects.id)),
  ]);

  const activeCutoff = Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000;
  const byCat = new Map<number, CatCard>();
  for (const c of cats) {
    byCat.set(c.id, { slug: c.slug, name: c.name, blurb: c.blurb, count: 0, active: 0, top: [] });
  }
  for (const r of rows) {
    const c = byCat.get(r.categoryId);
    if (!c) continue;
    c.count += 1;
    if (r.pushedAt && r.pushedAt.getTime() >= activeCutoff) c.active += 1;
    c.top.push({ name: r.name, stars: r.stars ?? 0 });
  }
  for (const c of byCat.values()) {
    c.top.sort((a, b) => b.stars - a.stars);
    c.top = c.top.slice(0, 3);
  }
  const bySlug = new Map([...byCat.values()].map((c) => [c.slug, c]));

  const card = (c: CatCard) => (
    <Link
      key={c.slug}
      href={`/?category=${c.slug}`}
      className="card card-hover project-card"
    >
      <div className="pc-top">
        <div className="pc-name">{c.name}</div>
        <IconArrowRight
          style={{ width: 16, height: 16, color: "var(--ink-500)", flexShrink: 0 }}
        />
      </div>
      <p className="pc-desc">{c.blurb}</p>
      {c.top.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, margin: "4px 0 10px" }}>
          {c.top.map((t) => (
            <div
              key={t.name}
              className="mono"
              style={{
                fontSize: 11.5,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                color: "var(--ink-700)",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.name}
              </span>
              <span style={{ color: "var(--ink-500)", flexShrink: 0 }}>
                ★ {formatCount(t.stars)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="pc-meta">
        <span className="m">
          {c.count} project{c.count !== 1 ? "s" : ""}
        </span>
        <span className="m">{c.active} active</span>
      </div>
    </Link>
  );

  return (
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">The Stack</span>
        <h1 className="display-m">The open source tax stack.</h1>
        <p className="body-l" style={{ maxWidth: 620 }}>
          Not just a directory — a map. What open source covers in tax,
          organized by the problems tax teams actually face: mandates to meet,
          AI to deploy without data leaving the building, tax to compute,
          returns to file, and law to understand.
        </p>
      </div>

      <div className="project-grid" style={{ marginBottom: 40 }}>
        {PERSONAS.map((p) => (
          <div key={p.title} className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{p.title}</h3>
            <p className="pc-desc" style={{ marginBottom: 12 }}>{p.body}</p>
            <div className="cluster">
              {p.links.map((l) => (
                <a key={l.href} href={l.href} className="accent mono" style={{ fontSize: 12 }}>
                  {l.label} ↓
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="stack-24">
        <section className="social-section" id="calendar">
          <div className="social-head">
            <h2>The compliance calendar</h2>
          </div>
          <p className="body" style={{ maxWidth: 680, marginBottom: 8 }}>
            The mandates redrawing tax operations, and where each one stands.
            Every entry links to the open tooling for that jurisdiction.
          </p>
          <div>
            {MANDATES.map((m) => (
              <div className="entry" key={`${m.jur}-${m.name}`}>
                <div className="entry-body">
                  <div className="entry-head">
                    <span
                      className={`badge ${m.status === "live" ? "badge-success" : "badge-neutral"}`}
                    >
                      {m.status === "live" ? "In force" : "Ahead"}
                    </span>
                    <Link
                      href={`/jurisdictions/${m.jur}`}
                      className="entry-author"
                      style={{ color: "var(--ink-deep)" }}
                    >
                      {m.jurLabel}
                    </Link>
                    <span className="mono accent">{m.name}</span>
                    <span className="entry-date">{m.when}</span>
                  </div>
                  <p className="entry-text" style={{ marginTop: 4 }}>
                    {m.note}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {STACK_SECTIONS.map((s) => {
          const sectionCards = s.categorySlugs
            .map((slug) => bySlug.get(slug))
            .filter((c): c is CatCard => Boolean(c));
          return (
            <section className="social-section" key={s.id} id={s.id}>
              <div className="social-head">
                <h2>{s.title}</h2>
              </div>
              <p className="body" style={{ maxWidth: 680 }}>
                {s.intro}
              </p>
              <p className="form-hint" style={{ maxWidth: 680, margin: "8px 0 18px" }}>
                {s.fit}
              </p>
              <div className="project-grid">{sectionCards.map(card)}</div>
            </section>
          );
        })}

        <section className="social-section" id="evaluate">
          <div className="social-head">
            <h2>How to evaluate open-source tax software</h2>
          </div>
          <p className="body" style={{ maxWidth: 680, marginBottom: 18 }}>
            Four questions before you rely on anything in this index — each one
            answerable from signals shown on every listing.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            {EVAL_POINTS.map((p) => (
              <div key={p.title} className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{p.title}</h3>
                <p className="pc-desc" style={{ margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="social-section">
          <div className="social-head">
            <h2>All categories</h2>
          </div>
          <div className="cluster" style={{ marginTop: 4 }}>
            {cats.map((c) => {
              const agg = byCat.get(c.id);
              return (
                <Link key={c.slug} href={`/?category=${c.slug}`} className="tag">
                  {c.name} · {agg?.count ?? 0}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
