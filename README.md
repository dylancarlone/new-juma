# Juma Ventures — modern site

A fast, maintainable rebuild of **juma.org**, migrated off the legacy WordPress + Elementor stack into **Astro + Tailwind + typed content collections**, deployable on **Vercel**.

The entire site is content-as-code: every page, post, story, job, and team member is a schema-validated file in `src/content/`. There is no CMS, database, or admin login to maintain — edits are made (by humans or AI) directly in the repo, validated at build time, and shipped via git.

## Stack

- **[Astro 6](https://astro.build)** — static output, ships ~zero JS by default
- **Tailwind CSS v4** (via PostCSS) — design tokens in `src/styles/global.css`
- **React 19** islands — only where interactivity is needed (the contact form)
- **Content Collections + Zod** — typed, build-validated content (`src/content.config.ts`)
- **MDX / Markdown** — page and article bodies
- **Vercel adapter** — static pages + one serverless function (contact form)

## Quick start

```bash
npm install
cp .env.example .env      # optional; site builds without it
npm run dev               # http://localhost:4321
npm run build             # production build -> dist/ + .vercel/output/
npm run preview
```

Deploy: push to a repo connected to Vercel (framework preset: **Astro**). Set the env vars from `.env.example` in the Vercel dashboard. No other config needed.

## Project structure

```
src/
  content.config.ts     # Zod schemas — the contract for all content
  content/
    post/      *.md      # 196 news articles
    story/     *.md      # youth & alumni stories
    team/      *.md      # leadership/staff bios
    job/       *.md      # open positions (careers board)
    location/  *.md      # the 4 city pages
    page/      *.md      # flexible structured pages (mission, programs, etc.)
    document/  *.json     # financial PDFs (annual reports, 990s, audits)
  data/home.json         # homepage content
  pages/                 # routes (see below)
  components/            # Header, Footer, sections/, cards/, ui/
  lib/site.ts            # nav, offices, social, donate, analytics config
  styles/global.css      # Tailwind theme + brand design tokens
  assets/media/          # optimized images (referenced from frontmatter)
public/media/            # body images served as-is
scripts/                 # the one-time migration pipeline (see below)
extraction/              # archived legacy content + analysis (source of truth for the migration)
```

### Routes

| URL | Source |
|---|---|
| `/` | `src/pages/index.astro` + `src/data/home.json` |
| `/news/`, `/news/<slug>/`, `/news/page/<n>/`, `/news/category/<slug>/` | `post` collection |
| `/stories/`, `/stories/<slug>/` | `story` collection |
| `/leadership/`, `/team/<slug>/` | `team` collection |
| `/work-for-juma/`, `/careers/<slug>/` | `job` collection + careers page |
| `/san-francisco/`, `/san-jose/`, `/seattle/`, `/sacramento/` | `location` collection |
| `/our-mission-history/`, `/programs/`, `/board-of-directors/`, … | `page` collection (`src/pages/[...slug].astro`) |
| `/donate/`, `/contact/`, `/newsletter/`, `/financials/`, `/events/` | bespoke pages |
| `/rss.xml`, `/sitemap-index.xml` | generated |
| `/api/contact` | serverless (Resend) |

## Editing content (the "maintainable with AI" part)

To change a page, edit its file in `src/content/`. The frontmatter is validated against the Zod schema in `src/content.config.ts` **at build time** — an invalid field fails the build, so bad content can never ship. An AI agent (or a person) edits the file, `npm run build` validates it, and the git diff shows exactly what changed.

**Images:** put the file in `src/assets/media/` and reference it by filename in frontmatter (e.g. `heroImage: my-photo.jpg`). The `<Media>` component resolves and optimizes it automatically. Body images live in `public/media/` and are referenced as `/media/<file>`.

Add a new blog post:

```md
---
title: "A great new story"
publishDate: 2026-06-01
author: Juma
categories: ["Youth stories"]
heroImage: my-photo.jpg      # file in src/assets/media/
excerpt: One-sentence summary for cards and SEO.
---

Body in Markdown…
```

## Integrations & env vars

| Concern | How it works | Env |
|---|---|---|
| **Donations** | Buttons link to a hosted checkout URL (currently the live **GoFundMe** campaign). Swap to Stripe Payment Links by changing the URL — UI is identical. | `PUBLIC_DONATE_URL`, `PUBLIC_DONATE_MONTHLY_URL` |
| **Contact form** | Posts to `/api/contact`, emails via **Resend**. Without a key: simulates success in dev, returns 503 in prod. | `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` |
| **Newsletter** | Native **Mailchimp** embed form (legacy Juma audience). | `PUBLIC_MAILCHIMP_URL` |
| **Apply / Volunteer** | Link out to the existing Google Forms (by location). | in `src/lib/site.ts` |
| **Analytics** | GA4 + optional FB Pixel, prod-only; empty = disabled. | `PUBLIC_GA4_ID`, `PUBLIC_FB_PIXEL_ID` |
| **SEO / redirects** | Per-page meta + canonical; 268 legacy→new **301 redirects** (`src/redirects.json`). | — |

## How the migration was done (reproducible)

The legacy site had no usable credentials, so it was migrated entirely from its public surface:

1. **Extract** (`scripts/extract-content.mjs`) — pulled all pages, posts, media, taxonomies via the WordPress REST API + Yoast sitemaps → `extraction/raw/`.
2. **Archive media** (`scripts/download-media.mjs`) — 519 assets → `extraction/media/`.
3. **Analyze** — multi-agent pass producing the brand design tokens, nav/IA, page archetypes, redirect map, and integrations inventory → `extraction/analysis/`.
4. **Convert** — `scripts/convert-mechanical.mjs` (posts/team/documents, deterministic) + an agent pass that staged the Elementor pages as JSON → serialized by `scripts/serialize-converted.mjs` into the content collections, with images localized.
5. **Redirects** (`scripts/gen-redirects.mjs`) — legacy URL → new path map.

These scripts are kept for traceability and re-runs; they are not part of the runtime site.

## Known follow-ups

- A handful of long-tail legacy pages (v1/legacy duplicates, thin stubs) were intentionally not rebuilt; the canonical versions are live and old URLs 301-redirect.
- Donation amounts/URLs and analytics IDs should be confirmed and set in Vercel env.
- A visual git-based editor (e.g. Keystatic) can be layered on later for non-technical staff — the content schemas are already in place for it.
