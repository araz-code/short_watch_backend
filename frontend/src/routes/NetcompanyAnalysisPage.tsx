import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import RelatedAnalyses from "../components/RelatedAnalyses";
import FeedbackWidget from "../components/FeedbackWidget";
import { trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TooltipContentProps } from "recharts/types/component/Tooltip";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

// ─── types ───────────────────────────────────────────────────────────────────
interface ChartPoint {
  date: string;
  short: number;
  close: number | null;
  volume: number | null;
}

interface SellerPoint {
  date: string;
  value: number;
}

interface SellerSeries {
  name: string;
  data: SellerPoint[];
  latest: number;
}

interface PieSlice {
  name: string;
  value: number;
}

// ─── static data ────────────────────────────────────────────────────────────
// Aggregeret short-interesse vs. lukkekurs (månedlig nedsampling af
// Finanstilsynets indberetninger). Kilde: Ziriums egne data.
const FULL_HISTORY: ChartPoint[] = [
  { date: "2023-11-30", short: 9.58, close: 218.9, volume: 247311 },
  { date: "2023-12-31", short: 8.87, close: 225.6, volume: 96992 },
  { date: "2024-01-31", short: 9.03, close: 276.2, volume: 202464 },
  { date: "2024-02-29", short: 5.87, close: 295.2, volume: 152550 },
  { date: "2024-03-31", short: 5.05, close: 285.0, volume: 67408 },
  { date: "2024-04-30", short: 4.70, close: 255.6, volume: 186718 },
  { date: "2024-05-31", short: 4.76, close: 300.8, volume: 211200 },
  { date: "2024-06-30", short: 4.44, close: 298.8, volume: 88698 },
  { date: "2024-07-31", short: 4.28, close: 293.4, volume: 55948 },
  { date: "2024-08-31", short: 3.52, close: 305.8, volume: 100263 },
  { date: "2024-09-30", short: 2.97, close: 307.8, volume: 80808 },
  { date: "2024-10-31", short: 2.56, close: 326.0, volume: 442948 },
  { date: "2024-11-30", short: 2.59, close: 351.6, volume: 65179 },
  { date: "2024-12-31", short: 2.61, close: 339.0, volume: 63128 },
  { date: "2025-01-31", short: 4.07, close: 294.0, volume: 83231 },
  { date: "2025-02-28", short: 4.95, close: 295.0, volume: 224967 },
  { date: "2025-03-31", short: 4.48, close: 257.2, volume: 97033 },
  { date: "2025-04-30", short: 4.38, close: 295.0, volume: 119565 },
  { date: "2025-05-31", short: 3.74, close: 304.6, volume: 235492 },
  { date: "2025-06-30", short: 3.32, close: 270.0, volume: 96685 },
  { date: "2025-07-31", short: 3.17, close: 241.4, volume: 71479 },
  { date: "2025-08-31", short: 3.90, close: 243.0, volume: 88326 },
  { date: "2025-09-30", short: 4.01, close: 241.6, volume: 152447 },
  { date: "2025-10-31", short: 4.58, close: 323.6, volume: 441054 },
  { date: "2025-11-30", short: 4.31, close: 323.2, volume: 121439 },
  { date: "2025-12-19", short: 4.31, close: 345.6, volume: 180717 },
  { date: "2026-01-31", short: 5.19, close: 332.6, volume: 65973 },
  { date: "2026-02-28", short: 6.37, close: 323.2, volume: 103512 },
  { date: "2026-03-31", short: 6.37, close: 390.6, volume: 197691 },
  { date: "2026-04-30", short: 6.11, close: 361.2, volume: 117291 },
  { date: "2026-05-31", short: 7.20, close: 343.4, volume: 181079 },
];

const RECENT: ChartPoint[] = FULL_HISTORY.filter((d) => d.date >= "2025-08-31");

const SELLERS: SellerSeries[] = [
  {
    name: "BlackRock",
    latest: 0,
    data: [
      { date: "2021-11-18", value: 0.65 }, { date: "2022-05-11", value: 1.52 },
      { date: "2022-05-23", value: 1.96 }, { date: "2022-09-15", value: 1.31 },
      { date: "2022-12-14", value: 1.94 }, { date: "2023-05-11", value: 2.51 },
      { date: "2023-09-21", value: 3.25 }, { date: "2023-11-09", value: 3.50 },
      { date: "2024-01-17", value: 3.72 }, { date: "2024-02-22", value: 2.39 },
      { date: "2024-02-27", value: 0.41 }, { date: "2025-04-11", value: 0.52 },
      { date: "2025-05-13", value: 0.49 },
    ],
  },
  {
    name: "Fosse Capital",
    latest: 0.99,
    data: [
      { date: "2023-10-26", value: 0.50 }, { date: "2023-11-03", value: 1.63 },
      { date: "2024-09-27", value: 1.45 }, { date: "2025-04-17", value: 1.50 },
      { date: "2025-07-29", value: 1.40 }, { date: "2025-12-03", value: 1.38 },
      { date: "2025-12-09", value: 1.19 }, { date: "2026-04-16", value: 1.03 },
      { date: "2026-04-17", value: 0.99 },
    ],
  },
  {
    name: "Citadel Advisors",
    latest: 0.59,
    data: [
      { date: "2023-07-18", value: 0.51 }, { date: "2023-08-18", value: 0.70 },
      { date: "2023-09-01", value: 0.49 }, { date: "2026-04-10", value: 0.52 },
      { date: "2026-04-29", value: 0.70 }, { date: "2026-05-08", value: 0.84 },
      { date: "2026-05-12", value: 0.79 }, { date: "2026-05-22", value: 0.66 },
      { date: "2026-05-29", value: 0.59 },
    ],
  },
  {
    name: "J.P. Morgan AM",
    latest: 0,
    data: [
      { date: "2025-01-30", value: 0.50 }, { date: "2025-02-14", value: 0.95 },
      { date: "2025-05-13", value: 0.86 }, { date: "2025-05-14", value: 0.61 },
      { date: "2025-06-05", value: 0.34 },
    ],
  },
  {
    name: "Capeview Capital",
    latest: 0,
    data: [
      { date: "2022-07-06", value: 0.51 }, { date: "2022-10-14", value: 0.81 },
      { date: "2022-11-07", value: 0.49 },
    ],
  },
];

const PIE_DATA: PieSlice[] = [
  { name: "Fosse Capital", value: 0.99 },
  { name: "Citadel Advisors", value: 0.59 },
  { name: "Under 0,50% (ukendte)", value: 5.62 },
];

const PIE_COLORS = ["#4361ee", "#2a9d8f", "#d4d4d8"];

const SELLER_COLORS = ["#e63946", "#4361ee", "#2a9d8f", "#f77f00", "#9b5de5"];

// ─── tooltip ────────────────────────────────────────────────────────────────
function ShortPriceTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const shortVal = payload.find((p) => p.dataKey === "short");
  const priceVal = payload.find((p) => p.dataKey === "close");
  const volVal = payload.find((p) => p.dataKey === "volume");
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">{String(label)}</p>
      {shortVal && <p className="text-center font-bold text-lg tabular-nums text-[#007AFF]">{Number(shortVal.value).toFixed(2)}%</p>}
      {priceVal && priceVal.value != null && <p className="text-center text-purple-500 dark:text-purple-400 tabular-nums">{Number(priceVal.value).toFixed(1)} DKK</p>}
      {volVal && volVal.value != null && Number(volVal.value) > 0 && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 tabular-nums">Vol: {Number(volVal.value).toLocaleString("da-DK")}</p>
      )}
    </div>
  );
}

// ─── format helpers ─────────────────────────────────────────────────────────
function fmtDate(d: string) {
  const parts = d.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${parseInt(parts[2])}. ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
}

function fmtShortDate(d: string) {
  const parts = d.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
}

function KPI({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-center">
      <p className="text-lg sm:text-xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function TimelineEvent({ date, title, children, color }: { date: string; title: string; children: React.ReactNode; color: string }) {
  return (
    <div className="relative pl-8 pb-8 last:pb-0 group">
      <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0d0d12] z-10" style={{ backgroundColor: color }} />
      <div className="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 group-last:hidden" />
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{date}</p>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-1.5">{title}</h4>
      <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

function SellerRow({ name, position, date, desc, i }: { name: string; position: string; date: string; desc: string; i: number }) {
  return (
    <tr className={i % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50/50 dark:bg-[#15151a]"}>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{name}</td>
      <td className="px-4 py-3 text-sm tabular-nums font-semibold text-red-500">{position}</td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">{date}</td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">{desc}</td>
    </tr>
  );
}

// ─── main component ─────────────────────────────────────────────────────────
const NetcompanyAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/netcompany", "netcompany_analysis");
    fetch(`${HOST}/stats/visit/netcompany-analysis/`).catch(() => {});
  }, []);

  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const getChartHeight = useCallback(() => (window.innerWidth < 640 ? 220 : 320), []);
  const [chartHeight, setChartHeight] = useState(getChartHeight);
  useEffect(() => {
    const h = () => setChartHeight(getChartHeight());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [getChartHeight]);

  const gridColor = isDark ? "#2a2a35" : "#f0f0f0";
  const tickColor = isDark ? "#999" : "#888";

  const allSellerDates = [...new Set(SELLERS.flatMap((s) => s.data.map((d) => d.date)))].sort();
  const sellerChartData = allSellerDates.map((date) => {
    const row: Record<string, string | number | null> = { date };
    SELLERS.forEach((s) => {
      const pt = s.data.find((d) => d.date === date);
      row[s.name] = pt ? pt.value : null;
    });
    return row;
  });

  return (
    <PageTemplate>
      <title>Zirium | Netcompany (NETC) - Shortanalyse</title>
      <meta name="description" content="Dybdegående analyse af short-positioner i Netcompany (NETC). Shorterne dækkede gennem 2024-rallyet, og en ny bølge bygger nu mod en P/E på 70." />
      <meta property="og:title" content="Shortanalyse: Shorterne der dækkede, og dem der kom tilbage" />
      <meta property="og:description" content="Dybdegående analyse af short-positioner i Netcompany (NETC). Shorterne dækkede gennem 2024-rallyet, og en ny bølge bygger nu mod en P/E på 70." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/netcompany/2026-06-05" />
      <meta property="og:image" content="https://www.zirium.dk/og-images/netcompany-2026-06-05.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Shortanalyse: Shorterne der dækkede, og dem der kom tilbage" />
      <meta name="twitter:description" content="Dybdegående analyse af short-positioner i Netcompany (NETC). Shorterne dækkede gennem 2024-rallyet, og en ny bølge bygger nu mod en P/E på 70." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/netcompany-2026-06-05.png" />
      <link rel="canonical" href="https://www.zirium.dk/analyse/netcompany/2026-06-05" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Shortanalyse: Shorterne der dækkede, og dem der kom tilbage",
        "description": "Dybdegående analyse af short-positioner i Netcompany (NETC). Shorterne dækkede gennem 2024-rallyet, og en ny bølge bygger nu mod en P/E på 70.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-06-05",
        "dateModified": "2026-06-05",
        "image": "https://www.zirium.dk/og-images/netcompany-2026-06-05.png",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/netcompany/2026-06-05",
        "inLanguage": "da",
      })}</script>

      <article className="w-full max-w-[900px] mx-auto px-5 sm:px-8 pb-10 sm:pb-16">
        <button
          className="text-blue-500 hover:text-blue-700 bg-transparent border-none text-base inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm min-h-[44px] min-w-[44px]"
          onClick={() => {
            if (window.history.length > 1 && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate("/analyse");
            }
          }}
        >
          <span aria-hidden="true">←</span>
          {t("Back")}
        </button>

        {/* ── Header ── */}
        <header className="mb-10 mt-4">
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-1">Analyse lavet af Araz Bayat Makoo (Zirium) - 5. juni 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Shortanalyse: Shorterne der dækkede, og dem der kom tilbage
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Netcompany Group (NETC)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Netcompany er en af de mest fascinerende short-historier på det danske marked, fordi den
            har to akter. Short-sælgerne sad med næsten 10% af aktien i bunden i 2023, kapitulerede
            gennem hele 2024-rallyet, og er nu vendt tilbage med en ny bølge, mens aktien handler til
            en P/E omkring 70. Denne analyse kombinerer udviklingen i short-positionerne med selskabets
            rejse fra pandemi-darling til opkøbsdrevet vækstcase.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="7,20%" label="Short-interesse (31. maj 2026)" />
          <KPI value="343,40 DKK" label="Seneste lukkekurs (31. maj)" />
          <KPI value="10,17%" label="Peak short (6. nov. 2023, kursbund)" />
          <KPI value="~70" label="P/E (markedet priser høj vækst)" />
        </div>

        {/* ── 1. Overordnet billede ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overordnet billede</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Netcompany bygger forretningskritiske it-løsninger, primært til den offentlige sektor i
            Danmark, Norge, Storbritannien, Holland og Grækenland (gennem det tidligere Intrasoft).
            Det er en model med høj sigtbarhed og lange kontrakter, men også med en hård binding mellem
            antal konsulenttimer og omsætning. Netop derfor er aktien blevet et yndet mål for
            hedgefonde, der både har spekuleret i værdiansættelsen og i marginpres.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Den aktuelle short-interesse er 7,2% per 31. maj 2026, op fra under 3% i efteråret 2024.
            Det interessante er rejsen dertil: shorten toppede på 10,17% i bunden i november 2023, faldt
            stort set lineært til 2,56% gennem 2024 i takt med at kursen næsten fordoblede sig, og er nu
            på vej op igen. Det er ikke den samme historie som de fleste danske shortcases, hvor shorten
            følger en aktie ned. Her dækkede shorterne ind i et rally, og en ny gruppe er kommet tilbage,
            efter at aktien er steget.
          </p>
        </section>

        {/* ── Chart 1: Full history ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short-interesse vs. aktiekurs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Historik siden november 2023. Blå = short-interesse, lilla = lukkekurs.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse vs. aktiekurs for Netcompany siden november 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FULL_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="netcShortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="40%" stopColor="#007AFF" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                  <filter id="netcGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 11]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={["dataMin - 20", "dataMax + 20"]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#netcShortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2, filter: "url(#netcGlow)" }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
                <ReferenceLine yAxisId="short" y={10.17} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Peak (10,17%)</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            Grafen fortæller hele historien. Læg mærke til den næsten perfekte spejling i 2024: i takt med
            at den lilla kurslinje steg fra cirka 205 til over 350, faldt den blå short-linje fra knap 10%
            til under 3%. Shorterne tog tab og lukkede positioner. Fra starten af 2026 vender mønstret:
            short-interessen stiger igen, selv mens kursen ligger højt.
          </p>
        </section>

        {/* ── 2. Baggrund ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Fra pandemi-darling til 75% fald</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Netcompany blev børsnoteret i juni 2018 til cirka 155 DKK per aktie. Under pandemien blev
            selskabet en af Københavnsbørsens mest hypede vækstaktier, drevet af en bølge af offentlig
            digitalisering, og toppede den 23. august 2021 i 861,60 DKK. På det tidspunkt handlede aktien
            til en værdiansættelse, der forudsatte mange år med høj, profitabel vækst.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            To ting brød historien. For det første ramte rentestigningerne i 2022 alle højt prissatte
            vækstaktier hårdt, og en P/E i 40'erne blev pludselig svær at forsvare. For det andet kom der
            pres på indtjeningen: efter opkøbet af græske Intrasoft i 2021 og en aggressiv opbygning af
            kapacitet i blandt andet Storbritannien steg omkostningerne hurtigere end indtjeningen.
            Nettomarginen faldt fra cirka 11% i 2022 til omkring 5% i 2023, og indtjeningen per aktie blev
            mere end halveret fra 12,27 til 6,13 DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Resultatet var et fald på over 75% fra toppen. Aktien fandt bunden omkring 200-220 DKK i
            efteråret 2023, og det var præcis her, short-interessen toppede. Da skepsissen var størst,
            sad shorterne med over 10% af aktien.
          </p>
        </section>

        {/* ── 3. 2023-2024 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. 2023-2024: Toppen i short, så kapitulationen</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den dominerende short-sælger i denne periode var BlackRock, der byggede sin position støt op
            fra 0,65% i slutningen af 2021 til hele 3,72% i januar 2024, den klart største enkeltposition
            i aktien nogensinde. På toppen var der op mod ti forskellige fonde med positioner over 0,50%.
            Konsensus blandt shorterne var, at den lave margin var strukturel, og at vækstpræmien skulle
            væk.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            De tog fejl, i hvert fald på den korte bane. Hen over 2024 viste Netcompany stærk ordretilgang
            og begyndte at genoprette marginen. Aktien steg fra cirka 205 DKK til over 350 DKK i løbet af
            året. For shorterne var det smerteligt, og de reagerede ved at dække: BlackRock skar sin
            position fra 3,72% til 0,41% på få dage i slutningen af februar 2024, og den samlede
            short-interesse faldt til bunden på 2,56% i oktober 2024.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det er en vigtig lektie i selve mekanikken: en faldende short-interesse er ikke i sig selv et
            købssignal. Her faldt den, fordi shorterne tabte og blev tvunget eller valgte at lukke, ikke
            fordi risikoen i selskabet var forsvundet.
          </p>
        </section>

        {/* ── Chart 2: Recent ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. Den nye bølge i detaljer</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Short-interesse med volumen siden august 2025. Opbygningen fra cirka 3% til 7,2% ses tydeligt.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse med volumen for Netcompany siden august 2025">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={RECENT} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="netcShortGradR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(d) => { const p = d.split("-"); const m = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"]; return `${m[parseInt(p[1])-1]} '${p[0].slice(2)}`; }} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[2, 8]} />
                <YAxis yAxisId="vol" hide domain={[0, 1800000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#netcShortGradR)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volumen</span>
            </div>
          </div>
        </section>

        {/* ── 4. SDC / NBS ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. SDC-opkøbet: Vækst, der blev købt</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I februar 2025 indgik Netcompany aftale om at købe Skandinavisk Data Center (SDC) for cirka
            1,0 mia. DKK, og handlen blev gennemført den 1. juli 2025. SDC er en bankplatform, der leverer
            it-infrastruktur til en lang række nordiske banker, og forretningen blev omdøbt til Netcompany
            Banking Services (NBS). Opkøbet ventes at løfte indtjeningen per aktie fra 2026 og med tocifret
            procent fra 2028.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Opkøbet er centralt for at forstå tallene i 2026. NBS føjer en betydelig, men langsommere
            voksende, omsætning til regnskabet, og det er netop forskellen mellem den rapporterede og den
            organiske vækst, der er blevet et af de vigtigste stridspunkter mellem optimisterne og
            shorterne.
          </p>
        </section>

        {/* ── 5. Q1 2026 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Q1 2026: +38,7% på overfladen, skuffelse under</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den 6. maj 2026 offentliggjorde Netcompany sit Q1-regnskab. Overskriften var stærk: den
            samlede omsætning voksede 38,7% år til år. Men næsten hele forskellen kom fra NBS, der ikke
            indgik i sammenligningstallene for Q1 2025. Den organiske vækst var 13,1%, hvilket faktisk var
            over selskabets egen helårsguidance på 5-10% ekskl. NBS. Alligevel faldt aktien på dagen, fordi
            indtjeningen per aktie skuffede i forhold til forventningerne.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det vigtigste signal for bull-casen var marginguidancen. Netcompany guider en justeret
            EBITDA-margin ekskl. NBS på 17-20%, og ledelsen peger eksplicit på AI indlejret i metode og
            platforme som en del af forklaringen på den forbedrede leveranceeksekvering. Hvis det holder,
            er det den sjældne situation, hvor et konsulenthus delvist bryder den lineære binding mellem
            timer og indtjening.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det er præcis dette punkt, der gør Netcompany til en AI-historie med to fortolkninger. Det
            samme ord, AI, er både kernen i bull-casen (vi leverer billigere og med højere margin) og i
            bear-casen (generativ AI kan på sigt kommoditisere skræddersyet softwareudvikling og presse
            både priser og vækst). De stigende short-positioner tyder på, at en voksende gruppe vælger den
            anden fortolkning.
          </p>
        </section>

        {/* ── Sellers section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Hvem shorter Netcompany?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Det mest bemærkelsesværdige ved den aktuelle short på 7,2% er, hvor lidt af den der er synlig.
            Kun to sælgere er over indberetningstærsklen på 0,50%: Fosse Capital med 0,99% og Citadel
            Advisors med 0,59%. Tilsammen udgør de kun 1,58%. De resterende cirka 5,62% holdes af en
            række aktører, der hver især ligger under 0,50%, og hvis identitet derfor er ukendt. Bulken af
            væddemålet mod Netcompany er altså anonymt.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Aktive short-sælgere i Netcompany over 0,50%</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short-sælger</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dato</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Beskrivelse</th>
                </tr>
              </thead>
              <tbody>
                <SellerRow i={0} name="Fosse Capital Partners" position="0,99%" date="17. apr 2026" desc="Langvarig short. Toppede 1,63% i nov 2023. Reducerer nu gradvist." />
                <SellerRow i={1} name="Citadel Advisors LLC" position="0,59%" date="29. maj 2026" desc="Genindtrådt i april 2026. Toppede 0,84% den 8. maj, trimmer siden." />
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Positionsudvikling over tid</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Udvalgte short-sælgeres positioner baseret på indberetninger til Finanstilsynet. BlackRock var den historiske hvalros.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Udvalgte short-sælgeres positionsudvikling over tid for Netcompany">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={sellerChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 4]} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? "#19191f" : "#fff", border: "1px solid #e5e5e5", borderRadius: 12, fontSize: 12 }} formatter={(v, name) => [`${Number(v).toFixed(2)}%`, String(name)]} labelFormatter={(label) => fmtDate(String(label))} itemSorter={(a) => -(Number(a.value) || 0)} />
                <ReferenceLine y={0.5} stroke={isDark ? "#444" : "#ddd"} strokeDasharray="4 4" />
                {SELLERS.map((s, i) => (
                  <Line key={s.name} dataKey={s.name} type="monotone" stroke={SELLER_COLORS[i]} strokeWidth={1.8} dot={{ r: 2.5, fill: SELLER_COLORS[i], strokeWidth: 0 }} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} connectNulls />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              {SELLERS.map((s, i) => (
                <span key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: SELLER_COLORS[i] }} />{s.name}
                </span>
              ))}
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-8 mb-2">Fordeling af den samlede short-interesse</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Cirka 78% af short-interessen holdes af aktører under 0,50%-tærsklen, hvis identitet er ukendt.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 flex justify-center" role="img" aria-label="Cirkeldiagram: Fordeling af den samlede short-interesse i Netcompany">
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={110} innerRadius={55} dataKey="value" nameKey="name" paddingAngle={2} label={({ value }) => `${Number(value).toFixed(2)}%`} labelLine={{ stroke: isDark ? "#555" : "#ccc", strokeWidth: 1 }} style={{ fontSize: 11 }}>
                  {PIE_DATA.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} stroke={isDark ? "#19191f" : "#fff"} strokeWidth={2} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span className="text-gray-600 dark:text-gray-300">{value}</span>} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={{ backgroundColor: isDark ? "#19191f" : "#fff", border: "1px solid #e5e5e5", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">9. Tidslinje over nøglebegivenheder</h2>
          <div className="ml-2">
            <TimelineEvent date="Juni 2018" title="Børsnotering til cirka 155 DKK" color="#4361ee">
              <p>Netcompany blev noteret på Nasdaq Copenhagen. Selskabet var allerede dengang kendt for sin faste leverancemodel og sin dominans inden for offentlig digitalisering i Danmark.</p>
            </TimelineEvent>
            <TimelineEvent date="August 2021" title="All-time high: 861,60 DKK" color="#2a9d8f">
              <p>Pandemiens digitaliseringsbølge og opkøbet af græske Intrasoft gjorde Netcompany til en af børsens dyreste vækstaktier. Værdiansættelsen forudsatte mange år med høj, profitabel vækst.</p>
            </TimelineEvent>
            <TimelineEvent date="2022-2023" title="Rentestød og marginpres: -75%" color="#e63946">
              <p>Stigende renter ramte højt prissatte vækstaktier, og samtidig faldt nettomarginen fra cirka 11% til 5%, mens indtjeningen per aktie blev mere end halveret. Aktien faldt over 75% fra toppen.</p>
            </TimelineEvent>
            <TimelineEvent date="November 2023" title="Short-interessen topper på 10,17%" color="#e63946">
              <p>Da kursen bundede omkring 205 DKK, sad short-sælgerne med over 10% af aktien. BlackRock var den største med en position på vej mod 3,72%. Skepsissen var på sit højeste.</p>
            </TimelineEvent>
            <TimelineEvent date="Februar 2024" title="Kapitulationen begynder" color="#2a9d8f">
              <p>I takt med stærk ordretilgang og stigende kurs skar BlackRock sin position fra 3,72% til 0,41% på få dage. Det blev startskuddet til et bredt fald i short-interessen gennem 2024.</p>
            </TimelineEvent>
            <TimelineEvent date="Oktober 2024" title="Short-interessen bunder på 2,56%" color="#4361ee">
              <p>Aktien var steget til over 320 DKK, og short-interessen var faldet til sit laveste niveau. For en stund så det ud, som om shortcasen var død.</p>
            </TimelineEvent>
            <TimelineEvent date="1. juli 2025" title="SDC-opkøbet gennemføres" color="#4361ee">
              <p>Netcompany afsluttede købet af Skandinavisk Data Center for cirka 1,0 mia. DKK og omdøbte det til Netcompany Banking Services. Opkøbet føjer betydelig omsætning til regnskabet fra 2026.</p>
            </TimelineEvent>
            <TimelineEvent date="6. maj 2026" title="Q1 2026: Stærk vækst, men EPS-skuffelse" color="#e63946">
              <p>Samlet omsætningsvækst på 38,7% (drevet af NBS), organisk vækst på 13,1% over guidance, og marginguidance ekskl. NBS på 17-20% med AI som forklaring. Alligevel faldt aktien på en EPS-skuffelse. Short-interessen var på vej mod 7%.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* ── The core question ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Det centrale spørgsmål: Fortjener Netcompany en P/E på 70?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den nye bølge af shorts handler i sidste ende om værdiansættelsen. Med en P/E omkring 70 er der
            ingen fejlmargin. Bull-casen og bear-casen kredser om de samme to spørgsmål: Er væksten ægte og
            organisk, og er AI en medvind eller en trussel?
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Bull-casen</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Organisk vækst på 13,1% i Q1, over guidance</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Marginguidance opjusteret til 17-20% ekskl. NBS</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>AI sænker leveranceomkostningen og løfter marginen</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Klæbrige, langsigtede offentlige kontrakter</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>NBS er EPS-løftende fra 2026</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Bear-casen</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>De +38,7% er opkøbsdrevet, ikke organisk</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>P/E omkring 70 efterlader nul fejlmargin</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>AI kan kommoditisere skræddersyet udvikling for alle</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>EPS skuffede i Q1 trods omsætningsvækst</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Marginhistorikken viser, hvor hurtigt den kan falde</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Den ærlige syntese er, at marginopjusteringen viser, at AI hjælper omkostningssiden i dag, men
            den afgør ikke prissætnings- og efterspørgselssiden i morgen. Det er præcis dér, shorterne
            sigter. Marginopjusteringen siger, at optimisterne fører på point lige nu. De 7,2%, der nægter
            at forsvinde, siger, at kampen langtfra er afgjort.
          </p>
        </section>

        {/* ── Conclusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Konklusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Netcompany er en sjælden shortcase med to akter. I første akt sad shorterne med næsten 10% i
            bunden i 2023, fik undervurderet selskabets evne til at genoprette marginen, og kapitulerede
            gennem hele 2024-rallyet. Det er en påmindelse om, at en høj short-interesse ikke er en garanti
            for, at aktien falder, og at en faldende short-interesse ikke er et købssignal i sig selv.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I anden akt, som vi står midt i, er en ny gruppe kommet tilbage. Denne gang handler det mindre
            om marginpres og mere om værdiansættelse: en P/E omkring 70, en stor del af væksten købt via
            SDC, og et åbent spørgsmål om, hvad generativ AI gør ved konsulentmodellen på sigt. At næsten
            4/5 af short-interessen er anonym, under indberetningstærsklen, gør det svært at vide præcis,
            hvem der står bag, men retningen er tydelig: skepsissen vokser igen.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Kommende katalysatorer at holde øje med</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Organisk vækst vs. rapporteret vækst i de kommende kvartaler (NBS-effekten)</li>
              <li>&#x2022; Om den justerede EBITDA-margin ekskl. NBS faktisk lander i 17-20%</li>
              <li>&#x2022; Om short-interessen fortsætter op (overbevisning) eller vender (kapitulation)</li>
              <li>&#x2022; Nye navngivne sælgere over 0,50%, eller om Citadel og Fosse trimmer videre</li>
              <li>&#x2022; Konkrete beviser på, at AI løfter marginen i stedet for at presse priserne</li>
            </ul>
          </div>
        </section>

        <FeedbackWidget pageType="analysis" pageId="netcompany/2026-06-05" />
        <RelatedAnalyses currentSlug="netcompany/2026-06-05" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Data stammer fra Finanstilsynets offentlige registre og selskabets egne
            rapporter. Historisk afkast er ikke en garanti for fremtidigt afkast. Foretag altid din
            egen analyse, og søg professionel rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  5. juni 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default NetcompanyAnalysisPage;
