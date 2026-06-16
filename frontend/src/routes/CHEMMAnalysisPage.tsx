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
  Cell,
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

// ─── static data ────────────────────────────────────────────────────────────
// Short interest and close price, sampled monthly plus key event days
const FULL_HISTORY = [
  { date: "2023-11-06", short: 8.03, close: 323.03 },
  { date: "2023-12-01", short: 8.99, close: 329.69 },
  { date: "2024-01-01", short: 8.28, close: 379.81 },
  { date: "2024-02-01", short: 9.07, close: 355.92 },
  { date: "2024-03-01", short: 7.98, close: 496.29 },
  { date: "2024-04-01", short: 8.6, close: 414.85 },
  { date: "2024-05-01", short: 8.57, close: 288.57 },
  { date: "2024-06-01", short: 8.2, close: 355.53 },
  { date: "2024-07-10", short: 9.81, close: 369.82 },
  { date: "2024-08-01", short: 9.56, close: 369.43 },
  { date: "2024-09-01", short: 8.41, close: 366.69 },
  { date: "2024-10-01", short: 6.82, close: 389.2 },
  { date: "2024-11-01", short: 6.0, close: 403.85 },
  { date: "2024-12-01", short: 4.56, close: 468.78 },
  { date: "2025-01-01", short: 4.06, close: 481.25 },
  { date: "2025-02-01", short: 2.45, close: 554.3 },
  { date: "2025-03-01", short: 2.3, close: 575.09 },
  { date: "2025-04-01", short: 2.2, close: 501.84 },
  { date: "2025-05-01", short: 2.48, close: 468.58 },
  { date: "2025-06-01", short: 2.51, close: 522.63 },
  { date: "2025-07-01", short: 2.37, close: 556.78 },
  { date: "2025-08-01", short: 1.87, close: 481.06 },
  { date: "2025-09-01", short: 1.17, close: 517.68 },
  { date: "2025-10-01", short: 1.55, close: 641.9 },
  { date: "2025-10-30", short: 0.85, close: 792.0 },
  { date: "2025-11-24", short: 0.53, close: 757.0 },
  { date: "2025-12-19", short: 0.53, close: 682.0 },
  { date: "2026-01-07", short: 0.58, close: 689.5 },
  { date: "2026-02-04", short: 0.29, close: 579.5 },
  { date: "2026-02-05", short: 0.41, close: 463.0 },
  { date: "2026-03-01", short: 0.98, close: 420.4 },
  { date: "2026-03-23", short: 1.38, close: 398.6 },
  { date: "2026-03-24", short: 1.54, close: 236.8 },
  { date: "2026-04-01", short: 2.03, close: 309.0 },
  { date: "2026-05-01", short: 3.04, close: 326.0 },
  { date: "2026-05-06", short: 3.36, close: 321.6 },
  { date: "2026-06-01", short: 3.79, close: 357.4 },
  { date: "2026-06-09", short: 3.47, close: 383.6 },
];

// Daily detail for 2026 (sampled)
const ZOOM_2026 = [
  { date: "2026-02-01", short: 0.29, close: 609.5 },
  { date: "2026-02-04", short: 0.29, close: 579.5 },
  { date: "2026-02-05", short: 0.41, close: 463.0 },
  { date: "2026-02-09", short: 1.01, close: 407.0 },
  { date: "2026-02-13", short: 0.84, close: 403.4 },
  { date: "2026-02-19", short: 0.88, close: 397.0 },
  { date: "2026-02-25", short: 0.87, close: 385.2 },
  { date: "2026-02-27", short: 0.98, close: 420.4 },
  { date: "2026-03-04", short: 0.98, close: 428.6 },
  { date: "2026-03-10", short: 1.13, close: 420.6 },
  { date: "2026-03-13", short: 1.41, close: 399.6 },
  { date: "2026-03-18", short: 1.5, close: 403.2 },
  { date: "2026-03-23", short: 1.38, close: 398.6 },
  { date: "2026-03-24", short: 1.54, close: 236.8 },
  { date: "2026-03-26", short: 1.95, close: 297.0 },
  { date: "2026-03-31", short: 2.09, close: 300.8 },
  { date: "2026-04-07", short: 2.19, close: 293.4 },
  { date: "2026-04-13", short: 2.22, close: 302.6 },
  { date: "2026-04-15", short: 2.48, close: 330.6 },
  { date: "2026-04-17", short: 2.19, close: 350.0 },
  { date: "2026-04-23", short: 2.41, close: 326.6 },
  { date: "2026-04-28", short: 2.84, close: 318.8 },
  { date: "2026-05-01", short: 3.04, close: 326.0 },
  { date: "2026-05-05", short: 3.04, close: 305.0 },
  { date: "2026-05-06", short: 3.36, close: 321.6 },
  { date: "2026-05-08", short: 3.56, close: 314.8 },
  { date: "2026-05-11", short: 3.67, close: 316.0 },
  { date: "2026-05-14", short: 3.37, close: 313.4 },
  { date: "2026-05-20", short: 3.47, close: 342.0 },
  { date: "2026-05-26", short: 3.32, close: 352.8 },
  { date: "2026-05-29", short: 3.3, close: 375.0 },
  { date: "2026-06-01", short: 3.79, close: 357.4 },
  { date: "2026-06-04", short: 3.68, close: 377.6 },
  { date: "2026-06-09", short: 3.47, close: 383.6 },
];

// Price flow of the 2026 rebuild (since Feb 1), thousands of shares per
// 2%-wide band, assigned to the previous trading day's close (T+1)
const FLOW_2026 = [
  { mid: 239.2, shorted: 34.8, covered: 0.0, net: 34.8 },
  { mid: 280.2, shorted: 36.5, covered: 0.0, net: 36.5 },
  { mid: 291.5, shorted: 0.0, covered: 52.2, net: -52.2 },
  { mid: 297.4, shorted: 59.2, covered: 3.5, net: 55.7 },
  { mid: 303.3, shorted: 99.2, covered: 10.4, net: 88.8 },
  { mid: 309.4, shorted: 27.8, covered: 0.0, net: 27.8 },
  { mid: 315.6, shorted: 24.4, covered: 12.2, net: 12.2 },
  { mid: 321.9, shorted: 114.9, covered: 45.2, net: 69.6 },
  { mid: 328.3, shorted: 74.8, covered: 50.5, net: 24.4 },
  { mid: 334.9, shorted: 17.4, covered: 0.0, net: 17.4 },
  { mid: 341.6, shorted: 20.9, covered: 45.2, net: -24.4 },
  { mid: 348.4, shorted: 36.5, covered: 17.4, net: 19.1 },
  { mid: 355.4, shorted: 27.8, covered: 31.3, net: -3.5 },
  { mid: 362.5, shorted: 0.0, covered: 19.1, net: -19.1 },
  { mid: 377.1, shorted: 109.6, covered: 60.9, net: 48.7 },
  { mid: 392.4, shorted: 13.9, covered: 19.1, net: -5.2 },
  { mid: 400.2, shorted: 191.4, covered: 118.3, net: 73.1 },
  { mid: 408.2, shorted: 59.2, covered: 62.6, net: -3.5 },
  { mid: 416.4, shorted: 47.0, covered: 41.8, net: 5.2 },
  { mid: 424.7, shorted: 22.6, covered: 0.0, net: 22.6 },
  { mid: 433.2, shorted: 38.3, covered: 0.0, net: 38.3 },
  { mid: 459.7, shorted: 66.1, covered: 0.0, net: 66.1 },
  { mid: 583.1, shorted: 20.9, covered: 0.0, net: 20.9 },
];

// Historical disclosed sellers (announcements to Finanstilsynet)
const PAST_SELLERS = [
  { name: "Qube Research & Technologies", count: 75, period: "Jun 2023 - jan 2025" },
  { name: "Brummer Multi-Strategy", count: 26, period: "Sep 2023 - okt 2025" },
  { name: "Millennium Intl Mgmt", count: 22, period: "Aug 2023 - maj 2024" },
  { name: "Boone Capital Mgmt", count: 14, period: "Sep 2023 - sep 2024" },
  { name: "Wellington Mgmt Intl", count: 10, period: "Sep 2024 - okt 2025" },
  { name: "Marshall Wace", count: 9, period: "Feb 2024 - apr 2024" },
  { name: "WorldQuant", count: 8, period: "Mar 2023 - maj 2024" },
];

// ─── format helpers ─────────────────────────────────────────────────────────
function fmtShortDate(d: string) {
  const parts = d.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
}

function fmtDayMonth(d: string) {
  const parts = d.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${parseInt(parts[2])}. ${months[parseInt(parts[1]) - 1]}`;
}

function fmtThousand(v: number) {
  return `${Math.round(v * 1000).toLocaleString("da-DK")} aktier`;
}

// ─── tooltips ───────────────────────────────────────────────────────────────
function ShortPriceTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const shortVal = payload.find((p) => p.dataKey === "short");
  const priceVal = payload.find((p) => p.dataKey === "close");
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">{String(label)}</p>
      {shortVal && <p className="text-center font-bold text-lg tabular-nums text-[#007AFF]">{Number(shortVal.value).toFixed(2)}%</p>}
      {priceVal && priceVal.value != null && <p className="text-center text-purple-500 dark:text-purple-400 tabular-nums">{Number(priceVal.value).toFixed(1)} DKK</p>}
    </div>
  );
}

function FlowTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { mid: number; shorted: number; covered: number; net: number };
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">Kursbånd omkring {String(d.mid).replace(".", ",")} DKK</p>
      <p className="text-center text-red-500 tabular-nums">Shortet: {fmtThousand(d.shorted)}</p>
      <p className="text-center text-green-600 dark:text-green-400 tabular-nums">Dækket: {fmtThousand(d.covered)}</p>
      <p className="text-center font-bold tabular-nums text-gray-900 dark:text-white">Netto: {d.net > 0 ? "+" : ""}{fmtThousand(d.net)}</p>
    </div>
  );
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

// ─── main component ─────────────────────────────────────────────────────────
const CHEMMAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/chemm", "chemm_analysis");
    fetch(`${HOST}/stats/visit/chemm-analysis/`).catch(() => {});
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
      <title>Zirium | ChemoMetec (CHEMM) - Shortanalyse</title>
      <meta name="description" content="Dybdegående analyse af short-positioner i ChemoMetec (CHEMM). Shorterne var næsten ude, da aktien kollapsede, og bygger nu op igen efter rekylen." />
      <meta property="og:title" content="Shortanalyse: Shorterne missede kollapset og jagter nu rekylen" />
      <meta property="og:description" content="Dybdegående analyse af short-positioner i ChemoMetec (CHEMM). Shorterne var næsten ude, da aktien kollapsede, og bygger nu op igen efter rekylen." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/chemm/2026-06-17" />
      <meta property="og:image" content="https://www.zirium.dk/og-images/chemm-2026-06-17.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Shortanalyse: Shorterne missede kollapset og jagter nu rekylen" />
      <meta name="twitter:description" content="Dybdegående analyse af short-positioner i ChemoMetec (CHEMM). Shorterne var næsten ude, da aktien kollapsede, og bygger nu op igen efter rekylen." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/chemm-2026-06-17.png" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Shortanalyse: Shorterne missede kollapset og jagter nu rekylen",
        "description": "Dybdegående analyse af short-positioner i ChemoMetec (CHEMM). Shorterne var næsten ude, da aktien kollapsede, og bygger nu op igen efter rekylen.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-06-17",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/chemm/2026-06-17",
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
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">Analyse lavet af Araz Bayat Makoo (Zirium) - 17. juni 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Shortanalyse: Shorterne missede kollapset og jagter nu rekylen
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            ChemoMetec A/S (CHEMM)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            ChemoMetec er en af de mærkeligste shorthistorier på det danske marked. Aktien var blandt de
            mest shortede i 2023-24, men da den i foråret 2026 leverede sit største endagsfald nogensinde,
            var shorterne stort set ude. Nu, efter at aktien er steget over 60% fra bunden, bygger et helt
            nyt hold af fonde positioner op igen. Denne analyse gennemgår forløbet i fire akter og fletter
            den fundamentale baggrund ind undervejs.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="3,47%" label="Short-interesse (9. juni)" />
          <KPI value="383,60 DKK" label="Seneste lukkekurs (9. juni)" />
          <KPI value="-52%" label="Fra toppen (792 DKK, okt. 2025)" />
          <KPI value="+62%" label="Fra bunden (236,80 DKK, 24. marts)" />
        </div>

        {/* ── 1. Overordnet billede ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overordnet billede</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            ChemoMetec udvikler og sælger instrumenter til celletælling og celleanalyse (NucleoCounter og
            den nyere XcytoMatic-platform), primært til kunder inden for celle- og genterapi samt
            bioprocessering. Forretningsmodellen kombinerer instrumentsalg med løbende salg af forbrugsvarer,
            og selskabet har usædvanligt høje marginer: I regnskabsåret 2024/25 voksede omsætningen 22% til
            495,6 mio. DKK med en EBITDA på 258,0 mio. DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Netop fordi væksthistorien er så afhængig af det nordamerikanske marked og af kundernes
            investeringslyst i celle- og genterapi, har aktien altid svinget voldsomt. De seneste tre år
            har budt på en rejse fra ca. 320 DKK til 792 DKK og ned til 236,80 DKK, og short-interessen
            har bevæget sig næsten perfekt modsat: Høj, da aktien lå lavt, næsten nul ved toppen, og
            stigende igen efter kollapset. Det er den historie, tallene nedenfor fortæller.
          </p>
        </section>

        {/* ── 2. Chart: full history ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short-interesse vs. aktiekurs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Historik siden november 2023. Blå = short-interesse, lilla = lukkekurs. Bemærk det næsten spejlvendte forløb.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse vs. aktiekurs for ChemoMetec siden november 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FULL_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="chemmShortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 10]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[150, 850]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#chemmShortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
            </div>
          </div>
        </section>

        {/* ── 3. Akt 1 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Akt 1: En af Danmarks mest shortede aktier (2023-24)</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I 2023 og 2024 var ChemoMetec en udpræget konsensus-short. Aktien var faldet hårdt fra
            2021-toppen, væksten var gået i stå, og short-interessen lå stabilt mellem 8% og 9%, med en
            top på 9,81% den 10. juli 2024. Det svarede til ca. 1,7 mio. aktier ud af kun 17,4 mio.
            udestående.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Holdet bag var de store kvantitative og multistrategiske fonde: Qube Research & Technologies
            alene står for 75 indberetninger til Finanstilsynet mellem juni 2023 og januar 2025, og
            Millennium, Brummer, Boone Capital, Marshall Wace og WorldQuant var alle inde med positioner
            over 0,50% undervejs. Vores estimat ud fra de daglige ændringer er, at positionerne i denne
            periode netto blev opbygget til en gennemsnitskurs omkring 355 DKK.
          </p>
        </section>

        {/* ── 4. Akt 2 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Akt 2: Den store dækning under rallyet (2024-25)</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Fra efteråret 2024 vendte fundamentet. Væksten kom tilbage, og regnskabsåret 2024/25
            (afsluttet 30. juni 2025) endte med 22% omsætningsvækst til 495,6 mio. DKK og 39% EBITDA-vækst
            til 258,0 mio. DKK. Den nye XcytoMatic-platform begyndte at sælge (27,7 mio. DKK mod 8,3 mio.
            året før), og den 28. oktober 2025 opjusterede selskabet sin guidance for 2025/26 til en
            omsætning på 565-580 mio. DKK. Aktien toppede i 792 DKK to dage senere.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Shorterne kapitulerede undervejs. Fra august 2024 til starten af februar 2026 blev der brutto
            dækket ca. 2,2 mio. aktier til en estimeret gennemsnitskurs omkring 498 DKK, markant over de
            ~355 DKK, positionerne i gennemsnit var åbnet til. For de fonde, der holdt fast hele vejen,
            var ChemoMetec med andre ord en dyr short. Qube forlod listen i januar 2025, og i efteråret
            2025 var kun Brummer og Wellington tilbage med positioner lige omkring tærsklen.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Ved kurstoppen den 30. oktober 2025 var short-interessen nede på 0,85%, og i februar 2026
            ramte den bunden med blot 0,29%. Tallene skal som altid læses med forbehold for, at vi kun
            ser nettoændringer, men retningen er utvetydig: Da aktien var dyrest, var næsten ingen short.
          </p>
        </section>

        {/* ── 5. Akt 3 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Akt 3: Kollapset, som (næsten) ingen shortede</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den 4. februar 2026 kom halvårsregnskabet for 2025/26, og det skuffede: Omsætningen faldt 1%
            til 249 mio. DKK (organisk +3%), andet kvartal isoleret faldt 8%, og den lange amerikanske
            regeringsnedlukning kostede ifølge selskabet ca. 20 mio. DKK i november-omsætning. Guidance
            blev fastholdt, men markedet mistede tilliden: Aktien faldt ca. 24% over to handelsdage, fra
            613 til 463 DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det virkelige slag kom tirsdag den 24. marts 2026, hvor ChemoMetec nedjusterede forventningerne
            til 2025/26: Omsætningen blev sænket fra 565-580 til 490-520 mio. DKK og EBITDA fra 320-335
            til 260-285 mio. DKK. Selskabet pegede på svagere salg i Nordamerika inden for celle- og
            genterapi, længere kundebeslutninger på grund af politisk og makroøkonomisk usikkerhed,
            langsommere automationsprojekter, og at den store interesse for XcytoMatic midlertidigt
            bremsede salget af de etablerede NC-instrumenter. Aktien lukkede i 236,80 DKK, et fald på ca.
            41% og det største endagsfald i selskabets historie.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Og hvor var shorterne? Stort set fraværende. Short-interessen var 0,29% ved halvårsregnskabet
            og kun ca. 1,4% dagen før nedjusteringen. Af det samlede fald fra 792 til 236,80 DKK fangede
            de indberettede short-positioner kun en brøkdel. Det er en vigtig påmindelse om, at høj
            short-interesse ikke er nogen pålidelig krystalkugle: I ChemoMetecs tilfælde har den nærmest
            virket som en omvendt indikator.
          </p>
        </section>

        {/* ── 6. Chart: 2026 zoom ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">6. 2026 i detaljer</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Februar til juni 2026. De tre gule markeringer: H1-regnskab (4. feb), nedjustering (24. mar) og Q3-meddelelse (6. maj).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse og aktiekurs for ChemoMetec i 2026 med nøglebegivenheder">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={ZOOM_2026} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="chemmZoomGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtDayMonth} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 4]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[200, 650]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#e63946", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <ReferenceLine yAxisId="price" x="2026-02-04" stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine yAxisId="price" x="2026-03-24" stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine yAxisId="price" x="2026-05-06" stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#chemmZoomGrad)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Nøglebegivenheder</span>
            </div>
          </div>
        </section>

        {/* ── 7. Akt 4 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Akt 4: Genopbygningen efter bunden</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Først efter kollapset kom shorterne tilbage. Fra bunden på 0,29% i februar er short-interessen
            steget støt til en foreløbig top på 3,79% den 1. juni, senest 3,47% den 9. juni. Det svarer til
            en netto-opbygning på ca. 553.000 aktier på fire måneder i et selskab med kun 17,4 mio. aktier
            udestående. Den aktuelle position har en markedsværdi på ca. 232 mio. DKK.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            Prisstrømmen nedenfor viser, ved hvilke kurser 2026-opbygningen er sket (metoden er forklaret i
            vores prisstrøm-analyse af GN). Rød = netto åbnede shorts, grøn = netto dækkede.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Netto prisstrøm per kursbånd for ChemoMetec siden februar 2026">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FLOW_2026} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="mid" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${Math.round(Number(v))}`} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} label={{ value: "1.000 aktier", angle: -90, position: "insideLeft", fontSize: 10, fill: tickColor }} />
                <Tooltip content={FlowTooltip} cursor={{ fill: isDark ? "#ffffff10" : "#00000008" }} />
                <ReferenceLine y={0} stroke={isDark ? "#555" : "#ccc"} />
                <ReferenceLine x={377.1} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                  {FLOW_2026.map((b) => (
                    <Cell key={b.mid} fill={b.net > 0 ? "#e63946" : "#2a9d8f"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#e63946] inline-block" />Netto åbnet</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#2a9d8f] inline-block" />Netto dækket</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Kurs i dag (~384 DKK)</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4 mb-4">
            Opbygningen er sket bredt i intervallet ca. 295-435 DKK med de tungeste bånd omkring 300-330
            og 400 DKK. Vores estimat på den vægtede gennemsnitskurs for alle nye shorts siden februar er
            ca. 363 DKK. Med en aktuel kurs på 383,60 DKK er den samlede 2026-årgang altså allerede ca.
            5-6% i minus.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Endnu mere markant ser det ud for de shorts, der er åbnet efter nedjusteringen den 24. marts:
            Her er der brutto åbnet ca. 712.000 aktier til en estimeret gennemsnitskurs på kun ca. 326 DKK.
            De positioner er ved kurs 384 omkring 18% i minus. Shorterne har med andre ord ikke fanget
            faldet, men er i stedet gået ind imod rekylen, og indtil videre har rekylen vundet.
          </p>
        </section>

        {/* ── 8. Hvem shorter ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Hvem shorter ChemoMetec nu?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Det mest påfaldende ved 2026-bølgen er, at den bæres af et helt nyt hold. Ingen af de store
            navne fra 2023-24 er vendt tilbage. I stedet kom Citadel ind den 14. april 2026 og har bygget
            op til 0,92%, mens D. E. Shaw krydsede tærsklen den 7. maj og senest er trimmet til 0,48%,
            lige under offentliggørelsesgrænsen. Resten af den samlede short-interesse, ca. 2 procentpoint,
            holdes af anonyme aktører med positioner under 0,50%.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Aktuelle short-sælgere i ChemoMetec</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short-sælger</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dato</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Beskrivelse</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">Citadel Advisors LLC</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold text-red-500">0,92%</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">14. maj</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">Ind 14. april 2026, toppede 0,96% den 6. maj.</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">D. E. Shaw & Co.</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold text-red-500">0,48%</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">27. maj</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">Ind 7. maj med 0,50%, nu lige under tærsklen.</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">Under 0,50% (ukendte)</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold text-red-500">~2,07%</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">-</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">Differencen op til de samlede 3,47%.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Det gamle hold (2023-25)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Fonde med offentliggjorte positioner over 0,50% i den forrige shortbølge. Ingen af dem er med i 2026-bølgen.</p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left">
              <caption className="sr-only">Historiske short-sælgere i ChemoMetec</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short-sælger</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Indberetninger</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Periode</th>
                </tr>
              </thead>
              <tbody>
                {PAST_SELLERS.map((s, i) => (
                  <tr key={s.name} className={i % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50/50 dark:bg-[#15151a]"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-300">{s.count}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">{s.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 9. Timeline ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">9. Tidslinje over nøglebegivenheder</h2>
          <div className="ml-2">
            <TimelineEvent date="10. juli 2024" title="Short-interessen topper: 9,81%" color="#e63946">
              <p>Den højeste short-interesse i datasættet, ca. 1,7 mio. aktier. Qube, Millennium, Brummer, Boone, Marshall Wace og WorldQuant havde alle haft positioner over 0,50% i perioden.</p>
            </TimelineEvent>
            <TimelineEvent date="11. september 2025" title="Årsrapport 2024/25: Vækst på alle linjer" color="#2a9d8f">
              <p>Omsætningen voksede 22% til 495,6 mio. DKK og EBITDA 39% til 258,0 mio. DKK. XcytoMatic-platformen solgte for 27,7 mio. DKK mod 8,3 mio. året før. Guidance for 2025/26: Omsætning på 545-565 mio. DKK.</p>
            </TimelineEvent>
            <TimelineEvent date="28. oktober 2025" title="Opjustering, og aktien topper i 792 DKK" color="#2a9d8f">
              <p>Guidance hævet til 565-580 mio. DKK i omsætning og 320-335 mio. DKK i EBITDA. Aktien lukkede i 792 DKK den 30. oktober. Short-interessen var da nede på 0,85%.</p>
            </TimelineEvent>
            <TimelineEvent date="4. februar 2026" title="H1 2025/26 skuffer: -24% på to dage" color="#e63946">
              <p>Omsætning på 249 mio. DKK (-1%, organisk +3%), Q2 isoleret -8%. Den amerikanske regeringsnedlukning kostede ca. 20 mio. DKK i november. Guidance fastholdt, men aktien faldt fra 613 til 463 DKK på to handelsdage. Short-interessen var rekordlave 0,29%.</p>
            </TimelineEvent>
            <TimelineEvent date="24. marts 2026" title="Nedjustering: Største endagsfald nogensinde" color="#e63946">
              <p>Omsætningsguidance sænket til 490-520 mio. DKK og EBITDA til 260-285 mio. DKK. Årsager: Svagere salg i Nordamerika, længere kundebeslutninger, langsommere automationsprojekter og XcytoMatic-interesse, der midlertidigt bremser NC-salget. Aktien lukkede i 236,80 DKK, ned ca. 41%. Short-interessen var kun ca. 1,4% dagen før.</p>
            </TimelineEvent>
            <TimelineEvent date="6. maj 2026" title="Q3 bedre end frygtet, lille opjustering og tilbagekøb" color="#2a9d8f">
              <p>Q3-omsætning på 142,3 mio. DKK (+15%) og EBITDA på 84,5 mio. DKK (+33%, inkl. en positiv IFRS-engangseffekt på 15,1 mio.). Guidance justeret op til 505-525 mio. DKK og EBITDA 275-290 mio. DKK. Fra 18. maj til 8. oktober 2026 kører et aktietilbagekøb på op til 500.000 aktier (2,9% af kapitalen), maks. 100 mio. DKK.</p>
            </TimelineEvent>
            <TimelineEvent date="Juni 2026" title="Rekyl til 384 DKK, short-interessen topper foreløbigt" color="#4361ee">
              <p>Aktien er steget ca. 62% fra bunden. Short-interessen ramte 3,79% den 1. juni og er senest 3,47%. Citadel (0,92%) er eneste offentliggjorte position.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* ── 10. Det centrale spørgsmål ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Det centrale spørgsmål: Kommer shorterne for sent igen?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            De nye shorts satser på, at rekylen er løbet foran fundamentet: Guidance er trods den lille
            opjustering i maj stadig markant under efterårets niveau, og med en markedsværdi på ca. 6,7
            mia. DKK prissættes selskabet til omkring 23-24 gange midtpunktet af EBITDA-guidance. Omvendt
            viste tredje kvartal fremgang, og selskabet køber selv aktier tilbage frem til oktober.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Shorternes argumenter</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Svagt nordamerikansk marked for celle- og genterapi</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Længere kundebeslutninger og udskudte automationsprojekter</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>XcytoMatic kannibaliserer midlertidigt NC-salget</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Aktien +62% fra bunden, mens guidance kun er hævet marginalt</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Høj værdiansættelse: Ca. 23-24x EBITDA-guidance</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Risici for shorterne</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Q3 viste +15% omsætning og opjusteret guidance</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Tilbagekøb på op til 100 mio. DKK støtter kursen til oktober</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Kun 17,4 mio. aktier: Illikvid aktie med squeeze-potentiale</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>2026-shortsene er allerede ca. 5-18% i minus (estimat)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Historikken: Sidst kostede det dyrt at shorte vendingen</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 11. Konklusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Konklusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            ChemoMetec-historien punkterer en udbredt myte: At short-interessen viser, hvor det næste store
            kursfald kommer. Her skete det stik modsatte. Shorterne lå tungt i aktien i 2023-24, dækkede
            med tab op igennem rallyet, var nærmest ude ved toppen i 792 DKK, og missede derefter både
            skuffelsen i februar og den historiske nedjustering i marts. Den samlede short-position var
            på sit laveste, præcis da den ville have tjent mest.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Nu er rollerne byttet om. Et nyt hold anført af Citadel har på fire måneder bygget
            short-interessen op fra 0,29% til ca. 3,5%, men det er sket efter faldet, ind i en rekyl, der
            allerede har sendt de nye positioner i minus. Med et aktivt tilbagekøbsprogram, en lille
            opjustering i maj og kun 17,4 mio. udestående aktier er det en short med betydelig risiko, og
            udfaldet afhænger af, om det nordamerikanske marked for celle- og genterapi reelt stabiliserer
            sig, eller om nedjusteringen i marts kun var den første.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Kommende katalysatorer at holde øje med</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Tilbagekøbsprogrammets afslutning (8. oktober 2026)</li>
              <li>&#x2022; Årsregnskabet 2025/26 og den første guidance for 2026/27 (ventes september 2026)</li>
              <li>&#x2022; Udviklingen i det nordamerikanske celle- og genterapimarked</li>
              <li>&#x2022; XcytoMatic-ordrer, og om NC-salget normaliseres</li>
              <li>&#x2022; Om Citadel og de anonyme positioner fortsætter med at bygge op over 4%</li>
            </ul>
          </div>
        </section>

        <FeedbackWidget pageType="analysis" pageId="chemm/2026-06-17" />
        <RelatedAnalyses currentSlug="chemm/2026-06-17" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Data stammer fra Finanstilsynets offentlige registre, selskabets egne
            meddelelser og markedspriser. Estimater for indgangskurser bygger på nettoændringer og kan afvige
            væsentligt fra de faktiske handelskurser. Foretag altid din egen analyse, og søg professionel
            rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  17. juni 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default CHEMMAnalysisPage;
