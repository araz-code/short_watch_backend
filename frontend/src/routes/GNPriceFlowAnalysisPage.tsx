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
// Short interest and close price, sampled at key changes (Finanstilsynet + Nasdaq)
const POSITION_HISTORY = [
  { date: "2023-11-06", short: 6.03, close: 121.1 },
  { date: "2023-12-06", short: 6.29, close: 162.7 },
  { date: "2024-02-09", short: 6.79, close: 179.55 },
  { date: "2024-04-29", short: 6.55, close: 190.75 },
  { date: "2024-06-06", short: 5.18, close: 224.2 },
  { date: "2024-08-05", short: 6.62, close: 164.8 },
  { date: "2024-10-15", short: 9.95, close: 136.5 },
  { date: "2024-12-31", short: 10.92, close: 133.75 },
  { date: "2025-01-15", short: 11.34, close: 128.3 },
  { date: "2025-03-05", short: 9.83, close: 123.0 },
  { date: "2025-04-09", short: 8.85, close: 82.56 },
  { date: "2025-05-08", short: 10.09, close: 88.58 },
  { date: "2025-07-18", short: 8.08, close: 100.05 },
  { date: "2025-09-01", short: 7.18, close: 115.6 },
  { date: "2025-10-02", short: 8.49, close: 107.15 },
  { date: "2025-11-24", short: 9.35, close: 96.94 },
  { date: "2026-01-07", short: 10.11, close: 112.9 },
  { date: "2026-02-04", short: 12.05, close: 106.35 },
  { date: "2026-02-25", short: 12.85, close: 92.98 },
  { date: "2026-03-11", short: 12.9, close: 89.0 },
  { date: "2026-03-16", short: 13.04, close: 105.3 },
  { date: "2026-03-18", short: 10.85, close: 98.0 },
  { date: "2026-04-01", short: 10.31, close: 100.7 },
  { date: "2026-04-16", short: 10.71, close: 104.5 },
  { date: "2026-04-30", short: 10.97, close: 95.74 },
  { date: "2026-05-08", short: 10.2, close: 95.44 },
  { date: "2026-05-12", short: 9.92, close: 95.58 },
  { date: "2026-05-21", short: 9.6, close: 93.66 },
  { date: "2026-05-27", short: 9.39, close: 97.52 },
  { date: "2026-06-01", short: 9.3, close: 96.22 },
  { date: "2026-06-04", short: 9.17, close: 95.44 },
  { date: "2026-06-09", short: 9.43, close: 93.9 },
  { date: "2026-06-11", short: 9.51, close: 89.84 },
  { date: "2026-06-16", short: 9.51, close: 89.04 },
  { date: "2026-06-19", short: 9.9, close: 91.86 },
  { date: "2026-06-22", short: 10.15, close: 89.02 },
  { date: "2026-06-26", short: 9.85, close: 87.3 },
];

// Full-period price flow per 2%-wide band, in millions of shares.
// Computed from daily short interest changes assigned to the previous
// trading day's close (same method as the Prisstrøm tab).
const FLOW_FULL = [
  { mid: 83.4, shorted: 0.47, covered: 0.0, net: 0.47 },
  { mid: 86.8, shorted: 1.03, covered: 0.0, net: 1.03 },
  { mid: 88.5, shorted: 0.57, covered: 1.66, net: -1.09 },
  { mid: 90.3, shorted: 2.68, covered: 1.92, net: 0.76 },
  { mid: 92.1, shorted: 2.43, covered: 1.98, net: 0.45 },
  { mid: 93.9, shorted: 3.01, covered: 2.75, net: 0.26 },
  { mid: 95.8, shorted: 2.24, covered: 4.73, net: -2.49 },
  { mid: 97.7, shorted: 3.51, covered: 2.3, net: 1.21 },
  { mid: 99.7, shorted: 1.57, covered: 3.28, net: -1.7 },
  { mid: 101.6, shorted: 2.04, covered: 3.22, net: -1.18 },
  { mid: 103.7, shorted: 1.98, covered: 1.24, net: 0.74 },
  { mid: 105.8, shorted: 0.71, covered: 3.19, net: -2.48 },
  { mid: 107.9, shorted: 3.92, covered: 0.86, net: 3.06 },
  { mid: 110.0, shorted: 3.0, covered: 1.21, net: 1.79 },
  { mid: 112.2, shorted: 1.27, covered: 1.24, net: 0.03 },
  { mid: 114.5, shorted: 0.22, covered: 0.35, net: -0.13 },
  { mid: 116.8, shorted: 1.05, covered: 1.15, net: -0.1 },
  { mid: 119.1, shorted: 0.76, covered: 1.63, net: -0.87 },
  { mid: 121.5, shorted: 0.32, covered: 0.45, net: -0.13 },
  { mid: 123.9, shorted: 1.63, covered: 0.19, net: 1.44 },
  { mid: 126.4, shorted: 0.07, covered: 0.0, net: 0.07 },
  { mid: 128.9, shorted: 0.74, covered: 0.74, net: 0.0 },
  { mid: 131.5, shorted: 1.57, covered: 0.68, net: 0.89 },
  { mid: 134.1, shorted: 1.85, covered: 2.81, net: -0.96 },
  { mid: 136.8, shorted: 1.89, covered: 0.77, net: 1.12 },
  { mid: 139.5, shorted: 1.54, covered: 0.48, net: 1.06 },
  { mid: 142.3, shorted: 0.58, covered: 1.02, net: -0.44 },
  { mid: 145.2, shorted: 1.28, covered: 0.01, net: 1.27 },
  { mid: 148.1, shorted: 1.3, covered: 1.11, net: 0.19 },
  { mid: 151.0, shorted: 0.28, covered: 2.02, net: -1.75 },
  { mid: 154.1, shorted: 1.7, covered: 1.99, net: -0.29 },
  { mid: 157.1, shorted: 1.59, covered: 0.51, net: 1.08 },
  { mid: 160.3, shorted: 1.35, covered: 0.67, net: 0.68 },
  { mid: 163.5, shorted: 3.0, covered: 0.35, net: 2.65 },
  { mid: 166.8, shorted: 0.39, covered: 0.8, net: -0.41 },
  { mid: 170.1, shorted: 1.59, covered: 0.25, net: 1.34 },
  { mid: 173.5, shorted: 0.68, covered: 1.76, net: -1.08 },
  { mid: 177.0, shorted: 1.14, covered: 2.07, net: -0.93 },
  { mid: 180.5, shorted: 1.41, covered: 0.87, net: 0.54 },
  { mid: 184.1, shorted: 0.68, covered: 0.28, net: 0.41 },
  { mid: 187.8, shorted: 0.66, covered: 0.57, net: 0.09 },
  { mid: 191.6, shorted: 0.71, covered: 0.32, net: 0.39 },
  { mid: 195.4, shorted: 0.26, covered: 0.13, net: 0.13 },
  { mid: 199.3, shorted: 0.26, covered: 0.48, net: -0.22 },
  { mid: 203.3, shorted: 0.67, covered: 1.02, net: -0.35 },
  { mid: 207.3, shorted: 0.23, covered: 1.3, net: -1.06 },
  { mid: 211.5, shorted: 0.2, covered: 0.0, net: 0.2 },
  { mid: 215.7, shorted: 0.01, covered: 0.61, net: -0.6 },
  { mid: 220.0, shorted: 0.0, covered: 0.38, net: -0.38 },
  { mid: 224.4, shorted: 0.84, covered: 0.0, net: 0.84 },
];

// Price flow for the last 3 months (since the end of March 2026), millions of
// shares, sorted by price band, highest first (same order as the app)
const FLOW_3M = [
  { band: "108,55-110,72", shorted: 0.0, covered: 0.55, net: -0.55 },
  { band: "106,42-108,55", shorted: 0.0, covered: 0.15, net: -0.15 },
  { band: "104,33-106,42", shorted: 0.0, covered: 0.31, net: -0.31 },
  { band: "102,29-104,33", shorted: 0.73, covered: 0.0, net: 0.73 },
  { band: "100,28-102,29", shorted: 0.82, covered: 0.9, net: -0.09 },
  { band: "98,31-100,28", shorted: 0.44, covered: 0.98, net: -0.54 },
  { band: "96,39-98,31", shorted: 1.16, covered: 2.1, net: -0.93 },
  { band: "94,50-96,39", shorted: 0.84, covered: 1.15, net: -0.31 },
  { band: "92,64-94,50", shorted: 0.0, covered: 0.19, net: -0.19 },
  { band: "90,83-92,64", shorted: 0.48, covered: 0.0, net: 0.48 },
  { band: "89,05-90,83", shorted: 0.2, covered: 0.44, net: -0.23 },
  { band: "87,30-89,05", shorted: 0.57, covered: 0.2, net: 0.36 },
];

// ─── format helpers ─────────────────────────────────────────────────────────
function fmtShortDate(d: string) {
  const parts = d.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
}

function fmtMio(v: number) {
  return `${v.toFixed(2).replace(".", ",")} mio.`;
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
      <p className="text-center text-red-500 tabular-nums">Shortet: {fmtMio(d.shorted)}</p>
      <p className="text-center text-green-600 dark:text-green-400 tabular-nums">Dækket: {fmtMio(d.covered)}</p>
      <p className="text-center font-bold tabular-nums text-gray-900 dark:text-white">Netto: {d.net > 0 ? "+" : ""}{fmtMio(d.net)}</p>
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

// ─── main component ─────────────────────────────────────────────────────────
const GNPriceFlowAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/gn/2026-06-28", "gn_priceflow_analysis");
    fetch(`${HOST}/stats/visit/gn-priceflow-analysis/`).catch(() => {});
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
      <title>Zirium | GN Store Nord (GN) - Prisstrøm</title>
      <meta name="description" content="Sådan bruger du prisstrømmen på Zirium. Med GN Store Nord som case viser vi, ved hvilke kurser shorterne har åbnet og dækket deres positioner." />
      <meta property="og:title" content="Sådan bruger du prisstrømmen: Hvor har shorterne handlet GN?" />
      <meta property="og:description" content="Med GN Store Nord som case viser vi, ved hvilke kurser shorterne har åbnet og dækket deres positioner, og hvordan du selv læser prisstrømmen." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/gn/2026-06-28" />
      <meta property="og:image" content="https://www.zirium.dk/og-images/gn-2026-06-28.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Sådan bruger du prisstrømmen: Hvor har shorterne handlet GN?" />
      <meta name="twitter:description" content="Med GN Store Nord som case viser vi, ved hvilke kurser shorterne har åbnet og dækket deres positioner, og hvordan du selv læser prisstrømmen." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/gn-2026-06-28.png" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Sådan bruger du prisstrømmen: Hvor har shorterne handlet GN?",
        "description": "Med GN Store Nord som case viser vi, ved hvilke kurser shorterne har åbnet og dækket deres positioner, og hvordan du selv læser prisstrømmen.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-06-28",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/gn/2026-06-28",
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
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">Analyse lavet af Araz Bayat Makoo (Zirium) - 28. juni 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Sådan bruger du prisstrømmen: Hvor har shorterne handlet GN?
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            GN Store Nord (GN)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Prisstrømmen er en fane på aktiens detaljeside, der fordeler alle indberettede
            shortændringer på kursniveau, så du kan se, ved hvilke kurser shorts er åbnet og dækket.
            Denne analyse bruger GN Store Nord som case og viser trin for trin, hvordan du læser
            tallene, hvad de kan fortælle dig, og hvor metodens grænser går.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="9,85%" label="Short-interesse (26. juni)" />
          <KPI value="87,30 DKK" label="Seneste lukkekurs (26. juni)" />
          <KPI value="62,9 mio." label="Aktier shortet siden nov. 2023" />
          <KPI value="57,4 mio." label="Aktier dækket siden nov. 2023" />
        </div>

        {/* ── 1. Hvad er prisstrømmen ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Hvad er prisstrømmen?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Finanstilsynets data viser hver dag den samlede shortinteresse i en aktie, men ikke til
            hvilke kurser positionerne er handlet. Prisstrømmen er et estimat, der udfylder det hul.
            Beregningen sker i tre trin:
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 mb-4">
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              <span><strong>Dag-til-dag ændringer:</strong> Hver dag sammenlignes shortinteressen med dagen før.
              Stiger den, er der netto åbnet nye shorts. Falder den, er der netto dækket. Ændringen i
              procentpoint omregnes til aktier. For GN svarer 1 procentpoint til ca. 1,46 mio. aktier.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              <span><strong>Kursen sættes til forrige handelsdag:</strong> Ændringer indberettes typisk dagen
              efter handlen (T+1). En ændring, der bliver synlig tirsdag, afspejler derfor mest sandsynligt
              en handel mandag, og den tildeles mandagens kurs.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">3.</span>
              <span><strong>Aktierne fordeles i kursbånd:</strong> Alle ændringer samles i 2%-brede kursbånd.
              Rød betyder åbnede shorts, grøn betyder dækkede shorts, og nettokolonnen viser retningen i
              hvert bånd.</span>
            </li>
          </ul>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Du finder prisstrømmen på aktiens detaljeside under fanen Prisstrøm, både på zirium.dk og i
            appen. Resultatet minder om det, man i teknisk analyse kalder en volumenprofil, men her er
            det udelukkende short-aktiviteten, der fordeles på kursniveau.
          </p>
        </section>

        {/* ── 2. Short-interesse vs. aktiekurs ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Konteksten: Short-interesse vs. aktiekurs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            Historik siden november 2023. Blå = short-interesse, lilla = lukkekurs. Det er disse to
            kurver, prisstrømmen kombinerer til ét billede.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse vs. aktiekurs for GN Store Nord siden november 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={POSITION_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gnPfShortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[4, 14]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[60, 240]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#gnPfShortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            GN er et godt eksempel, fordi aktien har været igennem hele spektret: En top på 224 DKK i juni
            2024, et bundniveau på 82,56 DKK i april 2025 og et hop på Amplifon-nyheden i marts 2026.
            Samtidig er shortinteressen gået fra 6% til over 13% og ned igen til 9,85%. Siden november 2023
            er der brutto åbnet shorts for 62,9 mio. aktier og dækket 57,4 mio. Det er ca. 4,4 gange den
            nuværende shortposition på ca. 14,3 mio. aktier, så der har været rigeligt med aktivitet at
            fordele på kursbåndene.
          </p>
        </section>

        {/* ── 3. Hele historikken ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">3. Hele historikken i ét billede</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            Nettostrøm per 2%-bredt kursbånd siden november 2023. Rød = netto åbnede shorts, grøn = netto
            dækkede shorts. Den stiplede linje markerer den aktuelle kurs.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Netto prisstrøm per kursbånd for GN Store Nord siden november 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FLOW_FULL} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="mid" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${Math.round(Number(v))}`} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} label={{ value: "mio. aktier", angle: -90, position: "insideLeft", fontSize: 10, fill: tickColor }} />
                <Tooltip content={FlowTooltip} cursor={{ fill: isDark ? "#ffffff10" : "#00000008" }} />
                <ReferenceLine y={0} stroke={isDark ? "#555" : "#ccc"} />
                <ReferenceLine x={86.8} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                  {FLOW_FULL.map((b) => (
                    <Cell key={b.mid} fill={b.net > 0 ? "#e63946" : "#2a9d8f"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#e63946] inline-block" />Netto åbnet</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#2a9d8f] inline-block" />Netto dækket</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Kurs i dag (87,30 DKK)</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4 mb-4">
            Tre bånd springer i øjnene. Det største røde bånd ligger ved 106,80-108,94 DKK, hvor der netto
            er åbnet 3,1 mio. aktier, med yderligere 1,8 mio. i nabobåndet 108,94-111,11 DKK. Det andet
            store røde område ligger ved 161,87-165,11 DKK med netto 2,7 mio. aktier, som primært blev
            åbnet i efteråret 2024, da aktien stadig handlede over 160 DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            De største grønne bånd ligger til gengæld lavt: 94,84-96,73 DKK (netto dækket 2,5 mio. aktier),
            104,71-106,80 DKK (netto 2,5 mio.), 149,55-152,54 DKK (netto 1,7 mio.) og 98,67-100,64 DKK
            (netto 1,7 mio.). Mønstret er altså, at shorts netto er åbnet på høje kursniveauer og dækket
            på lavere. Lægger man båndene sammen, er der over 113 DKK netto åbnet ca. 4,7 mio. aktier,
            mens der under 100 DKK netto er dækket ca. 1,1 mio.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Hvad kan man bruge det til? Hvis de positioner, der blev åbnet ved 107-111 og 160-170 DKK,
            stadig er åbne, sidder de på solide gevinster ved den aktuelle kurs på ca. 87 DKK. Det er
            shorts med en stor buffer, som ikke er tvunget til at reagere på mindre kursudsving. Omvendt
            betyder den massive dækning under 100 DKK, at mange shorts allerede har taget gevinsten her,
            og kursen er nu faldet ned under det tunge dækningsbånd ved 95-106 DKK.
          </p>
        </section>

        {/* ── 4. Amplifon-casen ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Casen: Amplifon-dagene viser, hvordan strømmen skal læses</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den 16. marts 2026 annoncerede GN salget af sin høreapparatdivision til Amplifon, og aktien
            lukkede i 105,30 DKK efter et stort hop. I de følgende to dage faldt shortinteressen fra
            13,04% til 10,85%, det vil sige 2,19 procentpoint eller ca. 3,2 mio. aktier. Fordi
            ændringerne tildeles forrige handelsdags kurs, lander stort set hele dækningen i båndet
            104,71-106,80 DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det er den største enkeltstående dækning i hele GN-datasættet, og den forklarer, hvorfor
            båndet omkring 105 DKK lyser grønt i grafen ovenfor. Pointen er generel: Når du ser et
            stort grønt eller rødt bånd, er det ofte en enkelt begivenhed, der ligger bag. Datokolonnen
            i appen viser, hvornår hvert bånd sidst var aktivt, så du kan koble strømmen til konkrete
            nyheder.
          </p>
        </section>

        {/* ── 5. Seneste 3 måneder ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">5. De seneste 3 måneder: Mild dækning, men ny shorting i bunden</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Periodeknapperne på detaljesiden filtrerer også prisstrømmen. Det er vigtigt, for det fulde
            billede ovenfor blander to år gamle handler sammen med sidste uges. Vælger man kun de seneste
            3 måneder, ser tabellen sådan ud:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Prisstrøm for GN Store Nord de seneste 3 måneder</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Kursbånd (DKK)</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Shortet</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dækket</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Netto</th>
                </tr>
              </thead>
              <tbody>
                {FLOW_3M.map((b, i) => (
                  <tr key={b.band} className={i % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50/50 dark:bg-[#15151a]"}>
                    <td className="px-4 py-3 text-sm font-medium tabular-nums text-gray-900 dark:text-white whitespace-nowrap">{b.band}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-red-500">{b.shorted > 0 ? fmtMio(b.shorted) : "-"}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-green-600 dark:text-green-400">{b.covered > 0 ? fmtMio(b.covered) : "-"}</td>
                    <td className={`px-4 py-3 text-sm tabular-nums font-semibold ${b.net > 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>{b.net > 0 ? "+" : ""}{fmtMio(b.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Siden slutningen af marts er der netto dækket ca. 1,7 mio. aktier, og shortinteressen er
            faldet fra 11,03% til 9,85%. Brutto er der dækket 7,0 mio. aktier og åbnet 5,2 mio. Dækningen
            er koncentreret omkring 96-100 DKK, hvor der netto er dækket ca. 1,5 mio. aktier i april og
            maj. Bemærk, at de store Amplifon-dage fra marts nu er gledet ud af 3-måneders-vinduet, så
            billedet her er renset for det enkeltstående hop og viser, hvad shorterne har gjort siden.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Mere interessant er de røde bånd i bunden af tabellen: I båndene under ca. 92 DKK
            (87,30-89,05 og 90,83-92,64) har strømmen de seneste 3 måneder været netto rød, og det samme
            gælder et enkelt bånd ved 102-104 DKK. Det tyder på, at nogle shorts genåbner positioner, når
            aktien falder ned i 80'erne. Shortinteressen har i juni svinget mellem ca. 9,5% og 10,2% og
            ligger nu på 9,85%, så det samlede pres er ikke aftaget, det har bare flyttet sig ned ad
            kursskalaen.
          </p>
        </section>

        {/* ── 6. Sådan bruger du fanen ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Sådan bruger du fanen i praksis</h2>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Brug periodeknapperne aktivt</h4>
              <p>Det fulde billede viser, hvor de historiske positioner er bygget op, mens 1M/3M viser, hvad shorterne gør lige nu. Som i GN-eksemplet kan de to fortælle vidt forskellige historier: Historisk netto-shorting ved 107-111 DKK, men overvejende dækning de seneste måneder.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Læg mærke til farveintensiteten og datoerne</h4>
              <p>Bjælkerne nedtones efter alder: Aktivitet inden for de seneste 90 dage står skarpt, 3-12 måneder gammel aktivitet er svagere, og alt over et år er svagest. Datoerne i tabellen viser, hvornår hvert kursbånd sidst var aktivt. Et kraftigt rødt bånd med en frisk dato betyder, at der shortes på det niveau netop nu.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Sammenlign med den aktuelle kurs</h4>
              <p>Ligger kursen under de store røde bånd, er shorterne samlet set i plus, og de har råd til at være tålmodige. Ligger kursen over dem, er de pressede, og en yderligere kursstigning kan tvinge dem til at dække. For GN ligger de store røde bånd ved 107-111 og 160-170 DKK, altså et godt stykke over den aktuelle kurs på ca. 87 DKK.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Kobl store bånd til begivenheder</h4>
              <p>Store udsving i strømmen har næsten altid en konkret anledning: Et regnskab, en nedjustering eller, som i GN's tilfælde, et frasalg. Brug datoerne til at finde begivenheden, før du tolker på mønstret.</p>
            </div>
          </div>
        </section>

        {/* ── 7. Forbehold ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Forbehold: Hvad prisstrømmen ikke kan</h2>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 mb-4">
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              <span><strong>Den ser kun nettoændringer:</strong> Hvis en fond dækker 500.000 aktier, og en anden
              åbner 500.000 den samme dag, viser strømmen nul. Den reelle aktivitet er altid større end
              det, der kan aflæses.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              <span><strong>Kursen er en antagelse:</strong> Vi antager, at handlen skete til forrige handelsdags
              kurs på grund af T+1-indberetning. Den faktiske handelskurs inden for dagen kender vi ikke,
              og ved store intradag-udsving, som på Amplifon-dagen, kan afvigelsen være betydelig.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">3.</span>
              <span><strong>Den skelner ikke mellem aktører:</strong> Strømmen er summen af alle shorts, både de
              offentliggjorte positioner over 0,50% og de anonyme under. Et rødt bånd fortæller, at nogen
              shortede på det niveau, ikke hvem, og heller ikke om de stadig holder positionen. Med en
              bruttoaktivitet på 4,4 gange den nuværende position kan mange af de viste handler for længst
              være modsvaret af senere handler.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">4.</span>
              <span><strong>Båndene er estimater:</strong> 2%-brede kursbånd er valgt som kompromis mellem detalje
              og støj. Tallene skal læses som niveauer og størrelsesordener, ikke som præcise handelskurser.</span>
            </li>
          </ul>
        </section>

        {/* ── 8. Konklusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Konklusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Prisstrømmen besvarer det spørgsmål, som den rå shortinteresse ikke kan: Ikke bare hvor meget
            der er shortet, men hvor. For GN viser den, at den stående shortposition primært er bygget op
            ved 107-111 DKK og oppe ved 160-170 DKK, mens der under 100 DKK netto er blevet dækket. Ved
            den aktuelle kurs på ca. 87 DKK er den gennemsnitlige tilbageværende short derfor i plus,
            og selvom de seneste 3 måneder samlet set har været domineret af gevinsthjemtagning, er der
            samtidig dukket ny netto-shorting op i de laveste bånd.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Og det er netop det mest interessante at holde øje med herfra: farven på båndene omkring
            87-92 DKK. I 3M-visningen er de nu netop blevet røde, altså genopbygger nogle shorts
            positioner, efterhånden som aktien er faldet ned i 80'erne. Fortsætter det mønster, er
            historien om GN som en af de mest shortede danske aktier langtfra slut. Vender båndene tilbage
            til grøn, er dækningen i gang igen. Prisstrømmen giver dig svaret løbende, opdateret hver dag
            på aktiens detaljeside.
          </p>
        </section>

        <FeedbackWidget pageType="analysis" pageId="gn/2026-06-28" />
        <RelatedAnalyses currentSlug="gn/2026-06-28" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Prisstrømmen er et estimat baseret på offentligt tilgængelige data fra
            Finanstilsynet og markedspriser. De faktiske handelskurser kan afvige væsentligt. Foretag altid
            din egen analyse, og søg professionel rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  28. juni 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default GNPriceFlowAnalysisPage;
