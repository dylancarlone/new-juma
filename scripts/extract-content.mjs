#!/usr/bin/env node
// Full content extraction from the legacy juma.org WordPress site via its open REST API + Yoast sitemaps.
// Writes raw JSON dumps to extraction/raw/ and a human-readable inventory to extraction/INVENTORY.md.
// Deterministic, paginated, polite (small concurrency, retries). Safe to re-run (overwrites).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "extraction");
const RAW = join(OUT, "raw");
const SITE = "https://juma.org";
const API = `${SITE}/wp-json/wp/v2`;
const UA = "new-juma-migration/1.0 (content extraction for site owner)";

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function fetchJSON(url, { retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const total = Number(res.headers.get("x-wp-total")) || null;
      const totalPages = Number(res.headers.get("x-wp-totalpages")) || null;
      const body = await res.json();
      return { body, total, totalPages };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

async function fetchText(url, { retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

// Pull every item of a REST collection by walking pages of 100.
async function fetchAll(restBase, { fields = null } = {}) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const params = new URLSearchParams({ per_page: "100", page: String(page) });
    if (fields) params.set("_fields", fields);
    const { body, total, totalPages: tp } = await fetchJSON(`${API}/${restBase}?${params}`);
    if (page === 1) {
      totalPages = tp || 1;
      log(`  ${restBase}: ${total ?? body.length} items across ${totalPages} page(s)`);
    }
    all.push(...body);
    page++;
  } while (page <= totalPages);
  return all;
}

// Extract <loc> URLs from a Yoast sitemap (handles both index and url sets).
function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  await mkdir(RAW, { recursive: true });
  log("Starting extraction from", SITE);

  // 1) Sitemap inventory (full URL surface, including CPTs not in REST).
  log("Fetching sitemap index...");
  const index = await fetchText(`${SITE}/sitemap_index.xml`);
  const childSitemaps = parseSitemapLocs(index);
  const sitemaps = {};
  for (const sm of childSitemaps) {
    const key = sm.split("/").pop().replace(".xml", "");
    try {
      const xml = await fetchText(sm);
      sitemaps[key] = parseSitemapLocs(xml);
      log(`  sitemap ${key}: ${sitemaps[key].length} urls`);
    } catch (e) {
      log(`  sitemap ${key}: FAILED (${e.message})`);
      sitemaps[key] = [];
    }
  }
  await writeFile(join(RAW, "sitemaps.json"), JSON.stringify(sitemaps, null, 2));

  // 2) Core REST collections (full content preserved for rebuild).
  log("Fetching pages...");
  const pages = await fetchAll("pages");
  await writeFile(join(RAW, "pages.json"), JSON.stringify(pages, null, 2));

  log("Fetching posts...");
  const posts = await fetchAll("posts");
  await writeFile(join(RAW, "posts.json"), JSON.stringify(posts, null, 2));

  log("Fetching media...");
  const media = await fetchAll("media", {
    fields: "id,date,slug,title,alt_text,caption,description,mime_type,source_url,media_details,post",
  });
  await writeFile(join(RAW, "media.json"), JSON.stringify(media, null, 2));

  log("Fetching taxonomies + authors...");
  const [categories, tags, users] = await Promise.all([
    fetchAll("categories"),
    fetchAll("tags"),
    fetchAll("users"),
  ]);
  await writeFile(join(RAW, "categories.json"), JSON.stringify(categories, null, 2));
  await writeFile(join(RAW, "tags.json"), JSON.stringify(tags, null, 2));
  await writeFile(join(RAW, "users.json"), JSON.stringify(users, null, 2));

  // 3) Events (Tribe / The Events Calendar) — may be empty.
  log("Fetching events...");
  let events = [];
  try {
    const { body } = await fetchJSON(`${SITE}/wp-json/tribe/events/v1/events?per_page=50`);
    events = body.events || [];
  } catch (e) {
    log("  events fetch failed:", e.message);
  }
  await writeFile(join(RAW, "events.json"), JSON.stringify(events, null, 2));

  // 4) Build a clean media manifest (id -> best url + alt + sizes) for the rebuild.
  const mediaManifest = media.map((m) => ({
    id: m.id,
    url: m.source_url,
    alt: m.alt_text || "",
    mime: m.mime_type,
    width: m.media_details?.width ?? null,
    height: m.media_details?.height ?? null,
    sizes: m.media_details?.sizes
      ? Object.fromEntries(Object.entries(m.media_details.sizes).map(([k, v]) => [k, v.source_url]))
      : {},
    filename: m.source_url ? m.source_url.split("/").pop() : null,
  }));
  await writeFile(join(RAW, "media-manifest.json"), JSON.stringify(mediaManifest, null, 2));

  // 5) Inventory report.
  const byParent = {};
  for (const p of pages) (byParent[p.parent] ||= []).push(p);
  const inventory = [
    "# juma.org — Legacy Content Inventory",
    "",
    `Extracted ${new Date().toISOString()} from ${SITE} (WordPress REST API + Yoast sitemaps).`,
    "",
    "## Counts",
    `- Pages: **${pages.length}**`,
    `- Posts (blog/news): **${posts.length}**`,
    `- Media items: **${media.length}**`,
    `- Categories: **${categories.length}**, Tags: **${tags.length}**, Authors: **${users.length}**`,
    `- Events: **${events.length}**`,
    "",
    "## Sitemap URL surface",
    ...childSitemaps.map((sm) => {
      const key = sm.split("/").pop().replace(".xml", "");
      return `- ${key}: ${sitemaps[key]?.length ?? 0} urls`;
    }),
    "",
    "## Page tree (by menu_order)",
    ...pages
      .filter((p) => p.parent === 0)
      .sort((a, b) => a.menu_order - b.menu_order || a.id - b.id)
      .flatMap((p) => {
        const lines = [`- [${p.title.rendered}](${p.link})  \`#${p.id}\` slug=\`${p.slug}\``];
        for (const c of (byParent[p.id] || []).sort((a, b) => a.menu_order - b.menu_order)) {
          lines.push(`  - [${c.title.rendered}](${c.link})  \`#${c.id}\` slug=\`${c.slug}\``);
        }
        return lines;
      }),
    "",
    "## Categories",
    ...categories
      .sort((a, b) => b.count - a.count)
      .map((c) => `- ${c.name} (${c.count}) — slug \`${c.slug}\``),
    "",
  ].join("\n");
  await writeFile(join(OUT, "INVENTORY.md"), inventory);

  log("DONE. Wrote raw JSON to extraction/raw/ and extraction/INVENTORY.md");
  log(`Pages=${pages.length} Posts=${posts.length} Media=${media.length} Events=${events.length}`);
}

main().catch((e) => {
  console.error("EXTRACTION FAILED:", e);
  process.exit(1);
});
