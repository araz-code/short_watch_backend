export interface Analysis {
  slug: string;
  title: string;
  subtitle: { da: string; en: string };
  date: { da: string; en: string };
  code: string;
}

export const analyses: Analysis[] = [
  {
    slug: "novo/dcf/2026-05-19",
    title: "Novo Nordisk A/S (NOVO)",
    subtitle: {
      da: "Lav din egen vurdering af Novo Nordisk A/S",
      en: "Build your own valuation of Novo Nordisk A/S",
    },
    date: { da: "19. maj 2026", en: "May 19, 2026" },
    code: "DK0062498333",
  },
  {
    slug: "bava/2026-05-17",
    title: "Bavarian Nordic (BAVA)",
    subtitle: {
      da: "Shortanalyse: Da BAVA sad øverst på shortlisten",
      en: "When BAVA topped the short sellers list",
    },
    date: { da: "17. maj 2026", en: "May 17, 2026" },
    code: "DK0015998017",
  },
  {
    slug: "zeal/gennemsnitspris/2026-05-14",
    title: "Zealand Pharma (ZEAL)",
    subtitle: {
      da: "Til hvilken kurs har de shortet Zealand Pharma?",
      en: "At what price did they short Zealand Pharma?",
    },
    date: { da: "15. maj 2026", en: "May 15, 2026" },
    code: "DK0060257814",
  },
  {
    slug: "gn/2026-05-14",
    title: "GN Store Nord (GN)",
    subtitle: {
      da: "Shortanalyse: Shorterne holder fast trods Amplifon-salget",
      en: "Short selling analysis: Short sellers hold firm despite Amplifon sale",
    },
    date: { da: "14. maj 2026", en: "May 14, 2026" },
    code: "DK0010272632",
  },
  {
    slug: "zeal/2026-05-13",
    title: "Zealand Pharma (ZEAL)",
    subtitle: {
      da: "Shortanalyse: Hvem vædder imod Zealand Pharma?",
      en: "Short selling analysis: Who is betting against Zealand Pharma?",
    },
    date: { da: "13. maj 2026", en: "May 13, 2026" },
    code: "DK0060257814",
  },
];
