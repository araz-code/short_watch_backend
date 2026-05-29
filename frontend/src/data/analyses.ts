import data from "./analyses.json";

export interface Analysis {
  slug: string;
  title: string;
  subtitle: { da: string; en: string };
  excerpt: { da: string; en: string };
  date: { da: string; en: string };
  readingMinutes: number;
  code: string;
  // Hex accent shown on the card's top border. Shared per stock (both ZEAL
  // analyses use the same color); used on web and in the iOS app.
  accentColor: string;
}

// Single source of truth: analyses.json. The backend reads the same file for
// server-side OG tags and the /v18/analyses API. The extra OG fields in the
// JSON (ogTitle/ogDescription/ogImage) are not needed on the web and ignored.
export const analyses: Analysis[] = data.analyses.map((a) => ({
  slug: a.slug,
  title: a.title,
  subtitle: a.subtitle,
  excerpt: a.excerpt,
  date: a.date,
  readingMinutes: a.readingMinutes,
  code: a.code,
  accentColor: a.accentColor,
}));
