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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TooltipContentProps } from "recharts/types/component/Tooltip";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

// ─── data ───────────────────────────────────────────────────────────────────
// Short interest changes with corresponding close price (sampled at key changes)
const POSITION_HISTORY = [
  { date: "2023-11-06", short: 4.09, close: 291 },
  { date: "2023-12-01", short: 3.89, close: 330 },
  { date: "2024-01-15", short: 3.98, close: 434 },
  { date: "2024-03-01", short: 2.83, close: 649 },
  { date: "2024-05-13", short: 3.20, close: 619 },
  { date: "2024-07-10", short: 2.68, close: 954 },
  { date: "2024-09-01", short: 2.59, close: 887 },
  { date: "2024-11-13", short: 4.35, close: 816 },
  { date: "2025-01-13", short: 5.46, close: 699 },
  { date: "2025-02-13", short: 6.13, close: 749 },
  { date: "2025-03-12", short: 5.43, close: 674 },
  { date: "2025-05-13", short: 8.34, close: 415 },
  { date: "2025-06-20", short: 8.16, close: 375 },
  { date: "2025-08-13", short: 7.88, close: 341 },
  { date: "2025-09-15", short: 7.08, close: 429 },
  { date: "2025-11-13", short: 5.56, close: 521 },
  { date: "2025-12-11", short: 4.61, close: 514 },
  { date: "2026-01-13", short: 5.87, close: 410 },
  { date: "2026-02-13", short: 5.87, close: 400 },
  { date: "2026-03-06", short: 6.51, close: 235 },
  { date: "2026-03-09", short: 7.58, close: 256 },
  { date: "2026-04-09", short: 8.35, close: 297 },
  { date: "2026-04-30", short: 9.44, close: 299 },
  { date: "2026-05-08", short: 10.02, close: 341 },
  { date: "2026-05-13", short: 10.13, close: 311 },
];

// Per-period breakdown for the method comparison chart
const METHOD_COMPARISON = [
  { method: "Method 1", label: "Exposure-weighted\nhistorical price level", value: 508, color: "#4361ee" },
  { method: "Method 2", label: "Incremental entry price\n(most accurate)", value: 499, color: "#2a9d8f" },
  { method: "Method 3", label: "Incremental entry price\n(last 6 months only)", value: 352, color: "#f77f00" },
  { method: "Method 4", label: "Simple average\n(12 months)", value: 403, color: "#9b5de5" },
];

// Per-seller estimated entry prices
const SELLER_ENTRIES = [
  { name: "D. E. Shaw & Co.", position: "0.50%", entry: 629, current: 311, pnl: "+51%", profitable: true },
  { name: "Connor Clark & Lunn", position: "0.80%", entry: 380, current: 311, pnl: "+18%", profitable: true },
  { name: "AHL Partners", position: "0.91%", entry: 362, current: 311, pnl: "+14%", profitable: true },
  { name: "Jupiter Asset Mgmt", position: "0.70%", entry: 352, current: 311, pnl: "+12%", profitable: true },
  { name: "Citadel Advisors", position: "0.63%", entry: 327, current: 311, pnl: "+5%", profitable: true },
  { name: "Marshall Wace", position: "1.28%", entry: 299, current: 311, pnl: "-4%", profitable: false },
  { name: "Jennison Associates", position: "0.61%", entry: 289, current: 311, pnl: "-8%", profitable: false },
  { name: "Voleon Capital", position: "1.00%", entry: 193, current: 311, pnl: "-61%", profitable: false },
];

// Period breakdown
const PERIOD_DATA = [
  { period: "Oct 2023 - Jun 2024", avgPrice: 454, sharesAdded: "7.2M", priceRange: "279-893 DKK" },
  { period: "Jul 2024 - Feb 2025", avgPrice: 811, sharesAdded: "5.6M", priceRange: "663-954 DKK" },
  { period: "Mar 2025 - Feb 2026", avgPrice: 449, sharesAdded: "11.8M", priceRange: "311-674 DKK" },
  { period: "Mar 2026 - May 2026", avgPrice: 292, sharesAdded: "3.9M", priceRange: "235-372 DKK" },
];

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtShortDate(d: string) {
  const parts = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
}

function ShortPriceTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const shortVal = payload.find((p) => p.dataKey === "short");
  const priceVal = payload.find((p) => p.dataKey === "close");
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">{String(label)}</p>
      {shortVal && <p className="text-center font-bold text-lg tabular-nums text-[#007AFF]">{Number(shortVal.value).toFixed(2)}%</p>}
      {priceVal && priceVal.value != null && <p className="text-center text-purple-500 dark:text-purple-400 tabular-nums">{Number(priceVal.value).toFixed(0)} DKK</p>}
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────
const ZealCostAnalysisPageEn: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/zeal/gennemsnitspris", "zeal_cost_analysis");
    fetch(`${HOST}/stats/visit/zeal-cost-analysis/`).catch(() => {});
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

  return (
    <PageTemplate>
      <title>Zirium | Zealand Pharma (ZEAL) - Average Short Price</title>
      <meta name="description" content="At what price did they short Zealand Pharma? Four calculation methods compared." />
      <meta property="og:title" content="At what price did they short Zealand Pharma?" />
      <meta property="og:description" content="Four calculation methods compared. Estimated entry price per short seller and analysis of who is making money." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/en/analyse/zeal/gennemsnitspris/2026-05-14" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="At what price did they short Zealand Pharma?" />
      <meta name="twitter:description" content="Four calculation methods compared. Estimated entry price per short seller and analysis of who is making money." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "At what price did they short Zealand Pharma?",
        "description": "Four calculation methods compared. Estimated entry price per short seller and analysis of who is making money.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-15",
        "mainEntityOfPage": "https://www.zirium.dk/en/analyse/zeal/gennemsnitspris/2026-05-14",
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
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">Analysis by Araz Bayat Makoo (Zirium) - May 15, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            At what price did they short Zealand Pharma?
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Zealand Pharma (ZEAL)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            When a stock is heavily shorted, one of the most natural questions is: "At what price did
            they short? Are they making money?" The short answer is that it is surprisingly difficult to
            calculate precisely. This analysis explains why, and presents four different methods that all
            yield different results.
          </p>
        </header>

        {/* ── 1. Why is it difficult ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Why is it difficult to calculate?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            When we see that 10% of a stock is shorted, it is natural to assume that the same investors
            have held the position all along. But short positions are dynamic. Funds continuously open
            and close their positions, and the total short interest is merely a snapshot. The 10% we see
            today may consist of entirely different investors than six months ago.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            This creates three concrete problems when we try to calculate the average price:
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 mb-4">
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              <span><strong>Positions change hands:</strong> Since November 2023, short positions equivalent to
              28.6 million shares have been opened, while 21.4 million have been closed again. Today, approximately 7.2 million
              shares are shorted. The cumulative short activity amounts to nearly four times the current short interest,
              indicating significant rotation in positions. A fund that shorted at 800 DKK may have long since closed
              with a profit, and an entirely different fund may hold that position today.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              <span><strong>We don't know all participants:</strong> Approximately 36% of the short interest is held by
              actors with net short positions below 0.50%, which are not disclosed. Actors are required to report
              to the Danish Financial Supervisory Authority (Finanstilsynet) when their total net short position exceeds
              0.10% of the company's share capital. However, only positions above 0.50% are published. We can see the
              total short interest rising, but we do not know exactly which actors are behind the individual changes, or
              at what price they traded.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">3.</span>
              <span><strong>We only see the net change:</strong> If a fund closes 10,000 shares and opens 15,000
              new ones on the same day, we only see an increase of 5,000. The actual trading activity is far greater
              than the figure we can observe.</span>
            </li>
          </ul>
        </section>

        {/* ── Chart: Short interest + price ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short interest vs. stock price</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            The chart shows how short interest (blue) and the stock price (purple) have evolved. The dashed
            yellow line shows the incremental entry price (~499 DKK). Note how much the price has
            fluctuated: from 235 to 954 DKK.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest vs. stock price for Zealand Pharma with estimated average entry price">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={POSITION_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="zcShortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[2, 11]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[100, 1000]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#zcShortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
                <ReferenceLine yAxisId="price" y={499} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Closing price</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Est. avg. entry (~499 DKK)</span>
            </div>
          </div>
        </section>

        {/* ── 3. Period breakdown ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. When were the positions opened?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            To understand what the short sellers paid, we can look at the periods when short interest increased.
            When short interest rises from, say, 5% to 6%, it means someone has opened new positions. We assume
            that the new shorts were opened at the previous trading day's closing price, as changes are typically
            reported the day after the trade. The table shows four periods with very different price levels:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Period breakdown of short positions in Zealand Pharma</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Period</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Avg. entry price</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Shares added</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Price range</th>
                </tr>
              </thead>
              <tbody>
                {PERIOD_DATA.map((p, i) => (
                  <tr key={p.period} className={i % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50/50 dark:bg-[#15151a]"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.period}</td>
                    <td className="px-4 py-3 text-sm tabular-nums font-semibold text-gray-900 dark:text-white">{p.avgPrice} DKK</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-300">{p.sharesAdded}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">{p.priceRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The most striking period is July 2024 to February 2025. Here, 5.6 million shares were shorted at an
            average price of 811 DKK, when the stock was still near its peak. If a significant portion of these
            positions are still open, they represent a large unrealized gain (the stock currently trades at
            311 DKK). But that is a big "if": Many of them may have already closed and realized the profit.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            At the other end of the spectrum are the most recent shorts from March-May 2026, which entered at
            an average price of just 292 DKK. These shorts have almost no gain at the current price and risk
            quickly moving into the red if the stock rises.
          </p>
        </section>

        {/* ── 4. Four calculation methods ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Four calculation methods compared</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            There is no single "correct" way to calculate the average price. Different methods yield different
            results because they make different assumptions. Here are four methods that range from 352 to
            508 DKK. Together they provide an interval that likely captures the real average price.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {METHOD_COMPARISON.map((m) => (
              <div key={m.method} className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{m.method}</p>
                  <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{m.value} DKK</p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300 whitespace-pre-line">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Method 1: Exposure-weighted historical price level (508 DKK)</h4>
              <p>For each day in the entire dataset (from October 2023 to today), we look at how large the short interest is and what the stock price is. Days with higher short interest count more, because more shares are exposed at that price. This method does not show a real entry price, but rather the average price level that short positions have been exposed to over time. A position opened at 800 DKK and held for many months will dominate the result, even if it may already have been closed.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Method 2: Incremental entry price (499 DKK)</h4>
              <p>This method goes through the entire dataset (from October 2023 to today) and only looks at days when total short interest increased. If short interest rises from 5% to 6%, we assume that net new shorts equivalent to 1% were opened, and that they were opened at the previous trading day's price. Days when short interest decreased (i.e., when more positions were closed net than opened) are ignored. This gives an estimate of the average price at which all historical short positions have been built up. The weakness is that we do not know whether the early shorts are still open or have long since been closed with a profit.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Method 3: Incremental entry price, last 6 months (352 DKK)</h4>
              <p>Same method as method 2, but only over the last 6 months. In this period, short interest has risen from 5.56% to 10.13%, and approximately 6.9 million shares have been opened gross (the sum of the daily increases). By only looking at this period, we better capture the current shorts, since many older positions have likely already been closed. The result of 352 DKK gives the newer shorts a buffer of about 12% at the current price of approximately 311 DKK. This is significantly less than the ~499 DKK from the full dataset.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Method 4: Simple average over 12 months (403 DKK)</h4>
              <p>This method does not use any short data at all. It simply calculates the average closing price for the stock over the last 12 months, regardless of what the short interest was. This gives 403 DKK. The method is easy to understand, but it implicitly assumes that shorts were opened evenly distributed throughout the entire period, which rarely holds in practice.</p>
            </div>
          </div>
        </section>

        {/* ── 5. Per-seller ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Estimated entry price per short seller</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            For the eight funds that currently hold a position above 0.50%, we can make a more detailed
            estimate by going through their full reporting history. Each time a fund has reported an
            increase in its position (since the first time they ever crossed the threshold), we assume the
            increase was shorted at the previous trading day's closing price. For the very first report we
            assume the position was opened at that day's price. The estimated entry price is the
            volume-weighted average of all these increases. This means that if a fund has also held earlier
            positions that were later closed, those increases are also included in the average, because we
            cannot know which shorts are still concretely open. For funds like Marshall Wace and Voleon
            Capital, which have history back to 2021-2022, this pulls the estimated entry level down,
            because some of their earlier shorts were opened at far lower price levels. The table shows the
            estimated entry price and whether the fund is currently in profit or loss (green/red).
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Estimated entry price and profit/loss per short seller in Zealand Pharma</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short seller</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Est. entry</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Est. P/L</th>
                </tr>
              </thead>
              <tbody>
                {SELLER_ENTRIES.map((s, i) => (
                  <tr key={s.name} className={i % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50/50 dark:bg-[#15151a]"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-300">{s.position}</td>
                    <td className="px-4 py-3 text-sm tabular-nums font-semibold text-gray-900 dark:text-white">{s.entry} DKK</td>
                    <td className={`px-4 py-3 text-sm tabular-nums font-semibold ${s.profitable ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{s.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            According to this estimate, five of the eight funds are in profit (green), while three are at a
            loss (red) at the current price of 311 DKK. D. E. Shaw stands out with an estimated entry price
            of 629 DKK, because they have held a position since December 2024 and built most of it up while
            the stock was trading at 600-900 DKK. If they still hold the position, that corresponds to an
            unrealized gain of approximately 51%. At the other end are Voleon Capital and Marshall Wace,
            whose estimated entry prices are pulled down by their earlier positions from 2021-2022, when
            ZEAL traded at far lower levels.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Important caveat:</strong> These figures are estimates and should be taken with caution.
            First, we assume that the first 0.50% was opened on the day the position crossed the disclosure
            threshold. In practice, the fund may have built up the position gradually over weeks or months
            at entirely different prices. Second, the reported position is a net short position where
            derivatives such as options and futures are already included (cf. EU Short Selling Regulation).
            This means that a fund's hedging in the same stock is reflected in the figure. However, strategies
            such as pair trades against other stocks or sector-based basket shorts are not captured, and a
            fund may therefore have a broader strategy where the short position in Zealand Pharma is only
            part of a larger picture. We also do not know at what prices the funds actually traded intraday.
          </p>
        </section>

        {/* ── 6. Conclusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. What can we conclude?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The historical average entry price for all short positions in Zealand Pharma is around 499 DKK
            (method 2). But if we only look at the last 6 months, where the majority of the current position
            buildup has occurred, the estimate drops to 352 DKK (method 3). With a current price of
            approximately 311 DKK, this corresponds to a gain of only about 12% for the newer shorts, and a
            positive news event could quickly reverse the picture.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Behind the average lie two very different groups. The shorts that entered during the period July
            2024 to February 2025 (at ~811 DKK on average) are potentially sitting on large gains. But the
            most recent shorts from 2026 (at ~292 DKK) are close to break-even and risk losses if the stock
            rises even slightly. This is not a homogeneous group, but rather investors with very different
            risk profiles.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            An important caveat is the high cumulative activity. The total short activity amounts to nearly
            four times the current short interest, indicating significant rotation. This means that many of
            the "expensive" shorts from the peak have likely already closed and realized their gains. The
            current short positions may to a greater extent be those that entered at lower prices and
            therefore have a smaller buffer. This makes the current position more vulnerable to positive
            news than the average figure would immediately suggest.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The analysis also does not account for borrowing costs (borrow fees), which can be significant
            in heavily shorted stocks like Zealand Pharma. Even a short position with a price gain may have
            reduced profitability if borrowing costs are high over an extended period.
          </p>
        </section>

        <RelatedAnalyses currentSlug="zeal/gennemsnitspris/2026-05-14" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not constitute
            investment advice. The calculations are estimates based on publicly available data from the Danish
            Financial Supervisory Authority (Finanstilsynet) and market prices. Actual entry prices may differ
            significantly. Always conduct your own analysis and seek professional advice before trading.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  May 15, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default ZealCostAnalysisPageEn;
