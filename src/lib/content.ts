import { getCollection, type CollectionEntry } from "astro:content";

/** Posts that are real editorial articles, excluding the recurring donor "Thank You to Our Funders" series. */
const DONOR_SERIES = /thank you to our (recent )?funders/i;

export async function getFeedPosts(): Promise<CollectionEntry<"post">[]> {
  const posts = await getCollection("post", (p) => !p.data.draft);
  return posts
    .filter((p) => !DONOR_SERIES.test(p.data.title))
    .sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
}

export async function getAllPosts(): Promise<CollectionEntry<"post">[]> {
  const posts = await getCollection("post", (p) => !p.data.draft);
  return posts.sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
}

export function postPath(entry: CollectionEntry<"post">) {
  return `/news/${entry.id}/`;
}

/** Distinct categories across the feed, with counts. */
export async function getCategories() {
  const posts = await getFeedPosts();
  const counts = new Map<string, number>();
  for (const p of posts) for (const c of p.data.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count, slug: slugifyTag(name) })).sort((a, b) => b.count - a.count);
}

export function slugifyTag(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
