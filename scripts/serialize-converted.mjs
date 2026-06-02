// Serialize the agent-staged JSON (extraction/converted/**) into typed content-collection
// files (src/content/<collection>/<slug>.md), localizing image URLs deterministically.
// Standalone image URLs (hero.image, photo, section.image) -> src/assets/media (optimized via <Media>).
// Image URLs embedded in markdown prose -> public/media (/media/<file>).
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, readJSON, toAsset, toPublic, writeContent } from "./lib/wp.mjs";

const STAGE = join(ROOT, "extraction", "converted");
const CONTENT = join(ROOT, "src", "content");
const DATA = join(ROOT, "src", "data");
const UPLOAD_RE = /https?:\/\/juma\.org\/wp-content\/uploads\/[^\s"')]+?\.(?:jpe?g|png|gif|webp|avif|svg)/gi;
const log = (...a) => console.log(...a);

async function localizeString(s) {
  if (typeof s !== "string" || !s.includes("juma.org/wp-content/uploads")) return s;
  const trimmed = s.trim();
  if (new RegExp(`^${UPLOAD_RE.source}$`, "i").test(trimmed)) {
    const name = await toAsset(trimmed); // standalone image -> asset filename
    return name || s;
  }
  const urls = [...new Set(s.match(UPLOAD_RE) || [])]; // embedded -> /media/ url
  let out = s;
  for (const u of urls) out = out.split(u).join(await toPublic(u));
  return out;
}

async function localize(node) {
  if (typeof node === "string") return localizeString(node);
  if (Array.isArray(node)) {
    const out = [];
    for (const x of node) out.push(await localize(x));
    return out;
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = await localize(v);
    return out;
  }
  return node;
}

async function serializeCollection(name) {
  const dir = join(STAGE, name);
  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return 0;
  }
  let n = 0;
  for (const f of files) {
    let raw;
    try {
      raw = await readJSON(join(dir, f));
    } catch (e) {
      log(`  ! ${name}/${f}: invalid JSON, skipped (${e.message})`);
      continue;
    }
    const slug = raw.slug || f.replace(/\.json$/, "");
    const { slug: _s, body = "", bodyFormat, ...rest } = raw;
    const frontmatter = await localize(rest);
    const localizedBody = await localizeString(String(body || ""));
    await writeContent(join(CONTENT, name, `${slug}.md`), frontmatter, localizedBody);
    n++;
  }
  log(`✓ ${name}: ${n} -> src/content/${name}/`);
  return n;
}

async function serializeHome() {
  let raw;
  try {
    raw = await readJSON(join(STAGE, "home.json"));
  } catch {
    return;
  }
  const data = await localize(raw);
  await mkdir(DATA, { recursive: true });
  await writeFile(join(DATA, "home.json"), JSON.stringify(data, null, 2) + "\n");
  log("✓ home -> src/data/home.json");
}

async function main() {
  log("Serializing staged conversions...");
  for (const c of ["location", "page", "story", "job"]) await serializeCollection(c);
  await serializeHome();
  log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
