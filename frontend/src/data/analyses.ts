export interface Analysis {
  slug: string;
  title: string;
  subtitle: { da: string; en: string };
  excerpt: { da: string; en: string };
  date: { da: string; en: string };
  readingMinutes: number;
  code: string;
}

export const analyses: Analysis[] = [
  {
    slug: "c25/2026-05-28",
    title: "OMX Copenhagen 25 (C25)",
    subtitle: {
      da: "Hvorfor C25 har stået stille i 5 år: Anatomien af et indeks der ikke vil stige",
      en: "Why C25 has stood still for 5 years: Anatomy of an index that won't rise",
    },
    excerpt: {
      da: "C25 er fladt over 5 år mens S&P 500 er steget 74%. Vi dekomponerer indekset aktie for aktie: Ørsted alene kostede 12pp, bankerne reddede +15pp.",
      en: "C25 is flat over 5 years while S&P 500 has risen 74%. We decompose the index stock by stock: Ørsted alone cost 12pp, banks saved +15pp.",
    },
    date: { da: "28. maj 2026", en: "May 28, 2026" },
    readingMinutes: 10,
    code: "",
  },
  {
    slug: "pandora/2026-05-23",
    title: "Pandora A/S (PNDORA)",
    subtitle: {
      da: "Pandora og sølvprisen: Hvordan råvarer og forbrugertillid påvirker aktien",
      en: "Pandora and the silver price: How commodities and consumer sentiment affect the stock",
    },
    excerpt: {
      da: "Pandora-aktien er faldet 41% mens sølvprisen er mere end tredoblet. Vi gennemgår sammenhængen, Pandoras hedging og hvad det betyder for de næste kvartaler.",
      en: "The Pandora share has fallen 41% while silver has more than tripled. We unpack the relationship, Pandora's hedging programme, and what it means for the coming quarters.",
    },
    date: { da: "23. maj 2026", en: "May 23, 2026" },
    readingMinutes: 12,
    code: "DK0060252690",
  },
  {
    slug: "novo/dcf/2026-05-19",
    title: "Novo Nordisk A/S (NOVO)",
    subtitle: {
      da: "Lav din egen vurdering af Novo Nordisk A/S",
      en: "Build your own valuation of Novo Nordisk A/S",
    },
    excerpt: {
      da: "Byg din egen DCF-værdiansættelse af Novo Nordisk med justerbare antagelser om vækst, marginer og diskonteringsrente. Se hvordan kursen ændrer sig i realtid.",
      en: "Build your own DCF valuation of Novo Nordisk with adjustable assumptions for growth, margins, and discount rate. See how the share price changes in real time.",
    },
    date: { da: "19. maj 2026", en: "May 19, 2026" },
    readingMinutes: 8,
    code: "DK0062498333",
  },
  {
    slug: "bava/2026-05-17",
    title: "Bavarian Nordic (BAVA)",
    subtitle: {
      da: "Shortanalyse: Da BAVA sad øverst på shortlisten",
      en: "When BAVA topped the short sellers list",
    },
    excerpt: {
      da: "Bavarian Nordic toppede shortlisten i månedsvis. Hvem stod bag positionerne, hvor meget tabte de, og hvad fortæller forløbet os om dansk short selling?",
      en: "Bavarian Nordic topped the short selling list for months. Who held the positions, how much did they lose, and what does the saga tell us about Danish short selling?",
    },
    date: { da: "17. maj 2026", en: "May 17, 2026" },
    readingMinutes: 7,
    code: "DK0015998017",
  },
  {
    slug: "zeal/gennemsnitspris/2026-05-14",
    title: "Zealand Pharma (ZEAL)",
    subtitle: {
      da: "Til hvilken kurs har de shortet Zealand Pharma?",
      en: "At what price did they short Zealand Pharma?",
    },
    excerpt: {
      da: "Vi beregner den gennemsnitlige indgangskurs for short-sælgerne i Zealand Pharma og kortlægger hvor dybt de er under vand på deres positioner.",
      en: "We compute the average entry price for short sellers in Zealand Pharma and map how deeply underwater each position currently sits.",
    },
    date: { da: "15. maj 2026", en: "May 15, 2026" },
    readingMinutes: 6,
    code: "DK0060257814",
  },
  {
    slug: "gn/2026-05-14",
    title: "GN Store Nord (GN)",
    subtitle: {
      da: "Shortanalyse: Shorterne holder fast trods Amplifon-salget",
      en: "Short selling analysis: Short sellers hold firm despite Amplifon sale",
    },
    excerpt: {
      da: "Selv efter den positive Amplifon-nyhed holder short-sælgerne fast i GN Store Nord. Vi ser på hvem de er, hvor længe de har holdt, og hvad de venter på.",
      en: "Even after the positive Amplifon news, short sellers are sticking with GN Store Nord. We look at who they are, how long they have held, and what they are waiting for.",
    },
    date: { da: "14. maj 2026", en: "May 14, 2026" },
    readingMinutes: 7,
    code: "DK0010272632",
  },
  {
    slug: "zeal/2026-05-13",
    title: "Zealand Pharma (ZEAL)",
    subtitle: {
      da: "Shortanalyse: Hvem vædder imod Zealand Pharma?",
      en: "Short selling analysis: Who is betting against Zealand Pharma?",
    },
    excerpt: {
      da: "Et dybt kig på short-positionerne i Zealand Pharma: Hvem holder dem, hvor store er de, og hvordan har de udviklet sig over de seneste år?",
      en: "A deep look at the short positions in Zealand Pharma: Who holds them, how big are they, and how have they developed over the past years?",
    },
    date: { da: "13. maj 2026", en: "May 13, 2026" },
    readingMinutes: 8,
    code: "DK0060257814",
  },
];
