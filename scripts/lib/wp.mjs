// Shared helpers for converting legacy WordPress content into clean content-collection files.
import { readFile, writeFile, copyFile, mkdir, access } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import he from "he";
import { parse } from "node-html-parser";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { stringify as yamlStringify } from "yaml";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const RAW = join(ROOT, "extraction", "raw");
export const ASSETS = join(ROOT, "src", "assets", "media");
export const PUBLIC_MEDIA = join(ROOT, "public", "media");
const UA = "new-juma-migration/1.0";

export const readJSON = async (p) => JSON.parse(await readFile(p, "utf8"));
const exists = (p) => access(p).then(() => true).catch(() => false);

export function decode(str = "") {
  return he.decode(String(str)).replace(/ /g, " ").replace(/￼/g, "").trim();
}

export function stripTags(html = "") {
  return decode(String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

export function slugify(str = "") {
  return decode(str)
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "page";
}

let _localMap = null;
async function localMap() {
  if (!_localMap) {
    try {
      _localMap = await readJSON(join(RAW, "media-local-map.json"));
    } catch {
      _localMap = {};
    }
  }
  return _localMap;
}

let _mediaById = null;
export async function mediaById() {
  if (!_mediaById) {
    const manifest = await readJSON(join(RAW, "media-manifest.json"));
    _mediaById = new Map(manifest.map((m) => [m.id, m]));
  }
  return _mediaById;
}

async function ensureDir(p) {
  await mkdir(dirname(p), { recursive: true });
}

// Download a remote asset that wasn't in the local archive (e.g. googleusercontent hot-links).
async function download(url, dest) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return false;
    await ensureDir(dest);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    return true;
  } catch {
    return false;
  }
}

/** Copy an image (by its original juma.org URL) into src/assets/media and return the bare filename. */
export async function toAsset(remoteUrl) {
  if (!remoteUrl) return null;
  const map = await localMap();
  const local = map[remoteUrl];
  if (local) {
    const name = basename(local);
    const dest = join(ASSETS, name);
    if (!(await exists(dest))) {
      await mkdir(ASSETS, { recursive: true });
      await copyFile(join(ROOT, local), dest).catch(() => {});
    }
    return name;
  }
  // Not in the archive — try to fetch it directly.
  if (/^https?:\/\//.test(remoteUrl)) {
    const name = slugify(basename(remoteUrl).replace(/\.[a-z0-9]+$/i, "")) + (remoteUrl.match(/\.[a-z0-9]+$/i)?.[0] || ".jpg");
    const dest = join(ASSETS, name);
    if ((await exists(dest)) || (await download(remoteUrl, dest))) return name;
  }
  return null;
}

/** Copy a body image into public/media and return a "/media/<file>" URL. */
export async function toPublic(remoteUrl) {
  if (!remoteUrl) return remoteUrl;
  const map = await localMap();
  const local = map[remoteUrl];
  let name;
  if (local) {
    name = basename(local);
    const dest = join(PUBLIC_MEDIA, name);
    if (!(await exists(dest))) {
      await mkdir(PUBLIC_MEDIA, { recursive: true });
      await copyFile(join(ROOT, local), dest).catch(() => {});
    }
  } else if (/^https?:\/\//.test(remoteUrl)) {
    const ext = remoteUrl.match(/\.[a-z0-9]+(?=$|\?)/i)?.[0] || ".jpg";
    name = slugify(basename(remoteUrl.split("?")[0])) + (basename(remoteUrl).includes(".") ? "" : ext);
    const dest = join(PUBLIC_MEDIA, name);
    if (!(await exists(dest))) {
      const ok = await download(remoteUrl, dest);
      if (!ok) return remoteUrl; // leave original if we can't grab it
    }
  } else {
    return remoteUrl;
  }
  return `/media/${name}`;
}

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
  hr: "---",
});
td.use(gfm);
td.remove(["script", "style", "noscript"]);
// Keep video iframes as a responsive raw-HTML block (valid in .md, not .mdx).
td.addRule("iframe", {
  filter: "iframe",
  replacement: (_c, node) => {
    const src = node.getAttribute("src") || "";
    if (!src) return "";
    return `\n\n<div class="aspect-video my-6"><iframe src="${src}" class="h-full w-full rounded-xl" loading="lazy" allowfullscreen></iframe></div>\n\n`;
  },
});

const IMG_NOISE = ["srcset", "sizes", "class", "style", "width", "height", "loading", "decoding", "fetchpriority", "sizes", "title"];

/**
 * Convert a chunk of legacy WP HTML to clean Markdown:
 * strip WP/Gutenberg/MSO noise, localize <img> into public/media, decode entities.
 */
export async function htmlToMarkdown(html = "") {
  if (!html.trim()) return "";
  const root = parse(html, { comment: false });
  // Drop spacers and MS-Office junk.
  root.querySelectorAll(".wp-block-spacer").forEach((n) => n.remove());
  root.querySelectorAll("[style]").forEach((n) => {
    if (/mso-|font-family:\s*Calibri/i.test(n.getAttribute("style") || "")) n.removeAttribute("style");
  });
  // Localize images.
  const imgs = root.querySelectorAll("img");
  for (const img of imgs) {
    const src = img.getAttribute("src");
    const alt = img.getAttribute("alt") || "";
    const localized = await toPublic(src);
    IMG_NOISE.forEach((a) => img.removeAttribute(a));
    img.setAttribute("src", localized);
    img.setAttribute("alt", alt);
  }
  let md = td.turndown(root.toString());
  md = he.decode(md).replace(/ /g, " ").replace(/￼/g, "");
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
}

/** Serialize a content file: YAML frontmatter + body. */
export async function writeContent(filePath, frontmatter, body = "") {
  const clean = Object.fromEntries(
    Object.entries(frontmatter).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
  );
  const fm = yamlStringify(clean, { lineWidth: 0 }).trimEnd();
  const out = `---\n${fm}\n---\n\n${body}\n`;
  await ensureDir(filePath);
  await writeFile(filePath, out);
}
