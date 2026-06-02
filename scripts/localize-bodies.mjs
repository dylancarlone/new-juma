// Final pass: localize any remaining juma.org IMAGE urls embedded in post/page/story bodies
// (e.g. markdown links/images the HTML converter missed) into public/media. Leaves PDFs/docs/video.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, toPublic } from "./lib/wp.mjs";

const IMG_RE = /https?:\/\/juma\.org\/wp-content\/uploads\/[^\s"')\]]+?\.(?:jpe?g|png|gif|webp|avif)/gi;
let changed = 0;

for (const col of ["post", "page", "story", "location", "job"]) {
  const dir = join(ROOT, "src/content", col);
  let files;
  try { files = (await readdir(dir)).filter((f) => f.endsWith(".md") || f.endsWith(".mdx")); } catch { continue; }
  for (const f of files) {
    const p = join(dir, f);
    const text = await readFile(p, "utf8");
    const urls = [...new Set(text.match(IMG_RE) || [])];
    if (!urls.length) continue;
    let out = text;
    for (const u of urls) {
      const local = await toPublic(u);
      if (local !== u) out = out.split(u).join(local);
    }
    if (out !== text) { await writeFile(p, out); changed++; }
  }
}
console.log(`Localized images in ${changed} body file(s).`);
