import type { ImageMetadata } from "astro";

/**
 * Resolve a bare image filename (e.g. "lisa-chin.jpg") stored in content
 * frontmatter to a local asset module under src/assets/media/, so authors and
 * AI never write import paths. Returns a lazy loader or undefined if not found.
 */
const images = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/media/**/*.{jpeg,jpg,JPG,JPEG,png,PNG,gif,webp,avif,svg}"
);

export function resolveMedia(name?: string) {
  if (!name) return undefined;
  const clean = name.replace(/^\.?\//, "").split("/").pop()!;
  const key =
    Object.keys(images).find((k) => k.endsWith(`/${clean}`)) ??
    Object.keys(images).find((k) => k.toLowerCase().endsWith(`/${clean.toLowerCase()}`));
  return key ? images[key] : undefined;
}

export function isRemote(src?: string) {
  return !!src && /^https?:\/\//.test(src);
}
