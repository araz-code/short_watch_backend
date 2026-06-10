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
// Aggregated short interest vs. closing price (monthly downsampling of the
// Danish FSA disclosures). Source: Zirium's own data.
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
  { date: "2026-06-09", short: 7.54, close: 340.2, volume: null },
];

const RECENT: ChartPoint[] = FULL_HISTORY.filter((d) => d.date >= "2025-07-31");

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
    latest: 0,
    data: [
      { date: "2023-07-18", value: 0.51 }, { date: "2023-08-18", value: 0.70 },
      { date: "2023-09-01", value: 0.49 }, { date: "2026-04-10", value: 0.52 },
      { date: "2026-04-29", value: 0.70 }, { date: "2026-05-08", value: 0.84 },
      { date: "2026-05-12", value: 0.79 }, { date: "2026-05-22", value: 0.66 },
      { date: "2026-05-29", value: 0.59 }, { date: "2026-06-04", value: 0.49 },
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
  { name: "PDT Partners", value: 0.49 },
  { name: "Below 0.50% (undisclosed)", value: 6.06 },
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
const NetcompanyAnalysisPageEn: React.FC = () => {
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
      <title>Zirium | Netcompany (NETC) - Short Selling Analysis</title>
      <meta name="description" content="In-depth analysis of short positions in Netcompany (NETC). The shorts covered through the 2024 rally, and a new wave is building against a P/E around 57." />
      <meta property="og:title" content="Short selling analysis of Netcompany: The shorts that covered, and the ones that came back" />
      <meta property="og:description" content="In-depth analysis of short positions in Netcompany (NETC). The shorts covered through the 2024 rally, and a new wave is building against a P/E around 57." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/netcompany/2026-06-10" />
      <meta property="og:image" content="https://www.zirium.dk/og-images/netcompany-2026-06-10-en.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Short selling analysis of Netcompany: The shorts that covered, and the ones that came back" />
      <meta name="twitter:description" content="In-depth analysis of short positions in Netcompany (NETC). The shorts covered through the 2024 rally, and a new wave is building against a P/E around 57." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/netcompany-2026-06-10-en.png" />
      <link rel="canonical" href="https://www.zirium.dk/analyse/netcompany/2026-06-10" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Short selling analysis of Netcompany: The shorts that covered, and the ones that came back",
        "description": "In-depth analysis of short positions in Netcompany (NETC). The shorts covered through the 2024 rally, and a new wave is building against a P/E around 57.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-06-10",
        "dateModified": "2026-06-10",
        "image": "https://www.zirium.dk/og-images/netcompany-2026-06-10-en.png",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/netcompany/2026-06-10",
        "inLanguage": "en",
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
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-1">Analysis by Araz Bayat Makoo (Zirium) - June 10, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Short selling analysis of Netcompany: The shorts that covered, and the ones that came back
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Netcompany Group (NETC)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Netcompany is one of the most fascinating short-selling stories on the Danish market
            because it has two acts. Short sellers held almost 10% of the stock at the 2023 lows, capitulated
            through the entire 2024 rally, and have now returned with a new wave while the stock
            trades at a reported P/E around 57. This analysis combines the development in the short
            positions with the company's journey from pandemic darling to acquisition-driven growth case.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="7.54%" label="Short interest (June 9, 2026)" />
          <KPI value="340.20 DKK" label="Latest close (June 9)" />
          <KPI value="10.17%" label="Peak short (Nov 6, 2023, price bottom)" />
          <KPI value="~57" label="P/E (reported, ~30 adjusted)" />
        </div>

        {/* ── 1. The big picture ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. The big picture</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Netcompany builds business-critical IT solutions, primarily for the public sector in
            Denmark, Norway, the United Kingdom, the Netherlands and Greece (through the former
            Intrasoft). It is a model with high visibility and long contracts, but also with a tight
            link between consultant hours and revenue. That is precisely why the stock has become a
            favourite target for hedge funds speculating both on the valuation and on margin pressure.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Current short interest is 7.54% as of June 9, 2026, up from below 3% in the autumn of 2024.
            The interesting part is how it got there: The short peaked at 10.17% at the lows in November
            2023, fell through 2024 to 2.34% (with a sharp drop in early 2024 as BlackRock covered) as
            the share price rose about 70% (from around 205 to above 350), and is now climbing again.
            This is not the same story as most Danish short cases, where the short follows a stock down.
            Here the shorts covered into a rally, and a new group has come back after the stock had risen.
          </p>
        </section>

        {/* ── Chart 1: Full history ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short interest vs. share price</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">History since November 2023. Blue = short interest, purple = closing price.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest vs. share price for Netcompany since November 2023">
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Closing price</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Peak (10.17%)</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            The chart tells the whole story. Note the almost perfect mirroring in 2024: As the purple
            price line rose from around 205 to above 350, the blue short line fell from almost 10% to
            below 3%. The shorts took losses and closed positions. From early 2026 the pattern reverses:
            Short interest is rising again, even with the share price at elevated levels.
          </p>
        </section>

        {/* ── 2. Background ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. From pandemic darling to a 75% drop</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Netcompany was listed in June 2018 at around 155 DKK per share. During the pandemic the
            company became one of the most hyped growth stocks on the Copenhagen exchange, driven by a
            wave of public-sector digitalisation, and peaked at 861.60 DKK on August 23, 2021. At that
            point the stock traded at a valuation that assumed many years of high, profitable growth.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Two things broke the story. First, the rate hikes of 2022 hit all highly priced growth
            stocks hard, and a P/E in the 40s suddenly became hard to justify. Second, earnings came
            under pressure: After the acquisition of Greece's Intrasoft in 2021 and an aggressive
            build-out of capacity, not least in the United Kingdom, costs grew faster than earnings.
            The net margin fell from around 11% in 2022 to about 5% in 2023, and earnings per share
            roughly halved from 12.27 to 6.13 DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The result was a drop of more than 75% from the top. The stock found its bottom around
            200-220 DKK in the autumn of 2023, and that was exactly where short interest peaked. When
            scepticism was at its highest, the shorts held more than 10% of the stock.
          </p>
        </section>

        {/* ── 3. 2023-2024 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. 2023-2024: The peak in short interest, then the capitulation</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The dominant short seller in this period was BlackRock, which steadily built its position
            from 0.65% in late 2021 to a full 3.72% in January 2024, the largest named single position
            registered in the stock. The remarkable thing is how few followed it above the threshold:
            Even when short interest peaked at 10.17%, only BlackRock and Fosse Capital were above
            0.50%, with around 5% between them. The rest was spread across anonymous positions below
            the threshold. The consensus among the shorts was that the low margin was structural and
            that the growth premium had to go.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            They were wrong, at least in the short run. Over 2024 Netcompany showed strong order intake
            and began to restore its margin. The stock rose from around 205 DKK to above 350 DKK during
            the year. For the shorts it was painful, and they reacted by covering: BlackRock scaled down
            from 3.72% over six weeks and finally cut from 2.39% to 0.41% in two days in late February
            2024, and total short interest fell to its bottom of 2.34% on November 1, 2024.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            It is an important lesson in the mechanics of short selling: Falling short interest is not
            in itself a buy signal. Here it fell because the shorts were losing and were forced to close,
            or chose to, not because the risk in the company had disappeared.
          </p>
        </section>

        {/* ── Chart 2: Recent ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. The new wave in detail</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Short interest with volume since July 2025. The build from just over 3% to 7.5% is clearly visible.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest with volume for Netcompany since July 2025">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={RECENT} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="netcShortGradR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(d) => { const p = d.split("-"); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${m[parseInt(p[1])-1]} '${p[0].slice(2)}`; }} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[2, 8]} />
                <YAxis yAxisId="vol" hide domain={[0, 1800000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#netcShortGradR)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volume</span>
            </div>
          </div>
        </section>

        {/* ── 4. SDC / NBS ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. The SDC acquisition: Growth that was bought</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In February 2025 Netcompany agreed to acquire Skandinavisk Data Center (SDC) for around
            DKK 1.0 billion, and the deal closed on July 1, 2025. SDC is a banking platform that
            provides IT infrastructure to a wide range of Nordic banks, and the business was renamed
            Netcompany Banking Services (NBS). The acquisition is expected to lift earnings per share
            from 2026, and by a double-digit percentage from 2028.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The acquisition is central to understanding the 2026 numbers. NBS adds substantial, but
            slower-growing, revenue to the accounts, and it is precisely the gap between reported and
            organic growth that has become one of the key points of contention between the optimists
            and the shorts.
          </p>
        </section>

        {/* ── 5. Q1 2026 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Q1 2026: +38.7% on the surface, disappointment underneath</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            On May 6, 2026 Netcompany published its Q1 results. The headline number was strong: Total
            revenue grew 38.7% year on year in constant currencies. But almost the entire difference
            came from NBS, which was not part of the comparison figures for Q1 2025. Organic growth was
            13.1%, which was actually above the company's own full-year guidance of 5-10% excluding
            NBS. Even so, the stock fell on the day because earnings per share fell short of
            expectations.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The most important signal for the bull case was the margin guidance. Netcompany had already
            raised it on March 26, 2026 and maintained it in Q1: An adjusted EBITDA margin excluding
            NBS of 17-20%, with management explicitly pointing to AI embedded in methodology and
            platforms as part of the explanation for the improved delivery execution. If that holds, it
            is the rare situation where a consultancy partially breaks the linear link between hours
            and earnings.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            This is exactly the point that makes Netcompany an AI story with two interpretations. The
            same word, AI, is at the core of both the bull case (we deliver more cheaply and at higher
            margins) and the bear case (generative AI may eventually commoditise custom software
            development and squeeze both prices and growth). Nobody can know whether the rising short
            positions are driven by that particular interpretation, since most of the positions are
            anonymous. But they show that scepticism is growing at the same time as the AI debate has
            made the case more binary.
          </p>
        </section>

        {/* ── Sellers section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Who is shorting Netcompany?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            The most remarkable thing about the current 7.5% short is how little of it is visible. Only
            one seller is above the 0.50% disclosure threshold: Fosse Capital at 0.99%. Citadel Advisors
            exited on June 4, and the quant fund PDT Partners, which entered at the threshold the same
            day, fell back to 0.49% just a day later. The remaining roughly 6.06% is held by a range of
            players who each sit below 0.50% and whose identity is therefore unknown. The bulk of the
            bet against Netcompany is anonymous. It is also worth remembering that rising short interest
            is a signal, not proof: Precisely because most of it is anonymous, the 7.54% can cover
            anything from valuation bets to hedging and quant strategies with very different time
            horizons.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Named short sellers in Netcompany around the 0.50% threshold</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short seller</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                <SellerRow i={0} name="Fosse Capital Partners" position="0.99%" date="Apr 17, 2026" desc="Long-running short. Peaked at 1.63% in Nov 2023. Now reducing gradually." />
                <SellerRow i={1} name="PDT Partners LLC" position="0.49%" date="June 5, 2026" desc="New quant fund. Entered at the threshold on June 4 but fell below 0.50% again the next day." />
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Positions over time</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Selected short sellers&apos; positions based on disclosures to the Danish FSA. BlackRock was the historical whale.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Selected short sellers' position development over time for Netcompany">
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

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-8 mb-2">Breakdown of the total short interest</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">About 80% of the short interest is held by unknown players below the 0.50% threshold. PDT Partners&apos; 0.49% is only known because the fund has just fallen back below the threshold.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 flex justify-center" role="img" aria-label="Pie chart: Breakdown of the total short interest in Netcompany">
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
            <TimelineEvent date="June 2018" title="Listed at around 155 DKK" color="#4361ee">
              <p>Netcompany was listed on Nasdaq Copenhagen. Even then the company was known for its fixed delivery model and its dominance in public-sector digitalisation in Denmark.</p>
            </TimelineEvent>
            <TimelineEvent date="August 2021" title="All-time high: 861.60 DKK" color="#2a9d8f">
              <p>The pandemic&apos;s digitalisation wave and the acquisition of Greece&apos;s Intrasoft made Netcompany one of the exchange&apos;s most expensive growth stocks. The valuation assumed many years of high, profitable growth.</p>
            </TimelineEvent>
            <TimelineEvent date="2022-2023" title="Rate shock and margin pressure: -75%" color="#e63946">
              <p>Rising rates hit highly priced growth stocks, and at the same time the net margin fell from around 11% to 5% while earnings per share roughly halved. The stock fell more than 75% from the top.</p>
            </TimelineEvent>
            <TimelineEvent date="November 2023" title="Short interest peaks at 10.17%" color="#e63946">
              <p>With the share price bottoming around 205 DKK, short sellers held more than 10% of the stock. BlackRock was the largest with a position heading towards 3.72%. Scepticism was at its peak.</p>
            </TimelineEvent>
            <TimelineEvent date="February 2024" title="The capitulation begins" color="#2a9d8f">
              <p>Amid strong order intake and a rising share price, BlackRock scaled its position down from 3.72% and finally cut from 2.39% to 0.41% in two days. It marked the start of a broad decline in short interest through 2024.</p>
            </TimelineEvent>
            <TimelineEvent date="November 2024" title="Short interest bottoms at 2.34%" color="#4361ee">
              <p>The stock had risen to around 320 DKK, and on November 1 short interest hit its lowest level. For a while the short case looked dead.</p>
            </TimelineEvent>
            <TimelineEvent date="July 1, 2025" title="The SDC acquisition closes" color="#4361ee">
              <p>Netcompany completed the acquisition of Skandinavisk Data Center for around DKK 1.0 billion and renamed it Netcompany Banking Services. The acquisition adds substantial revenue to the accounts from 2026.</p>
            </TimelineEvent>
            <TimelineEvent date="May 6, 2026" title="Q1 2026: Strong growth, but an EPS miss" color="#e63946">
              <p>Total revenue growth of 38.7% in constant currencies (driven by NBS), organic growth of 13.1% above guidance, and margin guidance excluding NBS of 17-20% with AI as the explanation. Even so, the stock fell on an EPS miss. Short interest was heading towards 7%.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* ── The core question ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. The core question: Does Netcompany deserve its valuation?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The new wave of shorts is ultimately about the valuation. At a reported P/E around 57
            (about 30 adjusted for acquisition amortisation and integration costs, 14-16 on analysts&apos;
            2026 estimates), the stock is still richly priced and the margin for error is limited. The
            bull case and the bear case revolve around the same two questions: Is the growth real and
            organic, and is AI a tailwind or a threat?
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">The bull case</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Organic growth of 13.1% in Q1, above guidance</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Margin guidance raised to 17-20% excluding NBS</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>AI lowers delivery costs and lifts margins</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Sticky, long-term public-sector contracts</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>NBS is EPS accretive from 2026</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">The bear case</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>The +38.7% is acquisition-driven, not organic</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Rich valuation (P/E ~57 reported, ~30 adjusted)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>AI may commoditise custom development for everyone</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>EPS disappointed in Q1 despite revenue growth</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>The margin history shows how quickly it can fall</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The honest synthesis is that the margin upgrade shows AI is helping the cost side today,
            but it does not settle the pricing and demand side of tomorrow, and that is where the bear
            case has its strongest argument. Likewise, the bought growth from SDC is not a problem in
            itself; it only becomes a bear argument if the integration or the return on the acquisition
            disappoints. The margin upgrade says the optimists are ahead on points right now. The 7.5%
            that is not just staying but growing says the battle is far from settled.
          </p>
        </section>

        {/* ── Conclusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Conclusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Netcompany is a rare short case with two acts. In the first act the shorts held almost 10%
            at the 2023 lows, underestimated the company&apos;s ability to restore its margin, and
            capitulated through the entire 2024 rally. It is a reminder that high short interest is no
            guarantee that a stock will fall, and that falling short interest is not a buy signal in
            itself.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In the second act, which we are in the middle of, a new group has come back. This time it
            is less about margin pressure and more about valuation: A reported P/E around 57, a large
            share of the growth bought via SDC, and an open question about what generative AI will do
            to the consulting model over time. With about four fifths of the short interest anonymous,
            below the disclosure threshold, it is hard to know exactly who is behind it, but the
            direction is clear: Scepticism is growing again.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Upcoming catalysts to watch</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Organic vs. reported growth in the coming quarters (the NBS effect)</li>
              <li>&#x2022; Whether the adjusted EBITDA margin excluding NBS actually lands at 17-20%</li>
              <li>&#x2022; Whether short interest keeps climbing (conviction) or turns (capitulation)</li>
              <li>&#x2022; New named sellers above 0.50% (Citadel has just exited, and PDT Partners fell below the threshold after one day), or whether Fosse keeps trimming</li>
              <li>&#x2022; Concrete evidence that AI lifts margins rather than squeezing prices</li>
            </ul>
          </div>
        </section>

        <FeedbackWidget pageType="analysis" pageId="netcompany/2026-06-10" />
        <RelatedAnalyses currentSlug="netcompany/2026-06-10" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Sources:</strong> The Danish FSA&apos;s register of large short positions via Zirium
            (aggregated short interest from October 2023, named positions from 2021), Yahoo Finance via
            yfinance (price data), Netcompany&apos;s annual and interim reports, and analysts&apos;
            consensus estimates.{" "}
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not
            constitute investment advice. Past performance is not a guarantee of future returns. Always
            do your own analysis and seek professional advice before trading.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  June 10, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default NetcompanyAnalysisPageEn;
