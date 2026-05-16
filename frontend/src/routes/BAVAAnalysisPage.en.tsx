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

// ─── static data ────────────────────────────────────────────────────────────
const FULL_HISTORY: ChartPoint[] = [
  { date: "2023-01-16", short: 2.2, close: 255, volume: null },
  { date: "2023-03-08", short: 2.5, close: 227, volume: null },
  { date: "2023-05-26", short: 2.7, close: 212, volume: null },
  { date: "2023-08-10", short: 2.9, close: 207, volume: null },
  { date: "2023-11-06", short: 3.1, close: 194, volume: null },
  { date: "2024-02-14", short: 3.3, close: 184, volume: null },
  { date: "2024-04-22", short: 3.4, close: 180, volume: null },
  { date: "2024-07-01", short: 3.2, close: 194, volume: null },
  { date: "2024-08-22", short: 2.9, close: 244, volume: null },
  { date: "2024-09-18", short: 3.5, close: 222, volume: null },
  { date: "2024-11-07", short: 3.8, close: 192, volume: null },
  { date: "2025-01-14", short: 3.9, close: 173, volume: null },
  { date: "2025-03-28", short: 3.86, close: 167, volume: null },
  { date: "2025-06-10", short: 3.4, close: 197, volume: null },
  { date: "2025-08-20", short: 3.1, close: 233, volume: null },
  { date: "2025-10-15", short: 2.8, close: 242, volume: null },
  { date: "2025-11-06", short: 3.0, close: 170, volume: 4200000 },
  { date: "2025-12-10", short: 2.11, close: 175, volume: null },
  { date: "2026-01-20", short: 2.1, close: 182, volume: null },
  { date: "2026-03-18", short: 2.0, close: 190, volume: null },
  { date: "2026-05-12", short: 2.1, close: 194, volume: null },
];

const RECENT_PERIOD: ChartPoint[] = FULL_HISTORY.filter(
  (d) => d.date >= "2025-08-20"
);

const SELLERS: SellerSeries[] = [
  {
    name: "AHL Partners LLP",
    latest: 1.05,
    data: [
      { date: "2022-10-14", value: 0.56 },
      { date: "2023-03-22", value: 0.76 },
      { date: "2023-08-08", value: 1.00 },
      { date: "2024-01-16", value: 1.28 },
      { date: "2024-05-14", value: 1.44 },
      { date: "2024-09-18", value: 1.65 },
      { date: "2025-01-20", value: 1.52 },
      { date: "2025-06-09", value: 1.35 },
      { date: "2025-11-18", value: 1.12 },
      { date: "2026-02-10", value: 1.05 },
    ],
  },
  {
    name: "Citadel Advisors LLC",
    latest: 0.57,
    data: [
      { date: "2022-03-01", value: 0.52 },
      { date: "2022-08-05", value: 0.44 },
      { date: "2022-11-15", value: 0.55 },
      { date: "2023-04-18", value: 0.57 },
      { date: "2023-09-12", value: 0.56 },
      { date: "2024-02-07", value: 0.57 },
      { date: "2024-08-20", value: 0.54 },
      { date: "2025-01-08", value: 0.58 },
      { date: "2025-07-14", value: 0.57 },
    ],
  },
  {
    name: "Marshall Wace LLP",
    latest: 0.51,
    data: [
      { date: "2022-01-10", value: 0.78 },
      { date: "2022-07-18", value: 0.53 },
      { date: "2022-11-02", value: 0.65 },
      { date: "2023-05-15", value: 0.73 },
      { date: "2024-01-17", value: 0.66 },
      { date: "2024-09-05", value: 0.55 },
      { date: "2025-04-07", value: 0.51 },
    ],
  },
];

const PIE_DATA: PieSlice[] = [
  { name: "AHL Partners LLP", value: 1.05 },
  { name: "Citadel Advisors LLC", value: 0.57 },
  { name: "Below 0.50% (unknown)", value: 0.49 },
];

const PIE_COLORS = [
  "#e63946", "#4361ee", "#d4d4d8",
];

const SELLER_COLORS = [
  "#e63946", "#4361ee", "#2a9d8f",
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
  const tickColor = isDark ? "#666" : "#bbb";

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
      <meta name="description" content="In-depth analysis of short positions in Bavarian Nordic (BAVA). From the 2022 mpox vaccine boom to the failed 2025 takeover bid." />
      <meta property="og:title" content="Short Selling Analysis: BAVA after the vaccine boom and failed takeover bid" />
      <meta property="og:description" content="In-depth analysis of short positions in Bavarian Nordic (BAVA). From the 2022 mpox vaccine boom to the failed 2025 takeover bid." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/bava/2026-05-15" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Short Selling Analysis: BAVA after the vaccine boom and failed takeover bid" />
      <meta name="twitter:description" content="In-depth analysis of short positions in Bavarian Nordic (BAVA). From the 2022 mpox vaccine boom to the failed 2025 takeover bid." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Short Selling Analysis: BAVA after the vaccine boom and failed takeover bid",
        "description": "In-depth analysis of short positions in Bavarian Nordic (BAVA). From the 2022 mpox vaccine boom to the failed 2025 takeover bid.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-15",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/bava/2026-05-15",
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

        {/* Header */}
        <header className="mb-10 mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Analysis by Araz Bayat Makoo (Zirium) - May 15, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Short Selling Analysis: BAVA after the vaccine boom and failed takeover bid
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Bavarian Nordic (BAVA)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Bavarian Nordic experienced one of the most dramatic stock price moves on Nasdaq Copenhagen in 2022,
            when the mpox outbreak created global demand for its JYNNEOS vaccine. The stock tripled in under
            six months. But as the outbreak faded, short sellers went to work. This analysis tracks how
            short interest evolved alongside the company's strategic transformation: from government
            contracts during the mpox crisis to the Emergent BioSolutions acquisition and the failed
            private equity takeover bid.
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="2.1%" label="Short interest (May 2026)" />
          <KPI value="194 DKK" label="Latest closing price (May 2026)" />
          <KPI value="2" label="Active short sellers above 0.50%" />
          <KPI value="-53%" label="From ATH (DKK 411, Aug 2022)" />
        </div>

        {/* 1. Overview */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overview</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Bavarian Nordic is a Danish vaccine company that has undergone two major transformations
            in recent years: the acquisition of Emergent BioSolutions' travel vaccine portfolio in 2023,
            and a failed takeover bid from Nordic Capital and Permira in 2025. Its most important product
            remains JYNNEOS/MVA-BN, the world's only approved mpox vaccine, but revenues from it are
            heavily dependent on government orders and outbreak dynamics.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Short interest reached its peak of 3.86% in March 2025, following two quarters of
            disappointing mpox sales and a guidance revision that raised questions about revenue
            sustainability. Since the failed takeover bid in November 2025, short interest has dropped
            to approximately 2.1%, though two institutional investors still maintain positions above
            the 0.50% reporting threshold for the Danish Financial Supervisory Authority (DFSA/Finanstilsynet).
          </p>
        </section>

        {/* Chart 1: Full history */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short interest vs. share price</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">History since January 2023. Blue = short interest, purple = closing price.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest vs. share price for Bavarian Nordic since January 2023">
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
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[1.5, 4.5]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[140, 270]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#bavaShortGradEn)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2, filter: "url(#bavaGlowEn)" }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
                <ReferenceLine yAxisId="short" y={3.86} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Closing price</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Peak short (3.86%)</span>
            </div>
          </div>
        </section>

        {/* 3. Vaccine boom */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. The vaccine boom: From niche player to global actor</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In May 2022, the WHO declared a global mpox outbreak. Bavarian Nordic's JYNNEOS vaccine was
            the world's only approved preventive mpox vaccine. The US, EU, and other governments rapidly
            placed massive procurement orders. The US government alone ordered millions of doses.
            The stock surged from approximately DKK 160 in spring 2022 to an all-time high of DKK 411
            on August 5, 2022, a gain of more than 150% in under six months.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            For short sellers, this was a painful period. DFSA data shows that Marshall Wace LLP had
            already built a position above 0.50% before the outbreak. When the stock exploded, these
            positions were sharply squeezed. Citadel Advisors LLC opened its position on March 1, 2022,
            before the peak, but likely reduced exposure during the mpox rally's height. Overall, short
            interest in the US OTC shares dropped 84.7% in August 2022, a classic short squeeze.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            As the mpox outbreak faded in autumn 2022, short positions began rebuilding. The market's
            question was now: what is Bavarian Nordic actually worth when the mpox contracts are not
            there? The company's underlying, recurring business was considerably more modest.
          </p>
        </section>

        {/* 4. Emergent acquisition */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. The Emergent acquisition: Diversification or distraction?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In February 2023, Bavarian Nordic announced the acquisition of Emergent BioSolutions' travel
            vaccine portfolio for up to USD 380 million (USD 274 million at closing plus up to USD 110 million
            in milestones). The portfolio included Rabipur (rabies vaccine), Encepur (TBE vaccine), and
            a chikungunya pipeline program.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            To finance the deal, Bavarian Nordic completed a directed private placement of DKK 1,642
            million in February 2023, issuing 7,046,839 new shares at DKK 233 per share, approximately
            10% dilution. Bookrunners were Danske Bank, Morgan Stanley, and Nordea.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The acquisition closed in May 2023. Financially, 2023 became Bavarian Nordic's best year
            on record with revenue of DKK 7.06 billion, primarily driven by JYNNEOS/MVA-BN sales of
            approximately USD 725 million. Travel vaccines contributed DKK 1.877 billion.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            But for short sellers, there was a clear concern: large JYNNEOS orders are episodic.
            Governments build up emergency stockpiles after an outbreak, then do not need the same
            volumes in subsequent years. Total EBITDA for 2023 was actually negatively impacted by
            Phase 3 investment in chikungunya and integration costs. Short interest rose gradually
            from approximately 2.2% at the start of 2023 to above 3% by year-end.
          </p>
        </section>

        {/* Chart 2: Recent period */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. The takeover period and aftermath</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">From August 2025 to May 2026. On November 6, 2025, Nordic Capital/Permira withdrew the bid.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest with volume for Bavarian Nordic during and after the takeover attempt">
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
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[1.8, 3.4]} />
                <YAxis yAxisId="vol" hide domain={[0, 8000000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#bavaShortGrad2En)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
                <ReferenceLine yAxisId="short" y={3.86} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Peak 3.86%", fontSize: 10, fill: "#eab308", position: "insideTopLeft" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volume</span>
            </div>
          </div>
        </section>

        {/* 6. Declining mpox orders */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. 2024: Declining mpox orders and growing skepticism</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In August 2024, WHO declared a second mpox PHEIC (Public Health Emergency of International
            Concern), this time related to the Clade I variant in the DRC and Central Africa. Bavarian
            Nordic and Africa CDC signed an agreement for 215,000 doses. The stock rose 13% on
            August 22, 2024, and the company raised its full-year guidance. It was a brief reprieve.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In November 2024, when Q3 results came out, the stock fell 12% in a single day. JYNNEOS
            sales in Q3 were USD 74.4 million versus USD 100.3 million the year before, a decline of 26%.
            For the first nine months of 2024, mpox vaccine sales had fallen 46% year-over-year. This
            was a clear signal that epidemic preparedness orders cannot substitute for a stable, recurring
            customer base.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            In early 2025, the company's guidance for full-year 2025 disappointed the market. The stock
            fell approximately 10% on the news. By March 2025, short interest had reached its peak of
            3.86%, while the stock traded near DKK 167, down more than 59% from the August 2022
            all-time high. That was the short sellers' moment of maximum conviction.
          </p>
        </section>

        {/* 7. Failed takeover */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. The failed takeover bid: An expensive lesson</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In summer 2025, Nordic Capital and Permira announced a takeover bid for Bavarian Nordic
            at DKK 250 per share. The bid initially required 90% shareholder acceptance, a threshold
            that was subsequently lowered to 75% and then to 66.7%. This progressively lower bar was
            a clear sign the bid was struggling to attract sufficient support.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            On November 6, 2025, the outcome: only approximately 60% of shareholders had accepted the
            offer. Nordic Capital and Permira withdrew the bid. The stock fell approximately 22% on
            the day, one of the largest single-day drops in the company's recent history. All gains
            driven by the bid evaporated. The stock subsequently traded near DKK 158-170.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            An intriguing signal in the failed bid: more than 33% of voting rights rejected DKK 250
            per share. This can be read two ways. Either the largest shareholders believe the company
            is worth more than DKK 250, or passive funds simply held their shares without actively
            engaging with the offer.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            By December 2025, short interest had fallen to 2.11%. The board subsequently authorized
            potential share issuance of up to 10% of capital through June 2027, and management
            signaled the possibility of future acquisitions via debt and equity financing.
          </p>
        </section>

        {/* Sellers section */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Who is shorting Bavarian Nordic?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            There are 2 institutional short sellers with positions above the 0.50% reporting threshold.
            The total reported position is approximately 1.62%, with the remaining approximately 0.49%
            held by actors below the threshold. AHL Partners LLP (Man Group) is the dominant player,
            with a position that peaked at 1.65% in September 2024.
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
                <SellerRow i={0} name="AHL Partners LLP (Man Group)" position="1.05%" date="Feb 10, 2026" desc="Active since Oct 2022. Peaked at 1.65% in Sep 2024. Gradually reduced." />
                <SellerRow i={1} name="Citadel Advisors LLC" position="0.57%" date="Jul 14, 2025" desc="Opened position Mar 1, 2022. 12+ adjustments. Stable 0.5-0.6%." />
                <SellerRow i={2} name="Marshall Wace LLP" position="0.51%*" date="Apr 7, 2025" desc="*Last reported position. Likely reduced below 0.50% since then." />
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Position history over time</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Individual short sellers' positions based on disclosures to Finanstilsynet (DFSA).</p>
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
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Based on most recently known reported positions (May 2026). Approximately 0.49% is held by actors below the 0.50% threshold.</p>
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">9. Timeline of key events</h2>
          <div className="ml-2">
            <TimelineEvent date="May 2019" title="FDA approves JYNNEOS for smallpox and mpox" color="#4361ee">
              <p>The US FDA approves JYNNEOS as the first non-replicating vaccine for smallpox and mpox for high-risk adults. This lays the groundwork for the explosive demand three years later.</p>
            </TimelineEvent>
            <TimelineEvent date="March 1, 2022" title="Citadel Advisors LLC opens short position" color="#e63946">
              <p>Citadel Advisors opens a short position above 0.50% in BAVA. The decision is made before the mpox outbreak breaks out in earnest. The stock was trading around DKK 150-160 at the time.</p>
            </TimelineEvent>
            <TimelineEvent date="May 2022" title="WHO declares global mpox outbreak" color="#2a9d8f">
              <p>WHO declares an international public health emergency (PHEIC) related to mpox. Since JYNNEOS is the world's only approved mpox vaccine, the US, EU, and other governments immediately place large orders. The stock begins to surge sharply.</p>
            </TimelineEvent>
            <TimelineEvent date="August 5, 2022" title="Stock peaks at DKK 411: all-time high" color="#2a9d8f">
              <p>Bavarian Nordic's stock hits DKK 411, a gain of more than 150% from the start of the year. Short sellers with existing positions suffer losses. OTC short interest in US-listed shares drops 84.7% in August 2022, a classic short squeeze.</p>
            </TimelineEvent>
            <TimelineEvent date="February 2023" title="Emergent acquisition announced: USD 380 million" color="#4361ee">
              <p>Bavarian Nordic announces the acquisition of Emergent BioSolutions' travel vaccine portfolio for up to USD 380 million. To finance the deal, a directed private placement of DKK 1,642 million is completed at DKK 233 per share (approximately 10% dilution).</p>
            </TimelineEvent>
            <TimelineEvent date="May 2023" title="Emergent acquisition closes" color="#4361ee">
              <p>USD 274 million paid at closing. The portfolio adds Rabipur and Encepur to BAVA's product range. 2023 becomes the record year with revenue of DKK 7.06 billion, but EBITDA is pressured by chikungunya Phase 3 investment and integration costs.</p>
            </TimelineEvent>
            <TimelineEvent date="August 22, 2024" title="WHO's second mpox PHEIC: stock rises 13%" color="#2a9d8f">
              <p>WHO declares another PHEIC due to Clade I mpox in the DRC. Bavarian Nordic and Africa CDC sign an agreement for 215,000 doses. Stock rises 13% in one day. Company raises full-year guidance. Brief reprieve for bulls.</p>
            </TimelineEvent>
            <TimelineEvent date="November 2024" title="Q3 results: mpox sales fall 26%, stock -12%" color="#e63946">
              <p>JYNNEOS Q3 sales of USD 74.4 million vs. USD 100.3 million the prior year (down 26%). For the first nine months of 2024, mpox sales are down 46% year-over-year. Stock falls 12% on the day. Short interest rises to approximately 3.8%.</p>
            </TimelineEvent>
            <TimelineEvent date="January 2025" title="2025 guidance disappoints: stock -10%" color="#e63946">
              <p>Bavarian Nordic presents 2025 guidance that disappoints the market. The stock falls approximately 10% on the news. In March 2025, short interest reaches 3.86%, the highest level in the analysis period. The stock trades near DKK 167.</p>
            </TimelineEvent>
            <TimelineEvent date="March 28, 2025" title="Peak: 3.86% short interest" color="#e63946">
              <p>DFSA disclosures show aggregate reported short positions of 3.86% of shares. AHL Partners LLP is the largest known actor, with a position of 1.65% (reported September 2024).</p>
            </TimelineEvent>
            <TimelineEvent date="Summer 2025" title="Takeover bid from Nordic Capital and Permira: DKK 250" color="#4361ee">
              <p>Nordic Capital and Permira launch a takeover bid for Bavarian Nordic at DKK 250 per share. The initial acceptance threshold is 90%, progressively lowered to 75% and then 66.7%. The stock rises toward the bid price of DKK 250.</p>
            </TimelineEvent>
            <TimelineEvent date="November 6, 2025" title="The failed bid: stock falls 22%" color="#e63946">
              <p>Only approximately 60% of shareholders accepted the offer. Nordic Capital and Permira withdraw the bid. The stock falls approximately 22% on the day, to approximately DKK 168-170. One of the largest single-day drops in the company's recent history.</p>
            </TimelineEvent>
            <TimelineEvent date="December 10, 2025" title="Short interest falls to 2.11%" color="#2a9d8f">
              <p>DFSA disclosures show total reported short positions have fallen to 2.11%. The board authorizes potential share issuance of up to 10% of capital through June 2027. Management signals possible future acquisitions.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* Bull/Bear */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. The case for and against</h2>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Positive factors</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>JYNNEOS remains the world's only approved mpox vaccine</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Travel vaccine portfolio (Rabipur, Encepur) provides stable, recurring revenue</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>2026 guidance: DKK 5,500-5,700 million in revenue</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Failed DKK 250 takeover bid confirms external interest in the company</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Short interest has dropped markedly from the 3.86% peak</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Negative factors</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>JYNNEOS revenue heavily dependent on government orders and outbreaks</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Mpox sales down 46% year-over-year (first nine months of 2024)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Stock down 53% from all-time high of DKK 411</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Failed takeover leaves strategic direction and ownership uncertain</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Emergent integration costs still a factor in near-term margins</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Conclusion */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Conclusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Bavarian Nordic's short selling history reflects a company caught in a constant valuation
            debate: is it primarily an mpox preparedness company with episodic revenue, or is it
            transforming into a broadly diversified vaccine player with stable cash flow from travel
            vaccines?
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Short interest peaked at 3.86% in March 2025, precisely when the market began doubting
            whether JYNNEOS revenue would hold, and after the company had disappointed with its 2025
            guidance. It is notable that the short position built up over a period of more than two
            years, with at least three major institutional actors: AHL Partners, Citadel, and Marshall
            Wace.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The failed DKK 250 takeover bid is a double-edged sword. On one hand, it showed that
            experienced PE investors saw enough potential to bid DKK 250. On the other, a large
            minority of shareholders would not sell at that price, signaling they expect more. This
            leaves the company as a potential acquisition target, but also with an unclear strategic
            path forward.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Upcoming catalysts to watch</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Mpox orders from the US and EU for 2027 (stockpile renewal cycles)</li>
              <li>&#x2022; Chikungunya vaccine: Phase 3 trial outcome and potential FDA filing</li>
              <li>&#x2022; Potential future acquisitions via debt and equity (management signaling)</li>
              <li>&#x2022; Travel vaccine growth (Rabipur, Encepur) as a stabilizing revenue source</li>
              <li>&#x2022; New mpox outbreaks and government responses to emergency stockpile levels</li>
            </ul>
          </div>
        </section>

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not
            constitute investment advice. Short interest data is sourced from Finanstilsynet's (DFSA)
            public registers. Some data points are estimates based on known anchor points.
            Past performance is not a guarantee of future returns. Always conduct your own analysis
            and seek professional advice before trading.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Generated by Zirium  |  May 15, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default BAVAAnalysisPageEn;
