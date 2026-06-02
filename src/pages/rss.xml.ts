import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { site } from "@/lib/site";
import { getFeedPosts, postPath } from "@/lib/content";

export async function GET(context: APIContext) {
  const posts = await getFeedPosts();
  return rss({
    title: `${site.name} — News`,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.slice(0, 50).map((p) => ({
      title: p.data.title,
      pubDate: p.data.publishDate,
      description: p.data.excerpt,
      link: postPath(p),
    })),
    customData: `<language>en-us</language>`,
  });
}
