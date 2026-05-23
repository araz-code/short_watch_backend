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

// ─── static data ────────────────────────────────────────────────────────────
// Aggregated data points from the Zirium dataset (Finanstilsynet + closing prices).
// The dataset starts in October 2023.
const FULL_HISTORY: ChartPoint[] = [
  { date: "2023-10-23", short: 9.40, close: 131.1, volume: null },
  { date: "2023-10-31", short: 9.25, close: 134.25, volume: null },
  { date: "2023-11-07", short: 8.80, close: 135.6, volume: 401112 },
  { date: "2023-11-17", short: 9.06, close: 144.15, volume: 477857 },
  { date: "2023-12-13", short: 8.16, close: 172.4, volume: 486779 },
  { date: "2024-01-10", short: 7.16, close: 173.5, volume: 371505 },
  { date: "2024-02-14", short: 7.21, close: 155.55, volume: 430309 },
  { date: "2024-03-08", short: 5.65, close: 173.1, volume: 875602 },
  { date: "2024-04-22", short: 6.72, close: 150.1, volume: 421064 },
  { date: "2024-05-08", short: 6.92, close: 162.9, volume: 1800883 },
  { date: "2024-06-03", short: 4.66, close: 186.25, volume: 395551 },
  { date: "2024-07-09", short: 4.44, close: 185.2, volume: 604035 },
  { date: "2024-08-22", short: 4.20, close: 272.3, volume: 2904374 },
  { date: "2024-09-12", short: 3.91, close: 237.8, volume: 772184 },
  { date: "2024-10-22", short: 3.73, close: 223.5, volume: 709802 },
  { date: "2024-11-07", short: 3.04, close: 204.0, volume: 283492 },
  { date: "2024-12-09", short: 4.25, close: 196.2, volume: 149356 },
  { date: "2025-01-14", short: 3.44, close: 193.3, volume: 275012 },
  { date: "2025-02-21", short: 4.87, close: 174.2, volume: 467377 },
  { date: "2025-03-05", short: 5.07, close: 167.9, volume: 340701 },
  { date: "2025-04-04", short: 3.06, close: 143.15, volume: 469457 },
  { date: "2025-05-13", short: 2.20, close: 158.6, volume: 428297 },
  { date: "2025-06-13", short: 2.14, close: 183.85, volume: 228726 },
  { date: "2025-07-17", short: 1.74, close: 182.45, volume: 119559 },
  { date: "2025-08-14", short: 0.93, close: 238.5, volume: 170739 },
  { date: "2025-09-24", short: 0.87, close: 230.6, volume: 161524 },
  { date: "2025-10-22", short: 0.84, close: 241.8, volume: 329473 },
  { date: "2025-11-06", short: 0.77, close: 187.0, volume: 4064267 },
  { date: "2025-11-25", short: 2.11, close: 184.25, volume: 204096 },
  { date: "2026-01-07", short: 2.60, close: 199.5, volume: 352932 },
  { date: "2026-02-12", short: 2.32, close: 193.2, volume: 354832 },
  { date: "2026-03-11", short: 2.69, close: 183.1, volume: 153108 },
  { date: "2026-04-20", short: 2.11, close: 197.1, volume: 137879 },
  { date: "2026-05-12", short: 1.93, close: 198.4, volume: 448497 },
  { date: "2026-05-13", short: 1.98, close: 188.3, volume: 808450 },
];

const RECENT_PERIOD: ChartPoint[] = FULL_HISTORY.filter(
  (d) => d.date >= "2025-07-17"
);

const SELLERS: SellerSeries[] = [
  {
    name: "Qube Research & Technologies",
    latest: 0.00,
    data: [
      { date: "2023-07-25", value: 1.22 },
      { date: "2023-08-09", value: 1.33 },
      { date: "2023-09-21", value: 1.31 },
      { date: "2023-10-26", value: 1.09 },
      { date: "2023-12-01", value: 1.10 },
      { date: "2024-01-25", value: 0.57 },
      { date: "2024-03-07", value: 0.87 },
      { date: "2024-08-19", value: 0.80 },
      { date: "2024-12-24", value: 0.48 },
      { date: "2025-02-10", value: 1.00 },
      { date: "2025-03-25", value: 0.69 },
      { date: "2025-04-04", value: 0.00 },
    ],
  },
  {
    name: "Millennium Intl Mgmt",
    latest: 0.47,
    data: [
      { date: "2023-07-31", value: 0.50 },
      { date: "2023-08-16", value: 1.00 },
      { date: "2023-09-18", value: 0.68 },
      { date: "2023-10-27", value: 0.90 },
      { date: "2023-12-07", value: 1.00 },
      { date: "2024-02-16", value: 0.48 },
      { date: "2024-07-04", value: 0.82 },
      { date: "2024-08-20", value: 0.91 },
      { date: "2024-10-31", value: 0.58 },
      { date: "2024-11-04", value: 0.47 },
    ],
  },
  {
    name: "Connor Clark & Lunn",
    latest: 0.70,
    data: [
      { date: "2025-12-04", value: 0.53 },
      { date: "2025-12-15", value: 0.61 },
      { date: "2026-01-07", value: 0.70 },
      { date: "2026-01-21", value: 0.81 },
      { date: "2026-02-06", value: 0.79 },
      { date: "2026-02-19", value: 0.69 },
      { date: "2026-04-20", value: 0.70 },
    ],
  },
];

const PIE_DATA: PieSlice[] = [
  { name: "Connor Clark & Lunn", value: 0.70 },
  { name: "Below 0.50% (unknown)", value: 0.97 },
];

const PIE_COLORS = ["#e63946", "#d4d4d8"];
const SELLER_COLORS = ["#e63946", "#4361ee", "#2a9d8f"];

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
const BAVAAnalysisPageEn: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/bava", "bava_analysis");
    fetch(`${HOST}/stats/visit/bava-analysis/`).catch(() => {});
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
      <title>Zirium | Bavarian Nordic (BAVA) - Short Selling Analysis</title>
      <meta name="description" content="Analysis of short positions in Bavarian Nordic (BAVA). From 9.40% in October 2023 to below 2% today, through a takeover bid and a 54% drop from the all-time high." />
      <meta property="og:title" content="Short Selling Analysis: When BAVA topped the short sellers list" />
      <meta property="og:description" content="Analysis of short positions in Bavarian Nordic (BAVA). From 9.40% in October 2023 to below 2% today, through a takeover bid and a 54% drop from the all-time high." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/bava/2026-05-17" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Short Selling Analysis: When BAVA topped the short sellers list" />
      <meta name="twitter:description" content="Analysis of short positions in Bavarian Nordic (BAVA). From 9.40% in October 2023 to below 2% today, through a takeover bid and a 54% drop from the all-time high." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Short Selling Analysis: When BAVA topped the short sellers list",
        "description": "Analysis of short positions in Bavarian Nordic (BAVA). From 9.40% in October 2023 to below 2% today, through a takeover bid and a 54% drop from the all-time high.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-17",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/bava/2026-05-17",
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
          <span aria-hidden="true">&larr;</span>
          {t("Back")}
        </button>

        {/* Header */}
        <header className="mb-10 mt-4">
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">Analysis by Araz Bayat Makoo (Zirium) - May 17, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Short Selling Analysis: When BAVA topped the short sellers list
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Bavarian Nordic (BAVA)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            This analysis combines the development in short positions with the most important
            events at Bavarian Nordic since October 2023. The purpose is to put the numbers
            into context: What happened when short interest was at its highest, and what has
            brought it down to below 2%?
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="1.67%" label="Short interest (May 2026)" />
          <KPI value="9.40%" label="Peak in dataset (Oct 2023)" />
          <KPI value="1" label="Active short seller above 0.50%" />
          <KPI value="-54%" label="From ATH (DKK 411 intraday, Aug 2022)" />
        </div>

        {/* 1. Overview */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overview</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            One of the reasons I built the Danish Short Watch app and website was my interest in following
            BAVA's short position in particular. In 2023 the stock had one of the highest short interests on the
            Danish stock market. The dataset starts in October 2023,
            and on October 23 short interest reached 9.40%. That is the highest recorded
            level we have, but the dataset does not cover the period before, so the level may have
            been even higher.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Since then, short interest has fallen to 1.67%, a drop of approximately 82%.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Along the way, a number of things have happened: WHO once again declared mpox a
            public health emergency (PHEIC) in August 2024, and the stock rose to DKK 283.
            Nordic Capital and Permira launched a takeover bid in July 2025, and the bid
            collapsed in November of the same year. All of these events appear to be reflected
            in the development of short interest.
          </p>
        </section>

        {/* Chart 1: Full history */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short interest vs. share price</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">History since October 2023. Blue = short interest, purple = closing price (DKK).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest vs. share price for Bavarian Nordic from November 2023 to May 2026">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FULL_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="bavaShortGradEn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="40%" stopColor="#007AFF" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                  <filter id="bavaGlowEn">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 10]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[130, 290]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#bavaShortGradEn)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2, filter: "url(#bavaGlowEn)" }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
                <ReferenceLine yAxisId="short" y={9.40} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "9.40%", fontSize: 9, fill: "#eab308", position: "insideTopLeft" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Closing price</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Peak in dataset</span>
            </div>
          </div>
        </section>

        {/* 3. Background */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. The vaccine boom and what followed</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Bavarian Nordic is best known for JYNNEOS, one of the few approved mpox vaccines. The
            mpox outbreak began spreading globally in May 2022, and on July 23 the WHO declared
            an international public health emergency (PHEIC). Demand exploded. The US, the EU
            and a long list of countries placed large orders. The stock rose from approximately
            DKK 130 in May 2022 to DKK 411 intraday on August 5, 2022.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Subsequently, revenue fell again. JYNNEOS sales are closely tied to government orders
            during outbreaks: Governments replenish emergency stockpiles and order significantly
            fewer doses in the following years. In February 2023, the company announced the
            acquisition of Emergent BioSolutions' travel vaccine portfolio (Vivotif for typhoid,
            Vaxchora for cholera, and a chikungunya candidate in Phase 3) for up to USD 380 million,
            partly financed via a directed private placement of DKK 1,642 million at DKK 233 per share.
            That corresponded to approximately 10% dilution. The transaction closed in May 2023.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            It was during this period that short interest built up to the level we see at
            the start of the dataset in October 2023. We know from Finanstilsynet's individual
            disclosures that a long list of funds had positions above 0.50% already in 2022,
            including Marshall Wace (up to 1.60%), Arrowstreet Capital (up to 1.00%), and Capital
            Fund Management (up to 0.72%).
          </p>
        </section>

        {/* 4. Gradual unwinding */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. The gradual unwinding after the peak</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            From the peak in October 2023, short sellers began to withdraw, in a period when
            the stock rose significantly. Short interest fell from 9.40% to 8.16% in December and
            7.16% in early January 2024, while the stock went from approximately DKK 131 at the end
            of October to DKK 173 in mid-January. This is not a dramatic unwinding,
            but rather a steady closing of positions, which may have been influenced by the
            rising share price.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In August 2024 an interesting development occurred. WHO declared another
            mpox PHEIC (Clade I in DRC), and the stock rose significantly to above DKK 280.
            Short interest fell to around 4% at the end of August (low point 3.96% on
            August 28). But in the following months, as the stock fell back, short interest
            rose again. The Q3 report in November 2024 showed that JYNNEOS sales
            had fallen 26% year-over-year (USD 74.4 million vs. USD 100.3 million the year before), and
            short interest reached a secondary peak of 5.08% on March 5, 2025 at
            a share price of DKK 168.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Notably, short interest rose after the market's focus on mpox began to ease. This
            suggests that the market's concern was not about a single event, but about
            the underlying business model: Can Bavarian Nordic grow stably when
            JYNNEOS revenue is tied to outbreak cycles?
          </p>
        </section>

        {/* Chart 2: Recent period */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. The takeover bid and what followed</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">July 2025 to May 2026. On November 6, 2025, Nordic Capital and Permira withdrew the bid.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest and volume for Bavarian Nordic during and after the takeover attempt">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={RECENT_PERIOD} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="bavaShortGrad2En" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(d) => { const p = d.split("-"); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${m[parseInt(p[1])-1]} ${parseInt(p[2])}`; }} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0.5, 3.2]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="vol" hide domain={[0, 8000000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#bavaShortGrad2En)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volume</span>
            </div>
          </div>
        </section>

        {/* 6. Takeover bid */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. From 5.08% to 0.77%: The bid that changed everything</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The clearest shift in the data comes in the period from March to November 2025.
            Short interest fell overall from 5.08% on March 5 to 1.40% at the end of
            July and 0.77% on November 6. That is a drop of approximately 85% in eight months.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The timing coincides with Nordic Capital and Permira's takeover bid in July 2025,
            which started at DKK 233 per share and was later raised to DKK 250 in October.
            For short sellers, a takeover bid is a difficult
            situation: The stock rises toward the bid price, and the loss on a short position can grow
            significantly if the bid is completed. It is a classic mechanism that often forces
            short sellers to reduce or close positions.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            On November 6, 2025, Nordic Capital and Permira withdrew the bid, as the acceptance
            level was insufficient. The stock fell from DKK 236 to DKK 187 on massive volume.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            What's interesting is what happened afterwards. Short interest rose from 0.77%
            to 2.11% in just 19 days and reached 2.69% in March 2026. This suggests that new
            or existing players increased their short exposure after the bid's collapse. Since
            then it has fallen slightly
            again to 1.67% in May 2026.
          </p>
        </section>

        {/* Sellers section */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Who is shorting Bavarian Nordic?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            There is currently 1 institutional player with a position above the 0.50% reporting threshold:
            Connor Clark & Lunn Investment Management Ltd with 0.70% according to the most recent disclosure
            on April 20, 2026. Historically, a long list of funds have had positions in BAVA. Qube
            Research & Technologies was the largest known player in the analysis period with a position
            up to 1.33% (August 2023), but closed down completely in April 2025. Millennium International
            Management reached 1.00% in August 2023 and December 2023, but fell below the threshold in
            November 2024. The remaining approximately 0.97% is held by players below the reporting threshold,
            whose identity we do not know.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Active short sellers in Bavarian Nordic</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short seller</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                <SellerRow i={0} name="Connor Clark & Lunn Inv. Mgmt" position="0.70%" date="Apr 20" desc="Active since Dec 2025. Highest known: 0.81% (Jan 2026)." />
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Position history over time</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Individual short sellers' positions based on disclosures to Finanstilsynet. Intermediate data points are estimates.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Individual short sellers' position history for Bavarian Nordic">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={sellerChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 2.0]} />
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

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-8 mb-2">Breakdown of total short interest</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Approximately 58% of short interest is held by players below the 0.50% threshold, whose identity is unknown.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 flex justify-center" role="img" aria-label="Pie chart: Breakdown of total short interest in Bavarian Nordic">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" nameKey="name" paddingAngle={2} label={({ value }) => `${Number(value).toFixed(2)}%`} labelLine={{ stroke: isDark ? "#555" : "#ccc", strokeWidth: 1 }} style={{ fontSize: 11 }}>
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

        {/* Timeline */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">8. Timeline of key events</h2>
          <div className="ml-2">
            <TimelineEvent date="July - August 2022" title="WHO declares mpox a public health emergency (PHEIC): The stock rises to DKK 411" color="#2a9d8f">
              <p>The mpox outbreak spreads globally from May 2022, and on July 23 WHO declares an international public health emergency (PHEIC). The US, EU, and other countries place large vaccine orders. The stock rises from approximately DKK 130 in May 2022 to DKK 411 intraday on August 5, 2022.</p>
            </TimelineEvent>
            <TimelineEvent date="February 2023" title="Emergent acquisition announced" color="#4361ee">
              <p>Bavarian Nordic announces the acquisition of Emergent BioSolutions' travel vaccine portfolio (Vivotif, Vaxchora and the chikungunya vaccine candidate) for up to USD 380 million. The transaction was partly financed via a directed private placement of DKK 1,642 million at DKK 233, corresponding to approximately 10% dilution.</p>
            </TimelineEvent>
            <TimelineEvent date="October 2023" title="9.40% short interest - peak in dataset" color="#e63946">
              <p>The dataset starts in October 2023, and on October 23 the level reaches 9.40%, the highest recorded. The stock traded at approximately DKK 131.</p>
            </TimelineEvent>
            <TimelineEvent date="August 2024" title="WHO once again declares mpox a public health emergency (PHEIC): The stock rises to DKK 283" color="#2a9d8f">
              <p>WHO declares another PHEIC due to the Clade I mpox variant in DRC. The stock rises to DKK 283 in August 2024. Short interest falls to around 4% (low point 3.96% on August 28).</p>
            </TimelineEvent>
            <TimelineEvent date="November 2024" title="Q3 report: JYNNEOS sales -26% year-over-year" color="#e63946">
              <p>JYNNEOS sales in Q3 2024 are USD 74.4 million vs. USD 100.3 million the year before. The stock fell 17% close-to-close. Short interest subsequently rises from approximately 2.89% to 5.08% in March 2025.</p>
            </TimelineEvent>
            <TimelineEvent date="March 5, 2025" title="Secondary peak: 5.08% short interest" color="#e63946">
              <p>Short interest hits 5.08% at a share price of DKK 168. That is the highest level in the data since January 2024. From April a rapid decline in short interest begins.</p>
            </TimelineEvent>
            <TimelineEvent date="July 2025" title="Takeover bid from Nordic Capital and Permira: DKK 233" color="#4361ee">
              <p>Nordic Capital and Permira launch a takeover bid at DKK 233 per share. Short interest falls significantly in the following months from around 1.7% in July toward below 1% as the takeover process develops.</p>
            </TimelineEvent>
            <TimelineEvent date="October 2025" title="The bid is raised to DKK 250" color="#4361ee">
              <p>The bid is raised to DKK 250 per share. Short interest continues to fall and hits 0.77% on November 6.</p>
            </TimelineEvent>
            <TimelineEvent date="November 6, 2025" title="The bid is withdrawn: Stock -21%, short interest rises again" color="#e63946">
              <p>Acceptance is insufficient and the bid is withdrawn. The stock falls to DKK 187 on massive volume. In the following weeks, short interest rises from 0.77% to 2.11%.</p>
            </TimelineEvent>
            <TimelineEvent date="March 2, 2026" title="CEO Paul Chaplin announces his departure" color="#e63946">
              <p>After more than a decade as CEO, Paul Chaplin announces that he is stepping down for personal reasons, as his family wishes to return to Australia. He remains in the role through 2026 or until a successor is appointed. The board initiates a formal search process.</p>
            </TimelineEvent>
            <TimelineEvent date="May 2026" title="Short interest at 1.67%" color="#2a9d8f">
              <p>Short interest has fallen from 2.69% in March 2026 to 1.67%. Connor Clark & Lunn Investment Management is the only known player above the 0.50% threshold with 0.70%.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* Insider transactions */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Insider transactions</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Since March 2025, 17 insider transactions in Bavarian Nordic have been registered for
            a total of approximately DKK 12.9 million, and no insider sales have been registered.
            <strong> Important:</strong> Although the transactions appear as "Buy", they are really
            part of management's and the board's compensation - shares they receive as a bonus over time.
            They are therefore not shares they themselves have chosen to buy on the exchange with their own money.
            It is still a positive signal that no one is selling, but it is not the same as
            a real purchase on the open market.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Insider transactions in Bavarian Nordic</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Person</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Quantity</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Price</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">5 board members</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">May 13, 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">5 x 771</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 188.30</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">5 x DKK 133,881</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Paul Chaplin (CEO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 12, 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">10,642</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 177.65</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 1,891,000</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Henrik Juuel (CFO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 12, 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">5,748</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 177.65</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 1,021,000</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Jean-Christophe May (CCO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 12, 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">5,184</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 177.65</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 921,000</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Russell Thirsk (COO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 12, 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">3,637</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 177.65</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 646,000</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Paul Chaplin (CEO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">May 9, 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">25,663</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 155.81</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 3,999,000</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Russell Thirsk (COO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">May 9, 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">6,669</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 110.21</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 735,000</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">3 board members</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">May 9, 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">3 x 983</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 152.58</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">3 x DKK 150,000</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Paul Chaplin (CEO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 5, 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">12,543</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 108.71</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 1,364,000</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Henrik Juuel (CFO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 5, 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">6,480</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 108.71</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 704,000</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Jean-Christophe May (CCO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">Mar 5, 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">4,726</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 108.73</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">DKK 514,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The largest single transaction is CEO Paul Chaplin's RSU vesting in May 2025 of nearly
            DKK 4 million from a retention program established in 2021. The RSU vestings in March 2025
            stem from grants in 2022, the March 2026 vestings from the short-term
            incentive program with 3-year vesting, and the May 2026 vestings from the board's
            2023 grant.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Additional transactions:</strong> In addition, management received pure
            share grants (no consideration) in March 2025 and December 2024. Thomas Bennekov
            exercised stock options on November 29, 2024 and acquired 2,596 shares at
            DKK 146.60 (DKK 380,574). All of these transactions are compensation-based
            and reflect equity-based pay, not active investment decisions.
          </p>
        </section>

        {/* Bull/Bear */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Arguments for and against</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Most of the large known short sellers have reduced their positions significantly.
            Qube Research closed completely in April 2025, and Millennium fell below the reporting threshold
            of 0.50% in November 2024. Connor Clark & Lunn is the only player above 0.50% today
            with 0.70%. Approximately 58% of total short interest is held by players below
            the reporting threshold. Here are the most obvious arguments on both sides:
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Arguments for shorting</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>JYNNEOS revenue is tied to government orders during outbreaks</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Mpox vaccine sales fell 46% year-over-year in the first nine months of 2024</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>The failed takeover bid leaves uncertainty about strategy</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>CEO Paul Chaplin has announced his departure in 2026, creating leadership transition uncertainty</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Chikungunya revenue (Vimkunya: DKK 85 million in 2025) is still small, and commercial scale-up is uncertain</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Arguments against shorting</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>JYNNEOS remains one of the few approved mpox vaccines</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Travel vaccines (Rabipur, Encepur) provide recurring revenue</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>The stock is down 54% from ATH - much of the risk may be priced in</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>The bid from Nordic Capital and Permira at DKK 250 indicates that professional investors saw significant value in the company at these price levels</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>No insider sales have been registered in the period, indicating that management has chosen to keep the shares they receive through compensation</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Conclusion */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Conclusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            From 9.40% in October 2023 to 1.67% in May 2026, short interest in Bavarian Nordic
            has fallen approximately 82%. It happened in two phases: A gradual unwinding in 2024, and a rapid
            unwinding during the takeover bid in 2025, where short interest fell to just 0.77%.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The most interesting signal in recent data is what happened after the bid collapsed.
            Short interest rose from 0.77% to over 2.5% in a short period, suggesting renewed
            short interest at the price levels at the time. The position peaked at 2.69% in March
            2026 and has since fallen back to 1.67% in May 2026.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The large known short sellers from 2023 have all reduced their positions significantly.
            Qube Research & Technologies, which was the largest with up to 1.33%, reduced its
            position to below the reporting threshold in April 2025. Connor Clark & Lunn is the
            only current player above 0.50% with a position of 0.70%, most recently reported from
            December 2025.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Upcoming catalysts to watch</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; New mpox orders from the US and EU (emergency stockpiles are renewed periodically)</li>
              <li>&#x2022; Commercial scale-up of Vimkunya (the chikungunya vaccine) and further market approvals</li>
              <li>&#x2022; A new takeover attempt would again pressure short sellers</li>
              <li>&#x2022; Development in travel vaccine revenue as a signal of business stability</li>
              <li>&#x2022; Any new mpox outbreaks and authorities' response</li>
            </ul>
          </div>
        </section>

        <RelatedAnalyses currentSlug="bava/2026-05-17" />

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not
            constitute investment advice. Short interest data is sourced from Finanstilsynet's public registers
            via Zirium. The dataset for aggregate short interest starts in October 2023.
            Past performance is not a guarantee of future returns. Always conduct your own
            analysis and seek professional advice before trading.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  May 17, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default BAVAAnalysisPageEn;
