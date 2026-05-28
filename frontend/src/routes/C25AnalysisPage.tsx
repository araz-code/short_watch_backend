import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageTemplate from "../components/PageTemplate";
import RelatedAnalyses from "../components/RelatedAnalyses";
import FeedbackWidget from "../components/FeedbackWidget";
import { trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

const SLUG = "c25/2026-05-28";

// ─── types ───────────────────────────────────────────────────────────────────
interface ComparisonPoint {
  date: string;
  c25: number;
  sp500: number;
  nasdaq: number;
  stoxx: number;
  omx: number;
}

interface SectorPoint {
  sector: string;
  y2020: number;
  y2021: number;
  y2026: number;
}

// ─── static data ────────────────────────────────────────────────────────────
// Genereret af scripts/c25_chart_data.py
// Kilde: Yahoo Finance daglig close, sidste-handelsdag-i-måneden, normaliseret til 100.
// Datavindue: 2021-05-31 → 2026-05-31 (61 punkter)
const COMPARISON_DATA: ComparisonPoint[] = [
  { date: "2021-05", c25: 100.0, sp500: 100.0, nasdaq: 100.0, stoxx: 100.0, omx: 100.0 },
  { date: "2021-06", c25: 103.0, sp500: 102.2, nasdaq: 105.5, stoxx: 101.4, omx: 100.9 },
  { date: "2021-07", c25: 106.6, sp500: 104.5, nasdaq: 106.7, stoxx: 103.4, omx: 105.7 },
  { date: "2021-08", c25: 109.4, sp500: 107.6, nasdaq: 111.0, stoxx: 105.4, omx: 104.9 },
  { date: "2021-09", c25: 104.1, sp500: 102.5, nasdaq: 105.1, stoxx: 101.8, omx: 100.8 },
  { date: "2021-10", c25: 109.2, sp500: 109.5, nasdaq: 112.7, stoxx: 106.4, omx: 102.2 },
  { date: "2021-11", c25: 104.2, sp500: 108.6, nasdaq: 113.0, stoxx: 103.6, omx: 100.0 },
  { date: "2021-12", c25: 108.8, sp500: 113.4, nasdaq: 113.8, stoxx: 109.4, omx: 107.9 },
  { date: "2022-01", c25: 98.4, sp500: 107.4, nasdaq: 103.6, stoxx: 105.0, omx: 102.2 },
  { date: "2022-02", c25: 97.7, sp500: 104.0, nasdaq: 100.0, stoxx: 101.4, omx: 95.2 },
  { date: "2022-03", c25: 98.9, sp500: 107.8, nasdaq: 103.4, stoxx: 102.0, omx: 93.5 },
  { date: "2022-04", c25: 97.7, sp500: 98.3, nasdaq: 89.7, stoxx: 100.8, omx: 91.8 },
  { date: "2022-05", c25: 93.2, sp500: 98.3, nasdaq: 87.9, stoxx: 99.2, omx: 91.1 },
  { date: "2022-06", c25: 87.2, sp500: 90.0, nasdaq: 80.2, stoxx: 91.1, omx: 83.5 },
  { date: "2022-07", c25: 98.0, sp500: 98.2, nasdaq: 90.1, stoxx: 98.1, omx: 90.7 },
  { date: "2022-08", c25: 91.5, sp500: 94.1, nasdaq: 85.9, stoxx: 92.9, omx: 85.7 },
  { date: "2022-09", c25: 79.7, sp500: 85.3, nasdaq: 76.9, stoxx: 86.8, omx: 81.6 },
  { date: "2022-10", c25: 87.2, sp500: 92.1, nasdaq: 79.9, stoxx: 92.3, omx: 87.8 },
  { date: "2022-11", c25: 93.4, sp500: 97.1, nasdaq: 83.4, stoxx: 98.5, omx: 93.8 },
  { date: "2022-12", c25: 94.2, sp500: 91.3, nasdaq: 76.1, stoxx: 95.1, omx: 91.1 },
  { date: "2023-01", c25: 94.0, sp500: 97.0, nasdaq: 84.3, stoxx: 101.4, omx: 98.1 },
  { date: "2023-02", c25: 98.6, sp500: 94.4, nasdaq: 83.3, stoxx: 103.2, omx: 99.3 },
  { date: "2023-03", c25: 99.1, sp500: 97.7, nasdaq: 88.9, stoxx: 102.5, omx: 99.2 },
  { date: "2023-04", c25: 100.7, sp500: 99.2, nasdaq: 88.9, stoxx: 104.4, omx: 101.3 },
  { date: "2023-05", c25: 99.8, sp500: 99.4, nasdaq: 94.1, stoxx: 101.1, omx: 99.7 },
  { date: "2023-06", c25: 100.6, sp500: 105.9, nasdaq: 100.3, stoxx: 103.4, omx: 103.0 },
  { date: "2023-07", c25: 100.2, sp500: 109.2, nasdaq: 104.3, stoxx: 105.5, omx: 100.4 },
  { date: "2023-08", c25: 96.2, sp500: 107.2, nasdaq: 102.1, stoxx: 102.6, omx: 97.5 },
  { date: "2023-09", c25: 94.2, sp500: 102.0, nasdaq: 96.1, stoxx: 100.8, omx: 96.1 },
  { date: "2023-10", c25: 89.7, sp500: 99.8, nasdaq: 93.5, stoxx: 97.1, omx: 92.6 },
  { date: "2023-11", c25: 95.7, sp500: 108.7, nasdaq: 103.5, stoxx: 103.3, omx: 99.6 },
  { date: "2023-12", c25: 100.8, sp500: 113.5, nasdaq: 109.2, stoxx: 107.2, omx: 107.0 },
  { date: "2024-01", c25: 102.8, sp500: 115.3, nasdaq: 110.3, stoxx: 108.7, omx: 105.1 },
  { date: "2024-02", c25: 105.0, sp500: 121.2, nasdaq: 117.0, stoxx: 110.7, omx: 109.4 },
  { date: "2024-03", c25: 107.6, sp500: 125.0, nasdaq: 119.1, stoxx: 114.8, omx: 112.3 },
  { date: "2024-04", c25: 105.5, sp500: 119.8, nasdaq: 113.9, stoxx: 113.0, omx: 114.0 },
  { date: "2024-05", c25: 109.8, sp500: 125.5, nasdaq: 121.7, stoxx: 116.0, omx: 116.2 },
  { date: "2024-06", c25: 108.2, sp500: 129.9, nasdaq: 129.0, stoxx: 114.5, omx: 114.6 },
  { date: "2024-07", c25: 111.3, sp500: 131.4, nasdaq: 128.0, stoxx: 116.0, omx: 116.4 },
  { date: "2024-08", c25: 110.2, sp500: 134.4, nasdaq: 128.8, stoxx: 117.5, omx: 115.8 },
  { date: "2024-09", c25: 108.0, sp500: 137.1, nasdaq: 132.3, stoxx: 117.0, omx: 117.2 },
  { date: "2024-10", c25: 103.9, sp500: 135.7, nasdaq: 131.6, stoxx: 113.1, omx: 113.4 },
  { date: "2024-11", c25: 102.6, sp500: 143.5, nasdaq: 139.8, stoxx: 114.2, omx: 112.1 },
  { date: "2024-12", c25: 98.4, sp500: 139.9, nasdaq: 140.5, stoxx: 113.0, omx: 110.8 },
  { date: "2025-01", c25: 98.2, sp500: 143.7, nasdaq: 142.8, stoxx: 120.8, omx: 119.1 },
  { date: "2025-02", c25: 102.5, sp500: 141.6, nasdaq: 137.1, stoxx: 124.7, omx: 121.5 },
  { date: "2025-03", c25: 92.3, sp500: 133.5, nasdaq: 125.8, stoxx: 119.5, omx: 111.2 },
  { date: "2025-04", c25: 91.7, sp500: 132.5, nasdaq: 126.9, stoxx: 118.1, omx: 108.6 },
  { date: "2025-05", c25: 97.5, sp500: 140.6, nasdaq: 139.0, stoxx: 122.8, omx: 111.3 },
  { date: "2025-06", c25: 94.5, sp500: 147.6, nasdaq: 148.2, stoxx: 121.2, omx: 111.2 },
  { date: "2025-07", c25: 92.2, sp500: 150.8, nasdaq: 153.6, stoxx: 122.2, omx: 115.1 },
  { date: "2025-08", c25: 92.3, sp500: 153.7, nasdaq: 156.1, stoxx: 123.1, omx: 117.1 },
  { date: "2025-09", c25: 90.2, sp500: 159.1, nasdaq: 164.8, stoxx: 124.9, omx: 118.8 },
  { date: "2025-10", c25: 93.3, sp500: 162.7, nasdaq: 172.6, stoxx: 128.0, omx: 123.4 },
  { date: "2025-11", c25: 96.7, sp500: 162.9, nasdaq: 169.9, stoxx: 129.0, omx: 124.4 },
  { date: "2025-12", c25: 101.0, sp500: 162.8, nasdaq: 169.0, stoxx: 132.7, omx: 128.6 },
  { date: "2026-01", c25: 105.5, sp500: 165.1, nasdaq: 170.6, stoxx: 136.8, omx: 135.0 },
  { date: "2026-02", c25: 95.9, sp500: 163.6, nasdaq: 164.9, stoxx: 141.9, omx: 143.8 },
  { date: "2026-03", c25: 93.1, sp500: 155.3, nasdaq: 157.0, stoxx: 130.5, omx: 130.7 },
  { date: "2026-04", c25: 96.4, sp500: 171.5, nasdaq: 181.1, stoxx: 136.8, omx: 136.5 },
  { date: "2026-05", c25: 98.4, sp500: 178.9, nasdaq: 194.0, stoxx: 140.6, omx: 140.8 },
];

// Sektorvægte fra officielle Nasdaq Index factsheets.
// Konsolideret til 7 sammenlignelige kategorier (Nasdaq omklassificerede mellem 2020 og 2021).
// 2020 "Oil & Gas" = Energy (kun Vestas). 2020 "Consumer Goods" = sum af Consumer Staples + Consumer Discretionary.
const SECTOR_TIMELINE_DATA: SectorPoint[] = [
  { sector: "Sundhed",    y2020: 47.15, y2021: 41.59, y2026: 33.19 },
  { sector: "Industri",   y2020: 19.29, y2021: 25.30, y2026: 27.79 },
  { sector: "Finans",     y2020: 5.27,  y2021: 6.81,  y2026: 16.86 },
  { sector: "Energi",     y2020: 11.33, y2021: 8.51,  y2026: 10.79 },
  { sector: "Forbrug",    y2020: 9.00,  y2021: 9.54,  y2026: 7.16 },
  { sector: "Forsyning",  y2020: 6.37,  y2021: 7.01,  y2026: 4.21 },
  { sector: "Teknologi",  y2020: 1.61,  y2021: 1.25,  y2026: 0.00 },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
const formatDate = (ym: string): string => {
  const [y, m] = ym.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};

// ─── sub-components ──────────────────────────────────────────────────────────
function KPI({ value, label, highlight, tone = "blue" }: { value: string; label: string; highlight?: boolean; tone?: "blue" | "red" | "green" }) {
  const toneClasses = {
    blue:  { bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",       text: "text-blue-600 dark:text-blue-400" },
    red:   { bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",           text: "text-red-600 dark:text-red-400" },
    green: { bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400" },
  };
  const t = toneClasses[tone];
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 text-center ${highlight ? t.bg : "bg-white dark:bg-[#19191f] border-gray-100 dark:border-gray-800"}`}>
      <p className={`text-lg sm:text-xl font-bold tabular-nums ${highlight ? t.text : "text-gray-900 dark:text-white"}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
      {n}. {title}
    </h2>
  );
}

function StockBlock({ name, returnLabel, children }: { name: string; returnLabel: string; children: React.ReactNode }) {
  const isPositive = returnLabel.trim().startsWith("+");
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
        <span className={`text-base font-bold tabular-nums ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {returnLabel}
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{children}</p>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
      {children}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────
const C25AnalysisPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackPageView(`/analyse/${SLUG}`, "C25 analyse");
    fetch(`${HOST}/stats/visit/c25_analysis/`).catch(() => {});
  }, []);

  return (
    <PageTemplate>
      <title>Hvorfor C25 har stået stille i 5 år | Zirium</title>
      <meta
        name="description"
        content="C25 har tabt 2% over 5 år, mens S&P 500 er steget 79% og europæiske peers cirka 41%. Vi ser på sektorforskydningen, de største vindere og tabere, og hvad der forklarer det danske efterslæb."
      />
      <meta property="og:title" content="Hvorfor C25 har stået stille i 5 år" />
      <meta property="og:description" content="C25 -2% mens peers steg 40-79%. Sektorforskydninger og enkelt-aktie-kollaps forklarer det danske efterslæb." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`https://www.zirium.dk/analyse/${SLUG}`} />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Hvorfor C25 har stået stille i 5 år" />
      <meta name="twitter:description" content="C25 -2% mens peers steg 40-79%. Sektorforskydninger og enkelt-aktie-kollaps forklarer det danske efterslæb." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Hvorfor C25 har stået stille i 5 år",
        "description": "C25 har tabt 2% over 5 år, mens S&P 500 er steget 79% og europæiske peers cirka 41%.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-28",
        "mainEntityOfPage": `https://www.zirium.dk/analyse/${SLUG}`,
        "inLanguage": "da",
      })}</script>

      <article className="w-full max-w-[900px] mx-auto px-5 sm:px-8 pb-10 sm:pb-16">
        <button
          className="text-blue-500 hover:text-blue-700 bg-transparent border-none text-base inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm min-h-[44px] min-w-[44px]"
          onClick={() => {
            if (window.history.length > 1 && window.history.state?.idx > 0) {
              navigate(-1);
            } else {
              navigate("/analyse");
            }
          }}
        >
          <span aria-hidden="true">←</span>
          Tilbage
        </button>

        {/* Header */}
        <header className="mb-10 mt-4">
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">
            Analyse lavet af Araz Bayat Makoo (Zirium) - 28. maj 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Hvorfor C25 har stået stille i 5 år
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            OMX Copenhagen 25 (C25)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Målt på prisindeks i lokal valuta har C25 tabt 1,6% over de sidste
            5 år (28. maj 2021 til 27. maj 2026), mens S&P 500 er steget 78,9%,
            STOXX Europe 600 er steget 40,6% og OMX Stockholm 30 er steget 40,8%.
            Selv det nære nordiske marked har leveret cirka 42 procentpoint mere
            end det danske.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Danske aktier har i mange år ofte været betragtet som et europæisk
            kvalitetsmarked: Dominans i sundhedssektoren, eksportstærke globale
            brands, høj corporate governance og stabile udbytter. Over de sidste
            5 år er den status blevet udfordret af store sektorforskydninger og
            enkelt-aktie-kollaps, der har trukket det samlede afkast under nul.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            De officielle Nasdaq Index-factsheets viser hvor markant indekset
            har forandret sig. Ved udgangen af 2021 udgjorde sundhedssektoren
            41,6% af C25; per seneste factsheet (31. marts 2026) er den nede
            på 33,2%. Finanssektoren er gået den modsatte vej: fra 6,8% til
            16,9%. Danske Bank alene er gået fra 3,4% af indekset til 10,8%
            i samme periode. Og strukturelt: C25 har ingen mega-cap
            tech-eksponering i stil med amerikanske hyperscalers eller
            platformsselskaber.
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="+78,9%" label="S&P 500 (5 år)" highlight tone="green" />
          <KPI value="+40,8%" label="OMX Stockholm 30 (5 år)" />
          <KPI value="+40,6%" label="STOXX 600 (5 år)" />
          <KPI value="-1,6%" label="OMX C25 (5 år)" highlight tone="red" />
        </div>

        {/* Section 1: Hvor sløvt er det? */}
        <section className="mb-12">
          <SectionHeader n={1} title="Hvor sløvt er det egentlig?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Lad os sætte tal på. C25 har tabt cirka 2% over de seneste fem år,
            mens Nasdaq Composite er steget 94% og S&P 500 er steget 79%. Også
            tættere på Danmark har gabet været stort: Både STOXX Europe 600 og
            OMX Stockholm 30 har leveret cirka 41%. Selv det nære nordiske
            marked har leveret cirka 42 procentpoint mere end det danske.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Graf: Sammenligning af C25, S&P 500, Nasdaq Composite, STOXX 600 og OMX Stockholm 30 over 5 år">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Sammenligning af 5 indekser (maj 2021 = 100)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Månedsslut, prisindeks (uden udbytter)</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={COMPARISON_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={formatDate}
                  interval={11}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[70, 200]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => Number(v).toFixed(1)}
                  labelFormatter={(label) => formatDate(String(label))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="nasdaq" name="Nasdaq Composite" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sp500" name="S&P 500" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="omx" name="OMX Stockholm 30" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="stoxx" name="STOXX Europe 600" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="c25" name="OMX C25" stroke="#ef4444" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
            Note: Sammenligningen bruger prisindekser uden reinvesterede udbytter
            for at sikre sammenlignelighed mellem de fem indekser. Afkast er
            målt i lokal valuta (USD, EUR, SEK, DKK) og er ikke valuta-justeret.
            Da DKK er fastlåst til EUR, er C25 vs. STOXX 600 reelt
            valutaneutral; for S&P 500 og OMX Stockholm 30 ville en valutajustering
            kunne flytte tal med nogle procentpoint, men ikke lukke det store gab
            til C25.
          </p>
        </section>

        {/* Section 2: Sektorforskydningen */}
        <section className="mb-12">
          <SectionHeader n={2} title="Sektorforskydningen" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Hvis man kun ser på indeksværdien (-1,6% på 5 år), kan det virke
            som om intet er sket i C25. Det er forkert. Under overfladen er
            sammensætningen af indekset blevet markant omflyttet. Den klareste
            historie er ikke om enkelte aktier, men om hvilke sektorer der er
            vokset i indeks-vægt, og hvilke der er skrumpet.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Graf: C25 sektorvægte over tid (sept 2020, dec 2021, marts 2026)">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">C25 sektorvægte over tid</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Procent af indeks. Kilde: Nasdaq Index factsheets.</p>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={SECTOR_TIMELINE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="sector" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `${Number(v).toFixed(2).replace(".", ",")}%`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="y2020" name="sept 2020" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="y2021" name="dec 2021" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="y2026" name="marts 2026" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Den mest påfaldende bevægelse er finanssektoren. Fra 5% af C25 i
            2020 og 7% ved udgangen af 2021 udgør Financials nu 17% af indekset
            - en tredobling på fem år. Det er en ren markedsdrevet stigning:
            bankerne fik et historisk boost da Nationalbanken og ECB hævede
            renterne fra negativ rente i 2022, og deres aktiekurser steg massivt.
            Danske Bank alene er gået fra 3% af indekset i 2021 til 11% nu.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Modsat har sundhedssektoren skrumpet fra 47% til 33% - en bred
            udvanding drevet af Coloplast (-53%), GN Store Nord (-82%), Ambu
            (-71%) og Genmab (-29%), mens Novo Nordisk trods medieopmærksomheden
            kun har leveret +31% over 5 år.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Tech-eksponeringen var aldrig stor, men er nu 0%. Netcompany, den
            sidste danske tech-aktie i C25, faldt ud af indekset i løbet af
            perioden. Til sammenligning udgør tech-sektoren cirka 32% af S&P 500
            - en strukturel forskel der alene forklarer en stor del af det
            amerikanske forspring.
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed mt-4">
            Kilde: Nasdaq Index factsheets dateret 30/9/2020, 30/12/2021 og
            31/3/2026. Nasdaq omklassificerede sit sektor-system mellem 2020 og
            2021; ovenstående er konsolideret til sammenlignelige kategorier.
            S&P 500 tech-vægt fra S&P Dow Jones Indices, maj 2026.
          </p>
        </section>

        {/* Section 3: Tabere */}
        <section className="mb-12">
          <SectionHeader n={3} title="De individuelle aktiehistorier - bunden" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Bag det flade indeks-tal gemmer sig nogle af de største enkelt-aktie
            fald set i et stort dansk indeks i nyere tid. Her er aktierne i C25
            der har tabt mest. Ikke som "bidrag" til indekset, men som
            selvstændige investeringshistorier.
          </p>

          <StockBlock name="Ørsted" returnLabel="-82%">
            Det største fald i C25. Aktien ramte sin all-time high på 1.355 DKK
            den 7. januar 2021 og handler i dag omkring 165 DKK - cirka 88%
            under toppen. Tabet skyldes en kombination af stigende renter (der
            ramte alle long-duration grønne aktier hårdt), eksploderende
            komponentpriser, forsinkelser i amerikanske offshore-projekter, og
            en stor nedskrivning på 28,4 mia. DKK i oktober 2023, da Ørsted
            måtte trække sig fra Ocean Wind 1 og 2 ud for New Jersey. Det var
            ikke et selskab i krise. Det var hele forretningsmodellen for
            offshore vind, der pludselig så uattraktiv ud.
          </StockBlock>

          <StockBlock name="GN Store Nord" returnLabel="-81%">
            Lige så slemt som Ørsted, bare mindre kendt i offentligheden. To
            samtidige problemer: et post-COVID kollaps i headset-segmentet
            (folk og virksomheder købte for meget under pandemien, derefter
            ingen genkøb), og pres på høreapparat-segmentet i USA fra
            over-the-counter konkurrenter solgt via Amazon og apoteker til en
            brøkdel af prisen.
          </StockBlock>

          <StockBlock name="Ambu" returnLabel="-71%">
            Samme post-COVID mønster som GN. Ambus engangsendoskoper var hot
            under pandemien hvor genbrugsudstyr blev set som smitterisiko. Den
            strukturelle vækst er aldrig vendt tilbage til pre-COVID niveau.
          </StockBlock>

          <StockBlock name="Coloplast" returnLabel="-52%">
            Tre samtidige modvinde: kinesisk volumen-pres på
            kontinens-produkter, en høj overtagelsespris (USD 1,3 mia. ≈ 8,9
            mia. DKK) for Kerecis i august 2023, der ikke har leveret som
            forventet, og en bred re-rating af defensive sundhedsaktier i et
            høj-rente-miljø.
          </StockBlock>

          <StockBlock name="Royal Unibrew" returnLabel="-39%">
            Marginpres fra råvarepriser (især aluminium og malt), voldsomt hop
            i input-omkostninger i 2022, og vækststagnation på de udviklede
            markeder.
          </StockBlock>

          <StockBlock name="Genmab" returnLabel="-29%">
            Patentfrygt omkring Darzalex - US-patentet udløber i 2029 og
            royalty-stream'en udfases gradvist over de tidlige 2030'ere - plus
            skuffende launch af nye produkter har sat aktien under pres trods
            stadigt voksende royaltyindtægter.
          </StockBlock>

          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-4">
            Yderligere store tab i perioden: Bavarian Nordic (-30%), Rockwool B
            (-26%), Vestas (-24%), Demant (-23%), Pandora (-16%), Novonesis B
            (-11%), Carlsberg B (-7%).
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed mt-4">
            Kilde: Yahoo Finance via yfinance, dividend-justerede priser fra
            26. maj 2021 til 27. maj 2026.
          </p>
        </section>

        {/* Section 4: Vindere */}
        <section className="mb-12">
          <SectionHeader n={4} title="De individuelle aktiehistorier - toppen" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Selv om indekset er fladt, har en håndfuld aktier leveret massive
            afkast. Modsat tabene er de store stigninger meget koncentrerede:
            banker og infrastruktur-leverandører dominerer toppen.
          </p>

          <StockBlock name="NKT" returnLabel="+320%">
            Den klart største vinder i C25 over 5 år - større end nogen bank.
            NKT producerer høj-spændings-strømkabler, herunder undersøiske
            kabler til offshore vindprojekter. Den globale udbygning af
            elnettet og elektrificeringen af industri og transport har skabt
            en ordrebog i historisk størrelse. Det er den klassiske "picks
            and shovels"-historie: Mens udviklere som Ørsted har lidt, har
            leverandører som NKT profiteret af den samme grønne omstilling.
          </StockBlock>

          <StockBlock name="Danske Bank" returnLabel="+299%">
            Den næststørste stigning i C25. Tre samtidige drivere:
            rente-margins eksploderede efter ECB hævede sin deposit-rente fra
            -0,5% i 2022 til 4,0% i september 2023 (MRO-renten op til 4,5%),
            og Nationalbanken fulgte med op til 3,6% - bankerne fik dermed en
            stor spread mellem indlån og udlån; historisk aggressive
            aktietilbagekøb; og re-rating efter at hvidvask-skandalen er
            blevet gradvist glemt af markedet. Aktien handlede til 0,5x P/B i
            2020, nu omkring 1,2x.
          </StockBlock>

          <StockBlock name="Jyske Bank" returnLabel="+214%">
            Samme rente-tema som Danske Bank, kombineret med endnu mere
            aggressive aktietilbagekøb relativt til markedsværdien.
          </StockBlock>

          <StockBlock name="ISS" returnLabel="+125%">
            Comeback-historie efter et brutalt 2020-2021 hvor facility
            services-selskabet blev hårdt ramt af lockdowns og hjemmearbejde.
            Aktien er nu cirka 2-3x sit pandemi-bund-niveau drevet af
            normalisering, omkostningsbesparelser og udvidede kontrakter.
          </StockBlock>

          <StockBlock name="FLSmidth" returnLabel="+117%">
            Cement- og mineindustri-leverandøren har profiteret af det globale
            infrastruktur- og rå-vare-tema. Selskabet har solgt sin
            cement-forretning fra og fokuseret 100% på mining - en
            transformation markedet har belønnet.
          </StockBlock>

          <StockBlock name="A.P. Møller-Mærsk" returnLabel="+70% / +75%">
            Mærsk B endte +70%, Mærsk A +75%. Vild ride: Aktien fordoblede
            sig i 2021-2022 under COVID-shipping-boomet, kollapsede i 2023
            da fragtraterne normaliserede, og er siden steget igen drevet af
            Rødehavet-omdirigeringen (Houthi-angreb), der har holdt rater oppe.
          </StockBlock>

          <StockBlock name="Zealand Pharma" returnLabel="+69%">
            Den eneste sundhedsaktie i toppen. Drevet af klinisk fremgang i
            selskabets pipeline (GLP-1 og glucagon-baserede behandlinger) -
            bl.a. survodutide (BI 456906), som udvikles sammen med Boehringer
            Ingelheim - der har valideret forretningen.
          </StockBlock>

          <StockBlock name="Novo Nordisk" returnLabel="+32%">
            Her er overraskelsen. Novo har domineret danske medieoverskrifter
            i flere år som "verdens mest værdifulde europæiske selskab", men
            over denne specifikke 5-års-periode er aktien kun steget 32%.
            Massiv stigning fra 2021 til midten af 2024 (drevet af Wegovy og
            Ozempic), efterfulgt af en hård korrektion da CagriSema-data i
            december 2024 skuffede, da konkurrence fra Eli Lillys Zepbound
            blev tydelig, og da bekymring for amerikansk drug pricing tog over.
          </StockBlock>

          <StockBlock name="Tryg" returnLabel="+30%">
            Forsikring er ikke bank, men har samme rente-medvind: Højere
            renter på reserver giver bedre investerings-resultat. Stabilt
            udbytte og en defensiv profil har også hjulpet i et uroligt marked.
          </StockBlock>

          <StockBlock name="DSV" returnLabel="+9%">
            Den største enkelt-vægt i C25 i dag (15,5% per Nasdaq-factsheet
            31. marts 2026) - men på 5 år har den kun leveret +9%. På en
            periode hvor S&P 500 er steget 79%, er det reelt en
            undervægtshistorie der gemmer sig i toppen af tabellen.
          </StockBlock>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed mt-4">
            Kilde: Yahoo Finance via yfinance, dividend-justerede priser fra
            26. maj 2021 til 27. maj 2026. Sydbank, der også er i C25, er
            ikke tilgængelig på Yahoo Finance og indgår derfor ikke i listen.
          </p>
        </section>

        {/* Section 5: Kapitalflows */}
        <section className="mb-12">
          <SectionHeader n={5} title="Var det udlændinge der dumpede danske aktier?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            En udbredt fortælling blandt analytikere er, at udenlandske
            investorer har solgt danske aktier i stor stil siden Novo Nordisk
            toppede i sommeren 2024 (aktien er faldet 72% fra toppen på 1.028
            DKK den 25. juni 2024 til 290 DKK den 27. maj 2026). Det er en
            umiddelbart indlysende forklaring på C25's stilstand. Men
            Nationalbankens egne tal viser en mere nuanceret historie.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 mb-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Kapitalflows januar - oktober 2025 (10 måneder)
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-3">Strøm</th>
                  <th className="pb-2 text-right">Beløb (mia. DKK)</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-300">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-3">Udlændinges salg af Novo Nordisk B</td>
                  <td className="py-2 text-right tabular-nums text-red-600 dark:text-red-400 font-semibold">-36</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-3">Udlændinges køb af Ørsted</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">+38</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-3 font-semibold">Udlændinges samlede nettokøb af danske aktier</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">+6</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-3">Danske investorers køb af udenlandske aktier</td>
                  <td className="py-2 text-right tabular-nums text-gray-700 dark:text-gray-300 font-semibold">+131</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 text-xs text-gray-500 dark:text-gray-400">Udlændinges samlede beholdning af danske aktier (okt 2025)</td>
                  <td className="py-2 text-right tabular-nums text-xs text-gray-500 dark:text-gray-400">2.049</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
              Kilde: Nationalbanken, "Store køb af udenlandske aktier i 2025",
              publiceret 28. november 2025.
            </p>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Det er ikke en bred udenlandsk flugt fra det danske aktiemarked.
            Det er et koncentreret Novo-frasalg kombineret med massivt køb af
            Ørsted - faktisk så meget, at Ørsted-købet på 38 mia. DKK alene
            opvejer Novo-salget på 36 mia. DKK. Trods salget ejer udlændinge
            stadig 77% af Novo Nordisk.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Den større flow-historie er endda omvendt af det, man hører i
            medierne: Danske pensions- og forsikringsselskaber har roteret ud
            af danske aktier og ind i globale, med en størrelse (131 mia. DKK)
            der overskygger udlændinges Novo-salg.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Det er en vigtig korrektion af den populære fortælling. C25's
            underperformance er ikke i hovedsagen et flow-problem. Det er et
            struktur-problem (sektorsammensætning, koncentration, manglende
            mega-cap tech) og et pris-problem på enkelt-aktier (Novo, Ørsted
            og et par sundheds-tabere har leveret store kurs-fald). Hvis
            udlændinge generelt havde dumpet danske aktier, ville vindere
            som NKT (+320%) og Danske Bank (+299%) være ramt af samme flow.
            Det har de ikke været.
          </p>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
            Forbehold: Datadækningen er kun de første 10 måneder af 2025.
            Tallene for Q4 2025 og 2026 kan have set anderledes ud, men der
            findes endnu ikke offentlig statistik for perioden. Bloomberg har
            rapporteret, at den danske krone svækkedes i februar 2026 efter
            Novo Nordisks skuffende fase 3-resultater, hvilket antyder
            fortsat udgangspres - men konkrete flow-data foreligger ikke.
          </p>
        </section>

        {/* Section 6: Strukturelle årsager */}
        <section className="mb-12">
          <SectionHeader n={6} title="Hvorfor er C25 strukturelt fanget?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Selv hvis vi tager den 5-årige underperformance med et gran salt
            (timing er aldrig perfekt), er der strukturelle grunde til, at C25
            har svært ved at følge med globale indekser.
          </p>
          <ol className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed list-decimal pl-6 mb-4">
            <li>
              <strong>Den historiske kvalitetspræmie er under afvikling.</strong>{" "}
              Danske aktier har i mange år ofte handlet til en præmie i forhold
              til både europæiske og nordiske peers. Forklaringen var stabile
              udbytter, høj corporate governance og en sundhedssektor i
              verdensklasse. Den status er over de sidste 5 år blevet udfordret
              af rentestigningers pres på defensive "dyre" aktier og af konkrete
              skuffelser i sundhedssektoren. Selv hvis indtjeningen havde været
              uændret, ville lavere multipler alene have kostet C25 markant.
            </li>
            <li>
              <strong>Ingen tech-eksponering.</strong> Mens S&P 500 har cirka
              32% i Information Technology, drevet af mega-cap tech-relaterede
              selskaber som Apple, Microsoft, Nvidia, Alphabet, Amazon og Meta,
              har C25 nu 0% i tech. Netcompany var den sidste danske tech-aktie
              og faldt ud af indekset i perioden. Der findes simpelthen ikke
              danske mega-cap tech-selskaber på Nasdaq Copenhagen.
            </li>
            <li>
              <strong>Healthcare-overvægt giver koncentrationsrisiko.</strong>{" "}
              Sundhedssektoren udgør cirka 33% af C25 i dag - og var 47% for
              5 år siden. Når denne sektor presses (som i 2023-2024), presses
              hele indekset. Det er bygget ind i indekset, ikke et midlertidigt
              forhold.
            </li>
            <li>
              <strong>Eksponering til den "forkerte" del af den grønne
              omstilling.</strong> Ørsted (offshore-udvikler) tabte 82%, Vestas
              (turbinefabrikant) tabte 24%. Til gengæld vandt NKT
              (kabelinfrastruktur) 320%. C25 har desværre meget mere kapital i
              loser-segmenterne end i winner-segmenterne, og selv en stærk
              NKT-stigning kan ikke kompensere for vægten i Ørsted.
            </li>
            <li>
              <strong>Eksport-tung sammensætning.</strong> Mange C25-selskaber
              afhænger af globale slutmarkeder (Pandora, Mærsk, Coloplast, GN,
              Carlsberg). Det betyder, at DKK-styrke gør produkter dyrere ude
              og spiser margins.
            </li>
            <li>
              <strong>Koncentration på få sektorer.</strong> Sundhed + Industri
              + Finans udgør 78% af indekset. Tre sektorer afgør hele markedets
              retning.
            </li>
          </ol>
        </section>

        {/* Section 7: Hvad skal der til */}
        <section className="mb-12">
          <SectionHeader n={7} title="Hvad skal der til, for at C25 stiger igen?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Tre ting kan vende billedet, hver med forskellige sandsynligheder.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">Sundheds-recovery (mest sandsynligt)</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Coloplast, GN, Demant og Ambu handler alle til historisk lave
            multipler. En genopretning til 2021-vurderinger ville flytte
            indekset materielt. Drivere kunne være: Kina-stabilisering for
            Coloplast, OTC-konkurrence der viser sig mindre alvorlig end
            frygtet, eller bare basis-effekter når sammenligningerne bliver
            lettere.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">Grøn comeback (mellem-sandsynligt)</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Ørsted handler nu til mere end 80% under sin top. Hvis renterne
            falder, og hvis offshore-vind-økonomien bedrer sig (større
            turbiner, bedre placeringer), kan aktien levere et stort comeback.
            Men en del af tabet er reelt: Nogle US-projekter er væk for altid.
            Vestas er i bedre form, men også sårbar.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">Bank-fortsættelse (usandsynligt)</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Bankerne har båret en stor del af indekset i 5 år drevet af
            rentestigningen fra -0,5% til 4% i 2022-2023. Cyklen er nu vendt:
            ECB har skåret deposit-renten ned til 2%, og markedet priser ingen
            yderligere cuts ind i 2026 - reelt en mulig ny stigning i 2027.
            Bank-tailwind'en fra rentehævningerne er allerede høstet, og det
            er svært at se Danske Bank levere endnu +299% fra her. Mere
            realistisk: Bank-bidraget bliver fladt fremover.
          </p>

          <InfoBox>
            <strong>Den ærlige risiko:</strong> hvis bankernes rente-tema
            vender til modvind, og sundheds-recovery udebliver, kan C25 godt
            have endnu 2-3 år med negativt afkast foran sig. Det er ikke et
            katastrofescenarie, det er bare matematik.
          </InfoBox>
        </section>

        {/* Section 8: Konklusion */}
        <section className="mb-12">
          <SectionHeader n={8} title="Konklusion" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            C25 er endt cirka 2% lavere over 5 år, mens peer-indekser har
            leveret 40-79%. Det er ikke ét enkelt selskabs skyld. Det er
            kombinationen af et par store enkelt-aktie-kollaps (Ørsted, GN,
            Ambu, Coloplast), en sundhedssektor der bredt er blevet ramt af
            re-rating, og en sektor-sammensætning der mangler de
            vækst-segmenter (tech) der har drevet andre markeder.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Den dramatiske skift i indeksets vægte fortæller historien:
            finanssektoren er tredoblet i indeks-vægt fra 5% til 17%,
            sundhedssektoren er skrumpet fra 47% til 33%, og
            tech-eksponeringen er forsvundet helt. Det er ikke design - det
            er resultatet af at bankerne har leveret massive afkast mens
            andet er kollapset.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Hvis du har haft eksponering til C25 (via passiv indeksinvestering
            eller danske enkelt-aktier) primært, er det værd at spørge: Hvor
            kompenserer din portefølje for de strukturelle skævheder her? Hvis
            ikke, kan det give mening at supplere med en global aktiefond. Der
            er ingen lov der siger at hjemmemarkedet skal være kernen i ens
            portefølje, slet ikke når det udgør cirka 0,5% af det globale
            aktiemarked.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det positive: Aktier handler altid på fremtidige forventninger,
            ikke historiske tabeller. Hvis sundhedsaktierne er overdrevet ramt,
            hvis Ørsted finder bunden, og hvis bank-renterne ikke kollapser
            brutalt, kan C25 sagtens levere de næste 5 år bedre end de seneste
            5. Det er den tese, du som investor må vurdere.
          </p>
        </section>

        {/* Feedback widget */}
        <FeedbackWidget pageType="analysis" pageId={SLUG} />

        {/* Related */}
        <RelatedAnalyses currentSlug={SLUG} />

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Kilder:</strong> Yahoo Finance via yfinance (aktie- og
            indeks-afkast), officielle Nasdaq Index factsheets (sektor-vægte),
            Nationalbanken (kapitalflows). <strong>Ansvarsfraskrivelse:</strong>{" "}
            Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Historisk afkast er ikke en garanti for
            fremtidigt afkast. Foretag altid din egen analyse, og søg
            professionel rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  28. maj 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default C25AnalysisPage;
