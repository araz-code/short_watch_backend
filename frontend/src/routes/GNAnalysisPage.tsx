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
  { date: "2023-10-20", short: 5.82, close: 120.5, volume: null },
  { date: "2023-12-06", short: 6.29, close: 172.0, volume: null },
  { date: "2024-02-09", short: 6.79, close: 159.8, volume: null },
  { date: "2024-04-29", short: 6.55, close: 190.6, volume: null },
  { date: "2024-06-06", short: 5.38, close: 224.2, volume: null },
  { date: "2024-08-05", short: 6.62, close: 161.0, volume: null },
  { date: "2024-10-15", short: 9.95, close: 136.5, volume: null },
  { date: "2024-12-31", short: 10.92, close: 133.8, volume: null },
  { date: "2025-01-15", short: 11.34, close: 140.0, volume: null },
  { date: "2025-03-05", short: 9.96, close: 127.8, volume: null },
  { date: "2025-04-09", short: 9.63, close: 82.6, volume: null },
  { date: "2025-05-08", short: 10.26, close: 90.5, volume: null },
  { date: "2025-07-18", short: 8.08, close: 93.7, volume: null },
  { date: "2025-09-01", short: 7.18, close: 115.6, volume: null },
  { date: "2025-10-02", short: 8.49, close: 107.4, volume: null },
  { date: "2025-11-24", short: 9.35, close: 103.6, volume: null },
  { date: "2026-01-06", short: 10.11, close: 109.9, volume: null },
  { date: "2026-02-04", short: 12.05, close: 112.1, volume: null },
  { date: "2026-02-25", short: 13.05, close: 93.6, volume: null },
  { date: "2026-03-11", short: 13.00, close: 87.5, volume: null },
  { date: "2026-03-16", short: 13.12, close: 86.9, volume: 700093 },
  { date: "2026-03-18", short: 10.85, close: 118.0, volume: 3200000 },
  { date: "2026-03-20", short: 11.46, close: 100.2, volume: 1353826 },
  { date: "2026-03-24", short: 11.01, close: 96.5, volume: 763215 },
  { date: "2026-04-01", short: 10.96, close: 100.7, volume: 524675 },
  { date: "2026-04-09", short: 10.42, close: 96.7, volume: 505757 },
  { date: "2026-04-16", short: 10.71, close: 109.7, volume: 1145982 },
  { date: "2026-04-23", short: 10.52, close: 97.5, volume: 662279 },
  { date: "2026-04-30", short: 10.98, close: 95.7, volume: 604156 },
  { date: "2026-05-06", short: 11.34, close: 99.0, volume: 508490 },
  { date: "2026-05-08", short: 11.15, close: 95.4, volume: 1469997 },
  { date: "2026-05-12", short: 10.14, close: 94.5, volume: 508490 },
  { date: "2026-05-13", short: 9.81, close: 94.5, volume: null },
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
  { name: "Under 0,50% (ukendte)", value: 5.01 },
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
      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mb-1">{String(label)}</p>
      {shortVal && <p className="text-center font-bold text-lg tabular-nums text-[#007AFF]">{Number(shortVal.value).toFixed(2)}%</p>}
      {priceVal && priceVal.value != null && <p className="text-center text-purple-500 dark:text-purple-400 tabular-nums">{Number(priceVal.value).toFixed(1)} DKK</p>}
      {volVal && volVal.value != null && Number(volVal.value) > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 tabular-nums">Vol: {Number(volVal.value).toLocaleString("da-DK")}</p>
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
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function TimelineEvent({ date, title, children, color }: { date: string; title: string; children: React.ReactNode; color: string }) {
  return (
    <div className="relative pl-8 pb-8 last:pb-0 group">
      <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0d0d12] z-10" style={{ backgroundColor: color }} />
      <div className="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 group-last:hidden" />
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{date}</p>
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
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{date}</td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">{desc}</td>
    </tr>
  );
}

// ─── main component ─────────────────────────────────────────────────────────
const GNAnalysisPage: React.FC = () => {
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
      <title>Zirium | GN Store Nord (GN) - Shortanalyse</title>
      <meta name="description" content="Dybdegående analyse af short-positioner i GN Store Nord (GN). Hvem shorter, hvor meget, og hvorfor?" />

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
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Analyse lavet af Araz Bayat Makoo (Zirium) - 14. maj 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            GN Store Nord (GN)
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Shortanalyse og markedsvurdering
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Denne analyse kombinerer udviklingen i short-positioner med selskabets strategiske transformation.
            GN Store Nord er gået fra et konglomerat med tre divisioner til at være på vej mod et mere
            fokuseret enterprise- og gaming-selskab, og undervejs har shortinteressen nået nogle af de højeste
            niveauer i selskabets nyere historie.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="9,81%" label="Short-interesse (13. maj)" />
          <KPI value="94,50 DKK" label="Seneste lukkekurs (13. maj)" />
          <KPI value="5" label="Aktive short-sælgere" />
          <KPI value="-58%" label="Fra 3-års high (224 DKK, juni 2024)" />
        </div>

        {/* ── 1. Overordnet billede ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Overordnet billede</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            GN Store Nord har i de seneste to år gennemgået en radikal forvandling. Selskabet har lukket sin
            Jabra-forbrugerdivision, solgt sin høreapparatforretning til Amplifon for 17 mia. DKK, og er nu
            på vej til at blive et mere fokuseret enterprise- og gaming-selskab. Det er en transformation, der
            har efterladt investorerne dybt splittede.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Shortinteressen nåede 13,12% i marts 2026, hvilket gjorde GN til den mest shortede aktie
            på det danske marked. Selvom den er faldet til 9,81% efter Amplifon-nyheden, er niveauet fortsat
            usædvanligt højt og indikerer, at short-sælgerne endnu ikke er overbeviste om investeringscasen
            efter den strategiske omlægning.
          </p>
        </section>

        {/* ── Chart 1: Full history ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short-interesse vs. aktiekurs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Historik siden oktober 2023. Blå = short-interesse, lilla = lukkekurs.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5">
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
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>ATH (13,12%)</span>
            </div>
          </div>
        </section>

        {/* ── 2. Baggrund ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Fra konglomerat til identitetskrise</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I 2021 købte GN Store Nord SteelSeries for 8 mia. DKK med ambitionen om at skabe en global leder
            inden for gaming-audio. Samtidig havde selskabet tre etablerede divisioner: Hearing (ReSound/Beltone),
            Enterprise (Jabra professionel) og Consumer (Jabra Elite/Talk). Aktien havde tidligere handlet over
            500 DKK under toppen i 2021.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Men i juni 2024 kom det første store strategiske skift. GN annoncerede, at man ville lukke
            Jabra-forbrugerdivisionen (Elite og Talk-produktlinjerne) og i stedet fokusere på enterprise og
            gaming. Beslutningen kom efter vedvarende tab i konkurrencen mod Apple, Sony og Samsung.
            Nedlukningen betød ca. 450 mio. DKK i tabt årlig omsætning og ca. 200 mio. DKK i ekstraordinære omkostninger.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Shortinteressen var allerede stigende fra ca. 6% i midten af 2024, men det var først i efteråret 2024,
            at den virkelig accelererede. Fra september til december 2024 steg shortinteressen fra 7% til næsten 11%,
            i takt med at markedet begyndte at tvivle på den resterende forretnings indtjeningskraft.
          </p>
        </section>

        {/* ── 3. Hvad skete der i 2025 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. 2025: Aktien finder bunden</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I januar 2025 nåede shortinteressen 11,34%, og aktien begyndte at falde markant fra 148 DKK
            ned mod 83 DKK i april 2025. Faldet skyldtes en kombination af selskabsspecifikke og makroøkonomiske
            faktorer: svag organisk vækst i Enterprise-divisionen (ned 3% i 2024), usikkerheden om, hvorvidt
            SteelSeries-opkøbet nogensinde ville skabe den lovede synergi, og et bredt fald på de globale
            aktiemarkeder drevet af Trumps toldpolitik, som ramte eksportorienterede selskaber særligt hårdt.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Et lyspunkt var Q4 2024-regnskabet, der viste SteelSeries' bedste kvartal nogensinde med 1.053 mio.
            DKK i omsætning og 16% organisk vækst. Det viste, at gaming-forretningen havde momentum, men det var
            ikke nok til at opveje bekymringerne om Enterprise.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Hen over sommeren 2025 faldt shortinteressen gradvist fra toppen til ca. 7% i september, i takt med at
            aktien stabiliserede sig omkring 100-115 DKK. Det var en kortvarig lettelse.
          </p>
        </section>

        {/* ── Chart 2: Recent 3 months ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">5. Seneste 3 måneder i detaljer</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Short-interesse med volumen. Amplifon-annonceringen den 16. marts 2026 ses tydeligt.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={RECENT_3M} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gnShortGrad3m" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e63946" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e63946" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(d) => { const p = d.split("-"); const m = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"]; return `${parseInt(p[2])} ${m[parseInt(p[1])-1]}`; }} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[9, 14]} />
                <YAxis yAxisId="vol" hide domain={[0, 10000000]} />
                <Tooltip content={ShortPriceTooltip} />
                <Bar yAxisId="vol" dataKey="volume" fill={isDark ? "#555" : "#cbd5e1"} opacity={0.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#e63946" strokeWidth={2.5} fill="url(#gnShortGrad3m)" activeDot={{ r: 5, fill: "#e63946", stroke: "#fff", strokeWidth: 2 }} />
                <ReferenceLine yAxisId="short" y={13.12} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "ATH 13,12%", fontSize: 10, fill: "#eab308", position: "insideTopLeft" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#e63946] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 dark:bg-gray-500 inline-block" />Volumen</span>
            </div>
          </div>
        </section>

        {/* ── 4. Amplifon-salget ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Vendepunktet: Salget af Hearing til Amplifon</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den 16. marts 2026 annoncerede GN Store Nord salget af sin Hearing-division (ReSound, Beltone)
            til italienske Amplifon for 17 mia. DKK. Betalingen bestod af 12,6 mia. DKK kontant plus
            56 mio. aktier i Amplifon, hvilket gør GN til ejer af ca. 16% af Amplifon. Aktien steg 36% på
            en enkelt dag med massiv volumen.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            GN har meddelt, at provenuet skal bruges til at nedbringe gælden til en kortsigtet leverage på
            1,0-1,5x, investere i den fortsættende forretning, og udlodde kapital til aktionærerne. Selskabet
            forventer 3,5-4,5 mia. DKK i "overskydende kontanter" til aktionærerne efter gældsnedbringelsen,
            bl.a. via et aktietilbagekøbsprogram. Amplifon-aktierne er underlagt en lock-up-periode, og GN
            får ret til at foreslå et medlem til Amplifons bestyrelse.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Hearing-divisionen genererede 7,2 mia. DKK i omsætning i 2025 med en EBITDA-margin på ca. 16%.
            Ved at sælge den slipper GN for en kapitalintensiv forretning med hård konkurrence fra Sonova,
            Demant og WS Audiology, men mister samtidig sin mest stabile indtægtskilde.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det interessante er, at shortinteressen faldt kraftigt fra 13,12% til 10,85% umiddelbart efter
            annonceringen, steg kortvarigt til over 11% i begyndelsen af maj, og er siden faldet yderligere
            til 9,81% efter Q1-regnskabet. Trods faldet er niveauet fortsat højt, hvilket kan indikere, at
            dele af markedet fortsat ser betydelige risici i den tilbageværende forretning.
          </p>
        </section>

        {/* ── 5. Q1 2026 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Q1 2026: Margin-pres og nedjusteret guidance</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den 7. maj 2026 offentliggjorde GN sit Q1-regnskab, og det var svagt. Omsætningen fra den
            fortsættende forretning (Enterprise + Gaming) var 2.096 mio. DKK, et fald på 8% og 4% organisk.
            Den justerede EBITA-margin faldt til 0,3% fra 5,7% året før, bl.a. på grund af
            betydelige engangsomkostninger relateret til udskillelsen af Hearing.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Samtidig nedjusterede ledelsen sin organiske vækstguidance for 2026 fra 2-8% til 0-6%. Aktien
            faldt 6% på dagen. Det vigtigste signal var dog, at ledelsen annoncerede et nyt
            besparelsesprogram med mål om 200 mio. DKK i strukturelle besparelser fra 2027.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            I dagene efter Q1-regnskabet faldt shortinteressen markant fra 11,15% til 9,81%. Det kan skyldes,
            at aktien allerede var faldet til et niveau, hvor nogle shorts valgte at tage gevinst, eller at
            det dårlige resultat var prissat ind på forhånd.
          </p>
        </section>

        {/* ── Sellers section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Hvem shorter GN Store Nord?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Der er i alt 5 institutionelle short-sælgere med positioner over 0,50%. Den samlede indberettede
            position er ca. 4,80%, mens de resterende ~5,01% holdes af aktører under indberetningtærsklen.
            Bemærkelsesværdigt er det, at GN har tiltrukket en bred vifte af hedge fonde over tid. Mere end
            15 forskellige fonde har haft positioner over 0,50% i løbet af de seneste fire år.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short-sælger</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dato</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Beskrivelse</th>
                </tr>
              </thead>
              <tbody>
                <SellerRow i={0} name="AKO Capital LLP" position="1,30%" date="23. apr" desc="Langvarig short. Aktiv siden maj 2022. Toppede 1,24%." />
                <SellerRow i={1} name="Millennium Intl Mgmt" position="1,17%" date="8. maj" desc="Genindtrådt i marts 2026. Hurtigt stigende." />
                <SellerRow i={2} name="Atalan Capital" position="1,13%" date="2. okt 2025" desc="Ingen opdatering siden okt 2025." />
                <SellerRow i={3} name="Capital Fund Mgmt" position="0,70%" date="7. maj" desc="Ny i marts 2026. Stadig stigende." />
                <SellerRow i={4} name="Citadel Advisors LLC" position="0,50%" date="12. maj" desc="Ny. Lige på indberetningtærsklen." />
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Positionsudvikling over tid</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Individuelle short-sælgeres positioner baseret på indberetninger til Finanstilsynet.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5">
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
              {SELLERS.map((s, i) => (
                <span key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: SELLER_COLORS[i] }} />{s.name}
                </span>
              ))}
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-8 mb-2">Fordeling af den samlede short-interesse</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ca. 51% af short-interessen holdes af aktører under 0,50%-tærsklen, hvis identitet er ukendt.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 flex justify-center">
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={110} innerRadius={55} dataKey="value" nameKey="name" paddingAngle={2} label={({ value }) => `${Number(value).toFixed(2)}%`} labelLine={{ stroke: isDark ? "#555" : "#ccc", strokeWidth: 1 }} style={{ fontSize: 11 }}>
                  {PIE_DATA.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} stroke={isDark ? "#19191f" : "#fff"} strokeWidth={2} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => <span className="text-gray-600 dark:text-gray-400">{value}</span>} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} contentStyle={{ backgroundColor: isDark ? "#19191f" : "#fff", border: "1px solid #e5e5e5", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">9. Tidslinje over nøglebegivenheder</h2>
          <div className="ml-2">
            <TimelineEvent date="Oktober 2021" title="SteelSeries-opkøbet: 8 mia. DKK" color="#4361ee">
              <p>GN Store Nord købte SteelSeries, en dansk gaming-perifer producent, for 8 mia. DKK. Strategien var at skabe en global leder inden for gaming-audio og -udstyr. Aktien havde tidligere handlet over 500 DKK under toppen i 2021.</p>
            </TimelineEvent>
            <TimelineEvent date="Juni 2024" title="Jabra-forbrugerdivisionen lukkes" color="#e63946">
              <p>GN annoncerede lukning af Jabra Elite- og Talk-produktlinjerne efter vedvarende tab i konkurrencen mod Apple, Sony og Samsung. Beslutningen betød ca. 450 mio. DKK i tabt årlig omsætning og ca. 200 mio. DKK i ekstraordinære omkostninger. Shortinteressen var ca. 5,4%.</p>
            </TimelineEvent>
            <TimelineEvent date="Oktober 2024" title="Shortinteressen krydser 10%" color="#e63946">
              <p>I takt med at markedet mistede tillid til transformationsstrategien, steg shortinteressen fra 7% i september til over 10% i oktober. Op til 10 forskellige fonde havde positioner over 0,50% i denne periode, heriblandt AKO Capital, Millennium, Gladstone, Marshall Wace og BlackRock.</p>
            </TimelineEvent>
            <TimelineEvent date="Februar 2025" title="Årsregnskab 2024: Blandet resultat" color="#4361ee">
              <p>Organisk vækst på 1% for hele gruppen. Enterprise faldt 3%, mens Gaming voksede 16% i Q4. Frit cashflow på 1,1 mia. DKK. Markedet var positivt overrasket over cashflow, men aktien steg kun kortvarigt.</p>
            </TimelineEvent>
            <TimelineEvent date="April 2025" title="3-års lavpunkt: 82,60 DKK" color="#e63946">
              <p>Aktien ramte bunden den 9. april 2025 ved 82,60 DKK, et fald på 63% fra 3-års toppen i juni 2024. Shortinteressen var omkring 9,6%. I de efterfølgende uger købte seks insidere aktier for samlet ca. 4,9 mio. DKK, anført af CEO Peter Karlstromer (2,4 mio. DKK) og CFO Søren Jelert (738.000 DKK).</p>
            </TimelineEvent>
            <TimelineEvent date="16. marts 2026" title="Hearing solgt til Amplifon: +36% på en dag" color="#2a9d8f">
              <p>GN annoncerede salget af Hearing-divisionen (ReSound, Beltone, ca. 5.500 medarbejdere) til Amplifon for 17 mia. DKK (12,6 mia. kontant + 56 mio. Amplifon-aktier). Aktien steg 36% til 118 DKK med massiv volumen. Shortinteressen faldt fra 13,12% til 10,85% på to dage.</p>
            </TimelineEvent>
            <TimelineEvent date="7. maj 2026" title="Q1 2026: Svagt resultat og nedjusteret guidance" color="#e63946">
              <p>Omsætning fra fortsættende forretning på 2.096 mio. DKK (ned 8%). EBITA-margin på kun 0,3% belastet af engangsomkostninger til udskillelsen af Hearing. Guidance nedjusteret fra 2-8% til 0-6% organisk vækst. Besparelsesprogram på 200 mio. DKK annonceret. Aktien faldt 6%.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* ── Insider section ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. Insider-transaktioner</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I perioden marts til maj 2025 har seks insidere købt GN-aktier i det åbne marked for egne midler.
            Det samlede beløb er ca. 4,9 mio. DKK, fordelt over syv separate køb. Der er ikke registreret
            insider-salg i den tilgængelige periode.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Person</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dato</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Antal</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Kurs</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Beløb</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Peter Karlstromer (CEO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">28. maj</td>
                  <td className="px-4 py-3 text-sm tabular-nums">25.000</td>
                  <td className="px-4 py-3 text-sm tabular-nums">94,84 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums hidden sm:table-cell">2.371.000 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Søren Jelert (CFO)</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">2. maj</td>
                  <td className="px-4 py-3 text-sm tabular-nums">8.200</td>
                  <td className="px-4 py-3 text-sm tabular-nums">90,05 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums hidden sm:table-cell">738.410 DKK</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Jørgen Bundgaard Hansen</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">15.-16. maj</td>
                  <td className="px-4 py-3 text-sm tabular-nums">7.000</td>
                  <td className="px-4 py-3 text-sm tabular-nums">93,66-98,34 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums hidden sm:table-cell">656.323 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Lise Skaarup Mortensen</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">12. mar</td>
                  <td className="px-4 py-3 text-sm tabular-nums">4.000</td>
                  <td className="px-4 py-3 text-sm tabular-nums">118,77 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums hidden sm:table-cell">475.080 DKK</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Charlotte Johs</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">18. mar</td>
                  <td className="px-4 py-3 text-sm tabular-nums">3.270</td>
                  <td className="px-4 py-3 text-sm tabular-nums">118,98 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums hidden sm:table-cell">388.920 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Jukka Pekka Pertola</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">16. maj</td>
                  <td className="px-4 py-3 text-sm tabular-nums">2.354</td>
                  <td className="px-4 py-3 text-sm tabular-nums">94,55 DKK</td>
                  <td className="px-4 py-3 text-sm tabular-nums hidden sm:table-cell">222.521 DKK</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det mest markante er CEO Peter Karlstromers køb den 28. maj 2025 for 2,4 mio. DKK. Det er et
            betydeligt beløb og et klart signal om ledelsens tro på selskabets fremtid. CFO Søren Jelert
            købte ligeledes for 738.000 DKK kort tid forinden.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Samlet set er billedet entydigt: Seks forskellige insidere har alle købt aktier i det åbne marked
            i en periode med høj shortinteresse, og ingen har solgt. Det er et positivt signal, men det skal
            ses i sammenhæng med, at aktien i dag handles til ca. 94 DKK, tæt på de kurser, insiderne
            købte til i maj 2025.
          </p>
        </section>

        {/* ── The core question ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Det centrale spørgsmål: Kan den tilbageværende forretning stå alene?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Efter salget af Hearing står GN Store Nord med to divisioner: Enterprise (Jabra professionelt
            udstyr til mødelokaler og kontorer) og Gaming (SteelSeries). Tilsammen omsatte de for ca.
            8,4 mia. DKK i 2025. Spørgsmålet er, om disse to forretninger kan retfærdiggøre den nuværende
            markedsværdi og skabe den vækst, som investorerne forventer.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Positive faktorer</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Hearing-salget giver 17 mia. DKK til gældsnedbringelse</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>SteelSeries vokser 7-13% organisk (2026-guidance)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Enterprise video-konference vokser tocifret</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Besparelsesprogram på 200 mio. DKK fra 2027</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Seks insidere (inkl. CEO og CFO) har købt aktier</li>
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Negative faktorer</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>EBITA-margin kun 0,3% i Q1 2026</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Guidance nedjusteret (0-6% vs. 2-8%)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>750 mio. DKK i engangsomkostninger 2026-2027</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Faste omkostninger (IT, overhead m.m.) der forbliver hos GN efter Hearing-salget</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Aktien ned 58% fra 3-års high</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Conclusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">12. Konklusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            GN Store Nord befinder sig midt i den mest gennemgribende transformation i selskabets nyere historie.
            På to år har man lukket forbrugerdivisionen, solgt høreapparatforretningen og nedjusteret forventningerne
            til den tilbageværende forretning. Det er en selskabshistorie, som short-sælgerne har fulgt tæt,
            med fokus på de betydelige operationelle og strategiske risici.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det er bemærkelsesværdigt, at over 15 forskellige hedgefonde har haft offentlige short-positioner i
            GN over de seneste fire år. Det er ikke en enkelt spekulant, men en bred skepsis blandt professionelle
            investorer over for selskabets transformation og værdiansættelse. At shortinteressen fortsat er tæt
            på 10%, selv efter Hearing-salget og det kraftige kursfald, tyder på, at mange fortsat ser risici
            i den nye forretningsmodel.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Kommende katalysatorer at holde øje med</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Gennemførelse af Hearing-salget til Amplifon (forventet ultimo 2026)</li>
              <li>&#x2022; Realisering af besparelsesprogrammet (200 mio. DKK mål fra 2027)</li>
              <li>&#x2022; Q2 2026-regnskab (første kvartal med bedre synlighed på stranded costs)</li>
              <li>&#x2022; SteelSeries-lancering af nye produktplatforme H2 2026</li>
              <li>&#x2022; Udvikling i Enterprise-ordreindgang (indikator for organisk vækst)</li>
            </ul>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Data stammer fra Finanstilsynets offentlige registre og selskabets egne
            rapporter. Historisk afkast er ikke en garanti for fremtidigt afkast. Foretag altid din
            egen analyse, og søg professionel rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
            Genereret af Zirium  |  14. maj 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default GNAnalysisPage;
