import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShareNodes, faCheck } from "@fortawesome/free-solid-svg-icons";
import PageTemplate from "../components/PageTemplate";
import RelatedAnalyses from "../components/RelatedAnalyses";
import { trackPageView, trackEvent } from "../analytics";
import { HOST, fetchShortPositionDetails } from "../apis/ShortPositionAPI";
import {
  projectRevenue,
  computeNOPAT,
  computeFCF,
  computeTerminalValue,
  computeDCF,
  computePerShare,
  sensitivityMatrix,
} from "../utils/dcfCalculations";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ─── static Novo data (Novo Nordisk 2025 Annual Report + Q1 2026 + Nasdaq Copenhagen) ──
const BASE_REVENUE_DKK = 309.1; // mia. DKK, 2025 årsrapport
const SHARES_OUTSTANDING = 4.449; // mia. udvandede aktier (diluted weighted avg, 2025 årsrapport)
const NET_DEBT_DKK = 95.4; // mia. DKK (nettogæld, 2025 årsrapport)
const DEFAULT_PRICE_DKK = 299; // fallback-kurs hvis API ikke svarer
const NOVO_ISIN = "DK0062498333";

const WACC_VALUES = [6, 7, 8, 9, 10, 11, 12, 13, 14];
const TG_VALUES = [1.5, 2.0, 2.5, 3.0, 3.5];

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtBn(val: number): string {
  return val.toFixed(1).replace(".", ",") + " mia.";
}

function fmtDKK(val: number): string {
  return Math.round(val).toLocaleString("da-DK") + " DKK";
}

function fmtPct(val: number, decimals = 1): string {
  return val.toFixed(decimals).replace(".", ",") + "%";
}

// ─── sub-components ───────────────────────────────────────────────────────────
function KPI({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 text-center ${highlight ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "bg-white dark:bg-[#19191f] border-gray-100 dark:border-gray-800"}`}>
      <p className={`text-lg sm:text-xl font-bold tabular-nums ${highlight ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 leading-tight">{label}</p>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: string;
}

function AssumptionSlider({ label, value, min, max, step, unit = "%", onChange, hint }: SliderProps) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
        <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0).replace(".", ",")}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(parseFloat(e.target.value).toFixed(2)))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-500 bg-gray-200 dark:bg-gray-700"
      />
      <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
      {n}. {title}
    </h2>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
      {children}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
const SLUG = "novo/dcf/2026-05-19";

const NovoDCFPage: React.FC = () => {
  const navigate = useNavigate();

  const [currentPrice, setCurrentPrice] = useState(DEFAULT_PRICE_DKK);
  const [priceDate, setPriceDate] = useState("");

  useEffect(() => {
    trackPageView("/analyse/novo/dcf", "novo_dcf_analysis");
    fetch(`${HOST}/stats/visit/novo-dcf-analysis/`).catch(() => {});

    // Fetch latest closing price from chart data
    fetchShortPositionDetails({ category: "c25", code: NOVO_ISIN })
      .then((data) => {
        const chart = data?.chartValues;
        if (Array.isArray(chart) && chart.length > 0) {
          const last = chart[chart.length - 1];
          if (last.close && last.close > 0) {
            setCurrentPrice(last.close);
            const d = new Date(last.timestamp);
            setPriceDate(d.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }));
          }
        }
      })
      .catch(() => {});
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

  const getChartHeight = useCallback(() => (window.innerWidth < 640 ? 200 : 280), []);
  const [chartHeight, setChartHeight] = useState(getChartHeight);
  useEffect(() => {
    const h = () => setChartHeight(getChartHeight());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [getChartHeight]);

  // ── read initial values from URL params (shared links) ──
  const [searchParams] = useSearchParams();
  const defaults = useMemo(() => {
    const p = (key: string, fallback: number) => {
      const v = searchParams.get(key);
      return v !== null ? parseFloat(v) : fallback;
    };
    const gr = searchParams.get("gr");
    return {
      growthRates: gr ? gr.split(",").map(Number) : [-5, 5, 9, 8, 7, 6, 5, 4, 3, 3],
      opMargin: p("om", 40),
      capexPct: p("cx", 9),
      nwcPct: p("nwc", 1.5),
      taxRate: p("tx", 22),
      riskFreeRate: p("rf", 2.6),
      beta: p("b", 1.0),
      equityRiskPremium: p("erp", 5.5),
      costOfDebt: p("rd", 3.5),
      waccOverride: searchParams.get("wacc") !== null ? parseFloat(searchParams.get("wacc")!) : null,
      terminalGrowth: p("tg", 2.5),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── assumptions state ──
  const [growthRates, setGrowthRates] = useState(defaults.growthRates);
  const [opMargin, setOpMargin] = useState(defaults.opMargin);
  const [capexPct, setCapexPct] = useState(defaults.capexPct);
  const [nwcPct, setNwcPct] = useState(defaults.nwcPct);
  const [taxRate, setTaxRate] = useState(defaults.taxRate);
  const [riskFreeRate, setRiskFreeRate] = useState(defaults.riskFreeRate);
  const [beta, setBeta] = useState(defaults.beta);
  const [equityRiskPremium, setEquityRiskPremium] = useState(defaults.equityRiskPremium);
  const [costOfDebt, setCostOfDebt] = useState(defaults.costOfDebt);
  const [waccOverride, setWaccOverride] = useState<number | null>(defaults.waccOverride);
  const [terminalGrowth, setTerminalGrowth] = useState(defaults.terminalGrowth);
  const [shareCopied, setShareCopied] = useState(false);

  // Full WACC: weighted average of cost of equity (CAPM) and after-tax cost of debt
  const costOfEquity = riskFreeRate + beta * equityRiskPremium;
  const marketCap = currentPrice * SHARES_OUTSTANDING; // mia. DKK
  const equityWeight = marketCap / (marketCap + NET_DEBT_DKK);
  const debtWeight = NET_DEBT_DKK / (marketCap + NET_DEBT_DKK);
  const computedWacc = equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate / 100);
  const wacc = waccOverride ?? parseFloat(computedWacc.toFixed(1));

  // ── derived calculations ──
  const revenues = useMemo(
    () => projectRevenue(BASE_REVENUE_DKK, growthRates),
    [growthRates]
  );

  const fcfs = useMemo(() =>
    revenues.map((rev) => {
      const nopat = computeNOPAT(rev, opMargin, taxRate);
      return computeFCF(nopat, rev, capexPct, nwcPct);
    }),
    [revenues, opMargin, taxRate, capexPct, nwcPct]
  );

  const terminalValue = useMemo(
    () => computeTerminalValue(fcfs[fcfs.length - 1], terminalGrowth, wacc),
    [fcfs, terminalGrowth, wacc]
  );

  const enterpriseValue = useMemo(
    () => computeDCF(fcfs, terminalValue, wacc),
    [fcfs, terminalValue, wacc]
  );

  const fairValuePerShare = useMemo(
    () => computePerShare(enterpriseValue, NET_DEBT_DKK, SHARES_OUTSTANDING),
    [enterpriseValue]
  );

  const upside = ((fairValuePerShare - currentPrice) / currentPrice) * 100;

  // 12-month price target: roll EV forward one year (discount unwinds), subtract year-1 FCF (already received)
  const ev12m = enterpriseValue * (1 + wacc / 100) - fcfs[0];
  const price12m = (ev12m - NET_DEBT_DKK) / SHARES_OUTSTANDING;
  const upside12m = ((price12m - currentPrice) / currentPrice) * 100;

  const senMatrix = useMemo(
    () => sensitivityMatrix(fcfs, WACC_VALUES, TG_VALUES, NET_DEBT_DKK, SHARES_OUTSTANDING),
    [fcfs]
  );

  // ── chart data ──
  const currentYear = 2025;
  const revenueChartData = revenues.map((rev, i) => ({
    year: `${currentYear + i + 1}`,
    omsaetning: parseFloat(rev.toFixed(1)),
    fcf: parseFloat(fcfs[i].toFixed(1)),
  }));

  const gridColor = isDark ? "#2a2a35" : "#f0f0f0";
  const tickColor = isDark ? "#999" : "#888";

  return (
    <PageTemplate>
      <title>Zirium | Novo Nordisk DCF: Lav din egen vurdering</title>
      <meta name="description" content="Interaktiv DCF-analyse af Novo Nordisk A/S. Juster dine egne antagelser om vækst, margin og diskonteringsrente og se hvad aktien er værd." />
      <meta property="og:title" content="Lav din egen vurdering af Novo Nordisk A/S" />
      <meta property="og:description" content="Interaktiv DCF-analyse af Novo Nordisk A/S. Juster dine egne antagelser om vækst, margin og diskonteringsrente og se hvad aktien er værd." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`https://www.zirium.dk/analyse/${SLUG}`} />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Lav din egen vurdering af Novo Nordisk A/S" />
      <meta name="twitter:description" content="Interaktiv DCF-analyse af Novo Nordisk A/S." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Lav din egen vurdering af Novo Nordisk A/S",
        "description": "Interaktiv DCF-analyse af Novo Nordisk A/S. Juster dine egne antagelser og se hvad aktien er værd.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-19",
        "mainEntityOfPage": `https://www.zirium.dk/analyse/${SLUG}`,
        "inLanguage": "da",
      })}</script>

      <article className="w-full max-w-[900px] mx-auto px-5 sm:px-8 pb-10 sm:pb-16">
        <button
          className="text-blue-500 hover:text-blue-700 bg-transparent border-none text-base inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm min-h-[44px] min-w-[44px]"
          onClick={() => {
            if (window.history.length > 1 && window.history.state?.idx > 0) {
              navigate(-1);
            } else {
              navigate("/analyse");
            }
          }}
        >
          <span aria-hidden="true">←</span>
          Tilbage
        </button>

        {/* Header */}
        <header className="mb-10 mt-4">
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">
            Interaktiv analyse af Araz Bayat Makoo (Zirium), 19. maj 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Lav din egen vurdering af Novo Nordisk A/S
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Novo Nordisk A/S (NOVO B)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Når analytikere sætter kursmål på Novo Nordisk, bygger de på modeller som denne,
            og små ændringer i antagelserne kan flytte kursmålet med hundredvis af kroner.
            Denne analyse lader dig prøve selv. Du justerer antagelserne om vækst, lønsomhed
            og risiko, og modellen beregner i realtid, hvad aktien er værd. Målet er at du
            kan danne din egen vurdering af selskabet, forstå hvor følsomt resultatet er,
            og se hvorfor to analytikere kan se på de samme tal og nå vidt forskellige konklusioner.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Hele casen koger ned til ét centralt spørgsmål: Er Novo et midlertidigt presset
            kvalitetsmonopol, hvor obesity bliver et gigantisk flerårigt marked, oral GLP-1 virker,
            og Novo stadig har en produktionsmæssig voldgrav? Eller er peak economics allerede
            passeret, og Eli Lilly fortsætter med at tage markedsandele, pricing power kollapser,
            og semaglutid mister sin særstatus? Dit svar på det spørgsmål bestemmer dine antagelser
            nedenfor.
          </p>
        </header>

        {/* Live KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI
            value={fmtDKK(fairValuePerShare)}
            label="Dit estimat (fair value)"
            highlight
          />
          <KPI value={fmtDKK(currentPrice)} label={priceDate ? `Lukkekurs (${priceDate})` : "Seneste lukkekurs"} />
          <KPI
            value={(upside >= 0 ? "+" : "") + fmtPct(upside)}
            label="Potentiale ift. kurs"
          />
          <KPI value={fmtPct(wacc)} label="WACC (din diskonteringsrente)" />
        </div>

        {/* 1. Hvad er DCF */}
        <section className="mb-12">
          <SectionHeader n={1} title="Hvad er en DCF-analyse?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            En DCF-analyse (Discounted Cash Flow) er en metode til at værdiansætte en
            virksomhed ved at estimere, hvor meget frit cash flow den vil generere i fremtiden,
            og så tilbagediskontere disse cash flows til nutidsværdi. Grundtanken er enkel:
            En krone i morgen er mindre værd end en krone i dag, fordi du kan investere den
            krone i dag og få afkast.
          </p>
          <InfoBox>
            <strong>Formlen i korte træk:</strong> Virksomhedsværdi = sum af tilbagediskonterede
            frie cash flows i prognoseperioden + tilbagediskonteret terminalværdi. Terminalværdien
            repræsenterer al værdi ud over prognoseperioden og antager, at virksomheden vokser
            i et stabilt, lavt tempo for evigt.
          </InfoBox>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            DCF er den metode, som professionelle analytikere og investorer bruger mest, når de
            skal værdiansætte virksomheder. Den tvinger dig til at være eksplicit om dine
            antagelser og giver et struktureret grundlag for diskussion. Ulempen er, at
            resultatet er meget følsomt over for små ændringer i antagelserne, specielt WACC
            og den langsigtede væksthastighed.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Denne model bruger en 10-års prognoseperiode efterfulgt af en terminalværdi. Vi
            bruger 10 år i stedet for de mere typiske 5, fordi Novo Nordisk er en
            vækstvirksomhed, og det tager tid før væksten normaliserer sig.
          </p>
        </section>

        {/* 2. Novo i tal */}
        <section className="mb-12">
          <SectionHeader n={2} title="Novo Nordisk i tal" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
            Inden vi begynder på antagelserne, er det vigtigt at kende udgangspunktet.
            Nedenfor er de nøgletal fra Novo Nordisks 2025 årsrapport og børsen, som
            modellen tager afsæt i.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <KPI value={fmtBn(BASE_REVENUE_DKK) + " DKK"} label="Omsætning 2025" />
            <KPI value="41,3%" label="Driftsmargin 2025" />
            <KPI value="21,5%" label="Effektiv skattesats 2025" />
            <KPI value={fmtBn(SHARES_OUTSTANDING)} label="Udvandede aktier (mia.)" />
            <KPI value={fmtBn(NET_DEBT_DKK) + " DKK"} label="Nettogæld 2025" />
            <KPI value={fmtDKK(currentPrice)} label={priceDate ? `Lukkekurs (${priceDate})` : "Seneste lukkekurs"} />
          </div>
          <InfoBox>
            <strong>Hvad er situationen?</strong> Novo Nordisk driver størstedelen af sin
            omsætning fra GLP-1-lægemidler (Ozempic, Wegovy, Rybelsus), men dominansen er
            under pres. Eli Lillys tirzepatid (Mounjaro/Zepbound) tager markedsandele og
            presser priserne, og Novo guider selv et omsætningsfald på -4% til -12% (CER) i 2026,
            det første fald i lokal valuta siden 2017. Driftsoverskuddet faldt til 127,7 mia. DKK i 2025, bl.a.
            grundet 8 mia. DKK i omstruktureringsomkostninger. Novo investerer massivt i
            fabrikskapacitet (60 mia. DKK i 2025) og satser på CagriSema og oral Wegovy som
            næste vækstdrivere. CagriSema har dog mødt modvind, da det i et stort studie
            ikke slog Eli Lillys Zepbound i vægttab, hvilket har skabt tvivl blandt analytikere
            om midlets potentiale.
          </InfoBox>
        </section>

        {/* 3. Vækstantagelser */}
        <section className="mb-12">
          <SectionHeader n={3} title="Omsætningsvækst: dine antagelser" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Novo Nordisk guider selv et fald i omsætningen på -4% til -12% (CER) i 2026,
            det første fald i lokal valuta siden 2017. Årsagerne er politisk prispres i USA (herunder forslag
            inspireret af "Most Favoured Nation"-modeller), patentudløb på semaglutid i visse
            markeder og tiltagende konkurrence fra Eli Lilly.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Spørgsmålet er, hvor hurtigt Novo kan vende faldet. Wegovy-pillen (oral semaglutid)
            blev lanceret i USA 5. januar 2026 og havde allerede over 200.000 ugentlige
            recepter i april. Den bredere internationale udrulning og nye produkter kan drive
            en tilbagevenden til vækst fra 2027, men CagriSemas skuffende studieresultater
            over for Eli Lillys Zepbound gør billedet mere usikkert.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Novo befinder sig stadig i en usædvanlig vækstfase for et stort medicinalselskab,
            og analytikere bruger derfor typisk en 10-årig prognoseperiode, fordi det tager
            længere tid, før væksten stabiliserer sig. Det giver et mere retvisende billede
            end de 5 år man normalt bruger for modne virksomheder.
            Juster dine antagelser for hvert år nedenfor, eller start fra et af de tre scenarier.
          </p>

          {/* Scenario presets */}
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Start fra et scenarie</p>
            <p className="text-base text-gray-600 dark:text-gray-300 mb-3">
              De tre scenarier er sammensat ud fra Novos egen guidance, historiske nøgletal og
              markedssituationen. De er ikke baseret på en specifik analytikers model, men
              repræsenterer rimelige spænd for en pessimistisk, neutral og optimistisk vurdering.
              Vælg et udgangspunkt og juster bagefter. Alle antagelser (vækst, margin, WACC, terminalvækst) opdateres.
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                {
                  label: "Pessimistisk",
                  gr: [-8, 2, 5, 4, 3, 3, 2, 2, 2, 2],
                  om: 36, cx: 10, nwc: 2, tx: 22, rf: 2.6, b: 1.85, erp: 5.5, rd: 4.0, wo: null, tg: 2.0,
                  color: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20",
                },
                {
                  label: "Basis",
                  gr: [-5, 5, 9, 8, 7, 6, 5, 4, 3, 3],
                  om: 40, cx: 9, nwc: 1.5, tx: 22, rf: 2.6, b: 1.0, erp: 5.5, rd: 3.5, wo: null, tg: 2.5,
                  color: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                },
                {
                  label: "Optimistisk",
                  gr: [-3, 8, 12, 10, 9, 8, 7, 6, 5, 4],
                  om: 43, cx: 8, nwc: 1, tx: 22, rf: 2.6, b: 0.9, erp: 5.5, rd: 3.0, wo: null, tg: 3.0,
                  color: "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
                },
              ] as const).map((scenario) => (
                <button
                  key={scenario.label}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border bg-white dark:bg-[#19191f] transition-colors ${scenario.color}`}
                  onClick={() => {
                    setGrowthRates([...scenario.gr]);
                    setOpMargin(scenario.om);
                    setCapexPct(scenario.cx);
                    setNwcPct(scenario.nwc);
                    setTaxRate(scenario.tx);
                    setRiskFreeRate(scenario.rf);
                    setBeta(scenario.b);
                    setEquityRiskPremium(scenario.erp);
                    setCostOfDebt(scenario.rd);
                    setWaccOverride(scenario.wo);
                    setTerminalGrowth(scenario.tg);
                  }}
                >
                  {scenario.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6">
            {growthRates.map((rate, i) => {
              const year = currentYear + i + 1;
              const hints: Record<number, { analyst: string; context: string }> = {
                2026: {
                  analyst: "Analytikerkonsensus: ~292 mia. DKK (-6%). Novos egen guidance: -4% til -12% (CER). 32 analytikere.",
                  context: "Politisk prispres i USA, patentudløb på semaglutid og tiltagende konkurrence fra Eli Lilly trykker omsætningen. Q1 2026 justeret salg faldt 4% i CER.",
                },
                2027: {
                  analyst: "",
                  context: "Wegovy-pillen (lanceret jan. 2026, >200.000 ugentlige recepter i april) kan drive en tilbagevenden til vækst. CagriSemas skuffende studieresultater mod Zepbound skaber dog usikkerhed. Generisk konkurrence og lavere priser presser stadig.",
                },
                2028: {
                  analyst: "",
                  context: "Amycretin og næste generation af lægemidler modner. Fabrikskapaciteten er ved at være udbygget, så investeringerne topper og cash flow forbedres.",
                },
                2029: {
                  analyst: "",
                  context: "Novo Nordisks evne til at forsvare markedsandele over for Eli Lilly og nye GLP-1-spillere bliver afgørende for væksten.",
                },
                2030: {
                  analyst: "",
                  context: "Semaglutid-patenterne er nu udløbet i de fleste markeder. Nye indikationer (NASH, hjerte, nyre) kan holde væksten oppe, men generisk konkurrence er reel.",
                },
                2031: {
                  analyst: "",
                  context: "Her bevæger vi os ud over analysedækningen. Væksten afhænger af om Novo har bragt næste generation af lægemidler til markedet.",
                },
                2032: {
                  analyst: "",
                  context: "GLP-1-markedet er nu modent. Væksten begynder at ligne den bredere farmasektor (3-5% årligt).",
                },
                2033: {
                  analyst: "",
                  context: "Væksten nærmer sig den globale økonomiske vækst. Novo er nu en moden, stabil kontantmaskine.",
                },
                2034: {
                  analyst: "",
                  context: "Samme som ovenfor. Jo længere ud vi kigger, jo mere usikre er estimaterne, men det er netop derfor vi har terminalværdien i næste trin.",
                },
                2035: {
                  analyst: "",
                  context: "Sidste år i prognosen. Herefter overtager terminalværdien, som antager at Novo vokser i et stabilt, lavt tempo for evigt.",
                },
              };
              const h = hints[year];
              return (
                <div key={i}>
                  <AssumptionSlider
                    label={`År ${i + 1} (${year})`}
                    value={rate}
                    min={-20}
                    max={50}
                    step={0.1}
                    onChange={(v) => {
                      const next = [...growthRates];
                      next[i] = v;
                      setGrowthRates(next);
                    }}
                  />
                  {h && (
                    <div className="mb-6 -mt-3 ml-1 space-y-1">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{h.analyst}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{h.context}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Omsætningsfremskrivning */}
        <section className="mb-12">
          <SectionHeader n={4} title="Fremskrevet omsætning og frit cash flow" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Blå søjler = omsætning (mia. DKK). Grøn linje = frit cash flow (FCF) med dine
            nuværende profitabilitetsantagelser fra trin 5.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Fremskrevet omsætning og FCF for Novo Nordisk">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={revenueChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: tickColor }} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} tickFormatter={(v) => `${v}`} unit=" mia." />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toFixed(1).replace(".", ",")} mia. DKK`,
                    name === "omsaetning" ? "Omsætning" : "FCF",
                  ]}
                  contentStyle={{
                    background: isDark ? "#19191f" : "#fff",
                    border: `1px solid ${isDark ? "#2a2a35" : "#e5e7eb"}`,
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="omsaetning" fill="#3b82f6" opacity={0.75} radius={[4, 4, 0, 0]} />
                <Line dataKey="fcf" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 5. Profitabilitet */}
        <section className="mb-12">
          <SectionHeader n={5} title="Hvor meget tjener Novo på hver krone?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Ikke alle pengene Novo tjener ender som overskud. En del går til drift, skat,
            fabrikker og lagre. Det der er tilbage kalder man <strong>frit cash flow</strong> -
            det er de penge, virksomheden reelt kan bruge til at skabe værdi for aktionærerne.
          </p>
          <InfoBox>
            <strong>Tænk på det således:</strong> Hvis Novo tjener 100 kr. i omsætning, så
            går en del til lønninger, råvarer og andre driftsomkostninger (driftsmargin
            bestemmer hvor meget der er tilbage). Derefter betaler de skat, foretager nye
            nettoinvesteringer i fabrikker ud over hvad der slides ned (CapEx minus
            afskrivninger), og binder penge i lagre og tilgodehavender (arbejdskapital).
            Det der er til overs er det frie cash flow.
          </InfoBox>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6">
            <AssumptionSlider
              label="Driftsmargin: Hvor mange øre tjener Novo pr. omsætningskrone?"
              value={opMargin}
              min={20}
              max={50}
              step={0.1}
              onChange={setOpMargin}
              hint="I 2025 beholdt Novo 41 øre af hver krone i omsætning som driftsoverskud (41,3%). I 2024 var det 44 øre. Marginen er allerede faldende. Hvis obesity-markedet bliver mere konkurrencedygtigt, formularies i USA bliver hårdere, og næste generation af incretins presser priserne, kan 35-37% langsigtet margin være mere realistisk. Omvendt kan Novo fastholde høj margin, hvis de bevarer deres produktionsmæssige forspring."
            />
            <AssumptionSlider
              label="Nettoinvesteringer (CapEx minus afskrivninger, % af omsætning)"
              value={capexPct}
              min={3}
              max={15}
              step={0.1}
              onChange={setCapexPct}
              hint="Nettoinvesteringer er CapEx fratrukket afskrivninger, dvs. den reelle nye investering ud over vedligeholdelse. I 2025 var Novos brutto-CapEx 19% af omsætningen, men netto var det lavere. Normalt ligger nettoinvesteringer for medicinalvirksomheder på 4-8%. Når de nye fabrikker er færdige, falder denne post."
            />
            <AssumptionSlider
              label="Årlig ændring i arbejdskapital (% af omsætning)"
              value={nwcPct}
              min={0}
              max={8}
              step={0.1}
              onChange={setNwcPct}
              hint="Hvert år bindes en del af omsætningen i lager, tilgodehavender og andre driftsposter. Denne procent trækkes fra det frie cash flow hvert år. For en voksende virksomhed er 1-2% normalt. I 2025 var det ca. 4% for Novo pga. den kraftige udbygning."
            />
            <AssumptionSlider
              label="Skat (% af overskud)"
              value={taxRate}
              min={15}
              max={30}
              step={0.1}
              onChange={setTaxRate}
              hint="Den danske selskabsskat er 22%, men Novo opererer globalt og betaler en effektiv skat tættere på 21-22%. I 2025 var den effektive skatteprocent 21,5%. Satsen kan ændre sig i fremtiden."
            />
          </div>

          {/* FCF summary table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Mia. DKK</th>
                  {revenues.map((_, i) => (
                    <th key={i} className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                      {currentYear + i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">Omsætning</td>
                  {revenues.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-right tabular-nums text-gray-900 dark:text-white">{v.toFixed(1).replace(".", ",")}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">Driftsoverskud efter skat (NOPAT)</td>
                  {revenues.map((rev, i) => {
                    const nopat = computeNOPAT(rev, opMargin, taxRate);
                    return <td key={i} className="py-2 px-2 text-right tabular-nums text-gray-900 dark:text-white">{nopat.toFixed(1).replace(".", ",")}</td>;
                  })}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">Frit cash flow</td>
                  {fcfs.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{v.toFixed(1).replace(".", ",")}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Frit cash flow = driftsoverskud efter skat (NOPAT), minus nettoinvesteringer (CapEx fratrukket afskrivninger), minus ændring i arbejdskapital (lager, tilgodehavender m.m.). Vi bruger nettoinvesteringer i stedet for brutto-CapEx, så afskrivninger allerede er indregnet uden en separat post.
          </p>
        </section>

        {/* 6. Beta og afkastkrav */}
        <section className="mb-12">
          <SectionHeader n={6} title="Hvor meget afkast kræver investorerne?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Fremtidige penge er mindre værd end penge i dag, fordi du kunne have investeret
            dem i noget andet i mellemtiden. Diskonteringsrenten (WACC) er det afkast,
            investorer kræver for at binde deres penge i netop Novo Nordisk. Jo højere
            afkastkravet er, jo mindre er fremtidige cash flows værd i dag, og jo lavere
            bliver fair value.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            WACC beregnes ud fra to ting: Hvad aktionærerne kræver i afkast, og hvad det
            koster Novo at låne penge. De to dele vægtes efter, hvor stor en andel af
            virksomheden der er finansieret med henholdsvis aktier og gæld.
          </p>

          <InfoBox>
            <strong>Tre ting bestemmer afkastkravet på aktier:</strong>
            <br /><br />
            <strong>1. Den risikofrie rente</strong> er det afkast du kan få helt uden risiko,
            f.eks. ved at købe danske statsobligationer. Det er dit udgangspunkt.
            <br /><br />
            <strong>2. Beta</strong> måler, hvor meget Novo-aktien svinger sammenlignet med
            aktiemarkedet generelt. En beta på 1,0 svinger lige så meget som markedet.
            Over 1,0 svinger den mere (højere risiko), under 1,0 svinger den mindre.
            <br /><br />
            <strong>3. Aktierisikopræmien</strong> er det ekstra afkast investorer historisk
            har krævet for at investere i aktier fremfor sikre statsobligationer.
            <br /><br />
            Derudover indgår <strong>gældsrenten</strong> (hvad Novo betaler i rente på sine lån),
            justeret for skat, da renteudgifter er fradragsberettigede.
          </InfoBox>

          {/* Beta selection */}
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Beta: Hvor risikabel er Novo-aktien?</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Novo har to meget forskellige beta-tal. Den korte (1-2 år) er 1,85, drevet af
              den seneste tids store kursudsving. Den normaliserede 5-årige er ca. 1,0. De
              fleste analytikere bruger den udglattede beta, da kortsigtede udsving ofte er
              midlertidige. Vælg en af de foruddefinerede værdier, eller juster selv med slideren.
            </p>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: "Normaliseret 5-årig (~1,0)", value: 1.0 },
                { label: "Kortsigtede udsving (1,85)", value: 1.85 },
                { label: "Farmaindustriens gennemsnit (~0,9)", value: 0.9 },
              ].map((preset) => (
                <button
                  key={preset.value}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    Math.abs(beta - preset.value) < 0.01
                      ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                      : "bg-white dark:bg-[#19191f] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                  }`}
                  onClick={() => { setBeta(preset.value); setWaccOverride(null); }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <AssumptionSlider
              label="Beta"
              value={beta}
              min={0.5}
              max={3.0}
              step={0.05}
              unit=""
              onChange={(v) => { setBeta(v); setWaccOverride(null); }}
              hint=""
            />
          </div>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-4">De øvrige komponenter</p>
            <AssumptionSlider
              label="Risikofri rente"
              value={riskFreeRate}
              min={1}
              max={5}
              step={0.1}
              onChange={(v) => { setRiskFreeRate(v); setWaccOverride(null); }}
              hint="Renten på en dansk 10-årig statsobligation. Det er dit 'nulpunkt' for afkast. Typisk 2,5-3,0%."
            />
            <AssumptionSlider
              label="Aktierisikopræmie"
              value={equityRiskPremium}
              min={3}
              max={8}
              step={0.1}
              onChange={(v) => { setEquityRiskPremium(v); setWaccOverride(null); }}
              hint="Hvor meget ekstra afkast kræver investorer for at tage risikoen ved aktier? Historisk har det været 5-6% for det danske marked."
            />
            <AssumptionSlider
              label="Gældsrente"
              value={costOfDebt}
              min={1}
              max={8}
              step={0.1}
              onChange={(v) => { setCostOfDebt(v); setWaccOverride(null); }}
              hint="Den gennemsnitlige rente Novo betaler på sine lån. Bør normalt ligge over den risikofrie rente. For Novo typisk 3-4%."
            />
          </div>

          {/* Computed WACC display */}
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-4">Din beregnede diskonteringsrente (WACC)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Afkastkrav på aktier (CAPM)</p>
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {fmtPct(costOfEquity)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  = {fmtPct(riskFreeRate)} + {beta.toFixed(2).replace(".", ",")} &times; {fmtPct(equityRiskPremium)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Samlet WACC</p>
                <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {fmtPct(computedWacc)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Denne rente bruges til at diskontere alle fremtidige cash flows
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Modellen vægter aktionærernes afkastkrav ({fmtPct(equityWeight * 100)}) og gældsrenten efter skat ({fmtPct(debtWeight * 100)}) baseret på Novos kapitalstruktur: markedsværdi {fmtBn(marketCap)} mia. DKK, nettogæld {fmtBn(NET_DEBT_DKK)} mia. DKK.
            </p>
          </div>

          <InfoBox>
            <strong>Er din WACC realistisk?</strong> Med basis-antagelserne lander WACC omkring
            7,7%. Det er ikke urimeligt for et europæisk mega-cap pharma-selskab historisk set, men
            Novo er ikke længere et klassisk defensivt pharma-selskab. Markedet priser i dag
            regulatorisk risiko, politisk prispres i USA, konkurrence fra Eli Lilly og
            koncentrationsrisiko omkring semaglutid-platformen. Mange professionelle investorer
            bruger i dag 8,5-10% som afkastkrav på egenkapitalen for Novo. Tjek
            følsomhedstabellen i afsnit 9 for at se, hvor meget WACC flytter din fair value.
          </InfoBox>

          {/* Manual WACC override */}
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="wacc-override"
                checked={waccOverride !== null}
                onChange={(e) => setWaccOverride(e.target.checked ? parseFloat(computedWacc.toFixed(1)) : null)}
                className="w-4 h-4 accent-blue-500"
              />
              <label htmlFor="wacc-override" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Jeg vil hellere sætte WACC direkte
              </label>
            </div>
            {waccOverride !== null && (
              <AssumptionSlider
                label="WACC (manuelt valgt)"
                value={waccOverride}
                min={5}
                max={18}
                step={0.1}
                onChange={setWaccOverride}
                hint="Du tilsidesætter nu beregningen ovenfor. Analytikerkonsensus for Novo ligger typisk på 9-13%."
              />
            )}
          </div>
        </section>

        {/* 7. Terminal value */}
        <section className="mb-12">
          <SectionHeader n={7} title="Terminalværdi og langsigtet vækst" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Terminalværdien repræsenterer al virksomhedsværdi ud over år 10. Den beregnes
            ved at antage, at det frie cash flow vokser med en konstant, lav rate for evigt
            (Gordon Growth Model). Typisk sætter man denne rate til noget nær den langsigtede
            nominelle BNP-vækst, dvs. inflation + real vækst, altså ca. 2-3%.
          </p>
          <InfoBox>
            <strong>Terminalværdi = FCF<sub>10</sub> &times; (1 + g) / (WACC - g)</strong>
            <br /><br />
            Værd at bide mærke i: Terminalværdien udgør typisk 60-80% af den samlede
            virksomhedsværdi i en DCF-model. Det betyder, at modellen i praksis er mere
            et "WACC + terminalvækst-instrument" end en præcis analyse af de enkelte år.
            Selv en lille ændring i terminalvækst fra 2,5% til 3,0% kan flytte fair value
            med 20-30%. Det er ikke en svaghed ved denne specifikke model, men sådan DCF
            fungerer for store kvalitetsselskaber. Vær ekstra kritisk over for denne antagelse.
          </InfoBox>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6">
            <AssumptionSlider
              label="Langsigtet væksthastighed (g)"
              value={terminalGrowth}
              min={1}
              max={4}
              step={0.1}
              onChange={setTerminalGrowth}
              hint="2-2,5% er et normalt udgangspunkt, svarende til langsigtet nominel BNP-vækst. Over 3% er sjældent rimeligt og bør kun bruges, hvis man har en stærk tese om varig konkurrencefordel. 3,5-4% er meget optimistisk for et modent mega-cap selskab."
            />
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Terminalværdi (udiskonteret)</p>
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{fmtBn(terminalValue)} DKK</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nutidsværdi af terminalværdi</p>
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {fmtBn(terminalValue / Math.pow(1 + wacc / 100, growthRates.length))} DKK
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">TV som andel af EV</p>
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {enterpriseValue > 0 ? fmtPct((terminalValue / Math.pow(1 + wacc / 100, growthRates.length) / enterpriseValue) * 100) : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Din vurdering */}
        <section className="mb-12">
          <SectionHeader n={8} title="Din vurdering" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Med dine antagelser ser resultatet således ud. Fair value per aktie er den pris,
            modellen mener aktien er værd lige nu baseret på dine antagelser. Hvis fair value er højere
            end den aktuelle kurs, antyder modellen at aktien er undervurderet, og omvendt.
          </p>
          <InfoBox>
            <strong>Tænk i intervaller, ikke i præcise tal.</strong> Når modellen siger f.eks.
            "307 DKK", er det fristende at konkludere at fair value er præcis 307. Men den reelle
            indsigt er snarere: "med disse antagelser ligger værdien et sted mellem 240 og 400".
            Brug følsomhedstabellen nedenfor til at se spændet. Det er sådan professionelle
            investorer bruger DCF-modeller.
          </InfoBox>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI value={fmtBn(enterpriseValue) + " DKK"} label="Virksomhedsværdi (EV)" />
            <KPI value={fmtBn(enterpriseValue - NET_DEBT_DKK) + " DKK"} label="Egenkapitalværdi (EV minus gæld)" />
            <KPI value={fmtDKK(fairValuePerShare)} label="Estimeret fair value per aktie" highlight />
            <KPI
              value={(upside >= 0 ? "+" : "") + fmtPct(upside)}
              label={upside >= 0 ? "Potentiale fra kurs" : "Nedside fra kurs"}
            />
          </div>

          {/* Share button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={async () => {
                const params = new URLSearchParams();
                params.set("gr", growthRates.join(","));
                params.set("om", String(opMargin));
                params.set("cx", String(capexPct));
                params.set("nwc", String(nwcPct));
                params.set("tx", String(taxRate));
                params.set("rf", String(riskFreeRate));
                params.set("b", String(beta));
                params.set("erp", String(equityRiskPremium));
                params.set("rd", String(costOfDebt));
                if (waccOverride !== null) params.set("wacc", String(waccOverride));
                params.set("tg", String(terminalGrowth));
                const shareUrl = `https://zirium.dk/analyse/novo/dcf?${params.toString()}`;
                const shareText =
                  `Min DCF-vurdering af Novo Nordisk (NOVO B)\n\n` +
                  `Fair value: ${fmtDKK(fairValuePerShare)}\n` +
                  `12-mdr. kursmål: ${fmtDKK(price12m)}\n` +
                  `Seneste lukkekurs: ${fmtDKK(currentPrice)}\n` +
                  `Potentiale: ${(upside >= 0 ? "+" : "") + fmtPct(upside)}\n` +
                  `WACC: ${fmtPct(wacc)}\n\n` +
                  `Se mine antagelser og lav din egen vurdering:\n${shareUrl}`;
                trackEvent("dcf_share_click", { fair_value: Math.round(fairValuePerShare) });
                fetch(`${HOST}/stats/visit/novo-dcf-share/`).catch(() => {});
                if (navigator.share) {
                  try {
                    await navigator.share({ text: shareText, url: shareUrl });
                  } catch {
                    // User cancelled share dialog
                  }
                } else {
                  await navigator.clipboard.writeText(shareText);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              <FontAwesomeIcon icon={shareCopied ? faCheck : faShareNodes} />
              {shareCopied ? "Kopieret!" : "Del din vurdering"}
            </button>
          </div>
        </section>

        {/* 9. 12-month price target */}
        <section className="mb-12">
          <SectionHeader n={9} title="Hvor kan kursen være om 12 måneder?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Fair value er modellens estimat for, hvad aktien er værd i dag baseret på dine
            nuværende antagelser. Men hvad hvis antagelserne er uændrede om et år?
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I en DCF-model vil virksomhedens værdi normalt stige over tid med omtrent
            diskonteringsrenten (WACC), fordi man kommer ét år tættere på de fremtidige cash
            flows. Samtidig er det første års cash flow nu realiseret og indgår derfor ikke
            længere i værdiansættelsen.
          </p>
          <InfoBox>
            <strong>En forenklet måde at beregne et 12-måneders kursmål:</strong>
            <br /><br />
            12-måneders EV = (dagens EV &times; (1 + WACC)) &minus; næste års frie cash flow
            <br /><br />
            Herefter fratrækkes forventet nettogæld, og resultatet divideres med antal aktier.
            Denne metode bruges ofte af analytikere til at omsætte en DCF-model til et
            12-måneders kursmål. Bemærk at det er en approksimation, da en fuldstændig
            genberegning teknisk set kræver at hele modellen flyttes ét år frem.
          </InfoBox>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KPI value={fmtDKK(fairValuePerShare)} label="Fair value i dag" />
            <KPI value={fmtDKK(price12m)} label="Estimeret kurs om 12 mdr." highlight />
            <KPI value={fmtDKK(currentPrice)} label={priceDate ? `Lukkekurs (${priceDate})` : "Seneste lukkekurs"} />
            <KPI
              value={(upside12m >= 0 ? "+" : "") + fmtPct(upside12m)}
              label="Potentiale om 12 mdr."
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Kursmålet forudsætter, at dine antagelser om vækst, margin, risiko og konkurrence
            er uændrede om 12 måneder. I praksis ændrer kursmål sig løbende, fordi markedets
            forventninger til netop disse faktorer ændrer sig. Brug derfor tallet som en
            indikation af det forventede afkast under dine nuværende antagelser, ikke som en
            præcis forudsigelse af kursen om 12 måneder.
          </p>
        </section>

        {/* 10. Sensitivity matrix */}
        <section className="mb-12">
          <SectionHeader n={10} title="Følsomhedsanalyse" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
            Selv små ændringer i WACC og terminalvækst kan flytte fair value mere end ændringer
            i de første mange års omsætningsvækst. Det er den vigtigste indsigt i en DCF-model,
            og tabellen nedenfor illustrerer det tydeligt.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
            Din beregnede fair value er{" "}
            <strong className="text-gray-900 dark:text-white">{Math.round(fairValuePerShare).toLocaleString("da-DK")} DKK</strong> (markeret
            med blåt). Grøn betyder over nuværende kurs ({currentPrice} DKK), rød betyder under.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-5">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800" /> Under kurs</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" /> Tæt på kurs</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800" /> Over kurs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#15151a]">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    WACC \ Vækst
                  </th>
                  {TG_VALUES.map((tg) => (
                    <th key={tg} className="px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap tabular-nums">
                      {fmtPct(tg)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const allValues = senMatrix.flat().map((c) => c.perShare);
                  const minVal = Math.min(...allValues);
                  const maxVal = Math.max(...allValues);
                  // Find nearest cell to current WACC and terminal growth
                  const nearestWaccIdx = WACC_VALUES.reduce((best, v, i) => Math.abs(v - wacc) < Math.abs(WACC_VALUES[best] - wacc) ? i : best, 0);
                  const nearestTgIdx = TG_VALUES.reduce((best, v, i) => Math.abs(v - terminalGrowth) < Math.abs(TG_VALUES[best] - terminalGrowth) ? i : best, 0);
                  return senMatrix.map((row, ri) => {
                    const rowWacc = WACC_VALUES[ri];
                    return (
                      <tr key={ri}>
                        <td className="px-3 py-2.5 font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#15151a] tabular-nums whitespace-nowrap">
                          {fmtPct(rowWacc)}
                        </td>
                        {row.map((cell, ci) => {
                          const isSelected = ri === nearestWaccIdx && ci === nearestTgIdx;

                          // Heatmap: ratio from current price
                          const ratio = cell.perShare / currentPrice;
                          let bgClass: string;
                          let textClass: string;
                          if (isSelected) {
                            bgClass = "bg-blue-100 dark:bg-blue-900/50";
                            textClass = "text-blue-700 dark:text-blue-300 font-bold";
                          } else if (ratio < 0.85) {
                            // Deep red: far below current price
                            const intensity = Math.min(1, (currentPrice - cell.perShare) / (currentPrice - minVal));
                            bgClass = intensity > 0.5
                              ? "bg-red-200 dark:bg-red-900/50"
                              : "bg-red-100 dark:bg-red-900/30";
                            textClass = "text-red-800 dark:text-red-300";
                          } else if (ratio < 0.95) {
                            bgClass = "bg-red-50 dark:bg-red-900/20";
                            textClass = "text-red-700 dark:text-red-400";
                          } else if (ratio <= 1.05) {
                            bgClass = "bg-gray-50 dark:bg-gray-800/50";
                            textClass = "text-gray-700 dark:text-gray-300";
                          } else if (ratio <= 1.15) {
                            bgClass = "bg-emerald-50 dark:bg-emerald-900/20";
                            textClass = "text-emerald-700 dark:text-emerald-400";
                          } else {
                            const intensity = Math.min(1, (cell.perShare - currentPrice) / (maxVal - currentPrice));
                            bgClass = intensity > 0.5
                              ? "bg-emerald-200 dark:bg-emerald-900/50"
                              : "bg-emerald-100 dark:bg-emerald-900/30";
                            textClass = "text-emerald-800 dark:text-emerald-300";
                          }

                          return (
                            <td
                              key={ci}
                              className={`px-3 py-2.5 text-center tabular-nums font-medium ${bgClass} ${textClass} ${isSelected ? "ring-2 ring-blue-500 ring-inset" : ""}`}
                            >
                              {Math.round(cell.perShare).toLocaleString("da-DK")}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Alle værdier i DKK per aktie. Blåt felt med ramme svarer til dine nuværende WACC- og g-værdier ({Math.round(fairValuePerShare).toLocaleString("da-DK")} DKK).
            Tabellen opdateres automatisk når du ændrer dine antagelser.
          </p>
        </section>

        {/* 11. Disclaimer */}
        <section className="mb-12">
          <SectionHeader n={11} title="Disclaimer" />
          <div className="bg-gray-50 dark:bg-[#15151a] border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            <p className="mb-3">
              Denne analyse er udelukkende udarbejdet til uddannelses- og informationsmæssige
              formål. Den er ikke et tilbud om, en anbefaling af eller en opfordring til køb
              eller salg af værdipapirer.
            </p>
            <p className="mb-3">
              Alle tal og antagelser er baseret på offentligt tilgængelig information,
              herunder Novo Nordisk A/S' årsrapporter og meddelelser til Nasdaq Copenhagen.
              Fremtidsudsigterne i modellen er usikre og kan afvige væsentligt fra det faktiske
              udfald.
            </p>
            <p className="mb-3">
              Araz Bayat Makoo er ikke registreret som investeringsrådgiver og yder ikke
              investerings- eller skatterådgivning. Konsulter altid en professionel rådgiver
              inden du træffer investeringsbeslutninger.
            </p>
            <p>
              Modellen er et interaktivt beregningsværktøj, og der tages forbehold for
              eventuelle programmeringsfejl, unøjagtigheder i data og afrundinger.
              Resultaterne bør ikke bruges som eneste grundlag for investeringsbeslutninger.
            </p>
          </div>
        </section>

        <RelatedAnalyses currentSlug={SLUG} />
      </article>
    </PageTemplate>
  );
};

export default NovoDCFPage;
