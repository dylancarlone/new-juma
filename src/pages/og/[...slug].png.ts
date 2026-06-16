import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { readFile } from "node:fs/promises";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

/**
 * Branded social share cards, generated at build time with satori.
 * Every news post, story, job, and structured page gets a 1200×630
 * card at /og/<slug>.png; pages with real hero photos keep those and
 * use these as the no-photo fallback.
 */
export const prerender = true;

const W = 1200;
const H = 630;

const fontBold = await readFile("node_modules/@fontsource/montserrat/files/montserrat-latin-700-normal.woff");
const fontXBold = await readFile("node_modules/@fontsource/montserrat/files/montserrat-latin-800-normal.woff");

type Card = { title: string; eyebrow: string };

export const getStaticPaths: GetStaticPaths = async () => {
  const cards = new Map<string, Card>();

  for (const p of await getCollection("post", (p) => !p.data.draft)) {
    cards.set(`news/${p.id}`, { title: p.data.title, eyebrow: p.data.categories[0] ?? "Juma News" });
  }
  for (const s of await getCollection("story", (s) => !s.data.draft)) {
    cards.set(`stories/${s.id}`, { title: s.data.title ?? `${s.data.name}'s Story`, eyebrow: "Youth Story" });
  }
  for (const j of await getCollection("job")) {
    cards.set(`careers/${j.id}`, { title: j.data.jobTitle, eyebrow: "Careers at Juma" });
  }
  for (const p of await getCollection("page", (p) => !p.data.draft)) {
    cards.set(p.id, { title: p.data.title, eyebrow: "Juma Ventures" });
  }

  // Bespoke routes (only set if not already provided by the page collection).
  const fixed: Record<string, Card> = {
    default: { title: "We believe in the power of work and the potential of young people.", eyebrow: "Est. 1993 · A nonprofit social enterprise" },
    impact: { title: "The 2025 Impact Report", eyebrow: "Year in review" },
    timeline: { title: "30 years of making possible, possible.", eyebrow: "Our story" },
    game: { title: "Juma: Concourse Rush — a stadium doom-style run.", eyebrow: "Move · Serve · Earn · Clock Out" },
    "wall-of-possible": { title: "The Wall of Possible", eyebrow: "In their own words" },
    events: { title: "Paths to Possibility — Juma events", eyebrow: "Events" },
    leadership: { title: "The people driving Juma's mission", eyebrow: "Leadership" },
    financials: { title: "Financials & transparency", eyebrow: "Candid Platinum rated" },
    donate: { title: "Invest in a young person's future.", eyebrow: "Support Juma" },
    contact: { title: "Get in touch with the Juma team", eyebrow: "Contact" },
    newsletter: { title: "Juma news and youth success stories, in your inbox", eyebrow: "Newsletter" },
    stories: { title: "Youth Voices — Impact & Stories", eyebrow: "Behind every statistic" },
    news: { title: "Stories & Updates from Juma", eyebrow: "Juma News" },
  };
  for (const [slug, card] of Object.entries(fixed)) if (!cards.has(slug)) cards.set(slug, card);

  return [...cards.entries()].map(([slug, props]) => ({ params: { slug }, props }));
};

// Tiny hyperscript helper for satori's element trees. Childless nodes must
// pass `undefined` (an empty array reads as "multiple children" to satori).
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]) => ({
  type,
  props: { style, children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children },
});

const WORDMARK = [
  ["J", "#e33a5e"],
  ["U", "#fdbf51"],
  ["M", "#9bdbf3"],
  ["A", "#e95d00"],
] as const;

export const GET: APIRoute = async ({ props }) => {
  const { title, eyebrow } = props as Card;
  const size = title.length > 90 ? 46 : title.length > 55 ? 56 : 66;

  const tree = h(
    "div",
    {
      width: W,
      height: H,
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#1c1e30",
      backgroundImage:
        "radial-gradient(circle at 85% 10%, rgba(227,58,94,0.35) 0%, rgba(227,58,94,0) 45%), radial-gradient(circle at 8% 95%, rgba(253,191,81,0.22) 0%, rgba(253,191,81,0) 40%), radial-gradient(rgba(255,255,255,0.07) 2px, transparent 2.5px)",
      backgroundSize: "100% 100%, 100% 100%, 28px 28px",
      fontFamily: "Montserrat",
    },
    // brand accent bar
    h("div", {
      height: 14,
      width: "100%",
      backgroundImage: "linear-gradient(90deg, #e33a5e 0%, #e95d00 50%, #fdbf51 100%)",
    }),
    // content
    h(
      "div",
      { display: "flex", flexDirection: "column", flexGrow: 1, padding: "56px 72px 48px", justifyContent: "space-between" },
      h(
        "div",
        { display: "flex", flexDirection: "column" },
        h(
          "div",
          { display: "flex", alignItems: "center", gap: 14 },
          h("div", { width: 44, height: 5, backgroundColor: "#fdbf51", borderRadius: 3 }),
          h("div", { fontSize: 26, fontWeight: 700, color: "#fdbf51", letterSpacing: 5, textTransform: "uppercase" }, eyebrow.slice(0, 48))
        ),
        h(
          "div",
          {
            marginTop: 34,
            fontSize: size,
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.12,
            letterSpacing: -1,
            maxWidth: 1020,
            display: "block",
            lineClamp: 4,
          },
          title
        )
      ),
      h(
        "div",
        { display: "flex", alignItems: "center", justifyContent: "space-between" },
        h(
          "div",
          { display: "flex", alignItems: "center", gap: 18 },
          h(
            "div",
            { display: "flex", fontSize: 54, fontWeight: 800, letterSpacing: 2 },
            ...WORDMARK.map(([ch, color]) => h("div", { color }, ch))
          ),
          h("div", { width: 2, height: 40, backgroundColor: "rgba(255,255,255,0.25)" }),
          h("div", { fontSize: 24, fontWeight: 700, color: "#9ba3c9" }, "juma.org")
        ),
        h("div", { fontSize: 22, fontWeight: 700, color: "#9ba3c9", letterSpacing: 3, textTransform: "uppercase" }, "Earn · Learn · Connect")
      )
    )
  );

  const svg = await satori(tree as never, {
    width: W,
    height: H,
    fonts: [
      { name: "Montserrat", data: fontBold, weight: 700, style: "normal" },
      { name: "Montserrat", data: fontXBold, weight: 800, style: "normal" },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng();
  return new Response(png, {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=31536000, immutable" },
  });
};
