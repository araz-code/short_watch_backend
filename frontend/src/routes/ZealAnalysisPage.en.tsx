import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
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
  { name: "Below 0.50% (unknown)", value: 3.7 },
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
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 tabular-nums">Vol: {Number(volVal.value).toLocaleString("en-US")}</p>
      )}
    </div>
  );
}

// ─── format helpers ──────────────────────────────────────────────────────────
function fmtDate(d: string) {
  const parts = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}, ${parts[0]}`;
}

function fmtShortDate(d: string) {
  const parts = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
const ZealAnalysisPageEn: React.FC = () => {
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
  const tickColor = isDark ? "#666" : "#bbb";

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
      <title>Zirium | Zealand Pharma (ZEAL) - Short Selling Analysis</title>
      <meta name="description" content="In-depth analysis of short positions in Zealand Pharma (ZEAL). Who is shorting, how much, and why?" />
      <meta property="og:title" content="Short Selling Analysis: Who is betting against Zealand Pharma?" />
      <meta property="og:description" content="In-depth analysis of short positions in Zealand Pharma (ZEAL). Who is shorting, how much, and why?" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/en/analyse/zeal/2026-05-13" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Short Selling Analysis: Who is betting against Zealand Pharma?" />
      <meta name="twitter:description" content="In-depth analysis of short positions in Zealand Pharma (ZEAL). Who is shorting, how much, and why?" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Short Selling Analysis: Who is betting against Zealand Pharma?",
        "description": "In-depth analysis of short positions in Zealand Pharma (ZEAL). Who is shorting, how much, and why?",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-13",
        "mainEntityOfPage": "https://www.zirium.dk/en/analyse/zeal/2026-05-13",
        "inLanguage": "en",
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
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Analysis by Araz Bayat Makoo (Zirium) - May 13, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Short Selling Analysis: Who is betting against Zealand Pharma?
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Zealand Pharma (ZEAL)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            This analysis combines the development in short positions with market expectations for Zealand
            Pharma. The purpose is to provide an overview of the numbers and put them in context with the most
            important events during the period.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="10.13%" label={"Short interest\n(all-time high)"} />
          <KPI value="310.60 DKK" label="Latest closing price (May 13)" />
          <KPI value="8" label="Active short sellers" />
          <KPI value="-67%" label="From all-time high (954 DKK)" />
        </div>

        {/* ── 1. The big picture ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. The big picture</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Over the past two years, Zealand Pharma has been one of the most volatile stocks on the Danish market.
            The stock went from massive optimism and near-euphoric investor interest in 2024 to significant
            skepticism in 2025 and early 2026. What is interesting is not just the price decline. The most
            remarkable thing is that short interest continues to rise even as the stock has begun recovering
            from its March 2026 bottom.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            This tells us that several professional investors still believe the market is overestimating
            the company's short-term potential.
          </p>
        </section>

        {/* ── Chart 1: Full history ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short interest vs. stock price</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Full history since November 2023. Blue = short interest, purple = closing price.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest vs. stock price for Zealand Pharma since November 2023">
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Closing price</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Current level</span>
            </div>
          </div>
        </section>

        {/* ── 2. Why the stock surged ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Why did the stock surge so dramatically in 2024?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In the first half of 2024, Zealand Pharma became a central part of the global obesity narrative
            in the stock market. Investors began to see the company as a potential challenger to Novo Nordisk
            and Eli Lilly in the next generation of obesity treatments.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In June 2024, Boehringer Ingelheim presented impressive Phase 2 data for survodutide against MASH
            (fatty liver disease) at the EASL congress in Milan. At the highest dose, 83% of patients achieved
            improvement. This enthusiasm, combined with Zealand's growing pipeline in obesity treatment,
            drove the stock to an all-time high of 954 DKK in July 2024.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            At that time, short interest was relatively low at around 3%, indicating that
            most investors still believed in the case. The market increasingly began to
            price in the potential several years ahead rather than current earnings.
          </p>
        </section>

        {/* ── 3. What changed ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. From hype to distrust</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Looking at the data, a clear shift can be seen throughout 2025. The price began to fall
            from its peak, and at the same time the number of short positions rose steadily. This
            suggests that more institutional investors began to assess that the stock was overpriced
            relative to the risks associated with the lengthy development process and fierce competition
            in the obesity market.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In March 2025, Roche entered into an exclusive collaboration agreement with Zealand for
            petrelintide with $1.65 billion upfront and up to $5.3 billion in total milestones. Despite
            this massive validation, the price decline continued, and short interest rose to over 6%.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The culmination came on March 6, 2026, when Phase 2b results for petrelintide showed
            10.7% weight loss over 42 weeks. The market had expected around 13-16%. The result was
            disappointing because it lagged behind competitors, including Eli Lilly's eloralintide
            (9-20% depending on dose in Phase 2). The stock plunged
            ~36% in a single day to the lowest level since August 2023 at 234.9 DKK with 3.35 million shares traded.
          </p>
        </section>

        {/* ── Chart 2: Recent 3 months ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. Last 3 months in detail</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Short interest with volume. +4.26 percentage points in just three months.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest with volume for Zealand Pharma over the last 3 months">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={RECENT_3M} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="shortGrad3m" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(d) => { const p = d.split("-"); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${parseInt(p[2])} ${m[parseInt(p[1])-1]}`; }} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[5.5, 11]} />
                <YAxis yAxisId="vol" hide domain={[0, 10000000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#shortGrad3m)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volume</span>
            </div>
          </div>
        </section>

        {/* ── 5. The most interesting signal ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. The most interesting signal right now</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Since the bottom in March 2026, the stock has risen more than 40%. Normally, one would expect
            short sellers to reduce their risk in such a rebound. But the opposite has happened.
            Short interest has risen to a record-high 10.13%, making Zealand
            Pharma one of the most shorted stocks in Denmark.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            This likely signals one of two things: Either the professional investors expect
            the rebound to be only temporary. Or they assess that the company's valuation
            is still too high relative to the risk. It is precisely this divergence between
            the price trend and short interest that makes the stock interesting.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            On May 7, Zealand published its Q1 report, which beat expectations, along with a
            share buyback program of 1.3 billion DKK. The stock rose approximately 9.5% on the day with over 1 million
            shares traded. Furthermore, the company confirmed $700 million in milestone payments from Roche in
            Q2, as petrelintide advances to Phase 3. Despite all of this, short interest continues to rise.
          </p>
        </section>

        {/* ── Sellers section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Who is shorting Zealand Pharma?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            There are a total of 8 institutional short sellers with positions above 0.50%, as reported to the
            Danish Financial Supervisory Authority (Finanstilsynet). The total reported position is approximately
            6.43%, while the remaining ~3.70% is held by actors below the reporting threshold whose identity
            we do not know.
          </p>

          {/* Seller table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Active short sellers in Zealand Pharma</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short seller</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                <SellerRow i={0} name="Marshall Wace LLP" position="1.28%" date="May 7" desc="Largest single position. Active since Dec 2021." />
                <SellerRow i={1} name="Voleon Capital Mgmt" position="1.00%" date="May 12" desc="Increased from 0.63% to 1.00%. Still rising." />
                <SellerRow i={2} name="AHL Partners LLP" position="0.91%" date="May 8" desc="New in Jan 2026. Peaked at 1.20% in April." />
                <SellerRow i={3} name="Connor Clark & Lunn" position="0.80%" date="Apr 29" desc="New in Jan 2026. Still building." />
                <SellerRow i={4} name="Jupiter Asset Mgmt" position="0.70%" date="Mar 13" desc="No update since March." />
                <SellerRow i={5} name="Citadel Advisors LLC" position="0.63%" date="May 12" desc="Very active. Ranges 0.52%-0.73%." />
                <SellerRow i={6} name="Jennison Associates" position="0.61%" date="Apr 14" desc="Brand new in April 2026." />
                <SellerRow i={7} name="D. E. Shaw & Co." position="0.50%" date="May 12" desc="Right at the reporting threshold." />
              </tbody>
            </table>
          </div>

          {/* Seller timeline chart */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Position development over time</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Individual short sellers' positions based on reports to the Danish Financial Supervisory Authority (Finanstilsynet).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Individual short sellers' position development over time for Zealand Pharma">
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
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-8 mb-2">Distribution of total short interest</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Approximately 36% of the short interest is held by actors below the 0.50% threshold whose identity is unknown.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 flex justify-center" role="img" aria-label="Pie chart: Distribution of total short interest in Zealand Pharma">
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">8. Timeline of key events</h2>
          <div className="ml-2">
            <TimelineEvent date="June 2024" title="Survodutide MASH data at EASL congress" color="#2a9d8f">
              <p>Boehringer Ingelheim presented impressive Phase 2 data for survodutide against fatty liver disease (MASH). At the highest dose, 83% of patients achieved improvement. The enthusiasm drove the stock to an all-time high of 954 DKK in July 2024 with short interest at just 3%.</p>
            </TimelineEvent>
            <TimelineEvent date="March 2025" title="Roche partnership: $5.3 billion deal" color="#4361ee">
              <p>Roche entered into an exclusive collaboration agreement with Zealand for petrelintide with $1.65 billion upfront and up to $5.3 billion in total milestone payments. Despite this massive validation, the stock had already started falling, and short interest rose to over 6%.</p>
            </TimelineEvent>
            <TimelineEvent date="Summer 2025" title="Price decline and rising short interest" color="#e63946">
              <p>The stock fell from over 450 DKK to 311 DKK in August amid rising competition. Eli Lilly's eloralintide showed 9-20% weight loss depending on dose in Phase 2, raising questions about Zealand's differentiation. Short interest reached 9.81% in late May before falling slightly over the summer.</p>
            </TimelineEvent>
            <TimelineEvent date="November 2025" title="Temporary recovery to 521 DKK" color="#2a9d8f">
              <p>The last participant in ZUPREME-1 (petrelintide Phase 2) completed their 28-week visit, and SYNCHRONIZE-1 (survodutide Phase 3) completed its 76-week treatment period. Data had not yet been published, but expectations were high and shorts partially covered (down to 5.56%).</p>
            </TimelineEvent>
            <TimelineEvent date="December 2025" title={'Capital Markets Day: "Metabolic Frontier 2030"'} color="#4361ee">
              <p>Zealand presented its strategy with ambitions for five product launches and over ten clinical programs by 2030, along with a new research center in Boston. Insiders sold shares the same month (CFO sold for ~8.5 million DKK at ~466 DKK).</p>
            </TimelineEvent>
            <TimelineEvent date="March 6, 2026" title="Petrelintide disappoints: ~36% drop in a single day" color="#e63946">
              <p>Phase 2b results showed 10.7% weight loss over 42 weeks. The market expected around 13-16%. The stock plunged to the lowest level since August 2023 at 234.9 DKK with 3.35 million shares traded. CEO Adam Steensberg defended the result and criticized the focus on pure kilos rather than tolerability, where petrelintide performed well (no vomiting, no treatment discontinuation).</p>
            </TimelineEvent>
            <TimelineEvent date="April 28, 2026" title="Survodutide Phase 3: 16.6% weight loss" color="#2a9d8f">
              <p>SYNCHRONIZE-1 showed 16.6% weight loss after 76 weeks vs. 3.2% for placebo. 85.1% achieved at least 5% weight loss. The result was on par with Novo Nordisk's Wegovy but below Eli Lilly's Zepbound. The stock rose to ~309 DKK.</p>
            </TimelineEvent>
            <TimelineEvent date="May 7, 2026" title="Q1 report + share buyback program: +approx. 9.5%" color="#4361ee">
              <p>Revenue of 34 million DKK (double expectations), loss of 539 million DKK (better than consensus of 672 million). Share buyback program of 1.3 billion DKK and $700 million in milestones from Roche confirmed. The stock rose approximately 9.5% to 345 DKK with over 1 million shares traded.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* ── Insider section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Insider transactions</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            On April 19-20, 2026, CEO Adam Steensberg, CFO Henriette Wennicke, and six
            board members received share grants as part of their compensation. In total, approximately
            166,000 shares were granted with a total nominal value of approximately 52 million DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            <strong>Important:</strong> These grants are compensation-based and should not be confused with open
            market purchases, which would be a stronger positive signal. No insiders have purchased shares on
            the open market in the available data despite the 67% price decline.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            In December 2025, CFO Henriette Wennicke sold approximately 18,220 shares at an average price of
            ~466 DKK (total ~8.5 million DKK). Board Chairman Martin Nicklasson sold 1,700
            shares at 467 DKK, shortly after Capital Markets Day.
          </p>
        </section>

        {/* ── Squeeze risk ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. The risk of a short squeeze</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            When short interest becomes very high, the risk of a short squeeze increases. This happens if the
            stock suddenly rises sharply on positive news. In such situations, short sellers may be
            forced to buy back shares to limit losses, which can create very powerful
            price movements in a short period of time.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Arguments for a squeeze</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Short interest is at an all-time high (10.13%)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>The stock is in an uptrend (+43% since March)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Buyback of 1.3 billion DKK reduces available shares</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>$700 million in milestones from Roche in Q2 2026</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Petrelintide Phase 3 (start H2 2026) may surprise positively</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Arguments against</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Shorts are professionals with large capital</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>No insiders are buying shares</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Petrelintide (10.7%) lags behind competitors (up to 20%)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Survodutide (16.6%) is on par with Wegovy, not leading</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>The stock is still down 67% from its all-time high</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Conclusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Conclusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Zealand Pharma has gone from being one of the market's most popular growth stories to a
            stock marked by doubt and polarization. The central question is no longer whether the company has
            interesting products. The central question is now whether Zealand can deliver results that are
            strong enough to justify the expectations the market previously had.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The market currently appears divided: Some investors see the large price decline as an opportunity.
            Others still assess that the risk is underestimated. The record-high short interest tells
            us at least that a large group of professional investors still expects more headwinds.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Upcoming catalysts to watch</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Full presentation of survodutide SYNCHRONIZE-1 and SYNCHRONIZE-MASLD at ADA 2026 in New Orleans</li>
              <li>&#x2022; Results from SYNCHRONIZE-2 and SYNCHRONIZE-CVOT trials (expected 2026)</li>
              <li>&#x2022; Start of petrelintide Phase 3 with Roche (planned H2 2026)</li>
              <li>&#x2022; Extraordinary general meeting on May 26, 2026</li>
              <li>&#x2022; Ongoing share buybacks through October 31, 2026</li>
            </ul>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not constitute
            investment advice. Data is sourced from the Danish Financial Supervisory Authority's (Finanstilsynet) public registers. Past performance is not a guarantee of future returns. Always conduct your
            own analysis and seek professional advice before trading.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Generated by Zirium  |  May 13, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default ZealAnalysisPageEn;
