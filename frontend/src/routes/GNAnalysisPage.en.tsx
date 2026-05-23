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
const FULL_HISTORY: ChartPoint[] = [
  { date: "2023-11-06", short: 6.03, close: 121.1, volume: 700309 },
  { date: "2023-12-06", short: 6.29, close: 162.7, volume: 441341 },
  { date: "2024-02-09", short: 6.79, close: 179.55, volume: 1188694 },
  { date: "2024-04-29", short: 6.55, close: 190.75, volume: 545212 },
  { date: "2024-06-06", short: 5.18, close: 224.2, volume: 561693 },
  { date: "2024-08-05", short: 6.62, close: 164.8, volume: 1171143 },
  { date: "2024-10-15", short: 9.95, close: 136.5, volume: 603143 },
  { date: "2024-12-31", short: 10.92, close: 133.75, volume: 510995 },
  { date: "2025-01-15", short: 11.34, close: 128.3, volume: 704037 },
  { date: "2025-03-05", short: 9.83, close: 123.0, volume: 1088748 },
  { date: "2025-04-09", short: 8.85, close: 82.56, volume: 2354609 },
  { date: "2025-05-08", short: 10.09, close: 88.58, volume: 766993 },
  { date: "2025-07-18", short: 8.08, close: 100.05, volume: 733793 },
  { date: "2025-09-01", short: 7.18, close: 115.6, volume: 362817 },
  { date: "2025-10-02", short: 8.49, close: 107.15, volume: 740797 },
  { date: "2025-11-24", short: 9.35, close: 96.94, volume: 811128 },
  { date: "2026-01-07", short: 10.11, close: 112.9, volume: 672699 },
  { date: "2026-02-04", short: 12.05, close: 106.35, volume: 862042 },
  { date: "2026-02-25", short: 12.85, close: 92.98, volume: 436126 },
  { date: "2026-03-11", short: 12.9, close: 89.0, volume: 791948 },
  { date: "2026-03-16", short: 13.04, close: 105.3, volume: 9208005 },
  { date: "2026-03-18", short: 10.85, close: 98.0, volume: 2213414 },
  { date: "2026-03-20", short: 11.32, close: 96.5, volume: 1353826 },
  { date: "2026-03-24", short: 10.81, close: 94.24, volume: 524141 },
  { date: "2026-04-01", short: 10.31, close: 100.7, volume: 524675 },
  { date: "2026-04-09", short: 10.42, close: 95.42, volume: 710886 },
  { date: "2026-04-16", short: 10.71, close: 104.5, volume: 530213 },
  { date: "2026-04-23", short: 10.52, close: 99.0, volume: 477797 },
  { date: "2026-04-30", short: 10.97, close: 95.74, volume: 759201 },
  { date: "2026-05-06", short: 10.85, close: 103.7, volume: 1391904 },
  { date: "2026-05-08", short: 10.2, close: 95.44, volume: 1469997 },
  { date: "2026-05-12", short: 9.92, close: 95.58, volume: 611074 },
  { date: "2026-05-13", short: 9.7, close: null, volume: null },
];

const RECENT_3M: ChartPoint[] = FULL_HISTORY.filter(
  (d) => d.date >= "2026-02-04"
);

const SELLERS: SellerSeries[] = [
  {
    name: "AKO Capital",
    latest: 1.3,
    data: [
      { date: "2022-05-11", value: 0.96 }, { date: "2022-08-19", value: 1.15 },
      { date: "2022-09-21", value: 0.95 }, { date: "2022-10-04", value: 0.58 },
      { date: "2023-02-02", value: 0.93 }, { date: "2023-05-26", value: 0.25 },
      { date: "2024-02-05", value: 0.64 }, { date: "2024-02-09", value: 0.85 },
      { date: "2024-03-22", value: 1.05 }, { date: "2024-04-25", value: 0.86 },
      { date: "2024-08-06", value: 0.77 }, { date: "2024-08-23", value: 1.0 },
      { date: "2024-09-04", value: 1.24 }, { date: "2024-09-09", value: 0.97 },
      { date: "2024-11-08", value: 1.04 }, { date: "2025-02-13", value: 1.18 },
      { date: "2025-03-05", value: 1.05 }, { date: "2025-04-04", value: 0.54 },
      { date: "2025-04-07", value: 0.49 }, { date: "2025-04-24", value: 0.58 },
      { date: "2025-05-02", value: 0.95 }, { date: "2025-06-12", value: 0.82 },
      { date: "2025-08-22", value: 0.93 }, { date: "2025-10-30", value: 1.07 },
      { date: "2025-11-05", value: 1.15 }, { date: "2026-01-16", value: 1.21 },
      { date: "2026-01-28", value: 1.17 }, { date: "2026-03-09", value: 1.22 },
      { date: "2026-04-23", value: 1.3 },
    ],
  },
  {
    name: "Millennium Intl Mgmt",
    latest: 1.17,
    data: [
      { date: "2022-10-05", value: 0.51 }, { date: "2022-11-29", value: 1.99 },
      { date: "2022-12-01", value: 0.07 },
      { date: "2024-10-17", value: 0.5 }, { date: "2024-10-21", value: 0.48 },
      { date: "2024-11-28", value: 0.51 }, { date: "2024-12-02", value: 0.48 },
      { date: "2026-03-18", value: 0.51 }, { date: "2026-03-20", value: 0.7 },
      { date: "2026-04-16", value: 0.7 }, { date: "2026-04-23", value: 0.81 },
      { date: "2026-04-28", value: 0.95 }, { date: "2026-05-01", value: 1.11 },
      { date: "2026-05-06", value: 1.24 }, { date: "2026-05-08", value: 1.17 },
    ],
  },
  {
    name: "Atalan Capital",
    latest: 1.13,
    data: [
      { date: "2025-09-30", value: 0.76 }, { date: "2025-10-01", value: 0.98 },
      { date: "2025-10-02", value: 1.13 },
    ],
  },
  {
    name: "Capital Fund Mgmt",
    latest: 0.7,
    data: [
      { date: "2026-03-24", value: 0.51 }, { date: "2026-04-09", value: 0.6 },
      { date: "2026-05-07", value: 0.7 },
    ],
  },
  {
    name: "Citadel Advisors",
    latest: 0.5,
    data: [
      { date: "2026-05-12", value: 0.5 },
    ],
  },
];

const PIE_DATA: PieSlice[] = [
  { name: "AKO Capital", value: 1.3 },
  { name: "Millennium Intl Mgmt", value: 1.17 },
  { name: "Atalan Capital", value: 1.13 },
  { name: "Capital Fund Mgmt", value: 0.7 },
  { name: "Citadel Advisors", value: 0.5 },
  { name: "Below 0.50% (unknown)", value: 4.90 },
];

const PIE_COLORS = [
  "#e63946", "#4361ee", "#2a9d8f", "#f77f00", "#9b5de5", "#d4d4d8",
];

const SELLER_COLORS = [
  "#e63946", "#4361ee", "#2a9d8f", "#f77f00", "#9b5de5",
];

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
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 tabular-nums">Vol: {Number(volVal.value).toLocaleString("en-US")}</p>
      )}
    </div>
  );
}

// ─── format helpers ─────────────────────────────────────────────────────────
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
const GNAnalysisPageEn: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/gn", "gn_analysis");
    fetch(`${HOST}/stats/visit/gn-analysis/`).catch(() => {});
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
      <title>Zirium | GN Store Nord (GN) - Short Selling Analysis</title>
      <meta name="description" content="In-depth analysis of short positions in GN Store Nord (GN). Short sellers hold firm despite the Amplifon sale." />
      <meta property="og:title" content="Short selling analysis: Short sellers hold firm despite Amplifon sale" />
      <meta property="og:description" content="In-depth analysis of short positions in GN Store Nord (GN). Short sellers hold firm despite the Amplifon sale." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/en/analyse/gn/2026-05-14" />
      <meta property="og:image" content="https://www.zirium.dk/og-images/gn-2026-05-14-en.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Short selling analysis: Short sellers hold firm despite Amplifon sale" />
      <meta name="twitter:description" content="In-depth analysis of short positions in GN Store Nord (GN). Short sellers hold firm despite the Amplifon sale." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/gn-2026-05-14-en.png" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Short selling analysis: Short sellers hold firm despite Amplifon sale",
        "description": "In-depth analysis of short positions in GN Store Nord (GN). Short sellers hold firm despite the Amplifon sale.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-14",
        "mainEntityOfPage": "https://www.zirium.dk/en/analyse/gn/2026-05-14",
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
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">Analysis by Araz Bayat Makoo (Zirium) - May 14, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Short selling analysis: Short sellers hold firm despite Amplifon sale
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            GN Store Nord (GN)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            This analysis combines the development of short positions with the company's strategic transformation.
            GN Store Nord has gone from being a conglomerate with three divisions to heading towards a more
            focused enterprise and gaming company, and along the way, short interest has reached some of the highest
            levels in the company's recent history.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="9.70%" label="Short interest (May 13)" />
          <KPI value="94.50 DKK" label="Latest closing price (May 13)" />
          <KPI value="5" label="Active short sellers" />
          <KPI value="-58%" label="From 3-year high (224 DKK, June 2024)" />
        </div>

        {/* ── 1. Overall picture ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overall picture</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Over the past two years, GN Store Nord has undergone a radical transformation. The company has shut down its
            Jabra consumer division, sold its hearing aid business to Amplifon for DKK 17 billion, and is now
            heading towards becoming a more focused enterprise and gaming company. It is a transformation that
            has left investors deeply divided.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Short interest reached 13.12% in March 2026, making GN the most shorted stock
            on the Danish market. Although it has fallen to 9.70% following the Amplifon news, the level remains
            unusually high and indicates that short sellers are not yet convinced about the investment case
            after the strategic restructuring.
          </p>
        </section>

        {/* ── Chart 1: Full history ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short interest vs. share price</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">History since October 2023. Blue = short interest, purple = closing price.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest vs. share price for GN Store Nord since October 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FULL_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gnShortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="40%" stopColor="#007AFF" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                  <filter id="gnGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[4, 14]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={["dataMin - 10", "dataMax + 10"]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#gnShortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2, filter: "url(#gnGlow)" }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
                <ReferenceLine yAxisId="short" y={13.12} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Closing price</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>ATH (13.12%)</span>
            </div>
          </div>
        </section>

        {/* ── 2. Background ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. From conglomerate to identity crisis</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In 2021, GN Store Nord acquired SteelSeries for DKK 8 billion with the ambition of creating a global leader
            in gaming audio. At the same time, the company had three established divisions: Hearing (ReSound/Beltone),
            Enterprise (Jabra professional), and Consumer (Jabra Elite/Talk). The stock had previously traded above
            DKK 500 during the 2021 peak.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            But in June 2024, the first major strategic shift came. GN announced that it would shut down
            the Jabra consumer division (Elite and Talk product lines) and instead focus on enterprise and
            gaming. The decision came after sustained losses in competition against Apple, Sony, and Samsung.
            The shutdown meant approximately DKK 450 million in lost annual revenue and approximately DKK 200 million in extraordinary costs.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Short interest was already rising from around 6% in mid-2024, but it was not until autumn 2024
            that it truly accelerated. From September to December 2024, short interest rose from 7% to nearly 11%,
            as the market began to doubt the remaining business's earnings power.
          </p>
        </section>

        {/* ── 3. What happened in 2025 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. 2025: The stock finds its floor</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In January 2025, short interest reached 11.34%, and the stock began to decline significantly from DKK 148
            down towards DKK 83 in April 2025. The decline was caused by a combination of company-specific and macroeconomic
            factors: weak organic growth in the Enterprise division (down 3% in 2024), uncertainty about whether
            the SteelSeries acquisition would ever deliver the promised synergies, and a broad decline in global
            equity markets driven by Trump's tariff policies, which hit export-oriented companies particularly hard.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            A bright spot was the Q4 2024 earnings report, which showed SteelSeries' best quarter ever with DKK 1,053 million
            in revenue and 16% organic growth. It showed that the gaming business had momentum, but it was
            not enough to offset concerns about Enterprise.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Over the summer of 2025, short interest gradually declined from the peak to approximately 7% in September, as the
            stock stabilized around DKK 100-115. It was a short-lived relief.
          </p>
        </section>

        {/* ── Chart 2: Recent 3 months ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. Last 3 months in detail</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Short interest with volume. The Amplifon announcement on March 16, 2026 is clearly visible.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest with volume for GN Store Nord over the last 3 months">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={RECENT_3M} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gnShortGrad3m" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(d) => { const p = d.split("-"); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${parseInt(p[2])} ${m[parseInt(p[1])-1]}`; }} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[9, 14]} />
                <YAxis yAxisId="vol" hide domain={[0, 10000000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#gnShortGrad3m)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
                <ReferenceLine yAxisId="short" y={13.12} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "ATH 13.12%", fontSize: 10, fill: "#eab308", position: "insideTopLeft" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volume</span>
            </div>
          </div>
        </section>

        {/* ── 4. The Amplifon sale ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. The turning point: Sale of Hearing to Amplifon</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            On March 16, 2026, GN Store Nord announced the sale of its Hearing division (ReSound, Beltone)
            to Italian Amplifon for DKK 17 billion. The payment consisted of DKK 12.6 billion in cash plus
            56 million Amplifon shares, making GN the owner of approximately 16% of Amplifon. The stock rose 36% in
            a single day on massive volume.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            GN has announced that the proceeds will be used to reduce debt to a short-term leverage of
            1.0-1.5x, invest in the continuing business, and distribute capital to shareholders. The company
            expects DKK 3.5-4.5 billion in "excess cash" for shareholders after debt reduction,
            including through a share buyback program. The Amplifon shares are subject to a lock-up period, and GN
            will have the right to nominate a member to Amplifon's board of directors.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The Hearing division generated DKK 7.2 billion in revenue in 2025 with an EBITDA margin of approximately 16%.
            By selling it, GN sheds a capital-intensive business with fierce competition from Sonova,
            Demant, and WS Audiology, but at the same time loses its most stable revenue source.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Interestingly, short interest dropped sharply from 13.12% to 10.85% immediately after
            the announcement, rose briefly above 11% in early May, and has since fallen further
            to 9.70% following the Q1 earnings report. Despite the decline, the level remains high, which may indicate that
            parts of the market still see significant risks in the remaining business.
          </p>
        </section>

        {/* ── 5. Q1 2026 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Q1 2026: Margin pressure and lowered guidance</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            On May 7, 2026, GN published its Q1 earnings report, and it was weak. Revenue from the
            continuing business (Enterprise + Gaming) was DKK 2,096 million, a decline of 8% and 4% organically.
            The adjusted EBITA margin fell to 0.3% from 5.7% the year before, partly due to
            significant one-off costs related to the separation of Hearing.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            At the same time, management lowered its organic growth guidance for 2026 from 2-8% to 0-6%. The stock
            fell 6% on the day. The most important signal, however, was that management announced a new
            cost-savings program targeting DKK 200 million in structural savings from 2027.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            In the days following the Q1 report, short interest fell significantly from 11.15% to 9.70%. This may be because
            the stock had already fallen to a level where some shorts chose to take profits, or because
            the poor result had already been priced in.
          </p>
        </section>

        {/* ── Sellers section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Who is shorting GN Store Nord?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            There are a total of 5 institutional short sellers with positions above 0.50%. The total reported
            position is approximately 4.80%, while the remaining ~4.90% is held by actors below the reporting threshold.
            Notably, GN has attracted a wide range of hedge funds over time. More than
            15 different funds have held positions above 0.50% over the past four years.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Active short sellers in GN Store Nord</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short seller</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                <SellerRow i={0} name="AKO Capital LLP" position="1.30%" date="Apr 23" desc="Long-term short. Active since May 2022. Peaked at 1.30%." />
                <SellerRow i={1} name="Millennium Intl Mgmt" position="1.17%" date="May 8" desc="Re-entered in March 2026. Rising rapidly." />
                <SellerRow i={2} name="Atalan Capital" position="1.13%" date="Oct 2, 2025" desc="No update since Oct 2025." />
                <SellerRow i={3} name="Capital Fund Mgmt" position="0.70%" date="May 7" desc="New in March 2026. Still rising." />
                <SellerRow i={4} name="Citadel Advisors LLC" position="0.50%" date="May 12" desc="New. Right at the reporting threshold." />
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Position development over time</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Individual short sellers' positions based on filings with the Danish Financial Supervisory Authority (Finanstilsynet).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Individual short sellers' position development over time for GN Store Nord">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={sellerChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 2.2]} />
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

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-8 mb-2">Distribution of total short interest</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Approximately 51% of short interest is held by actors below the 0.50% threshold, whose identity is unknown.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 flex justify-center" role="img" aria-label="Pie chart: Distribution of total short interest in GN Store Nord">
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">9. Timeline of key events</h2>
          <div className="ml-2">
            <TimelineEvent date="October 2021" title="SteelSeries acquisition: DKK 8 billion" color="#4361ee">
              <p>GN Store Nord acquired SteelSeries, a Danish gaming peripherals manufacturer, for DKK 8 billion. The strategy was to create a global leader in gaming audio and equipment. The stock had previously traded above DKK 500 during the 2021 peak.</p>
            </TimelineEvent>
            <TimelineEvent date="June 2024" title="Jabra consumer division shut down" color="#e63946">
              <p>GN announced the shutdown of the Jabra Elite and Talk product lines after sustained losses in competition against Apple, Sony, and Samsung. The decision meant approximately DKK 450 million in lost annual revenue and approximately DKK 200 million in extraordinary costs. Short interest was approximately 5.4%.</p>
            </TimelineEvent>
            <TimelineEvent date="October 2024" title="Short interest crosses 10%" color="#e63946">
              <p>As the market lost confidence in the transformation strategy, short interest rose from 7% in September to above 10% in October. Up to 10 different funds held positions above 0.50% during this period, including AKO Capital, Millennium, Gladstone, Marshall Wace, and BlackRock.</p>
            </TimelineEvent>
            <TimelineEvent date="February 2025" title="2024 annual report: Mixed results" color="#4361ee">
              <p>Organic growth of 1% for the entire group. Enterprise fell 3%, while Gaming grew 16% in Q4. Free cash flow of DKK 1.1 billion. The market was positively surprised by the cash flow, but the stock only rose briefly.</p>
            </TimelineEvent>
            <TimelineEvent date="April 2025" title="3-year low: DKK 82.60" color="#e63946">
              <p>The stock hit its floor on April 9, 2025 at DKK 82.60, a decline of 63% from the 3-year high in June 2024. Short interest was around 9.6%. In the following weeks, six insiders purchased shares for a combined total of approximately DKK 4.9 million, led by CEO Peter Karlstromer (DKK 2.4 million) and CFO Soeren Jelert (DKK 738,000).</p>
            </TimelineEvent>
            <TimelineEvent date="March 16, 2026" title="Hearing sold to Amplifon: +36% in one day" color="#2a9d8f">
              <p>GN announced the sale of the Hearing division (ReSound, Beltone, approximately 5,500 employees) to Amplifon for DKK 17 billion (DKK 12.6 billion cash + 56 million Amplifon shares). The stock rose 36% to DKK 118 on massive volume. Short interest fell from 13.12% to 10.85% in two days.</p>
            </TimelineEvent>
            <TimelineEvent date="May 7, 2026" title="Q1 2026: Weak results and lowered guidance" color="#e63946">
              <p>Revenue from continuing operations of DKK 2,096 million (down 8%). EBITA margin of just 0.3%, weighed down by one-off costs for the separation of Hearing. Guidance lowered from 2-8% to 0-6% organic growth. Cost-savings program of DKK 200 million announced. The stock fell 6%.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* ── Insider section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Insider transactions</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In the period from March to May 2025, six insiders purchased GN shares on the open market with their own funds.
            The total amount is approximately DKK 4.9 million, spread across seven separate purchases. No
            insider sales have been recorded in the available period.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Insider transactions in GN Store Nord</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Person</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Shares</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Price</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Peter Karlstromer (CEO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">May 28</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">25,000</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">94.84 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">2,371,000 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Soeren Jelert (CFO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">May 2</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">8,200</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">90.05 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">738,410 DKK</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Joergen Bundgaard Hansen</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">May 15-16</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">7,000</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">93.66-98.34 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">656,323 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Lise Skaarup Mortensen</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 12</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">4,000</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">118.77 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">475,080 DKK</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Charlotte Johs</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 18</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">3,270</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">118.98 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">388,920 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Jukka Pekka Pertola</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">May 16</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">2,354</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">94.55 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">222,521 DKK</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Most notable is CEO Peter Karlstromer's purchase on May 28, 2025 for DKK 2.4 million. It is a
            significant amount and a clear signal of management's belief in the company's future. CFO Soeren Jelert
            also purchased shares for DKK 738,000 shortly before.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Overall, the picture is unambiguous: Six different insiders have all purchased shares on the open market
            during a period of high short interest, and none have sold. It is a positive signal, but it should
            be seen in the context that the stock currently trades at approximately DKK 94, close to the prices the insiders
            purchased at in May 2025.
          </p>
        </section>

        {/* ── The core question ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. The central question: Can the remaining business stand on its own?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            After the sale of Hearing, GN Store Nord is left with two divisions: Enterprise (Jabra professional
            equipment for meeting rooms and offices) and Gaming (SteelSeries). Together, they generated approximately
            DKK 8.4 billion in revenue in 2025. The question is whether these two businesses can justify the current
            market capitalization and deliver the growth that investors expect.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Positive factors</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Hearing sale provides DKK 17 billion for debt reduction</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>SteelSeries growing 7-13% organically (2026 guidance)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Enterprise video conferencing growing double digits</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Cost-savings program of DKK 200 million from 2027</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Six insiders (incl. CEO and CFO) have purchased shares</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Negative factors</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>EBITA margin only 0.3% in Q1 2026</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Guidance lowered (0-6% vs. 2-8%)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>DKK 750 million in one-off costs 2026-2027</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Fixed costs (IT, overhead etc.) remaining with GN after the Hearing sale</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Stock down 58% from 3-year high</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Conclusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">12. Conclusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            GN Store Nord is in the midst of the most comprehensive transformation in the company's recent history.
            Over two years, the company has shut down its consumer division, sold its hearing aid business, and lowered expectations
            for the remaining business. It is a company story that short sellers have followed closely,
            with a focus on the significant operational and strategic risks.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            It is noteworthy that more than 15 different hedge funds have held public short positions in
            GN over the past four years. It is not a single speculator, but a broad skepticism among professional
            investors regarding the company's transformation and valuation. The fact that short interest remains close
            to 10%, even after the Hearing sale and the sharp price decline, suggests that many still see risks
            in the new business model.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Upcoming catalysts to watch</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Completion of the Hearing sale to Amplifon (expected late 2026)</li>
              <li>&#x2022; Realization of the cost-savings program (DKK 200 million target from 2027)</li>
              <li>&#x2022; Q2 2026 earnings report (first quarter with better visibility on stranded costs)</li>
              <li>&#x2022; SteelSeries launch of new product platforms H2 2026</li>
              <li>&#x2022; Development in Enterprise order intake (indicator for organic growth)</li>
            </ul>
          </div>
        </section>

        <FeedbackWidget pageType="analysis" pageId="gn/2026-05-14" />
        <RelatedAnalyses currentSlug="gn/2026-05-14" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not constitute
            investment advice. Data is sourced from the Danish Financial Supervisory Authority's (Finanstilsynet) public registers and the company's own
            reports. Past performance is not a guarantee of future returns. Always conduct your
            own analysis and seek professional advice before trading.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  May 14, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default GNAnalysisPageEn;
