/**
 * Central site configuration: navigation, offices, social, donate, analytics.
 * Derived from the legacy site analysis (extraction/analysis/{ia,integrations}.json).
 * Anything environment-specific (donate URL, analytics IDs) reads from env with
 * sensible defaults so the site builds and runs out of the box.
 */

export type NavItem = {
  label: string;
  href: string;
  children?: NavItem[];
  description?: string;
};

export const site = {
  name: "Juma Ventures",
  shortName: "Juma",
  tagline: "Paving the way to work, education, and financial capability for youth across America.",
  description:
    "Juma Ventures breaks the cycle of poverty by paving the way to work, education, and financial capability for young people ages 16–24 across America.",
  url: import.meta.env.SITE || "https://juma.org",
  locale: "en-US",
  founded: 1993,
} as const;

/** Primary header navigation. Top-level items render as a mega-menu. */
export const nav: NavItem[] = [
  {
    label: "Locations",
    href: "#",
    children: [
      { label: "San Francisco / Bay Area", href: "/san-francisco/" },
      { label: "San Jose", href: "/san-jose/" },
      { label: "Sacramento", href: "/sacramento/" },
      { label: "Seattle", href: "/seattle/" },
    ],
  },
  { label: "For Youth", href: "/apply/", description: "Apply for a paid job and career support." },
  { label: "For Employers", href: "/employer/", description: "Partner with Juma to build your workforce." },
  { label: "For Volunteers", href: "/volunteer/", description: "Mentor and support local youth." },
  {
    label: "About",
    href: "#",
    children: [
      { label: "Mission, Vision & History", href: "/our-mission-history/" },
      { label: "Our Programs", href: "/programs/" },
      { label: "Social Enterprise", href: "/social-enterprise/" },
      { label: "Impact & Stories", href: "/stories/" },
      { label: "Leadership", href: "/leadership/" },
      { label: "Board of Directors", href: "/board-of-directors/" },
      { label: "Partners & Supporters", href: "/our-partners-supporters/" },
      { label: "Financials", href: "/financials/" },
      { label: "Press", href: "/press/" },
      { label: "Work for Juma", href: "/work-for-juma/" },
      { label: "Contact Us", href: "/contact/" },
    ],
  },
  { label: "News", href: "/news/" },
  { label: "Events", href: "/events/" },
];

/** Footer link columns. */
export const footerNav: { heading: string; links: NavItem[] }[] = [
  {
    heading: "Get Involved",
    links: [
      { label: "Donate", href: "/donate/" },
      { label: "Volunteer", href: "/volunteer/" },
      { label: "Newsletter", href: "/newsletter/" },
      { label: "Work for Juma", href: "/work-for-juma/" },
    ],
  },
  {
    heading: "About",
    links: [
      { label: "Our Mission", href: "/our-mission-history/" },
      { label: "Programs", href: "/programs/" },
      { label: "Impact & Stories", href: "/stories/" },
      { label: "Leadership", href: "/leadership/" },
      { label: "Financials", href: "/financials/" },
    ],
  },
  {
    heading: "Locations",
    links: [
      { label: "San Francisco / Bay Area", href: "/san-francisco/" },
      { label: "San Jose", href: "/san-jose/" },
      { label: "Sacramento", href: "/sacramento/" },
      { label: "Seattle", href: "/seattle/" },
    ],
  },
];

export const social = [
  { platform: "instagram", label: "Instagram", url: "https://instagram.com/juma_ventures/" },
  { platform: "facebook", label: "Facebook", url: "https://www.facebook.com/jumaventures" },
  { platform: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/company/juma-ventures" },
  { platform: "youtube", label: "YouTube", url: "https://www.youtube.com/channel/UCTQR2CosvNd8-dP8qENfrsg" },
] as const;

/** Office locations (from the legacy Contact page). */
export const offices = [
  {
    name: "San Francisco (Main)",
    address: "131 Steuart Street, Suite 202, San Francisco, CA 94105",
    phone: "415.371.0727",
  },
  { name: "Sacramento", address: "815 S Street, Sacramento, CA 95811", phone: "504.233.9838" },
  { name: "Seattle", address: "900 1st Avenue South, Suite 102, Seattle, WA 98134", phone: "206.557.5613" },
] as const;

/** Purpose-routed contact emails (from the legacy Contact page). */
export const contactRoutes = [
  { purpose: "Donations & tax receipts", email: "devadmin@juma.org" },
  { purpose: "HR & employment verification", email: "operations@juma.org" },
  { purpose: "Corporate partnerships", email: "meganh@juma.org" },
] as const;

/**
 * Donation configuration. Donations currently run through GoFundMe (Every.org);
 * to switch to Stripe Payment Links, set PUBLIC_DONATE_URL / the monthly URL to
 * your Stripe links — the donate page UI is identical either way.
 */
export const donate = {
  oneTimeUrl: import.meta.env.PUBLIC_DONATE_URL || "https://giving.gofundme.com/campaign/757612/donate",
  monthlyUrl: import.meta.env.PUBLIC_DONATE_MONTHLY_URL || "https://giving.gofundme.com/campaign/757612/donate",
  stockCryptoUrl: "https://tinyurl.com/supportjuma",
  oneTimeAmounts: [25, 50, 100, 200, 300, 500],
  monthlyAmounts: [20, 25, 30, 50, 70, 90],
  provider: "GoFundMe (Every.org)",
} as const;

/** Youth application links (Google Forms, by location). */
export const applyForms = {
  "san-francisco": "https://forms.gle/6FiveuybZR6sAM767",
  seattle: "https://forms.gle/ydf1qXLve8GfsbM9A",
  "san-jose": "https://forms.gle/nEZ9YDPye4SryxzG7",
  sacramento: "https://forms.gle/H19aUL8WrWNy1ZCu8",
} as const;

/** Analytics — configure via env; empty disables the tag. */
export const analytics = {
  ga4: import.meta.env.PUBLIC_GA4_ID || "",
  fbPixel: import.meta.env.PUBLIC_FB_PIXEL_ID || "",
};

/** Newsletter (Mailchimp) — audience details from the legacy embed. */
export const newsletter = {
  provider: "mailchimp",
  actionUrl:
    import.meta.env.PUBLIC_MAILCHIMP_URL ||
    "https://juma.us2.list-manage.com/subscribe/post?u=335885ccfee96c7678831b8f8&id=1cdc01eea9&f_id=001ecae1f0",
};
