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
  { method: "Metode 1", label: "Eksponeringsvægtet\nhistorisk kursniveau", value: 508, color: "#4361ee" },
  { method: "Metode 2", label: "Inkrementel indgangspris\n(mest præcis)", value: 499, color: "#2a9d8f" },
  { method: "Metode 3", label: "Inkrementel indgangspris\n(kun seneste 6 mdr.)", value: 352, color: "#f77f00" },
  { method: "Metode 4", label: "Simpelt gennemsnit\n(12 mdr.)", value: 403, color: "#9b5de5" },
];

// Per-seller estimated entry prices
const SELLER_ENTRIES = [
  { name: "D. E. Shaw & Co.", position: "0,50%", entry: 629, current: 311, pnl: "+51%", profitable: true },
  { name: "Connor Clark & Lunn", position: "0,80%", entry: 380, current: 311, pnl: "+18%", profitable: true },
  { name: "AHL Partners", position: "0,91%", entry: 362, current: 311, pnl: "+14%", profitable: true },
  { name: "Jupiter Asset Mgmt", position: "0,70%", entry: 352, current: 311, pnl: "+12%", profitable: true },
  { name: "Citadel Advisors", position: "0,63%", entry: 327, current: 311, pnl: "+5%", profitable: true },
  { name: "Marshall Wace", position: "1,28%", entry: 299, current: 311, pnl: "-4%", profitable: false },
  { name: "Jennison Associates", position: "0,61%", entry: 289, current: 311, pnl: "-8%", profitable: false },
  { name: "Voleon Capital", position: "1,00%", entry: 193, current: 311, pnl: "-61%", profitable: false },
];

// Period breakdown
const PERIOD_DATA = [
  { period: "Okt 2023 - Jun 2024", avgPrice: 454, sharesAdded: "7,2 mio.", priceRange: "279-893 DKK" },
  { period: "Jul 2024 - Feb 2025", avgPrice: 811, sharesAdded: "5,6 mio.", priceRange: "663-954 DKK" },
  { period: "Mar 2025 - Feb 2026", avgPrice: 449, sharesAdded: "11,8 mio.", priceRange: "311-674 DKK" },
  { period: "Mar 2026 - Maj 2026", avgPrice: 292, sharesAdded: "3,9 mio.", priceRange: "235-372 DKK" },
];

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtShortDate(d: string) {
  const parts = d.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
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
const ZealCostAnalysisPage: React.FC = () => {
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
  const tickColor = isDark ? "#666" : "#bbb";

  return (
    <PageTemplate>
      <title>Zirium | Zealand Pharma (ZEAL) - Gennemsnitlig shortpris</title>
      <meta name="description" content="Til hvilken kurs har de shortet Zealand Pharma? Fire beregningsmetoder sammenlignet." />
      <meta property="og:title" content="Til hvilken kurs har de shortet Zealand Pharma?" />
      <meta property="og:description" content="Fire beregningsmetoder sammenlignet. Estimeret indgangspris per short-sælger og analyse af hvem der tjener penge." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/zeal/gennemsnitspris/2026-05-14" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Til hvilken kurs har de shortet Zealand Pharma?" />
      <meta name="twitter:description" content="Fire beregningsmetoder sammenlignet. Estimeret indgangspris per short-sælger og analyse af hvem der tjener penge." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Til hvilken kurs har de shortet Zealand Pharma?",
        "description": "Fire beregningsmetoder sammenlignet. Estimeret indgangspris per short-sælger og analyse af hvem der tjener penge.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-15",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/zeal/gennemsnitspris/2026-05-14",
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
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">Analyse lavet af Araz Bayat Makoo (Zirium) - 15. maj 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Til hvilken kurs har de shortet Zealand Pharma?
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Zealand Pharma (ZEAL)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Når en aktie er kraftigt shortet, er et af de mest naturlige spørgsmål: "Til hvilken kurs har
            de shortet? Tjener de penge?" Det korte svar er, at det er overraskende svært at beregne
            præcist. Denne analyse forklarer hvorfor, og viser fire forskellige metoder, der alle giver
            forskellige resultater.
          </p>
        </header>

        {/* ── 1. Hvorfor er det svært ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Hvorfor er det svært at beregne?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Når vi ser, at 10% af en aktie er shortet, er det naturligt at tro, at det er de samme
            investorer, der har holdt positionen hele vejen. Men short-positioner er dynamiske. Fonde åbner
            og lukker løbende deres positioner, og den samlede shortinteresse er blot et øjebliksbillede.
            De 10%, vi ser i dag, kan bestå af helt andre investorer end for seks måneder siden.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det skaber tre konkrete problemer, når vi forsøger at beregne gennemsnitsprisen:
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 mb-4">
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              <span><strong>Positionerne skifter hænder:</strong> Siden november 2023 er der i alt åbnet short-positioner
              svarende til 28,6 mio. aktier, mens 21,4 mio. er lukket igen. I dag er ca. 7,2 mio. aktier shortet.
              Den kumulative short-aktivitet svarer til næsten fire gange den nuværende shortinteresse, hvilket
              indikerer betydelig rotation i positionerne. En fond, der shortede til 800 DKK, kan for længst have
              lukket med gevinst, og en helt anden fond kan sidde med den position i dag.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              <span><strong>Vi kender ikke alle:</strong> Ca. 36% af shortinteressen holdes af aktører med
              netto short-positioner under 0,50%, som ikke offentliggøres. Aktører har indberetningspligt
              til Finanstilsynet, når deres samlede netto short-position overstiger 0,10% af selskabets
              aktiekapital. Men kun positioner
              over 0,50% offentliggøres. Vi kan se den samlede shortinteresse stige, men vi ved ikke præcis
              hvilke aktører der står bag de enkelte ændringer, eller til hvilken kurs de handlede.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">3.</span>
              <span><strong>Vi ser kun nettoændringen:</strong> Hvis en fond lukker 10.000 aktier og åbner 15.000
              nye den samme dag, ser vi kun en stigning på 5.000. Den faktiske handelsaktivitet er langt større,
              end det tal, vi kan aflæse.</span>
            </li>
          </ul>
        </section>

        {/* ── Chart: Short interest + price ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short-interesse vs. aktiekurs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            Grafen viser, hvordan shortinteressen (blå) og aktiekursen (lilla) har udviklet sig. Den stiplede
            gule linje viser den inkrementelle indgangspris (~499 DKK). Bemærk, hvor meget kursen har
            svinget: fra 235 til 954 DKK.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse vs. aktiekurs for Zealand Pharma med estimeret gennemsnitlig indgangspris">
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Est. gns. entry (~499 DKK)</span>
            </div>
          </div>
        </section>

        {/* ── 3. Periodefordeling ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Hvornår blev positionerne åbnet?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            For at forstå hvad shorterne har betalt, kan vi kigge på de perioder, hvor shortinteressen steg.
            Når shortinteressen stiger fra f.eks. 5% til 6%, betyder det, at nogen har åbnet nye positioner.
            Vi antager, at de nye shorts blev åbnet til forrige handelsdags lukkekurs, da ændringer typisk rapporteres dagen efter handlen. Tabellen viser fire perioder med
            meget forskellige prisniveauer:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Periodefordeling af short-positioner i Zealand Pharma</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Periode</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Gns. indgangspris</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Aktier tilføjet</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Kursinterval</th>
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
            Det mest slående er perioden juli 2024 til februar 2025. Her blev 5,6 mio. aktier shortet til en
            gennemsnitskurs på 811 DKK, da aktien stadig var tæt på toppen. Hvis en væsentlig del af disse
            positioner stadig er åbne, repræsenterer de en stor urealiseret gevinst (aktien handles i dag til
            311 DKK). Men det er et stort "hvis": Mange af dem kan allerede have lukket og realiseret gevinsten.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            I den anden ende af skalaen er de nyeste shorts fra marts-maj 2026, der kom ind til en
            gennemsnitspris på kun 292 DKK. Disse shorts har næsten ikke nogen gevinst ved den nuværende
            kurs, og risikerer hurtigt at komme i minus, hvis aktien stiger.
          </p>
        </section>

        {/* ── 4. Fire beregningsmetoder ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Fire beregningsmetoder sammenlignet</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Der findes ikke en enkelt "rigtig" måde at beregne gennemsnitsprisen på. Forskellige metoder
            giver forskellige resultater, fordi de gør forskellige antagelser. Her er fire metoder, der
            spænder fra 352 til 508 DKK. Sammen giver de et interval, der sandsynligvis fanger den reelle
            gennemsnitspris.
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
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Metode 1: Eksponeringsvægtet historisk kursniveau (508 DKK)</h4>
              <p>For hver dag i hele datasættet (fra oktober 2023 til i dag) kigger vi på, hvor stor shortinteressen er, og hvad aktiekursen er. Dage med en højere shortinteresse tæller mere, fordi der er flere aktier eksponeret til den kurs. Denne metode viser ikke en reel indgangspris, men snarere det gennemsnitlige kursniveau som short-positionerne har været eksponeret mod over tid. En position der blev åbnet ved 800 DKK og holdt i mange måneder vil dominere resultatet, selvom den måske allerede er lukket.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Metode 2: Inkrementel indgangspris (499 DKK)</h4>
              <p>Denne metode gennemgår hele datasættet (fra oktober 2023 til i dag) og kigger kun på dage, hvor den samlede shortinteresse steg. Hvis shortinteressen stiger fra 5% til 6%, antager vi, at der netto blev åbnet nye shorts svarende til 1%, og at de blev åbnet til forrige handelsdags kurs. Dage hvor shortinteressen faldt (dvs. hvor der netto blev lukket flere positioner end der blev åbnet) ignoreres. Det giver et estimat på den gennemsnitlige pris, som alle de historiske short-positioner er blevet opbygget til. Svagheden er, at vi ikke ved, om de tidlige shorts stadig er åbne, eller om de for længst er lukket med gevinst.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Metode 3: Inkrementel indgangspris, seneste 6 mdr. (352 DKK)</h4>
              <p>Samme metode som metode 2, men kun over de seneste 6 måneder. I denne periode er shortinteressen steget fra 5,56% til 10,13%, og der er brutto åbnet ca. 6,9 mio. aktier (summen af de daglige stigninger). Ved kun at kigge på denne periode fanger vi bedre de nuværende shorts, da mange ældre positioner sandsynligvis allerede er lukket. Resultatet på 352 DKK giver de nyere shorts en buffer på ca. 12% ved den nuværende kurs på ca. 311 DKK. Det er markant mindre end de ~499 DKK fra det fulde datasæt.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Metode 4: Simpelt gennemsnit over 12 mdr. (403 DKK)</h4>
              <p>Denne metode bruger slet ikke shortdata. Den beregner blot den gennemsnitlige lukkekurs for aktien over de seneste 12 måneder, uanset hvad shortinteressen var. Det giver 403 DKK. Metoden er let at forstå, men den antager implicit, at shorts er åbnet jævnt fordelt over hele perioden, hvilket sjældent passer i praksis.</p>
            </div>
          </div>
        </section>

        {/* ── 5. Per-seller ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Estimeret indgangspris per short-sælger</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            For de otte fonde, der har en aktiv position over 0,50%, kan vi lave et mere detaljeret estimat
            ved at gennemgå deres fulde indberetningshistorik. For hver gang en fond har indberettet en
            stigning i sin position (siden første gang de overhovedet krydsede tærsklen), antager vi, at
            stigningen blev shortet til forrige handelsdags lukkekurs. For den allerførste indberetning
            antager vi, at positionen blev åbnet til den dags kurs. Den estimerede indgangspris er det
            volumenvægtede gennemsnit af alle disse stigninger. Det betyder, at hvis en fond også har holdt
            tidligere positioner, der senere er lukket, indgår de stigninger også i gennemsnittet, fordi
            vi ikke kan vide, hvilke shorts der konkret stadig er åbne. For fonde som Marshall Wace og
            Voleon Capital, der har historik tilbage til 2021-2022, trækker det estimerede indgangsniveau
            ned, fordi en del af deres tidligere shorts blev åbnet på langt lavere kursniveauer. Tabellen
            viser estimeret indgangspris og om fonden aktuelt er i plus eller minus (grøn/rød).
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Estimeret indgangspris og profit/tab per short-sælger i Zealand Pharma</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short-sælger</th>
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
            Ifølge dette estimat er fem af de otte fonde i plus (grøn), mens tre er i minus (rød) ved den
            nuværende kurs på 311 DKK. D. E. Shaw skiller sig ud med en estimeret indgangspris på 629 DKK,
            fordi de har holdt en position siden december 2024 og opbygget størstedelen af den, mens kursen
            lå på 600-900 DKK. Hvis de stadig sidder på positionen, svarer det til en urealiseret gevinst
            på ca. 51%. I den anden ende er Voleon Capital og Marshall Wace, hvis estimerede indgangskurser
            trækkes ned af deres tidligere positioner fra 2021-2022, hvor ZEAL handlede på langt lavere
            niveauer.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Vigtigt forbehold:</strong> Disse tal er estimater og skal tages med forbehold.
            For det første antager vi, at de første 0,50% blev åbnet på den dag, positionen krydsede
            offentliggørelsestærsklen. I praksis kan fonden have opbygget positionen gradvist over uger
            eller måneder til helt andre kurser. For det andet er den indberettede position en netto
            short-position, hvor derivater som optioner og futures allerede er medregnet (jf. EU Short
            Selling Regulation). Det betyder, at en fonds hedging i samme aktie er afspejlet i tallet.
            Men strategier som pair trades mod andre aktier eller sektorbaserede basket shorts fanges
            ikke, og en fond kan derfor have en bredere strategi, hvor short-positionen i Zealand Pharma
            kun er en del af et større billede. Vi ved heller ikke, til hvilke kurser fondene faktisk
            har handlet inden for dagen.
          </p>
        </section>

        {/* ── 6. Konklusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Hvad kan vi konkludere?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den historiske gennemsnitlige indgangspris for alle short-positioner i Zealand Pharma ligger
            omkring 499 DKK (metode 2). Men kigger vi kun på de seneste 6 måneder, hvor størstedelen af
            den nuværende positionsopbygning er sket, falder estimatet til 352 DKK (metode 3). Med en
            aktuel kurs på ca. 311 DKK svarer det til en gevinst på kun ca. 12% for de nyere shorts,
            og en positiv nyhed kan hurtigt vende billedet.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Bag gennemsnittet gemmer sig to vidt forskellige grupper. De shorts, der gik ind i perioden
            juli 2024 til februar 2025 (til ~811 DKK i gennemsnit), sidder potentielt på store gevinster.
            Men de nyeste shorts fra 2026 (til ~292 DKK) er tæt på break-even og risikerer tab, hvis
            aktien stiger blot lidt. Det er altså ikke en homogen gruppe, men investorer med meget
            forskellige risikoprofiler.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Et vigtigt forbehold er den høje kumulative aktivitet. Den samlede short-aktivitet svarer til
            næsten fire gange den nuværende shortinteresse, hvilket indikerer betydelig rotation. Det
            betyder, at mange af de "dyre" shorts fra toppen sandsynligvis allerede har lukket og realiseret
            deres gevinst. De nuværende short-positioner kan i højere grad være dem, der gik ind til lavere
            kurser, og som derfor har en mindre buffer. Det gør den nuværende position mere sårbar over for
            positive nyheder, end gennemsnitstallet umiddelbart antyder.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Analysen tager desuden ikke højde for låneomkostninger (borrow fees), som kan være betydelige
            i hårdt shortede aktier som Zealand Pharma. Selv en short-position med kursgevinst kan have
            reduceret profitabilitet, hvis låneomkostningerne er høje over længere tid.
          </p>
        </section>

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Beregningerne er estimater baseret på offentligt tilgængelige data fra
            Finanstilsynet og markedspriser. De faktiske indgangspriser kan afvige væsentligt. Foretag altid
            din egen analyse, og søg professionel rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Genereret af Zirium  |  15. maj 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default ZealCostAnalysisPage;
