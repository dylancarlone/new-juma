// Deterministically convert the "mechanical" legacy content into typed collections:
//   - 196 blog posts  -> src/content/post/<slug>.md
//   - 8 team bios      -> src/content/team/<slug>.md   (from analysis/team.json)
//   - financial PDFs   -> src/content/document/<slug>.json
// Run: node scripts/convert-mechanical.mjs
import { join } from "node:path";
import { parse } from "node-html-parser";
import {
  ROOT, RAW, readJSON, decode, stripTags, slugify, htmlToMarkdown, writeContent, toAsset, mediaById,
} from "./lib/wp.mjs";

const CONTENT = join(ROOT, "src", "content");
const log = (...a) => console.log(...a);

/* ------------------------------- POSTS ------------------------------- */
async function convertPosts() {
  const posts = await readJSON(join(RAW, "posts.json"));
  const cats = await readJSON(join(RAW, "categories.json"));
  const tags = await readJSON(join(RAW, "tags.json"));
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const tagName = new Map(tags.map((t) => [t.id, t.name]));
  const media = await mediaById();
  const used = new Set();
  let heroCount = 0;

  for (const p of posts) {
    let slug = slugify(decodeURIComponent(p.slug || ""));
    if (!slug || slug === "juma") slug = `${slugify(p.title.rendered)}-${p.id}`;
    while (used.has(slug)) slug = `${slug}-${p.id}`;
    used.add(slug);

    const categories = (p.categories || []).map((id) => catName.get(id)).filter((n) => n && n !== "Uncategorized");
    const postTags = (p.tags || []).map((id) => tagName.get(id)).filter(Boolean);

    // Hero: featured_media -> manifest url -> local asset; fallback yoast og_image.
    let heroImage, heroImageAlt;
    const fm = media.get(p.featured_media);
    const heroUrl = fm?.url || p.yoast_head_json?.og_image?.[0]?.url;
    if (heroUrl) {
      const name = await toAsset(heroUrl);
      if (name) { heroImage = name; heroImageAlt = fm?.alt || decode(p.title.rendered); heroCount++; }
    }

    const sameDay = p.modified?.slice(0, 10) === p.date?.slice(0, 10);
    const body = await htmlToMarkdown(p.content?.rendered || "");

    await writeContent(join(CONTENT, "post", `${slug}.md`), {
      title: decode(p.title.rendered),
      publishDate: p.date,
      updatedDate: sameDay ? undefined : p.modified,
      author: "Juma",
      categories,
      tags: postTags,
      heroImage,
      heroImageAlt,
      excerpt: stripTags(p.excerpt?.rendered).slice(0, 300) || undefined,
      legacyId: p.id,
    }, body);
  }
  log(`✓ posts: ${posts.length} -> src/content/post/ (${heroCount} with hero images)`);
}

/* ------------------------------- TEAM -------------------------------- */
const ROLE_RANK = [/chief executive|ceo/i, /chief|officer|general counsel/i, /director/i, /manager/i];
function roleOrder(role = "") {
  const i = ROLE_RANK.findIndex((r) => r.test(role));
  return (i === -1 ? ROLE_RANK.length : i) * 10;
}

async function convertTeam() {
  const team = await readJSON(join(ROOT, "extraction", "analysis", "team.json"));
  let n = 0;
  for (const m of team) {
    if (m.slug === "team" || !m.photoUrl) continue; // skip archive index entry
    const photo = m.photoUrl ? await toAsset(m.photoUrl) : undefined;
    await writeContent(join(CONTENT, "team", `${m.slug}.md`), {
      name: m.name,
      role: m.role,
      group: "leadership",
      photo,
      location: m.location || undefined,
      isAlum: /alumni|alum\b/i.test(m.bio || ""),
      order: roleOrder(m.role) + n,
      legacyId: undefined,
    }, decode(m.bio || ""));
    n++;
  }
  log(`✓ team: ${n} -> src/content/team/`);
}

/* ----------------------------- DOCUMENTS ----------------------------- */
const DOC_TYPE = [
  [/audited|financial-statement/i, "audited-financial-statement"],
  [/form-990|990/i, "form-990"],
  [/annual-report/i, "annual-report"],
];
async function convertDocuments() {
  const pages = await readJSON(join(RAW, "pages.json"));
  const docPages = pages.filter((p) => /^\d{4}-(annual-report|form-990|audited-financial-statement|financial-statements)/.test(p.slug));
  let n = 0;
  for (const p of docPages) {
    const year = parseInt(p.slug.slice(0, 4), 10);
    const docType = (DOC_TYPE.find(([re]) => re.test(p.slug)) || [, "annual-report"])[1];
    // Find a PDF / uploads link in the body.
    const root = parse(p.content?.rendered || "");
    const href = root.querySelectorAll("a").map((a) => a.getAttribute("href")).find((h) => h && /\.(pdf)(\?|$)|\/wp-content\/uploads\//i.test(h));
    const data = {
      docTitle: decode(p.title.rendered),
      docType,
      year,
      fileUrl: href || undefined,
      legacyId: p.id,
    };
    const { writeFile, mkdir } = await import("node:fs/promises");
    await mkdir(join(CONTENT, "document"), { recursive: true });
    await writeFile(join(CONTENT, "document", `${p.slug}.json`), JSON.stringify(
      Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)), null, 2) + "\n");
    n++;
  }
  log(`✓ documents: ${n} -> src/content/document/`);
}

async function main() {
  log("Converting mechanical content...");
  await convertPosts();
  await convertTeam();
  await convertDocuments();
  log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
