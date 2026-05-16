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
// Aggregerede datapunkter fra Zirium-datasættet (Finanstilsynet + lukkekurser).
// Datasættet starter i oktober 2023.
const FULL_HISTORY: ChartPoint[] = [
  { date: "2023-10-23", short: 9.40, close: 131.1, volume: null },
  { date: "2023-10-31", short: 9.25, close: 134.25, volume: null },
  { date: "2023-11-07", short: 8.80, close: 135.6, volume: null },
  { date: "2023-11-17", short: 9.06, close: 144.15, volume: null },
  { date: "2023-12-13", short: 8.16, close: 172.4, volume: null },
  { date: "2024-01-10", short: 7.16, close: 173.5, volume: null },
  { date: "2024-02-14", short: 7.21, close: 155.55, volume: null },
  { date: "2024-03-08", short: 5.65, close: 173.1, volume: null },
  { date: "2024-04-22", short: 6.72, close: 150.1, volume: 421064 },
  { date: "2024-05-08", short: 6.92, close: 162.9, volume: null },
  { date: "2024-06-03", short: 4.66, close: 186.25, volume: null },
  { date: "2024-07-09", short: 4.44, close: 185.2, volume: null },
  { date: "2024-08-22", short: 4.20, close: 272.3, volume: null },
  { date: "2024-09-12", short: 3.91, close: 237.8, volume: null },
  { date: "2024-10-22", short: 3.73, close: 223.5, volume: null },
  { date: "2024-11-07", short: 3.04, close: 204.0, volume: null },
  { date: "2024-12-09", short: 4.25, close: 196.2, volume: null },
  { date: "2025-01-14", short: 3.44, close: 193.3, volume: null },
  { date: "2025-02-21", short: 4.87, close: 174.2, volume: null },
  { date: "2025-03-05", short: 5.07, close: 167.9, volume: null },
  { date: "2025-04-04", short: 3.06, close: 143.15, volume: null },
  { date: "2025-05-13", short: 2.20, close: 158.6, volume: null },
  { date: "2025-06-13", short: 2.14, close: 183.85, volume: null },
  { date: "2025-07-17", short: 1.74, close: 182.45, volume: null },
  { date: "2025-08-14", short: 0.93, close: 238.5, volume: null },
  { date: "2025-09-24", short: 0.87, close: 230.6, volume: null },
  { date: "2025-10-22", short: 0.84, close: 241.8, volume: null },
  { date: "2025-11-06", short: 0.77, close: 187.0, volume: 4064267 },
  { date: "2025-11-25", short: 2.11, close: 184.25, volume: null },
  { date: "2026-01-07", short: 2.60, close: 199.5, volume: null },
  { date: "2026-02-12", short: 2.32, close: 193.2, volume: null },
  { date: "2026-03-11", short: 2.69, close: 183.1, volume: null },
  { date: "2026-04-20", short: 2.11, close: 197.1, volume: null },
  { date: "2026-05-12", short: 1.93, close: 198.4, volume: null },
  { date: "2026-05-13", short: 1.98, close: 188.3, volume: null },
  { date: "2026-05-14", short: 1.67, close: 188.3, volume: null },
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
  { name: "Under 0,50% (ukendte)", value: 1.23 },
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
const BAVAAnalysisPage: React.FC = () => {
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
      <title>Zirium | Bavarian Nordic (BAVA) - Shortanalyse</title>
      <meta name="description" content="Analyse af short-positioner i Bavarian Nordic (BAVA). Fra 9,40% i oktober 2023 til under 2% i dag, gennem et overtagelsesbud og et kursfald på 54% fra toppen." />
      <meta property="og:title" content="Shortanalyse: Da BAVA sad øverst på shortlisten" />
      <meta property="og:description" content="Analyse af short-positioner i Bavarian Nordic (BAVA). Fra 9,40% i oktober 2023 til under 2% i dag, gennem et overtagelsesbud og et kursfald på 54% fra toppen." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/bava/2026-05-17" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Shortanalyse: Da BAVA sad øverst på shortlisten" />
      <meta name="twitter:description" content="Analyse af short-positioner i Bavarian Nordic (BAVA). Fra 9,40% i oktober 2023 til under 2% i dag, gennem et overtagelsesbud og et kursfald på 54% fra toppen." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Shortanalyse: Da BAVA sad øverst på shortlisten",
        "description": "Analyse af short-positioner i Bavarian Nordic (BAVA). Fra 9,40% i oktober 2023 til under 2% i dag, gennem et overtagelsesbud og et kursfald på 54% fra toppen.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-17",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/bava/2026-05-17",
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

        {/* Header */}
        <header className="mb-10 mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Analyse lavet af Araz Bayat Makoo (Zirium) - 17. maj 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Shortanalyse: Da BAVA sad øverst på shortlisten
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Bavarian Nordic (BAVA)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Denne analyse kombinerer udviklingen i short-positioner med de vigtigste
            begivenheder i Bavarian Nordic siden oktober 2023. Formålet er at sætte tallene
            i kontekst: Hvad skete der, da shortinteressen var på sit højeste, og hvad har
            bragt den ned til under 2%?
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="1,67%" label="Short-interesse (maj 2026)" />
          <KPI value="9,40%" label="Højeste i datasættet (okt 2023)" />
          <KPI value="1" label="Aktiv short-sælger over 0,50%" />
          <KPI value="-54%" label="Fra ATH (411 DKK, aug 2022)" />
        </div>

        {/* 1. Overordnet billede */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overordnet billede</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            En af grundene til, at jeg byggede Danish Short Watch appen og hjemmesiden, var min interesse i at følge netop BAVAs
            shortposition. I 2023 var aktien noget af det mest diskuterede på det danske aktiemarked,
            og shortinteressen var høj. Datasættet starter i oktober 2023,
            og den 23. oktober nåede shortinteressen 9,40%. Det er det højeste registrerede
            niveau vi har, men datasættet dækker ikke perioden før, så niveauet kan have
            været endnu højere.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Siden da er shortinteressen faldet til 1,67%, et fald på ca. 82%.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Undervejs er der sket en række ting: WHO erklærede en ny mpox-PHEIC i
            august 2024, og aktien steg til 272 DKK. Nordic Capital og Permira fremsatte et
            overtagelsesbud i juli 2025, og budet kollapsede i november samme år. Alle
            disse begivenheder ser ud til at afspejle sig i udviklingen i shortinteressen.
          </p>
        </section>

        {/* Chart 1: Full history */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short-interesse vs. aktiekurs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Historik siden oktober 2023. Blå = short-interesse, lilla = lukkekurs (DKK).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse vs. aktiekurs for Bavarian Nordic fra november 2023 til maj 2026">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FULL_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="bavaShortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="40%" stopColor="#007AFF" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                  <filter id="bavaGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 10]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[130, 290]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#bavaShortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2, filter: "url(#bavaGlow)" }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
                <ReferenceLine yAxisId="short" y={9.40} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "9,40%", fontSize: 9, fill: "#eab308", position: "insideTopLeft" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Højeste i datasæt</span>
            </div>
          </div>
        </section>

        {/* 3. Baggrund */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Vaccineboomen og det, der fulgte</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Bavarian Nordic er bedst kendt for JYNNEOS, en af de få godkendte mpox-vacciner. Da
            mpox-udbruddet begyndte at sprede sig globalt i maj 2022, og den 23. juli erklærede
            WHO en international folkesundhedsnødsituation (PHEIC). Efterspørgslen eksploderede.
            USA, EU og en lang række lande placerede store ordrer. Aktien steg fra ca. 130 DKK
            i maj 2022 til 411 DKK intradag den 5. august 2022.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Efterfølgende faldt omsætningen igen. JYNNEOS-salget er tæt knyttet til myndighedsordrer
            under udbrud: Regeringer fylder beredskabslagre op og bestiller markant færre doser de
            efterfølgende år. I februar 2023 annoncerede selskabet købet af Emergent BioSolutions'
            rejsevaccinportefølje (Vivotif mod tyfus, Vaxchora mod kolera samt en chikungunya-kandidat
            i fase 3) for op til USD 380 mio., blandt andet finansieret via en kapitalforhøjelse på
            1.642 mio. DKK til kurs 233 DKK per aktie. Det svarede til ca. 10% udvanding. Handelen
            blev lukket i maj 2023.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det var i denne periode, at shortinteressen byggede sig op til det niveau, vi ser i
            starten af datasættet i oktober 2023. Vi ved fra Finanstilsynets individuelle
            indberetninger, at en lang række fonde havde positioner over 0,50% allerede i 2022,
            herunder Marshall Wace (op til 1,60%), Arrowstreet Capital (op til 1,00%) og Capital
            Fund Management (op til 0,72%).
          </p>
        </section>

        {/* 4. Den gradvise afvikling */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Den gradvise afvikling efter toppen</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Fra toppen i oktober 2023 begyndte shorterne at trække sig, i en periode hvor
            aktien steg markant. Shortinteressen faldt fra 9,40% til 8,16% i december og
            7,16% i begyndelsen af januar 2024, mens aktien gik fra ca. 131 DKK i slutningen
            af oktober til 173 DKK i midten af januar. Det er ikke en dramatisk afvikling,
            men en jævn lukning af positioner, hvilket kan have været påvirket af den
            stigende aktiekurs.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I august 2024 kom der en interessant udvikling. WHO erklærede endnu en
            mpox-PHEIC (Clade I i DRC), og aktien steg markant til over 280 DKK.
            Shortinteressen faldt til omkring 4% i slutningen af august (lavpunkt 3,96% den
            28. august). Men i de efterfølgende måneder, da aktien faldt tilbage, steg
            shortinteressen igen. Q3-regnskabet i november 2024 viste, at JYNNEOS-salget
            var faldet 26% år-over-år (74,4 mio. USD mod 100,3 mio. USD året før), og
            shortinteressen nåede et sekundært toppunkt på 5,08% den 5. marts 2025 ved
            aktiekurs 168 DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det bemærkelsesværdige er, at shortinteressen steg efter markedets fokus på mpox
            begyndte at aftage. Det
            tyder på, at markedets bekymring ikke handlede om én enkelt begivenhed, men om
            den underliggende forretningsmodel: Kan Bavarian Nordic vokse stabilt, når
            JYNNEOS-omsætningen er knyttet til udbrudscykler?
          </p>
        </section>

        {/* Chart 2: Recent period */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. Overtagelsesbudet og hvad der fulgte</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Juli 2025 til maj 2026. Den 6. november 2025 trak Nordic Capital og Permira budet tilbage.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse og volumen for Bavarian Nordic under og efter overtagelsesforsøget">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={RECENT_PERIOD} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="bavaShortGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(d) => { const p = d.split("-"); const m = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"]; return `${parseInt(p[2])} ${m[parseInt(p[1])-1]}`; }} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0.5, 3.2]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="vol" hide domain={[0, 8000000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#bavaShortGrad2)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volumen</span>
            </div>
          </div>
        </section>

        {/* 6. Overtagelsesbudet */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Fra 5,07% til 0,77%: Budet der ændrede alt</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det tydeligste skift i dataene kommer i perioden april til november 2025.
            Shortinteressen faldt fra 5,07% i marts til 3,06% i april, videre til 1,74% i
            juli og helt ned til 0,77% den 6. november. Det er et fald på 85% på otte måneder.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Timingen falder sammen med Nordic Capital og Permiras overtagelsesbud i juli 2025,
            der startede på 233 DKK per aktie og senere blev hævet til 250 DKK i oktober.
            For shortsælgere er et overtagelsesbud en vanskelig
            situation: Aktien stiger mod budkursen, og tabet på en shortposition kan vokse
            markant, hvis budet gennemføres. Det er en klassisk mekanisme, der tvinger mange
            til at dække.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den 6. november 2025 trak Nordic Capital og Permira budet tilbage, da tilslutningen
            var utilstrækkelig. Aktien faldt fra ca. 242 DKK til 187 DKK med massiv omsætning.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det interessante er, hvad der skete bagefter. Shortinteressen steg fra 0,77%
            til 2,11% på blot 19 dage og nåede 2,69% i marts 2026. Det fortæller os, at nye
            aktører indtog shortpositioner efter budets kollaps. Siden er den faldet lidt
            igen til 1,93% i maj 2026.
          </p>
        </section>

        {/* Sellers section */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Hvem shorter Bavarian Nordic?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Der er i dag 1 institutionel aktør med en position over 0,50%-indberetningsgrænsen:
            Connor Clark & Lunn Investment Management Ltd med 0,70% ifølge seneste indberetning
            den 20. april 2026. Historisk har en lang række fonde haft positioner i BAVA. Qube
            Research & Technologies var den største kendte aktør i analyseperioden med en position
            op til 1,33% (august 2023), men lukkede helt ned i april 2025. Millennium International
            Management nåede 1,00% i august 2023 og december 2023, men faldt under grænsen i
            november 2024. De resterende ca. 1,23% holdes af aktører under rapporteringsgrænsen,
            hvis identitet vi ikke kender.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Aktive short-sælgere i Bavarian Nordic</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short-sælger</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dato</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Beskrivelse</th>
                </tr>
              </thead>
              <tbody>
                <SellerRow i={0} name="Connor Clark & Lunn Inv. Mgmt" position="0,70%" date="20. apr" desc="Aktiv siden dec 2025. Højeste kendte: 0,81% (jan 2026)." />
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Positionsudvikling over tid</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Individuelle short-sælgeres positioner baseret på indberetninger til Finanstilsynet. Mellemliggende datapunkter er estimater.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Individuelle short-sælgeres positionsudvikling over tid for Bavarian Nordic">
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

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-8 mb-2">Fordeling af den samlede short-interesse</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Ca. 64% af short-interessen holdes af aktører under 0,50%-tærsklen, hvis identitet er ukendt.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 flex justify-center" role="img" aria-label="Cirkeldiagram: Fordeling af den samlede short-interesse i Bavarian Nordic">
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">8. Tidslinje over nøglebegivenheder</h2>
          <div className="ml-2">
            <TimelineEvent date="Juli - august 2022" title="WHO erklærer mpox-PHEIC: Aktien stiger til 411 DKK" color="#2a9d8f">
              <p>Mpox-udbruddet spreder sig globalt fra maj 2022, og den 23. juli erklærer WHO en international folkesundhedsnødsituation (PHEIC). USA, EU og andre lande placerer store vaccineordrer. Aktien stiger fra ca. 160 DKK til 411 DKK den 5. august 2022.</p>
            </TimelineEvent>
            <TimelineEvent date="Februar 2023" title="Emergent-opkøbet annonceret" color="#4361ee">
              <p>Bavarian Nordic annoncerer køb af Emergent BioSolutions' rejsevaccinportefølje for op til USD 380 mio. Finansiering via kapitalforhøjelse på 1.642 mio. DKK til kurs 233 DKK, svarende til ca. 10% udvanding.</p>
            </TimelineEvent>
            <TimelineEvent date="November 2023" title="9,06% shortinteresse - højeste i datasættet" color="#e63946">
              <p>Datasættet starter i november 2023, og den 17. november nås 9,06%, det højeste registrerede niveau. Aktien handlede til ca. 144 DKK. Qube Research & Technologies (1,06%), Millennium International Management (0,90%) og Arrowstreet Capital er blandt de kendte aktører med positioner over 0,50%.</p>
            </TimelineEvent>
            <TimelineEvent date="August 2024" title="WHO erklærer ny mpox-PHEIC: Aktien stiger til 272 DKK" color="#2a9d8f">
              <p>WHO erklærer endnu en PHEIC på grund af Clade I mpox-varianten i DRC. Aktien stiger til 272 DKK. Shortinteressen falder til 4,20%.</p>
            </TimelineEvent>
            <TimelineEvent date="November 2024" title="Q3-regnskab: JYNNEOS-salg -26% år-over-år" color="#e63946">
              <p>JYNNEOS-salget i Q3 2024 er 74,4 mio. USD mod 100,3 mio. USD året før. Aktien falder 12% på dagen. Shortinteressen stiger efterfølgende fra 3,04% til 5,07% i marts 2025.</p>
            </TimelineEvent>
            <TimelineEvent date="5. marts 2025" title="Sekundært toppunkt: 5,07% shortinteresse" color="#e63946">
              <p>Shortinteressen rammer 5,07% ved aktiekurs 168 DKK. Det er det højeste niveau i data siden januar 2024. Samme dag køber CEO Paul Chaplin aktier for 1,4 mio. DKK, CFO Henrik Juuel for 704.000 DKK og CCO Jean-Christophe May for 514.000 DKK. Fra april begynder et hurtigt fald i shortinteressen.</p>
            </TimelineEvent>
            <TimelineEvent date="9. maj 2025" title="Insidere køber igen: CEO Chaplin for 4 mio. DKK" color="#2a9d8f">
              <p>CEO Paul Chaplin køber 25.663 aktier for knap 4 mio. DKK. COO Russell Thirsk køber for 735.000 DKK, og tre bestyrelsesmedlemmer køber hver for 150.000 DKK. Shortinteressen er faldet til 2,20%. Samlet insider-køb i 2025: ca. 7,8 mio. DKK.</p>
            </TimelineEvent>
            <TimelineEvent date="Juli 2025" title="Overtagelsesbud fra Nordic Capital og Permira: 233 DKK" color="#4361ee">
              <p>Nordic Capital og Permira lancerer et overtagelsesbud til 233 DKK per aktie. Shortinteressen falder fra 1,74% i juli til under 1%.</p>
            </TimelineEvent>
            <TimelineEvent date="Oktober 2025" title="Budet hæves til 250 DKK" color="#4361ee">
              <p>Budet hæves til 250 DKK per aktie. Shortinteressen fortsætter ned og rammer 0,77% den 6. november.</p>
            </TimelineEvent>
            <TimelineEvent date="6. november 2025" title="Budet trækkes tilbage: Aktien -22%, nye shorts indtræder" color="#e63946">
              <p>Tilslutningen er utilstrækkelig, og budet trækkes tilbage. Aktien falder til 187 DKK med massiv omsætning. I de følgende uger stiger shortinteressen fra 0,77% til 2,11%.</p>
            </TimelineEvent>
            <TimelineEvent date="12. marts 2026" title="Fire insidere køber for samlet 4,5 mio. DKK" color="#2a9d8f">
              <p>CEO Paul Chaplin (1,9 mio. DKK), CFO Henrik Juuel (1,0 mio. DKK), CCO Jean-Christophe May (921.000 DKK) og COO Russell Thirsk (646.000 DKK) køber alle aktier til kurs 177,65 DKK. Shortinteressen er på det tidspunkt 2,69%.</p>
            </TimelineEvent>
            <TimelineEvent date="Maj 2026" title="Shortinteressen på 1,93%" color="#2a9d8f">
              <p>Shortinteressen er faldet fra 2,69% i marts 2026 til 1,93%. Connor Clark & Lunn Investment Management er den eneste kendte aktør over 0,50%-grænsen med 0,70%.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* Insider transactions */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">9. Insider-transaktioner</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Mens shortsælgerne har reduceret deres positioner, har insidere i Bavarian Nordic
            købt aktier i det åbne marked. Siden marts 2025 er der registreret 12 insider-køb
            for samlet ca. 12,2 mio. DKK. Der er ikke registreret insider-salg i den tilgængelige data.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Insider-transaktioner i Bavarian Nordic</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Person</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dato</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Antal</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Kurs</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Beløb</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Paul Chaplin (CEO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">12. mar 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">10.642</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">177,65 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">1.891.000 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Henrik Juuel (CFO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">12. mar 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">5.748</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">177,65 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">1.021.000 DKK</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Jean-Christophe May (CCO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">12. mar 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">5.184</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">177,65 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">921.000 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Russell Thirsk (COO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">12. mar 2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">3.637</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">177,65 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">646.000 DKK</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Paul Chaplin (CEO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">9. maj 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">25.663</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">155,81 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">3.999.000 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Russell Thirsk (COO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">9. maj 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">6.669</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">110,21 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">735.000 DKK</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">3 bestyrelsesmedlemmer</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">9. maj 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">3 x 983</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">152,58 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">3 x 150.000 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Paul Chaplin (CEO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">5. mar 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">12.543</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">108,71 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">1.364.000 DKK</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Henrik Juuel (CFO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">5. mar 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">6.480</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">108,71 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">704.000 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Jean-Christophe May (CCO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">5. mar 2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">4.726</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">108,73 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white hidden sm:table-cell">514.000 DKK</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det mest markante er CEO Paul Chaplins tre separate køb for samlet ca. 7,25 mio.
            DKK. Han købte først i marts 2025 ved 108 DKK (nær det sekundære toppunkt i
            shortinteressen), igen i maj 2025 for knap 4 mio. DKK, og senest i marts 2026
            ved 177 DKK. CFO Henrik Juuel og COO Russell Thirsk har begge købt ved to
            lejligheder.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Vigtigt:</strong> Udover disse køb modtog ledelsen også aktietildelinger som
            en del af deres aflønning i marts 2025 og december 2024. Disse tildelinger er
            kompensationsbaserede og skal ikke forveksles med åbent markedskøb. Tabellen
            ovenfor viser kun køb i det åbne marked.
          </p>
        </section>

        {/* Bull/Bear */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Argumenter for og imod</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            De fleste af de store kendte shortsælgere har lukket deres positioner. Qube Research
            lukkede helt i april 2025, og Millennium faldt under grænsen i november 2024. Connor
            Clark & Lunn er den eneste aktør over 0,50% i dag med 0,70%. Ca. 64% af den samlede
            shortinteresse holdes af ukendte aktører under rapporteringsgrænsen. Her er de mest
            oplagte argumenter på begge sider:
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Argumenter for at shorte</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>JYNNEOS-omsætning er knyttet til myndighedsordrer under udbrud</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Mpox-vaccinesalget faldt 46% år-over-år i de første ni måneder af 2024</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Det mislykkede overtagelsesbud efterlader usikkerhed om strategien</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Chikungunya-programmet kræver store investeringer uden garanteret udfald</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Argumenter imod at shorte</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>JYNNEOS er fortsat en af de få godkendte mpox-vacciner</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Rejsevacciner (Rabipur, Encepur) giver tilbagevendende omsætning</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Aktien er ned 52% fra ATH - en stor del af risikoen kan være prissat ind</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>PE-interesse ved 233-250 DKK indikerer en ekstern vurdering af selskabets værdi</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Insidere (inkl. CEO, CFO og COO) har købt for 12,2 mio. DKK, ingen har solgt</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Conclusion */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Konklusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Fra 9,06% i november 2023 til 1,93% i maj 2026 er shortinteressen i Bavarian Nordic
            faldet ca. 79%. Det er sket i to faser: En gradvis afvikling i 2024, og en hurtig
            afvikling under overtagelsesbudet i 2025, hvor shortinteressen faldt til blot 0,77%.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det mest interessante signal i nyere data er det, der skete efter budet kollapsede.
            Shortinteressen steg fra 0,77% til over 2,5% på kort tid, hvilket fortæller os, at
            nye aktører vurderede, at der var grundlag for en shortposition ved de daværende
            kursniveauer. Siden marts 2026 er den dog faldet lidt igen.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            De store kendte shortsælgere fra 2023 har alle lukket deres positioner. Qube Research
            & Technologies, der var den største med op til 1,33%, lukkede helt i april 2025.
            Connor Clark & Lunn er den eneste nuværende aktør over 0,50% med en position på
            0,70%, aktiv siden december 2025.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Kommende katalysatorer at holde øje med</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Nye mpox-ordrer fra USA og EU (beredskabslagre fornyes med jævne mellemrum)</li>
              <li>&#x2022; Resultater fra chikungunya Phase 3-forsøg og eventuel regulatorisk godkendelse</li>
              <li>&#x2022; Et nyt overtagelsesforsøg ville igen presse shortsælgere</li>
              <li>&#x2022; Udviklingen i rejsevaccinomsætningen som signal om forretningens stabilitet</li>
              <li>&#x2022; Eventuelle nye mpox-udbrud og myndighedernes reaktion</li>
            </ul>
          </div>
        </section>

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Short-interessedata stammer fra Finanstilsynets offentlige registre
            via Zirium. Datasættet for den aggregerede shortinteresse starter i november 2023.
            Individuelle short-sælgerdatapunkter er delvist estimater. Historisk afkast er ikke en
            garanti for fremtidigt afkast. Foretag altid din egen analyse, og søg professionel
            rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Genereret af Zirium  |  15. maj 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default BAVAAnalysisPage;
