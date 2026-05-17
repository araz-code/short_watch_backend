import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import RelatedAnalyses from "../components/RelatedAnalyses";
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

// ─── static data (from database queries) ────────────────────────────────────
// Full history chart data (sampled weekly for performance)
const FULL_HISTORY: ChartPoint[] = [
  { date: "2023-11-06", short: 4.09, close: 291.2, volume: 257141 },
  { date: "2023-12-01", short: 3.89, close: 330.2, volume: 315124 },
  { date: "2024-01-15", short: 3.98, close: 434.0, volume: 201343 },
  { date: "2024-03-01", short: 2.83, close: 649.0, volume: 507164 },
  { date: "2024-05-13", short: 3.2, close: 618.5, volume: 422171 },
  { date: "2024-07-10", short: 2.68, close: 954.0, volume: 217950 },
  { date: "2024-09-01", short: 2.59, close: 886.5, volume: 3168434 },
  { date: "2024-11-13", short: 4.35, close: 816.0, volume: 179537 },
  { date: "2025-01-13", short: 5.46, close: 699.0, volume: 191860 },
  { date: "2025-02-13", short: 6.13, close: 748.5, volume: 191693 },
  { date: "2025-03-12", short: 5.43, close: 674.0, volume: 2633784 },
  { date: "2025-05-13", short: 8.34, close: 414.8, volume: 298781 },
  { date: "2025-06-20", short: 8.16, close: 374.7, volume: 937978 },
  { date: "2025-08-13", short: 7.88, close: 341.1, volume: 309469 },
  { date: "2025-09-15", short: 7.08, close: 428.7, volume: 335081 },
  { date: "2025-11-13", short: 5.56, close: 520.8, volume: 824938 },
  { date: "2025-12-11", short: 4.61, close: 514.2, volume: 366871 },
  { date: "2026-01-13", short: 5.87, close: 410.0, volume: 240218 },
  { date: "2026-02-13", short: 5.87, close: 399.7, volume: 502819 },
  { date: "2026-02-19", short: 6.37, close: 382.8, volume: 694487 },
  { date: "2026-03-06", short: 6.51, close: 234.9, volume: 3348855 },
  { date: "2026-03-09", short: 7.58, close: 255.8, volume: 1213156 },
  { date: "2026-03-13", short: 6.87, close: 268.2, volume: 463933 },
  { date: "2026-03-19", short: 7.15, close: 279.7, volume: 347672 },
  { date: "2026-03-24", short: 7.60, close: 280.5, volume: 325358 },
  { date: "2026-03-31", short: 7.87, close: 295.0, volume: 238330 },
  { date: "2026-04-07", short: 8.13, close: 276.9, volume: 395681 },
  { date: "2026-04-09", short: 8.35, close: 296.8, volume: 244036 },
  { date: "2026-04-14", short: 8.38, close: 296.5, volume: 276889 },
  { date: "2026-04-16", short: 8.60, close: 315.0, volume: 346500 },
  { date: "2026-04-21", short: 8.51, close: 300.8, volume: 320692 },
  { date: "2026-04-23", short: 8.63, close: 305.3, volume: 259994 },
  { date: "2026-04-28", short: 8.83, close: 309.0, volume: 774410 },
  { date: "2026-04-30", short: 9.44, close: 299.4, volume: 604156 },
  { date: "2026-05-03", short: 9.62, close: 309.0, volume: 253013 },
  { date: "2026-05-05", short: 9.56, close: 305.5, volume: 331641 },
  { date: "2026-05-06", short: 9.67, close: 315.2, volume: 448979 },
  { date: "2026-05-07", short: 9.74, close: 345.0, volume: 1087018 },
  { date: "2026-05-08", short: 10.02, close: 341.2, volume: 510653 },
  { date: "2026-05-11", short: 9.97, close: 346.6, volume: 479766 },
  { date: "2026-05-12", short: 10.13, close: 336.0, volume: 351675 },
  { date: "2026-05-13", short: 10.13, close: null, volume: null },
];

const RECENT_3M: ChartPoint[] = FULL_HISTORY.filter(
  (d) => d.date >= "2026-02-13"
);

// Seller announcement timelines (active in 2026)
const SELLERS: SellerSeries[] = [
  {
    name: "Marshall Wace",
    latest: 1.28,
    data: [
      { date: "2021-12-02", value: 0.5 }, { date: "2025-04-29", value: 0.7 },
      { date: "2025-05-28", value: 0.93 }, { date: "2025-07-07", value: 0.44 },
      { date: "2026-03-04", value: 0.98 }, { date: "2026-03-10", value: 1.42 },
      { date: "2026-03-27", value: 1.39 }, { date: "2026-04-09", value: 1.29 },
      { date: "2026-04-17", value: 1.29 }, { date: "2026-04-22", value: 1.29 },
      { date: "2026-05-04", value: 1.29 }, { date: "2026-05-05", value: 1.31 },
      { date: "2026-05-07", value: 1.28 },
    ],
  },
  {
    name: "Voleon Capital",
    latest: 1.0,
    data: [
      { date: "2021-11-25", value: 0.5 }, { date: "2026-03-09", value: 0.63 },
      { date: "2026-03-19", value: 0.7 }, { date: "2026-04-01", value: 0.81 },
      { date: "2026-05-06", value: 0.9 }, { date: "2026-05-12", value: 1.0 },
    ],
  },
  {
    name: "AHL Partners",
    latest: 0.91,
    data: [
      { date: "2026-01-07", value: 0.5 }, { date: "2026-02-27", value: 0.7 },
      { date: "2026-03-06", value: 0.8 }, { date: "2026-03-11", value: 0.91 },
      { date: "2026-03-17", value: 1.03 }, { date: "2026-03-20", value: 1.11 },
      { date: "2026-04-08", value: 1.2 }, { date: "2026-04-09", value: 1.19 },
      { date: "2026-04-20", value: 1.08 }, { date: "2026-04-24", value: 0.97 },
      { date: "2026-04-29", value: 0.87 }, { date: "2026-05-08", value: 0.91 },
    ],
  },
  {
    name: "Connor Clark & Lunn",
    latest: 0.8,
    data: [
      { date: "2026-01-21", value: 0.51 }, { date: "2026-03-05", value: 0.6 },
      { date: "2026-03-10", value: 0.58 }, { date: "2026-03-13", value: 0.6 },
      { date: "2026-03-23", value: 0.71 }, { date: "2026-04-29", value: 0.8 },
    ],
  },
  {
    name: "Jupiter Asset Mgmt",
    latest: 0.7,
    data: [
      { date: "2025-06-19", value: 0.51 }, { date: "2026-03-10", value: 0.62 },
      { date: "2026-03-13", value: 0.7 },
    ],
  },
  {
    name: "Citadel Advisors",
    latest: 0.63,
    data: [
      { date: "2025-08-08", value: 0.5 }, { date: "2025-11-14", value: 0.5 },
      { date: "2026-04-16", value: 0.52 }, { date: "2026-04-24", value: 0.61 },
      { date: "2026-04-30", value: 0.73 }, { date: "2026-05-05", value: 0.58 },
      { date: "2026-05-06", value: 0.6 }, { date: "2026-05-07", value: 0.7 },
      { date: "2026-05-08", value: 0.66 }, { date: "2026-05-11", value: 0.71 },
      { date: "2026-05-12", value: 0.63 },
    ],
  },
  {
    name: "Jennison Associates",
    latest: 0.61,
    data: [
      { date: "2026-04-13", value: 0.59 }, { date: "2026-04-14", value: 0.61 },
    ],
  },
  {
    name: "D. E. Shaw & Co.",
    latest: 0.5,
    data: [
      { date: "2024-12-23", value: 0.52 }, { date: "2026-03-09", value: 0.49 },
      { date: "2026-05-12", value: 0.5 },
    ],
  },
];

const PIE_DATA: PieSlice[] = [
  { name: "Marshall Wace", value: 1.28 },
  { name: "Voleon Capital", value: 1.0 },
  { name: "AHL Partners", value: 0.91 },
  { name: "Connor Clark & Lunn", value: 0.8 },
  { name: "Jupiter Asset Mgmt", value: 0.7 },
  { name: "Citadel Advisors", value: 0.63 },
  { name: "Jennison Associates", value: 0.61 },
  { name: "D. E. Shaw & Co.", value: 0.5 },
  { name: "Under 0,50% (ukendte)", value: 3.7 },
];

const PIE_COLORS = [
  "#e63946", "#4361ee", "#2a9d8f", "#f77f00", "#9b5de5",
  "#00bbf9", "#f15bb5", "#6c757d", "#d4d4d8",
];

const SELLER_COLORS = [
  "#e63946", "#4361ee", "#2a9d8f", "#f77f00", "#9b5de5",
  "#00bbf9", "#f15bb5", "#6c757d",
];

// ─── tooltip components ──────────────────────────────────────────────────────
function ShortPriceTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const shortVal = payload.find((p) => p.dataKey === "short");
  const priceVal = payload.find((p) => p.dataKey === "close");
  const volVal = payload.find((p) => p.dataKey === "volume");
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-400 dark:text-gray-400 text-center mb-1">{String(label)}</p>
      {shortVal && <p className="text-center font-bold text-lg tabular-nums text-[#007AFF]">{Number(shortVal.value).toFixed(2)}%</p>}
      {priceVal && priceVal.value != null && <p className="text-center text-purple-500 dark:text-purple-400 tabular-nums">{Number(priceVal.value).toFixed(1)} DKK</p>}
      {volVal && volVal.value != null && Number(volVal.value) > 0 && (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 tabular-nums">Vol: {Number(volVal.value).toLocaleString("da-DK")}</p>
      )}
    </div>
  );
}

// ─── format helpers ──────────────────────────────────────────────────────────
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

// ─── KPI card ────────────────────────────────────────────────────────────────
function KPI({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 text-center">
      <p className="text-lg sm:text-xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 leading-tight">{label}</p>
    </div>
  );
}

// ─── event timeline item ─────────────────────────────────────────────────────
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

// ─── seller table row ────────────────────────────────────────────────────────
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

// ─── main component ──────────────────────────────────────────────────────────
const ZealAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/zeal", "zeal_analysis");
    fetch(`${HOST}/stats/visit/zeal-analysis/`).catch(() => {});
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

  // Build merged seller chart data: all dates on one axis, one key per seller
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
      <title>Zirium | Zealand Pharma (ZEAL) - Shortanalyse</title>
      <meta name="description" content="Dybdegående analyse af short-positioner i Zealand Pharma (ZEAL). Hvem shorter, hvor meget, og hvorfor?" />
      <meta property="og:title" content="Shortanalyse: Hvem vædder imod Zealand Pharma?" />
      <meta property="og:description" content="Dybdegående analyse af short-positioner i Zealand Pharma (ZEAL). Hvem shorter, hvor meget, og hvorfor?" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/zeal/2026-05-13" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Shortanalyse: Hvem vædder imod Zealand Pharma?" />
      <meta name="twitter:description" content="Dybdegående analyse af short-positioner i Zealand Pharma (ZEAL). Hvem shorter, hvor meget, og hvorfor?" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Shortanalyse: Hvem vædder imod Zealand Pharma?",
        "description": "Dybdegående analyse af short-positioner i Zealand Pharma (ZEAL). Hvem shorter, hvor meget, og hvorfor?",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-13",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/zeal/2026-05-13",
        "inLanguage": "da",
      })}</script>

      <article className="w-full max-w-[900px] mx-auto px-5 sm:px-8 pb-10 sm:pb-16">
        <button
          className="text-blue-500 hover:text-blue-700 bg-transparent border-none text-base inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm min-h-[44px] min-w-[44px]"
          onClick={() => {
            if (
              window.history.length > 1 &&
              window.history.state.idx > 0
            ) {
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
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">Analyse lavet af Araz Bayat Makoo (Zirium) - 13. maj 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Shortanalyse: Hvem vædder imod Zealand Pharma?
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Zealand Pharma (ZEAL)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Denne analyse kombinerer udviklingen i short-positioner med markedets forventninger til Zealand
            Pharma. Formålet er at give et overblik over tallene og sætte dem i kontekst med de vigtigste
            begivenheder i perioden.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="10,13%" label={"Short-interesse\n(all-time high)"} />
          <KPI value="310,60 DKK" label="Seneste lukkekurs (13. maj)" />
          <KPI value="8" label="Aktive short-sælgere" />
          <KPI value="-67%" label="Fra all-time high (954 DKK)" />
        </div>

        {/* ── 1. Overordnet billede ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overordnet billede</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Zealand Pharma har de seneste to år været en af de mest volatile aktier på det danske marked.
            Aktien gik fra massiv optimisme og næsten euforisk investorinteresse i 2024 til markant skepsis i
            2025 og begyndelsen af 2026. Det interessante er ikke alene kursfaldet. Det mest bemærkelsesværdige er,
            at shortinteressen fortsætter med at stige, selvom aktien er begyndt at komme sig fra bunden i marts 2026.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det fortæller os, at flere professionelle investorer fortsat vurderer, at markedet overvurderer
            selskabets kortsigtede potentiale.
          </p>
        </section>

        {/* ── Chart 1: Full history ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short-interesse vs. aktiekurs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Fuld historik siden november 2023. Blå = short-interesse, lilla = lukkekurs.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse vs. aktiekurs for Zealand Pharma siden november 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FULL_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="shortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="40%" stopColor="#007AFF" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 12]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={["dataMin - 20", "dataMax + 20"]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#shortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2, filter: "url(#glow)" }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
                <ReferenceLine yAxisId="short" y={10.13} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Nuv. niveau</span>
            </div>
          </div>
        </section>

        {/* ── 2. Hvorfor steg aktien ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Hvorfor steg aktien så voldsomt i 2024?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I første halvår 2024 blev Zealand Pharma en central del af den globale fedmehistorie på
            aktiemarkedet. Investorerne begyndte at se selskabet som en mulig udfordrer til Novo Nordisk og Eli
            Lilly inden for næste generation af fedmebehandlinger.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I juni 2024 præsenterede Boehringer Ingelheim imponerende fase 2-data for survodutide mod MASH
            (fedtleversygdom) ved EASL-kongressen i Milano. Ved den højeste dosis opnåede 83% af patienterne
            forbedring. Denne entusiasme, kombineret med Zealands voksende pipeline inden for fedmebehandling,
            drev aktien til all-time high på 954 DKK i juli 2024.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            På det tidspunkt var shortinteressen relativt lav omkring 3%, hvilket indikerer, at
            de fleste investorer fortsat troede på casen. Markedet begyndte i stigende grad at
            værdisætte potentialet flere år frem i tiden frem for den aktuelle indtjening.
          </p>
        </section>

        {/* ── 3. Hvad ændrede sig ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Fra hype til mistillid</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Når man kigger i data, kan man se et tydeligt skift i løbet af 2025. Kursen begyndte at falde
            fra toppen, og samtidig steg antallet af short-positioner støt. Det tyder på, at flere
            institutionelle investorer begyndte at vurdere, at aktien var for højt prissat i forhold til
            de risici, der var forbundet med den lange udviklingsproces og den hårde konkurrence på fedmemarkedet.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I marts 2025 indgik Roche en eksklusiv samarbejdsaftale med Zealand om petrelintide med
            $1,65 mia. upfront og op til $5,3 mia. i samlede milestones. Trods denne massive
            validering fortsatte kursfaldet, og shortinteressen steg til over 6%.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Kulminationen kom den 6. marts 2026, hvor fase 2b-resultater for petrelintide viste
            10,7% vægttab over 42 uger. Markedet havde forventet omkring 13-16%. Resultatet skuffede, fordi det halter
            bagefter konkurrenterne, herunder Eli Lillys eloralintide (9-20% afhængigt af dosis i fase 2). Aktien styrtdykkede
            ~36% på en enkelt dag til det laveste niveau siden august 2023 på 234,9 DKK med 3,35 mio. handlede aktier.
          </p>
        </section>

        {/* ── Chart 2: Recent 3 months ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. Seneste 3 måneder i detaljer</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Short-interesse med volumen. +4,26 procentpoint på blot tre måneder.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse med volumen for Zealand Pharma de seneste 3 måneder">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={RECENT_3M} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="shortGrad3m" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(d) => { const p = d.split("-"); const m = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"]; return `${parseInt(p[2])} ${m[parseInt(p[1])-1]}`; }} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[5.5, 11]} />
                <YAxis yAxisId="vol" hide domain={[0, 10000000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#shortGrad3m)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volumen</span>
            </div>
          </div>
        </section>

        {/* ── 5. Det mest interessante signal ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Det mest interessante signal lige nu</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Siden bunden i marts 2026 er aktien steget mere end 40%. Normalt ville man forvente, at
            short-sælgere reducerede risikoen i et sådant rebound. Men det modsatte er sket.
            Shortinteressen er steget til rekordhøje 10,13%, hvilket gør Zealand
            Pharma til en af de mest shortede aktier i Danmark.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det signalerer sandsynligvis en af to ting: Enten forventer de professionelle investorer,
            at reboundet kun er midlertidigt. Eller også vurderer de, at selskabets værdiansættelse
            fortsat er for høj i forhold til risikoen. Det er netop denne divergens mellem
            kursudviklingen og shortinteressen, der gør aktien interessant.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Den 7. maj offentliggjorde Zealand Q1-regnskabet, som slog forventningerne, sammen med et
            aktietilbagekøbsprogram på 1,3 mia. DKK. Aktien steg ca. 9,5% på dagen med over 1 mio.
            handlede aktier. Derudover bekræftede selskabet $700 mio. i milepælsbetalinger fra Roche i
            Q2, da petrelintide avancerer til fase 3. Trods alt dette er shortinteressen fortsat stigende.
          </p>
        </section>

        {/* ── Sellers section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Hvem shorter Zealand Pharma?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Der er i alt 8 institutionelle short-sælgere med positioner over 0,50%, som er indberettet til
            Finanstilsynet. Den samlede indberettede position er ca. 6,43%, mens de resterende ~3,70% holdes
            af aktører under indberetningtærsklen, hvis identitet vi ikke kender.
          </p>

          {/* Seller table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Aktive short-sælgere i Zealand Pharma</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short-sælger</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dato</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Beskrivelse</th>
                </tr>
              </thead>
              <tbody>
                <SellerRow i={0} name="Marshall Wace LLP" position="1,28%" date="7. maj" desc="Største enkeltposition. Aktiv siden dec 2021." />
                <SellerRow i={1} name="Voleon Capital Mgmt" position="1,00%" date="12. maj" desc="Steget fra 0,63% til 1,00%. Stadig stigende." />
                <SellerRow i={2} name="AHL Partners LLP" position="0,91%" date="8. maj" desc="Ny i jan 2026. Toppede på 1,20% i april." />
                <SellerRow i={3} name="Connor Clark & Lunn" position="0,80%" date="29. apr" desc="Ny i jan 2026. Stadig opbygning." />
                <SellerRow i={4} name="Jupiter Asset Mgmt" position="0,70%" date="13. mar" desc="Ingen opdatering siden marts." />
                <SellerRow i={5} name="Citadel Advisors LLC" position="0,63%" date="12. maj" desc="Meget aktiv. Varierer 0,52%-0,73%." />
                <SellerRow i={6} name="Jennison Associates" position="0,61%" date="14. apr" desc="Helt ny i april 2026." />
                <SellerRow i={7} name="D. E. Shaw & Co." position="0,50%" date="12. maj" desc="Lige på indberetningtærsklen." />
              </tbody>
            </table>
          </div>

          {/* Seller timeline chart */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Positionsudvikling over tid</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Individuelle short-sælgeres positioner baseret på indberetninger til Finanstilsynet.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Individuelle short-sælgeres positionsudvikling over tid for Zealand Pharma">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={sellerChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 1.6]} />
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

          {/* Pie chart */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-8 mb-2">Fordeling af den samlede short-interesse</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Ca. 36% af short-interessen holdes af aktører under 0,50%-tærsklen, hvis identitet er ukendt.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 flex justify-center" role="img" aria-label="Cirkeldiagram: Fordeling af den samlede short-interesse i Zealand Pharma">
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

        {/* ── Timeline of events ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">8. Tidslinje over nøglebegivenheder</h2>
          <div className="ml-2">
            <TimelineEvent date="Juni 2024" title="Survodutide MASH-data ved EASL-kongressen" color="#2a9d8f">
              <p>Boehringer Ingelheim præsenterede imponerende fase 2-data for survodutide mod fedtleversygdom (MASH). Ved den højeste dosis opnåede 83% af patienterne forbedring. Entusiasmen drev aktien til all-time high på 954 DKK i juli 2024 med en shortinteresse på kun 3%.</p>
            </TimelineEvent>
            <TimelineEvent date="Marts 2025" title="Roche-partnerskab: $5,3 mia. aftale" color="#4361ee">
              <p>Roche indgik en eksklusiv samarbejdsaftale med Zealand om petrelintide med $1,65 mia. upfront og op til $5,3 mia. i samlede milepælsbetalinger. Trods denne massive validering var aktien allerede begyndt at falde, og shortinteressen steg til over 6%.</p>
            </TimelineEvent>
            <TimelineEvent date="Sommer 2025" title="Kursfald og stigende shortinteresse" color="#e63946">
              <p>Aktien faldt fra over 450 DKK til 311 DKK i august i takt med stigende konkurrence. Eli Lillys eloralintide viste 9-20% vægttab afhængigt af dosis i fase 2, hvilket satte spørgsmålstegn ved Zealands differentiering. Shortinteressen nåede 9,81% i slutningen af maj, før den faldt lidt igen hen over sommeren.</p>
            </TimelineEvent>
            <TimelineEvent date="November 2025" title="Midlertidigt opsving til 521 DKK" color="#2a9d8f">
              <p>Den sidste deltager i ZUPREME-1 (petrelintide fase 2) afsluttede sit 28-ugers besøg, og SYNCHRONIZE-1 (survodutide fase 3) afsluttede sin 76-ugers behandlingsperiode. Data var endnu ikke offentliggjort, men forventningerne var høje, og shorts dækkede delvist ind (ned til 5,56%).</p>
            </TimelineEvent>
            <TimelineEvent date="December 2025" title={'Capital Markets Day: "Metabolic Frontier 2030"'} color="#4361ee">
              <p>Zealand præsenterede sin strategi med ambitioner om fem produktlanceringer og over ti kliniske programmer inden 2030, samt et nyt forskningscenter i Boston. Insidere solgte aktier i samme måned (CFO solgte for ~8,5 mio. DKK ved ~466 DKK).</p>
            </TimelineEvent>
            <TimelineEvent date="6. marts 2026" title="Petrelintide skuffer: ~36% fald på en dag" color="#e63946">
              <p>Fase 2b-resultater viste 10,7% vægttab over 42 uger. Markedet forventede omkring 13-16%. Aktien styrtdykkede til det laveste niveau siden august 2023 på 234,9 DKK med 3,35 mio. handlede aktier. CEO Adam Steensberg forsvarede resultatet og kritiserede fokusset på rene kilo fremfor tolerabilitet, hvor petrelintide klarede sig godt (ingen opkast, ingen behandlingsophør).</p>
            </TimelineEvent>
            <TimelineEvent date="28. april 2026" title="Survodutide fase 3: 16,6% vægttab" color="#2a9d8f">
              <p>SYNCHRONIZE-1 viste 16,6% vægttab efter 76 uger vs. 3,2% for placebo. 85,1% opnåede mindst 5% vægttab. Resultatet var på niveau med Novo Nordisks Wegovy, men under Eli Lillys Zepbound. Aktien steg til ~309 DKK.</p>
            </TimelineEvent>
            <TimelineEvent date="7. maj 2026" title="Q1-regnskab + tilbagekøbsprogram: +ca. 9,5%" color="#4361ee">
              <p>Omsætning på 34 mio. DKK (dobbelt så høj som forventet), tab på 539 mio. DKK (bedre end konsensus 672 mio.). Tilbagekøbsprogram på 1,3 mia. DKK og $700 mio. i milepæle fra Roche bekræftet. Aktien steg ca. 9,5% til 345 DKK med over 1 mio. handlede aktier.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* ── Insider section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Insider-transaktioner</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den 19.-20. april 2026 modtog CEO Adam Steensberg, CFO Henriette Wennicke og seks
            bestyrelsesmedlemmer aktietildelinger som en del af deres aflønning. I alt blev der tildelt
            ca. 166.000 aktier til en samlet nominel værdi på ca. 52 mio. DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            <strong>Vigtigt:</strong> Disse tildelinger er kompensationsbaserede og skal ikke forveksles med åbent
            markedskøb, som ville være et stærkere positivt signal. Ingen insidere har købt aktier på det åbne
            marked i den tilgængelige data trods kursfaldet på -67%.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            I december 2025 solgte CFO Henriette Wennicke ca. 18.220 aktier til gennemsnitskurs
            ~466 DKK (samlet ~8,5 mio. DKK). Bestyrelsesformand Martin Nicklasson solgte 1.700
            aktier til 467 DKK, kort efter Capital Markets Day.
          </p>
        </section>

        {/* ── Squeeze risk ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Risikoen for short squeeze</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Når shortinteressen bliver meget høj, øges risikoen for et short squeeze. Det sker, hvis aktien
            pludselig stiger kraftigt på positive nyheder. I sådanne situationer kan short-sælgerne blive
            tvunget til at købe aktier tilbage for at begrænse tab, hvilket kan skabe meget kraftige
            kursbevægelser på kort tid.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Taler for squeeze</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Shortinteressen er på all-time high (10,13%)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Aktien er i stigende trend (+43% siden marts)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Tilbagekøb på 1,3 mia. DKK reducerer tilgængelige aktier</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>$700 mio. i milepæle fra Roche i Q2 2026</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Petrelintide fase 3 (start H2 2026) kan overraske positivt</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Taler imod</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Shorts er professionelle med stor kapital</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Ingen insidere køber aktier</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Petrelintide (10,7%) halter efter konkurrenter (op til 20%)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Survodutide (16,6%) er på niveau med Wegovy, ikke ledende</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Aktien er fortsat ned -67% fra all-time high</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Conclusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Konklusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Zealand Pharma er gået fra at være en af markedets mest populære væksthistorier til at være en
            aktie præget af tvivl og polarisering. Det centrale spørgsmål er ikke længere, om selskabet har
            interessante produkter. Det centrale spørgsmål er nu, om Zealand kan levere resultater, som er
            stærke nok til at retfærdiggøre de forventninger, markedet tidligere havde.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Markedet virker i øjeblikket splittet: Nogle investorer ser den store kursnedtur som en mulighed.
            Andre vurderer fortsat, at risikoen er undervurderet. Den rekordhøje shortinteresse fortæller
            i hvert fald, at en stor gruppe professionelle investorer fortsat forventer mere modvind.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Kommende katalysatorer at holde øje med</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Fuld præsentation af survodutide SYNCHRONIZE-1 og SYNCHRONIZE-MASLD ved ADA 2026 i New Orleans</li>
              <li>&#x2022; Resultater fra SYNCHRONIZE-2 og SYNCHRONIZE-CVOT forsøgene (forventet 2026)</li>
              <li>&#x2022; Start af petrelintide fase 3 med Roche (planlagt H2 2026)</li>
              <li>&#x2022; Ekstraordinær generalforsamling den 26. maj 2026</li>
              <li>&#x2022; Løbende aktietilbagekøb frem til 31. oktober 2026</li>
            </ul>
          </div>
        </section>

        <RelatedAnalyses currentSlug="zeal/2026-05-13" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Data stammer fra Finanstilsynets offentlige registre. Historisk afkast er ikke en garanti for fremtidigt afkast. Foretag altid din
            egen analyse, og søg professionel rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Genereret af Zirium  |  13. maj 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default ZealAnalysisPage;
