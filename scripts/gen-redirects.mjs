// Generate src/redirects.json (legacy pathname -> new path) from the analysis redirect map,
// so astro.config can emit proper 301s on Vercel. Skips identity/query-string/home redirects.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.parse(await readFile(join(ROOT, "extraction/analysis/redirects.json"), "utf8"));

// Read the slugs we actually generated so redirect targets never 301 into a 404.
const slugs = async (dir, ext = ".md") =>
  new Set((await readdir(join(ROOT, "src/content", dir)).catch(() => [])).filter((f) => f.endsWith(ext)).map((f) => f.replace(ext, "")));
const teamSlugs = await slugs("team");
const jobSlugs = await slugs("job");
const pageSlugs = await slugs("page");
const postSlugs = await slugs("post");

// Retarget a dangling destination to a safe parent index.
function safeTarget(to) {
  const m = to.match(/^\/(team|careers|news)\/([^/]+)\/?$/);
  if (!m) return to;
  const [, kind, slug] = m;
  if (kind === "team") return teamSlugs.has(slug) ? to : "/leadership/";
  if (kind === "careers") return jobSlugs.has(slug) ? to : "/work-for-juma/";
  if (kind === "news") return postSlugs.has(slug) ? to : "/news/";
  return to;
}

const out = {};
for (const r of src.redirects ?? []) {
  let from;
  try {
    from = new URL(r.from).pathname;
  } catch {
    from = r.from;
  }
  let to = safeTarget(r.to);
  if (!from || !to) continue;
  if (from.includes("?") || from === "/") continue; // never redirect the homepage or query URLs
  const norm = (s) => (s.endsWith("/") ? s : s + "/");
  if (norm(from) === norm(to)) continue; // identity
  out[from] = to;
}

await writeFile(join(ROOT, "src/redirects.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${Object.keys(out).length} redirects to src/redirects.json`);
