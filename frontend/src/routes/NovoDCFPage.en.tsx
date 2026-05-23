import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShareNodes, faCheck } from "@fortawesome/free-solid-svg-icons";
import PageTemplate from "../components/PageTemplate";
import RelatedAnalyses from "../components/RelatedAnalyses";
import FeedbackWidget from "../components/FeedbackWidget";
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
const BASE_REVENUE_DKK = 309.1; // bn DKK, 2025 annual report
const SHARES_OUTSTANDING = 4.449; // bn diluted shares (diluted weighted avg, 2025 annual report)
const NET_DEBT_DKK = 95.4; // bn DKK (net debt, 2025 annual report)
const DEFAULT_PRICE_DKK = 299; // fallback price if API does not respond
const NOVO_ISIN = "DK0062498333";

const WACC_VALUES = [6, 7, 8, 9, 10, 11, 12, 13, 14];
const TG_VALUES = [1.5, 2.0, 2.5, 3.0, 3.5];

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtBn(val: number): string {
  return val.toFixed(1) + " bn";
}

function fmtDKK(val: number): string {
  return Math.round(val).toLocaleString("en-US") + " DKK";
}

function fmtPct(val: number, decimals = 1): string {
  return val.toFixed(decimals) + "%";
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
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}{unit}
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

const NovoDCFPageEn: React.FC = () => {
  const navigate = useNavigate();

  const [currentPrice, setCurrentPrice] = useState(DEFAULT_PRICE_DKK);
  const [priceDate, setPriceDate] = useState("");

  useEffect(() => {
    trackPageView("/analyse/novo/dcf", "novo_dcf_analysis");
    fetch(`${HOST}/stats/visit/novo-dcf-analysis/`).catch(() => {});

    // Fetch latest closing price from chart data
    fetchShortPositionDetails({ category: "pick", code: NOVO_ISIN })
      .then((data) => {
        const chart = data?.chartValues;
        if (Array.isArray(chart) && chart.length > 0) {
          const entry = chart.find((c: { close: number | null }) => c.close != null && c.close > 0);
          if (entry) {
            setCurrentPrice(entry.close);
            const d = new Date(entry.timestamp);
            setPriceDate(d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
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
  const marketCap = currentPrice * SHARES_OUTSTANDING; // bn DKK
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
      <title>Novo Nordisk (NOVO B) DCF Model: Calculate Your Own Fair Value | Zirium</title>
      <meta name="description" content="Free interactive DCF model for Novo Nordisk A/S (NOVO B). Adjust revenue growth, operating margin, WACC, and terminal growth to calculate fair value and a 12-month price target in real time. Includes sensitivity analysis." />
      <meta property="og:title" content="Novo Nordisk (NOVO B) DCF: Calculate your own fair value" />
      <meta property="og:description" content="Free interactive DCF model for Novo Nordisk. Adjust growth, margin, and WACC assumptions to see fair value and price target in real time." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`https://www.zirium.dk/analyse/${SLUG}`} />
      <meta property="og:image" content="https://www.zirium.dk/og-images/novo-dcf-2026-05-19-en.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Novo Nordisk (NOVO B) DCF: Calculate your own fair value" />
      <meta name="twitter:description" content="Free interactive DCF model for Novo Nordisk. Adjust growth, margin, and WACC to see fair value and 12-month price target. Includes sensitivity table." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/novo-dcf-2026-05-19-en.png" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Novo Nordisk (NOVO B) DCF Model: Calculate your own fair value",
        "description": "Free interactive DCF model for Novo Nordisk A/S (NOVO B). Adjust revenue growth, operating margin, WACC, and terminal growth to calculate fair value and a 12-month price target in real time.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-19",
        "mainEntityOfPage": `https://www.zirium.dk/analyse/${SLUG}`,
        "inLanguage": "en",
        "about": { "@type": "Corporation", "name": "Novo Nordisk A/S", "tickerSymbol": "NOVO B", "url": "https://www.novonordisk.com" },
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
          Back
        </button>

        {/* Header */}
        <header className="mb-10 mt-4">
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">
            Interactive analysis by Araz Bayat Makoo (Zirium), May 19, 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Build your own valuation of Novo Nordisk A/S
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Novo Nordisk A/S (NOVO B)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            When analysts set price targets for Novo Nordisk, they rely on models like this one,
            and small changes in assumptions can move the target price significantly.
            This analysis lets you try it yourself. Adjust the assumptions about growth,
            profitability, and risk, and the model calculates in real time what the stock is worth.
            The goal is for you to form your own view of the company, understand how sensitive the
            result is, and see why two analysts can look at the same data and reach very different
            conclusions.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            The entire case boils down to one central question: Is Novo a temporarily pressured
            quality monopoly where obesity becomes a massive multi-year market, oral GLP-1 works,
            and Novo still has a manufacturing moat? Or have peak economics already passed, with
            Eli Lilly continuing to take market share, pricing power collapsing, and semaglutide
            losing its special status? Your answer to that question determines your assumptions below.
          </p>
        </header>

        {/* Live KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI
            value={fmtDKK(fairValuePerShare)}
            label="Your estimate (fair value)"
            highlight
          />
          <KPI value={fmtDKK(currentPrice)} label={priceDate ? `Closing price (${priceDate})` : "Latest closing price"} />
          <KPI
            value={(upside >= 0 ? "+" : "") + fmtPct(upside)}
            label="Upside vs. current price"
          />
          <KPI value={fmtPct(wacc)} label="WACC (your discount rate)" />
        </div>

        {/* 1. What is DCF */}
        <section className="mb-12">
          <SectionHeader n={1} title="What is a DCF analysis?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            A DCF analysis (Discounted Cash Flow) is a method of valuing a company by
            estimating how much free cash flow it will generate in the future, and then
            discounting those cash flows back to present value. The basic idea is simple:
            A dollar received tomorrow is worth less than a dollar today, because you
            could invest that dollar today and earn a return.
          </p>
          <InfoBox>
            <strong>The formula in brief:</strong> Enterprise value = sum of discounted
            free cash flows during the forecast period + discounted terminal value. The
            terminal value represents all value beyond the forecast period and assumes that
            the company grows at a stable, low rate in perpetuity.
          </InfoBox>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            DCF is the method most commonly used by professional analysts and investors
            when valuing companies. It forces you to be explicit about your assumptions
            and provides a structured basis for discussion. The downside is that the
            result is highly sensitive to small changes in assumptions, especially WACC
            and the long-term growth rate.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            This model uses a 10-year forecast period followed by a terminal value. We
            use 10 years instead of the more typical 5 because Novo Nordisk is a growth
            company, and it takes time before growth normalizes.
          </p>
        </section>

        {/* 2. Novo in numbers */}
        <section className="mb-12">
          <SectionHeader n={2} title="Novo Nordisk in numbers" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
            Before diving into the assumptions, it is important to know the starting
            point. Below are the key figures from Novo Nordisk's 2025 annual report and
            its listing on Nasdaq Copenhagen that the model is based on. All figures are
            in Danish kroner (DKK), the currency in which Novo reports and trades.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <KPI value={fmtBn(BASE_REVENUE_DKK) + " DKK"} label="Revenue 2025" />
            <KPI value="41.3%" label="Operating margin 2025" />
            <KPI value="21.5%" label="Effective tax rate 2025" />
            <KPI value={fmtBn(SHARES_OUTSTANDING)} label="Diluted shares (bn)" />
            <KPI value={fmtBn(NET_DEBT_DKK) + " DKK"} label="Net debt 2025" />
            <KPI value={fmtDKK(currentPrice)} label={priceDate ? `Closing price (${priceDate})` : "Latest closing price"} />
          </div>
          <InfoBox>
            <strong>Where does Novo stand?</strong> Novo Nordisk derives the majority of its
            revenue from GLP-1 drugs (Ozempic, Wegovy, Rybelsus), but its dominance is
            under pressure. Eli Lilly's tirzepatide (Mounjaro/Zepbound) is taking market share
            and pressuring prices, and Novo itself guides a revenue decline of -4% to -12% (CER)
            in 2026 - the first decline in local currency since 2017. Operating profit fell to
            127.7 bn DKK in 2025, partly due to 8 bn DKK in restructuring costs. Novo is
            investing heavily in manufacturing capacity (60 bn DKK in 2025) and is betting on
            CagriSema and oral Wegovy as the next growth drivers. CagriSema, however, has faced
            headwinds after failing to beat Eli Lilly's Zepbound in weight loss in a major study,
            raising doubts among analysts about its potential.
          </InfoBox>
        </section>

        {/* 3. Growth assumptions */}
        <section className="mb-12">
          <SectionHeader n={3} title="Revenue growth: your assumptions" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Novo Nordisk itself guides a revenue decline of -4% to -12% (CER) in 2026 -
            the first decline in local currency since 2017. This is driven by political pricing
            pressure in the US (including proposals inspired by "Most Favoured Nation" models),
            patent expirations on semaglutide in certain markets, and increasing competition
            from Eli Lilly.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The question is how quickly Novo can reverse the decline. The Wegovy pill (oral
            semaglutide) was launched in the US on January 5, 2026 and already had over
            200,000 weekly prescriptions in April. The broader international rollout and
            new products could drive a return to growth from 2027, but CagriSema's
            disappointing study results against Eli Lilly's Zepbound make the picture
            more uncertain.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            Novo is still in an unusual growth phase for a large pharmaceutical company,
            and analysts therefore typically use a 10-year forecast period because it takes
            longer before growth stabilizes. This provides a more accurate picture than the
            5 years normally used for mature companies.
            Adjust your assumptions for each year below, or start from one of the three scenarios.
          </p>

          {/* Scenario presets */}
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Start from a scenario</p>
            <p className="text-base text-gray-600 dark:text-gray-300 mb-3">
              The three scenarios are built from Novo's own guidance, historical key
              figures, and the current market landscape. They are not based on any specific
              analyst's model but represent reasonable ranges for a pessimistic, neutral, and
              optimistic view. Pick a starting point and fine-tune from there. All assumptions
              (growth, margin, WACC, terminal growth) are updated.
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                {
                  label: "Pessimistic",
                  gr: [-8, 2, 5, 4, 3, 3, 2, 2, 2, 2],
                  om: 36, cx: 10, nwc: 2, tx: 22, rf: 2.6, b: 1.85, erp: 5.5, rd: 4.0, wo: null, tg: 2.0,
                  color: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20",
                },
                {
                  label: "Base case",
                  gr: [-5, 5, 9, 8, 7, 6, 5, 4, 3, 3],
                  om: 40, cx: 9, nwc: 1.5, tx: 22, rf: 2.6, b: 1.0, erp: 5.5, rd: 3.5, wo: null, tg: 2.5,
                  color: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                },
                {
                  label: "Optimistic",
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
                  analyst: "Analyst consensus: ~292 bn DKK (-6%). Novo's own guidance: -4% to -12% (CER). 32 analysts.",
                  context: "Political pricing pressure in the US, semaglutide patent expirations, and increasing competition from Eli Lilly are weighing on revenue. Q1 2026 adjusted sales fell 4% in CER.",
                },
                2027: {
                  analyst: "",
                  context: "The Wegovy pill (launched Jan. 2026, >200,000 weekly prescriptions in April) could drive a return to growth. However, CagriSema's disappointing study results against Zepbound create uncertainty. Generic competition and lower prices remain headwinds.",
                },
                2028: {
                  analyst: "",
                  context: "Amycretin and next-generation drugs are maturing. Manufacturing capacity is nearing completion, so investments are peaking and cash flow is improving.",
                },
                2029: {
                  analyst: "",
                  context: "Novo Nordisk's ability to defend market share against Eli Lilly and new GLP-1 players will be crucial for growth.",
                },
                2030: {
                  analyst: "",
                  context: "Semaglutide patents have now expired in most markets. New indications (NASH, cardiovascular, renal) could sustain growth, but generic competition is real.",
                },
                2031: {
                  analyst: "",
                  context: "At this point, we're beyond analyst coverage. Growth depends on whether Novo has brought next-generation drugs to market.",
                },
                2032: {
                  analyst: "",
                  context: "The GLP-1 market is now mature. Growth begins to resemble the broader pharma sector (3-5% annually).",
                },
                2033: {
                  analyst: "",
                  context: "Growth approaches global economic growth. Novo is now a mature, stable cash-generating machine.",
                },
                2034: {
                  analyst: "",
                  context: "Same as above. The further out we look, the more uncertain the estimates become - but that's exactly why we have the terminal value in the next step.",
                },
                2035: {
                  analyst: "",
                  context: "Final year in the forecast. After this, the terminal value takes over, which assumes Novo grows at a stable, low rate in perpetuity.",
                },
              };
              const h = hints[year];
              return (
                <div key={i}>
                  <AssumptionSlider
                    label={`Year ${i + 1} (${year})`}
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

        {/* 4. Revenue projection */}
        <section className="mb-12">
          <SectionHeader n={4} title="Projected revenue and free cash flow" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Blue bars = revenue (bn DKK). Green line = free cash flow (FCF) with your
            current profitability assumptions from step 5.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Projected revenue and FCF for Novo Nordisk">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={revenueChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: tickColor }} />
                <YAxis tick={{ fontSize: 11, fill: tickColor }} tickFormatter={(v) => `${v}`} unit=" bn" />
                <Tooltip
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toFixed(1)} bn DKK`,
                    name === "omsaetning" ? "Revenue" : "FCF",
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

        {/* 5. Profitability */}
        <section className="mb-12">
          <SectionHeader n={5} title="How much profit does Novo actually generate?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Not all the money Novo earns ends up as profit. A portion goes to operations,
            taxes, factories, and inventories. What remains is called <strong>free cash
            flow</strong> - the money the company can actually use to create value for shareholders.
          </p>
          <InfoBox>
            <strong>Think of it this way:</strong> For every 100 in revenue, a
            portion goes to wages, raw materials, and other operating costs (the operating
            margin determines how much is left). Then taxes are paid, net capital is invested
            in factories beyond what depreciates (CapEx minus depreciation), and cash is
            tied up in inventories and receivables (working capital). Whatever is left over
            is the free cash flow.
          </InfoBox>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6">
            <AssumptionSlider
              label="Operating margin: What share of revenue does Novo keep as profit?"
              value={opMargin}
              min={20}
              max={50}
              step={0.1}
              onChange={setOpMargin}
              hint="In 2025, Novo retained 41.3% of revenue as operating profit. In 2024 it was 44%. The margin is already declining. If the obesity market becomes more competitive, US formularies get tougher, and next-generation incretins pressure prices, a long-term margin of 35-37% may be more realistic. Conversely, Novo could maintain a high margin if they preserve their manufacturing advantage."
            />
            <AssumptionSlider
              label="Net capital expenditure (CapEx minus depreciation, % of revenue)"
              value={capexPct}
              min={3}
              max={15}
              step={0.1}
              onChange={setCapexPct}
              hint="Net capital expenditure is CapEx minus depreciation, i.e. the actual new investment beyond maintenance. In 2025, Novo's gross CapEx was 19% of revenue, but net was lower. Normally, net capital expenditure for pharmaceutical companies is 4-8%. When the new factories are completed, this item decreases."
            />
            <AssumptionSlider
              label="Annual change in working capital (% of revenue)"
              value={nwcPct}
              min={0}
              max={8}
              step={0.1}
              onChange={setNwcPct}
              hint="Each year, a portion of revenue is tied up in inventory, receivables, and other operating items. This percentage is deducted from free cash flow each year. For a growing company, 1-2% is normal. In 2025, it was about 4% for Novo due to the heavy capacity buildout."
            />
            <AssumptionSlider
              label="Tax rate (% of profit)"
              value={taxRate}
              min={15}
              max={30}
              step={0.1}
              onChange={setTaxRate}
              hint="Denmark's corporate tax rate is 22%, but Novo operates globally and pays a blended effective rate of about 21-22%. In 2025, the effective tax rate was 21.5%. This could shift over time as tax policy evolves."
            />
          </div>

          {/* FCF summary table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Bn DKK</th>
                  {revenues.map((_, i) => (
                    <th key={i} className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                      {currentYear + i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">Revenue</td>
                  {revenues.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-right tabular-nums text-gray-900 dark:text-white">{v.toFixed(1)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">Net operating profit after tax (NOPAT)</td>
                  {revenues.map((rev, i) => {
                    const nopat = computeNOPAT(rev, opMargin, taxRate);
                    return <td key={i} className="py-2 px-2 text-right tabular-nums text-gray-900 dark:text-white">{nopat.toFixed(1)}</td>;
                  })}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">Free cash flow</td>
                  {fcfs.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{v.toFixed(1)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Free cash flow = net operating profit after tax (NOPAT), minus net capital expenditure (CapEx minus depreciation), minus change in working capital (inventory, receivables, etc.). We use net capital expenditure instead of gross CapEx, so depreciation is already accounted for without a separate line item.
          </p>
        </section>

        {/* 6. Beta and required return */}
        <section className="mb-12">
          <SectionHeader n={6} title="What return do investors require?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Future money is worth less than money today, because you could have invested
            it in something else in the meantime. The discount rate (WACC) is the return
            investors require for tying up their money in Novo Nordisk specifically. The
            higher the required return, the less future cash flows are worth today, and the
            lower the fair value.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            WACC is calculated from two things: the return shareholders demand and the
            cost for Novo to borrow money. The two are weighted according to Novo's mix
            of equity and debt financing.
          </p>

          <InfoBox>
            <strong>Three things determine the required return on equity:</strong>
            <br /><br />
            <strong>1. The risk-free rate</strong> is the return you can earn with virtually
            zero risk, e.g. by buying government bonds. It is your starting point.
            <br /><br />
            <strong>2. Beta</strong> measures how much the Novo stock fluctuates compared
            to the stock market in general. A beta of 1.0 fluctuates as much as the market.
            Above 1.0 it fluctuates more (higher risk), below 1.0 it fluctuates less.
            <br /><br />
            <strong>3. The equity risk premium</strong> is the extra return investors have
            historically required for investing in stocks rather than safe government bonds.
            <br /><br />
            Additionally, the <strong>cost of debt</strong> (the interest Novo pays on its
            loans) is included, adjusted for tax, as interest expenses are tax-deductible.
          </InfoBox>

          {/* Beta selection */}
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">Beta: How risky is the Novo stock?</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Novo has two very different beta figures. The short-term (1-2 year) beta is 1.85,
              driven by recent large price swings. The normalized 5-year beta is approximately
              1.0. Most analysts use the smoothed beta, as short-term volatility is often
              temporary. Choose one of the predefined values or adjust with the slider.
            </p>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: "Normalized 5-year (~1.0)", value: 1.0 },
                { label: "Short-term volatility (1.85)", value: 1.85 },
                { label: "Pharma industry average (~0.9)", value: 0.9 },
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
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-4">The other components</p>
            <AssumptionSlider
              label="Risk-free rate"
              value={riskFreeRate}
              min={1}
              max={5}
              step={0.1}
              onChange={(v) => { setRiskFreeRate(v); setWaccOverride(null); }}
              hint="Based on the yield of a 10-year government bond (Danish or comparable European). This is your 'baseline' for returns. Typically 2.5-3.0%."
            />
            <AssumptionSlider
              label="Equity risk premium"
              value={equityRiskPremium}
              min={3}
              max={8}
              step={0.1}
              onChange={(v) => { setEquityRiskPremium(v); setWaccOverride(null); }}
              hint="How much extra return do investors require for taking on equity risk versus holding bonds? Historically around 5-6% for developed European markets."
            />
            <AssumptionSlider
              label="Cost of debt"
              value={costOfDebt}
              min={1}
              max={8}
              step={0.1}
              onChange={(v) => { setCostOfDebt(v); setWaccOverride(null); }}
              hint="The average interest rate Novo pays on its loans. Should normally be above the risk-free rate. For Novo typically 3-4%."
            />
          </div>

          {/* Computed WACC display */}
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-4">
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-4">Your calculated discount rate (WACC)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Required return on equity (CAPM)</p>
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {fmtPct(costOfEquity)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  = {fmtPct(riskFreeRate)} + {beta.toFixed(2)} &times; {fmtPct(equityRiskPremium)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total WACC</p>
                <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {fmtPct(computedWacc)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  This rate is used to discount all future cash flows
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              The model weights the shareholders' required return ({fmtPct(equityWeight * 100)}) and the after-tax cost of debt ({fmtPct(debtWeight * 100)}) based on Novo's capital structure: market cap {fmtBn(marketCap)} bn DKK, net debt {fmtBn(NET_DEBT_DKK)} bn DKK.
            </p>
          </div>

          <InfoBox>
            <strong>Is your WACC realistic?</strong> With the base case assumptions, WACC
            lands around 7.7%. That is not unreasonable for a European mega-cap pharma company
            historically, but Novo is no longer a classic defensive pharma company. The market
            currently prices in regulatory risk, political pricing pressure in the US, competition
            from Eli Lilly, and concentration risk around the semaglutide platform. Many
            professional investors today use 8.5-10% as their required return on equity for Novo.
            Check the sensitivity table in section 9 to see how much WACC moves your fair value.
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
                I prefer to set WACC directly
              </label>
            </div>
            {waccOverride !== null && (
              <AssumptionSlider
                label="WACC (manually set)"
                value={waccOverride}
                min={5}
                max={18}
                step={0.1}
                onChange={setWaccOverride}
                hint="You are now overriding the calculation above. Analyst consensus for Novo typically ranges from 9-13%."
              />
            )}
          </div>
        </section>

        {/* 7. Terminal value */}
        <section className="mb-12">
          <SectionHeader n={7} title="Terminal value and long-term growth" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The terminal value represents all company value beyond year 10. It is calculated
            by assuming that free cash flow grows at a constant, low rate in perpetuity
            (Gordon Growth Model). Typically, this rate is set to something close to
            long-term nominal GDP growth, i.e. inflation + real growth, roughly 2-3%.
          </p>
          <InfoBox>
            <strong>Terminal value = FCF<sub>10</sub> &times; (1 + g) / (WACC - g)</strong>
            <br /><br />
            Worth noting: The terminal value typically constitutes 60-80% of total enterprise
            value in a DCF model. This means the model in practice is more of a "WACC +
            terminal growth instrument" than a precise analysis of the individual years.
            Even a small change in terminal growth from 2.5% to 3.0% can move fair value
            by 20-30%. This is not a weakness of this specific model - it is how DCF works
            for large quality companies. Scrutinize this assumption carefully.
          </InfoBox>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6">
            <AssumptionSlider
              label="Long-term growth rate (g)"
              value={terminalGrowth}
              min={1}
              max={4}
              step={0.1}
              onChange={setTerminalGrowth}
              hint="2-2.5% is a normal starting point, corresponding to long-term nominal GDP growth. Above 3% is rarely reasonable and should only be used if you have a strong thesis about lasting competitive advantage. 3.5-4% is very optimistic for a mature mega-cap company."
            />
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Terminal value (undiscounted)</p>
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{fmtBn(terminalValue)} DKK</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Present value of terminal value</p>
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {fmtBn(terminalValue / Math.pow(1 + wacc / 100, growthRates.length))} DKK
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">TV as share of EV</p>
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {enterpriseValue > 0 ? fmtPct((terminalValue / Math.pow(1 + wacc / 100, growthRates.length) / enterpriseValue) * 100) : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Your valuation */}
        <section className="mb-12">
          <SectionHeader n={8} title="Your valuation" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Based on your assumptions, here is the result. Fair value per share is what the
            model suggests the stock is worth today. If fair value is above the current price,
            the model implies the stock is undervalued, and vice versa.
          </p>
          <InfoBox>
            <strong>Think in ranges, not precise numbers.</strong> When the model says e.g.
            "307 DKK", it is tempting to conclude that fair value is exactly 307. But the real
            insight is rather: "with these assumptions, the value lies somewhere between 240 and
            400". Use the sensitivity table below to see the range. This is how professional
            investors use DCF models.
          </InfoBox>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI value={fmtBn(enterpriseValue) + " DKK"} label="Enterprise value (EV)" />
            <KPI value={fmtBn(enterpriseValue - NET_DEBT_DKK) + " DKK"} label="Equity value (EV minus debt)" />
            <KPI value={fmtDKK(fairValuePerShare)} label="Estimated fair value per share" highlight />
            <KPI
              value={(upside >= 0 ? "+" : "") + fmtPct(upside)}
              label={upside >= 0 ? "Upside from current price" : "Downside from current price"}
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
                  `My DCF valuation of Novo Nordisk (NOVO B)\n\n` +
                  `Fair value: ${fmtDKK(fairValuePerShare)}\n` +
                  `12-month price target: ${fmtDKK(price12m)}\n` +
                  `Latest closing price: ${fmtDKK(currentPrice)}\n` +
                  `Upside: ${(upside >= 0 ? "+" : "") + fmtPct(upside)}\n` +
                  `WACC: ${fmtPct(wacc)}\n\n` +
                  `See my assumptions and build your own valuation:\n${shareUrl}`;
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
              {shareCopied ? "Copied!" : "Share your valuation"}
            </button>
          </div>
        </section>

        {/* 9. 12-month price target */}
        <section className="mb-12">
          <SectionHeader n={9} title="Where could the price be in 12 months?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Fair value is the model's estimate of what the stock is worth today given your
            current assumptions. But what if those assumptions still hold a year from now?
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In a DCF model, the company's value naturally increases over time by roughly the
            discount rate (WACC), because you are one year closer to the future cash flows.
            At the same time, the first year's cash flow has been realized and therefore drops
            out of the valuation.
          </p>
          <InfoBox>
            <strong>A simplified way to calculate a 12-month price target:</strong>
            <br /><br />
            12-month EV = (today's EV &times; (1 + WACC)) &minus; next year's free cash flow
            <br /><br />
            Then expected net debt is subtracted and the result is divided by the number of
            shares. Analysts commonly use this shortcut to convert a DCF model into a
            12-month price target. Note that it is an approximation - a full recalculation
            would technically require rolling the entire model forward by one year.
          </InfoBox>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <KPI value={fmtDKK(fairValuePerShare)} label="Fair value today" />
            <KPI value={fmtDKK(price12m)} label="Estimated price in 12 months" highlight />
            <KPI value={fmtDKK(currentPrice)} label={priceDate ? `Closing price (${priceDate})` : "Latest closing price"} />
            <KPI
              value={(upside12m >= 0 ? "+" : "") + fmtPct(upside12m)}
              label="Upside in 12 months"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            The price target assumes your assumptions about growth, margins, risk, and
            competition remain unchanged over the next 12 months. In practice, price targets
            shift continuously as market expectations evolve. Use this number as a directional
            indicator of expected return under your current assumptions, not as a precise
            prediction of where the stock will trade.
          </p>
        </section>

        {/* 10. Sensitivity matrix */}
        <section className="mb-12">
          <SectionHeader n={10} title="Sensitivity analysis" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
            Even small changes in WACC and terminal growth can move fair value more than changes
            in the first many years of revenue growth. This is the most important insight in a
            DCF model, and the table below illustrates it clearly.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
            Your calculated fair value is{" "}
            <strong className="text-gray-900 dark:text-white">{Math.round(fairValuePerShare).toLocaleString("en-US")} DKK</strong>.
            The blue cell highlights the table value closest to your result.
            Green means above the current price ({currentPrice} DKK), red means below.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-5">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800" /> Below price</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" /> Near price</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800" /> Above price</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#15151a]">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    WACC \ Growth
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
                  // Find cell whose value is closest to the computed fair value
                  let nearestWaccIdx = 0;
                  let nearestTgIdx = 0;
                  let nearestDiff = Infinity;
                  senMatrix.forEach((row, ri) => {
                    row.forEach((cell, ci) => {
                      const diff = Math.abs(cell.perShare - fairValuePerShare);
                      if (diff < nearestDiff) {
                        nearestDiff = diff;
                        nearestWaccIdx = ri;
                        nearestTgIdx = ci;
                      }
                    });
                  });
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
                              {Math.round(cell.perShare).toLocaleString("en-US")}
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
            All values in DKK per share. The blue cell is the value closest to your calculated fair value ({Math.round(fairValuePerShare).toLocaleString("en-US")} DKK).
            The table updates automatically when you change your assumptions.
          </p>
        </section>

        {/* 11. Disclaimer */}
        <section className="mb-12">
          <SectionHeader n={11} title="Disclaimer" />
          <div className="bg-gray-50 dark:bg-[#15151a] border border-gray-200 dark:border-gray-700 rounded-xl p-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            <p className="mb-3">
              This analysis has been prepared solely for educational and informational
              purposes. It is not an offer, recommendation, or solicitation to buy or
              sell securities.
            </p>
            <p className="mb-3">
              All figures and assumptions are based on publicly available information,
              including Novo Nordisk A/S' annual reports and announcements to Nasdaq
              Copenhagen. The forward-looking projections in the model are uncertain and
              may differ significantly from actual outcomes.
            </p>
            <p className="mb-3">
              Araz Bayat Makoo is not a registered investment advisor and does not provide
              investment or tax advice. Always consult a professional advisor before making
              investment decisions.
            </p>
            <p>
              The model is an interactive calculation tool, and we cannot guarantee it
              is free from programming errors, data inaccuracies, or rounding issues. The
              results should not be used as the sole basis for investment decisions.
            </p>
          </div>
        </section>

        <FeedbackWidget pageType="analysis" pageId={SLUG} />
        <RelatedAnalyses currentSlug={SLUG} />
      </article>
    </PageTemplate>
  );
};

export default NovoDCFPageEn;
