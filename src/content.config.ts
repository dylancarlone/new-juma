import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

/* ------------------------------------------------------------------ *
 * Shared sub-schemas — the vocabulary every page type composes from.
 * Images are stored as plain filename strings (e.g. "alvin-yu.jpg") that
 * resolve against src/assets/media/ via the <Media> component, so content
 * authors (and AI) never deal with import paths.
 * ------------------------------------------------------------------ */
const link = z.object({ label: z.string(), href: z.string() });
const stat = z.object({ value: z.string(), label: z.string() });
const pillar = z.object({
  icon: z.string().optional(),
  title: z.string(),
  body: z.string(),
});
const section = z.object({
  id: z.string().optional(),
  heading: z.string().optional(),
  body: z.string().optional(),
  image: z.string().optional(),
});
const person = z.object({
  name: z.string(),
  role: z.string().optional(),
  org: z.string().optional(),
});
const hero = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
  subheading: z.string().optional(),
  image: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
});

const md = (base: string) => glob({ pattern: "**/*.{md,mdx}", base });

/* ------------------------------------------------------------------ *
 * post — News / blog articles (legacy WP posts). MDX body.
 * ------------------------------------------------------------------ */
const post = defineCollection({
  loader: md("./src/content/post"),
  schema: z.object({
    title: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default("Juma"),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    excerpt: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    legacyId: z.number().optional(),
  }),
});

/* ------------------------------------------------------------------ *
 * story — Youth & alumni success stories. MDX body.
 * ------------------------------------------------------------------ */
const story = defineCollection({
  loader: md("./src/content/story"),
  schema: z.object({
    name: z.string(),
    title: z.string().optional(),
    photo: z.string().optional(),
    location: z.string().optional(),
    pullQuote: z.string().optional(),
    outcome: z.string().optional(),
    isFirstPerson: z.boolean().default(true),
    order: z.number().optional(),
    draft: z.boolean().default(false),
    legacyId: z.number().optional(),
  }),
});

/* ------------------------------------------------------------------ *
 * team — Staff, leadership, and board members. MD body = bio.
 * ------------------------------------------------------------------ */
const team = defineCollection({
  loader: md("./src/content/team"),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    group: z.enum(["staff", "leadership", "board", "advisor"]).default("staff"),
    photo: z.string().optional(),
    email: z.string().optional(),
    location: z.string().optional(),
    isAlum: z.boolean().default(false),
    order: z.number().default(100),
    draft: z.boolean().default(false),
    legacyId: z.number().optional(),
  }),
});

/* ------------------------------------------------------------------ *
 * job — Open positions (careers board). Merges page- and post-typed
 * postings. MDX body for the full description.
 * ------------------------------------------------------------------ */
const job = defineCollection({
  loader: md("./src/content/job"),
  schema: z.object({
    jobTitle: z.string(),
    locations: z.array(z.string()).default([]),
    department: z.string().optional(),
    reportsTo: z.string().optional(),
    employmentType: z.string().optional(),
    salaryRange: z.string().optional(),
    summary: z.string().optional(),
    responsibilities: z.array(z.string()).default([]),
    qualifications: z.array(z.string()).default([]),
    benefits: z.array(z.string()).default([]),
    applyHref: z.string().optional(),
    postedDate: z.coerce.date().optional(),
    isOpen: z.boolean().default(true),
    legacyId: z.number().optional(),
  }),
});

/* ------------------------------------------------------------------ *
 * location — Per-city regional pages. MDX body + structured fields.
 * ------------------------------------------------------------------ */
const location = defineCollection({
  loader: md("./src/content/location"),
  schema: z.object({
    city: z.string(),
    region: z.enum(["san-francisco", "san-jose", "seattle", "sacramento"]),
    hero,
    intro: z.string().optional(),
    noteFrom: person.optional(),
    stats: z.array(stat).default([]),
    venues: z.array(z.string()).default([]),
    testimonial: z.object({ quote: z.string(), name: z.string() }).optional(),
    contact: z
      .object({ name: z.string(), role: z.string().optional(), email: z.string(), phone: z.string().optional(), address: z.string().optional() })
      .optional(),
    order: z.number().default(100),
    legacyId: z.number().optional(),
  }),
});

/* ------------------------------------------------------------------ *
 * page — Flexible structured content pages (mission, programs, careers
 * landing, partners, press, legal, campaign, video, etc.). The `kind`
 * discriminator lets the generic renderer + bespoke templates branch.
 * Optional MDX body for long-form prose.
 * ------------------------------------------------------------------ */
const page = defineCollection({
  loader: md("./src/content/page"),
  schema: z.object({
    title: z.string(),
    kind: z
      .enum([
        "standard",
        "mission",
        "program",
        "careers-landing",
        "partners",
        "board",
        "press",
        "financials",
        "video",
        "legal",
        "campaign",
        "contact",
        "donate",
      ])
      .default("standard"),
    hero: hero.optional(),
    intro: z.string().optional(),
    mission: z.string().optional(),
    vision: z.string().optional(),
    sections: z.array(section).default([]),
    stats: z.array(stat).default([]),
    pillars: z.array(pillar).default([]),
    eligibility: z.array(z.string()).default([]),
    benefits: z.array(z.object({ title: z.string(), body: z.string().optional() })).default([]),
    bullets: z.array(z.string()).default([]),
    groups: z.array(z.object({ title: z.string(), items: z.array(z.string()) })).default([]),
    people: z.array(person).default([]),
    ctas: z.array(link).default([]),
    videoUrl: z.string().optional(),
    documents: z.array(reference("document")).optional(),
    navOrder: z.number().optional(),
    showInNav: z.boolean().default(false),
    draft: z.boolean().default(false),
    legacyId: z.number().optional(),
    seoDescription: z.string().optional(),
  }),
});

/* ------------------------------------------------------------------ *
 * document — Financial transparency PDFs (annual reports, 990s, audits).
 * Data only (no body); rendered by the Financials page.
 * ------------------------------------------------------------------ */
const document = defineCollection({
  loader: glob({ pattern: "**/*.{json,yaml,yml,md}", base: "./src/content/document" }),
  schema: z.object({
    docTitle: z.string(),
    docType: z.enum(["annual-report", "form-990", "audited-financial-statement"]),
    year: z.number(),
    fileUrl: z.string().optional(),
    legacyId: z.number().optional(),
  }),
});

export const collections = { post, story, team, job, location, page, document };
