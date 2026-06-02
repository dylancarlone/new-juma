#!/usr/bin/env node
// Download every media asset listed in extraction/raw/media-manifest.json to extraction/media/.
// Polite: small concurrency, skips files already on disk, retries, writes a url->local map.
// Safe to re-run; only fetches what's missing.

import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "extraction", "raw", "media-manifest.json");
const MEDIA_DIR = join(ROOT, "extraction", "media");
const MAP_OUT = join(ROOT, "extraction", "raw", "media-local-map.json");
const UA = "new-juma-migration/1.0 (media download for site owner)";
const CONCURRENCY = 6;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function downloadOne(item) {
  if (!item.url) return { id: item.id, skipped: "no-url" };
  const filename = `${item.id}-${(item.filename || "asset").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dest = join(MEDIA_DIR, filename);
  if (await exists(dest)) return { id: item.id, url: item.url, local: `extraction/media/${filename}`, cached: true };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(item.url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
      return { id: item.id, url: item.url, local: `extraction/media/${filename}`, alt: item.alt };
    } catch (err) {
      if (attempt === 2) { log(`  FAIL ${item.url}: ${err.message}`); return { id: item.id, url: item.url, error: err.message }; }
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

async function main() {
  await mkdir(MEDIA_DIR, { recursive: true });
  const items = JSON.parse(await readFile(MANIFEST, "utf8"));
  log(`Downloading ${items.length} media assets (concurrency ${CONCURRENCY})...`);
  const results = [];
  let done = 0;
  const queue = [...items];
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      const r = await downloadOne(item);
      results.push(r);
      if (++done % 50 === 0) log(`  ${done}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const map = Object.fromEntries(results.filter((r) => r && r.local).map((r) => [r.url, r.local]));
  await writeFile(MAP_OUT, JSON.stringify(map, null, 2));
  const ok = results.filter((r) => r && r.local).length;
  const failed = results.filter((r) => r && r.error).length;
  log(`DONE. ${ok} downloaded/cached, ${failed} failed. Map -> ${MAP_OUT}`);
}

main().catch((e) => { console.error("MEDIA DOWNLOAD FAILED:", e); process.exit(1); });
