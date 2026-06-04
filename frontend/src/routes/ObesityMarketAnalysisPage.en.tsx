import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageTemplate from "../components/PageTemplate";
import RelatedAnalyses from "../components/RelatedAnalyses";
import FeedbackWidget from "../components/FeedbackWidget";
import { trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { STOCK_DATA } from "../data/novoLillyPrices";

const SLUG = "novo/2026-06-04";

// ─── static data ────────────────────────────────────────────────────────────
// Adults living with obesity, millions worldwide. 2010 and 2030 from World Obesity
// Atlas 2025 (2030 = projection); 2022 = actual figure from WHO.
const OBESITY_TREND_DATA = [
  { year: "2010", millions: 524, projected: false },
  { year: "2022", millions: 890, projected: false },
  { year: "2030", millions: 1130, projected: true },
];

// Analyst estimates for the global obesity drug market in 2030 (USD billion).
// NOT official figures. Source: Goldman Sachs Research and Morgan Stanley Research.
const FORECAST_2030_DATA = [
  { label: "Goldman (prev.)", value: 130, tone: "muted" },
  { label: "Goldman (now)", value: 95, tone: "now" },
  { label: "Morgan Stanley", value: 105, tone: "now" },
  { label: "MS bull case", value: 144, tone: "bull" },
];

// 2025 sales (DKK billion). Novo as reported in DKK; Lilly converted from USD
// at about DKK 6.41 per USD (end of May 2026). Sources: company annual reports.
const SALES_2025_DATA = [
  { drug: "Mounjaro", company: "Lilly", dkk: 147 },
  { drug: "Ozempic", company: "Novo", dkk: 127 },
  { drug: "Zepbound", company: "Lilly", dkk: 87 },
  { drug: "Wegovy", company: "Novo", dkk: 79 },
];

// Illustrative scenario calculation (NOT a forecast): market size (USD billion)
// if a given share of the ~1.13 billion adults with obesity in 2030 are treated,
// under three assumptions about net revenue per patient per year after rebates:
// bear 1,000, base 2,000, bull 4,000 USD. Market = share × 1,130 million × price.
const PENETRATION_DATA = [
  { pen: "1%", bear: 11, base: 23, bull: 45 },
  { pen: "5%", bear: 57, base: 113, bull: 226 },
  { pen: "10%", bear: 113, base: 226, bull: 452 },
  { pen: "15%", bear: 170, base: 339, bull: 678 },
  { pen: "20%", bear: 226, base: 452, bull: 904 },
];

// ─── sub-components ──────────────────────────────────────────────────────────
function KPI({
  value,
  label,
  highlight,
  tone = "blue",
}: {
  value: string;
  label: string;
  highlight?: boolean;
  tone?: "blue" | "red" | "green";
}) {
  const toneClasses = {
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800", text: "text-blue-600 dark:text-blue-400" },
    red: { bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400" },
    green: { bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400" },
  };
  const t = toneClasses[tone];
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 text-center ${highlight ? t.bg : "bg-white dark:bg-[#19191f] border-gray-100 dark:border-gray-800"}`}>
      <p className={`text-lg sm:text-xl font-bold tabular-nums ${highlight ? t.text : "text-gray-900 dark:text-white"}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 leading-tight">{label}</p>
    </div>
  );
}

const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// ISO "YYYY-MM-DD" -> "mmm yy" (English)
const formatStockDate = (iso: string): string => {
  const [y, m] = iso.split("-");
  return `${EN_MONTHS[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
      {n}. {title}
    </h2>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────
const ObesityMarketAnalysisPageEn: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackPageView(`/analyse/${SLUG}`, "obesity market analysis");
    fetch(`${HOST}/stats/visit/obesity-analysis/`).catch(() => {});
  }, []);

  return (
    <PageTemplate>
      <title>The obesity drug market: how big is it, and how fast is it growing? | Zirium</title>
      <meta
        name="description"
        content="WHO: over 890 million adults live with obesity. Analysts see a USD 95-105 billion obesity drug market in 2030. We unpack the numbers and the Novo Nordisk vs Eli Lilly duopoly."
      />
      <link rel="canonical" href={`https://www.zirium.dk/analyse/${SLUG}`} />
      <meta property="og:title" content="The obesity drug market: how big is it, and how fast is it growing?" />
      <meta property="og:description" content="890 million adults with obesity (WHO). A market estimated at USD 95-105 billion in 2030. Novo Nordisk vs Eli Lilly: who wins the race?" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`https://www.zirium.dk/analyse/${SLUG}`} />
      <meta property="og:image" content="https://www.zirium.dk/og-images/novo-2026-06-04-en.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="The obesity drug market: how big is it, and how fast is it growing?" />
      <meta name="twitter:description" content="890 million adults with obesity (WHO). A market estimated at USD 95-105 billion in 2030. Novo Nordisk vs Eli Lilly." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/novo-2026-06-04-en.png" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "The obesity drug market: how big is it, and how fast is it growing?",
        "description": "WHO: over 890 million adults live with obesity. Analysts see a USD 95-105 billion obesity drug market in 2030. Novo Nordisk vs Eli Lilly.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-06-04",
        "dateModified": "2026-06-04",
        "image": "https://www.zirium.dk/og-images/novo-2026-06-04-en.png",
        "mainEntityOfPage": `https://www.zirium.dk/analyse/${SLUG}`,
        "inLanguage": "en",
      })}</script>

      <article className="w-full max-w-[900px] mx-auto px-5 sm:px-8 pb-10 sm:pb-16">
        <button
          className="text-blue-600 hover:text-blue-700 bg-transparent border-none text-base inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm min-h-[44px] min-w-[44px]"
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
            Analysis by Araz Bayat Makoo (Zirium) - June 4, 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            The obesity drug market: how big is it, and how fast is it growing?
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Novo Nordisk vs Eli Lilly in the GLP-1 race
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Obesity drugs (GLP-1-based treatments such as Wegovy and Zepbound) have
            become one of the fastest-growing areas in the entire pharmaceutical
            industry. For a Danish investor it is especially relevant: Novo Nordisk
            has for years been Denmark's largest company, and the whole Danish stock
            market is affected by how the race develops.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            This analysis draws a sharp line between three kinds of figures: official
            health data from the WHO, official sales figures from the companies'
            annual reports, and analyst estimates for the market's future size. The
            first two are facts. The third is informed guesswork that is continuously
            revised, and it is made clear which figures are which.
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="890 million" label="adults with obesity in 2022 (WHO)" highlight tone="blue" />
          <KPI value="~USD 95-105bn" label="estimated market in 2030" highlight tone="green" />
          <KPI value="DKK 87bn" label="Zepbound sales 2025 (Lilly, conv.)" />
          <KPI value="DKK 79bn" label="Wegovy sales 2025 (Novo)" />
        </div>

        {/* Section 1: The patient base */}
        <section className="mb-12">
          <SectionHeader n={1} title="The patient base: Large and growing fast" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The clinical opportunity is enormous and still growing. According to the
            WHO, over 890 million adults were living with obesity in 2022, equal to
            about 16% of all adults worldwide. A further 2.5 billion adults were
            overweight, and the prevalence of obesity has more than doubled between
            1990 and 2022. The figures are high among children too: 160 million
            children and adolescents (aged 5 to 19) were living with obesity in 2022.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            But what matters for a market is not only the level but the direction.
            In the World Obesity Atlas 2025, the World Obesity Federation projects
            that the number of adults with obesity rises from 524 million in 2010 to
            about 1.13 billion in 2030, that is more than a doubling over twenty
            years. Looking further out, the earlier World Obesity Atlas 2023
            estimated that over 1.5 billion adults will live with obesity in 2035,
            that 51% of the world's population (more than 4 billion people) will be
            overweight or obese, and that the total economic cost reaches about
            USD 4.3 trillion a year, equivalent to roughly 3% of global GDP.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The US is the most important single market for obesity drugs, and here
            the prevalence is even higher: 40.3% of American adults had obesity and
            9.7% severe obesity (CDC/NCHS, NHANES August 2021-August 2023), and 21.1%
            of children and adolescents (aged 2-19). That is a big part of why US
            pricing and reimbursement policy is so decisive for how large the market
            actually becomes.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Chart: Number of adults worldwide living with obesity, 2010, 2022 and 2030, where 2030 is a projection">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Adults living with obesity (world)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Million adults. 2010 and 2022 actual figures; 2030 is a projection. Sources: World Obesity Atlas 2025 (2010, 2030) and WHO (2022).</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={OBESITY_TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 1300]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, _n, p) => [`${v} million`, (p?.payload as { projected?: boolean })?.projected ? "Projection" : "Actual"]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  content={() => (
                    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-gray-700 dark:text-gray-300">
                      {[
                        { label: "Actual", color: "#14b8a6" },
                        { label: "Projection 2030 (World Obesity Atlas 2025)", color: "#6ee7b7" },
                      ].map((item) => (
                        <li key={item.label} className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  )}
                />
                <Bar dataKey="millions" name="Adults with obesity" radius={[4, 4, 0, 0]}>
                  {OBESITY_TREND_DATA.map((d) => (
                    <Cell key={d.year} fill={d.projected ? "#6ee7b7" : "#14b8a6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
            Note: the WHO distinguishes between overweight (BMI 25 or above) and
            obesity (BMI 30 or above). The figures for a growing patient base are not
            the same as the market for drugs: how large a share of this population is
            actually treated and stays on medication depends on price, insurance and
            reimbursement coverage, and drop-off along the way. That uncertainty is
            exactly what the whole investment debate is about.
          </p>
        </section>

        {/* Section 2: Market size and growth */}
        <section className="mb-12">
          <SectionHeader n={2} title="Market size and growth (analyst estimates)" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            There is no single official figure for the market's size, so the usual
            references are the investment banks. What is interesting is that they have
            lowered their expectations, and that is itself part of the story. Goldman
            Sachs now sees a market of about USD 95 billion (around DKK 610 billion)
            in 2030, down from an earlier estimate of USD 130 billion. Morgan Stanley
            sees about USD 105 billion (around DKK 675 billion) in 2030, with a bull
            case as high as USD 144 billion, and a combined market for obesity and
            type 2 diabetes of about USD 190 billion in 2035.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Chart: Analyst estimates for the obesity drug market in 2030">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Market estimates for 2030 (USD billion)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Analyst estimates, not official figures. Sources: Goldman Sachs, Morgan Stanley.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={FORECAST_2030_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 160]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `USD ${v} billion`}
                />
                <Bar dataKey="value" name="Estimate" radius={[4, 4, 0, 0]}>
                  {FORECAST_2030_DATA.map((d) => (
                    <Cell key={d.label} fill={d.tone === "muted" ? "#cbd5e1" : d.tone === "bull" ? "#6ee7b7" : "#14b8a6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The range (from about USD 95 to 144 billion in 2030) reflects genuine
            disagreement about price pressure, how fast oral pills spread, and US
            reimbursement (especially Medicare coverage). That Goldman has cut its
            number is the key point: the thesis is that the market is huge, but
            perhaps smaller and more price-competitive than the 2023 hype suggested.
            Goldman expects oral pills alone to take about 24% of the market in 2030.
          </p>
        </section>

        {/* Section 3: The duopoly */}
        <section className="mb-12">
          <SectionHeader n={3} title="The duopoly: Novo Nordisk vs Eli Lilly (official accounts)" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The market is effectively a duopoly today. Two companies account for the
            vast majority of sales, and their latest annual reports (for 2025) paint a
            clear picture of where the momentum lies.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Chart: Sales of the four largest GLP-1 products in 2025">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">2025 sales, four largest products (DKK billion)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Green = Eli Lilly, blue = Novo Nordisk. Novo as reported; Lilly converted from USD at about DKK 6.41 per USD.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={SALES_2025_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="drug" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 160]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, _n, p) => [`DKK ${Number(v).toFixed(0)} billion`, (p?.payload as { company?: string })?.company ?? ""]}
                />
                <Bar dataKey="dkk" name="Sales" radius={[4, 4, 0, 0]}>
                  {SALES_2025_DATA.map((d) => (
                    <Cell key={d.drug} fill={d.company === "Lilly" ? "#10b981" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            An important clarification for the chart: two of the four products are
            strictly speaking diabetes drugs, not obesity drugs. Ozempic and Mounjaro
            are approved and marketed for type 2 diabetes, while Wegovy and Zepbound
            are the approved obesity versions. But they are exactly the same
            molecules: Ozempic and Wegovy are both semaglutide, and Mounjaro and
            Zepbound are both tirzepatide, just in different doses and under different
            names. In practice the line is blurred, because Ozempic in particular is
            widely used "off-label" for weight loss. It therefore makes sense to look
            at the whole incretin franchise (the GLP-1-based drugs), the diabetes
            brands included, when assessing the obesity race, as long as one remembers
            that part of the sales is formally diabetes treatment.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-6">Novo Nordisk (FY2025)</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Novo's semaglutide franchise covers both diabetes (Ozempic) and obesity
            (Wegovy). In 2025, obesity care sales (Wegovy and Saxenda) grew to
            DKK 82.3 billion, an increase of 31% at constant exchange rates, of which
            Wegovy alone accounted for DKK 79.1 billion. Ozempic remained the largest
            single product at DKK 127.1 billion. Total revenue reached about
            DKK 309 billion. The important signal, though, is Novo's expectations for
            2026: the company guides for a decline in sales and operating profit of
            5-13% at constant exchange rates, driven by lower realized prices, the US
            "Most Favoured Nations" agreement, semaglutide patent expiry in certain
            markets, and intensifying competition.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-6">Eli Lilly (FY2025)</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Lilly's tirzepatide franchise (Mounjaro for diabetes, Zepbound for
            obesity) is the fastest-growing and is taking market share. In 2025 total
            revenue reached about DKK 418 billion (USD 65.2 billion), of which
            Mounjaro accounted for about DKK 147 billion (USD 23.0 billion) and
            Zepbound for about DKK 87 billion (USD 13.5 billion). Together the two
            products made up about 56% of Lilly's entire revenue. Where Novo guides
            down for 2026, Lilly guides up to about DKK 515-530 billion (USD 80-83
            billion). That is the central signal right now.
          </p>
        </section>

        {/* Section 4: What the growth means for Novo and Lilly */}
        <section className="mb-12">
          <SectionHeader n={4} title="What does rising obesity mean for Novo and Lilly?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Here is the simplest way to see it. Even though Novo and Lilly together
            sold obesity drugs (Wegovy and Zepbound) for about USD 25 billion in 2025,
            that is still a small part of the patient base, and use is heavily
            concentrated in the US. KFF finds that about 1 in 8 American adults (about
            12%) currently take a GLP-1 drug, and RAND finds a similar order of
            magnitude for those who have ever used one; prescription-based estimates
            are lower. That is a large number in a single country: 12% of about 260
            million American adults equals around 31 million. Measured against the
            more than 1 billion adults with obesity worldwide, it is still only a low
            single-digit percentage that is in treatment. With 1.13 billion adults
            with obesity in 2030, it is the untreated share that defines the
            opportunity.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The chart translates that into dollar figures with three price scenarios. The
            decisive unknown is net revenue per patient per year after rebates, and it
            varies enormously by geography: in the US the list price is about USD
            13,000-16,000 (though Novo is cutting US list prices by about 50% to
            around USD 8,100 a year from January 2027), but the net price is far lower
            (cash price for Wegovy about USD 4,200, Medicare-negotiated about USD
            2,900), lower still in Europe, and minimal in emerging markets. We
            therefore use three globally blended levels: bear 1,000, base 2,000 and
            bull 4,000 USD per patient per year. This is not a forecast, but an order
            of magnitude that makes the sensitivity clear.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Chart: Market size at rising treatment rates of adults with obesity in 2030 under three price scenarios">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">The market at rising treatment rates in 2030 (USD billion)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Illustrative: share of 1.13 billion adults with obesity × net per patient per year (bear USD 1,000 / base USD 2,000 / bull USD 4,000). Not a forecast.</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={PENETRATION_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="pen" tick={{ fontSize: 12, fill: "#6b7280" }} label={{ value: "Treatment rate", position: "insideBottom", offset: -2, fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 950]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `USD ${v} billion`}
                />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: "Analyst estimate 2030 (~100)", position: "insideTopRight", fontSize: 10, fill: "#6b7280" }} />
                <Line type="monotone" dataKey="bull" name="Bull (USD 4,000)" stroke="#0d9488" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="base" name="Base (USD 2,000)" stroke="#14b8a6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bear" name="Bear (USD 1,000)" stroke="#6ee7b7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Two things stand out. First: the banks' estimate of about USD 95-105
            billion in 2030 corresponds, in the base scenario, to only about 5% of
            adults with obesity being treated (or about 9% in the bear scenario). So
            even the "huge" market number assumes that the vast majority are still
            left out. Second: the sensitivity is severe. In the base scenario the
            market grows from about USD 113 billion at 5% treatment to USD 452 billion
            at 20%, and the full range spans from under USD 60 billion (bear, 5%) to
            over USD 900 billion (bull, 20%).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            That leads to the real point for Novo and Lilly. The most important
            variable is not whether the market grows, but who ends up holding the
            share, and at what net price. That is exactly why the next sections are
            about the factors that decide it: first price and persistence, then patent
            protection and copy competition, which together can lift or dampen the
            entire range above, and finally the momentum shift between the two
            companies.
          </p>
        </section>

        {/* Section 5: Price, payer and persistence */}
        <section className="mb-12">
          <SectionHeader n={5} title="The two wild cards: price and persistence" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The model above makes it clear that the biggest question is not whether
            people want the drug, but who will pay for it. In the US, employers are
            already struggling with the GLP-1 bill, the PBMs (the large purchasing
            intermediaries) are pushing net prices down, and regulators will almost
            certainly try to lower them further. In 2025 Novo cut its US GLP-1 prices
            by up to about 75%. If the net price per patient falls faster than the
            number of patients rises, the market can grow in patient numbers without
            revenue exploding to the same degree. This is in practice a key reason why Goldman
            cut its estimate from 130 to 95 billion USD. On top of that, the
            reimbursable population is often narrower than the patient base: reimbursement and
            indications typically depend on BMI thresholds (often obesity with BMI
            30+, or BMI 27+ with comorbidities), so the covered market is smaller than
            the raw figures for overweight (BMI 25+).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The other wild card is persistence. In clinical trials over 80% stay on
            treatment, but in the real world a large share stop much faster: several
            studies find that 40-50% have stopped within a year (a Danish population
            study found 52%), often because of side effects, price, or lost insurance
            coverage. It is, however, heading in the right direction: pharmacy data
            show that 63% of those who started on Wegovy or Zepbound in 2024 were
            still in treatment after a year, up from 40% in the 2023 cohort. The
            difference between "peak patients" (everyone who ever starts) and actively
            retained patients determines the real lifetime value, and thus how high
            and how durable the peak in sales becomes. It is one of the most
            underappreciated uncertainties in the entire sector.
          </p>
        </section>

        {/* Section 6: Patent expiry, copies and concentration */}
        <section className="mb-12">
          <SectionHeader n={6} title="Patent expiry, copies and concentration" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            A market worth several hundred billion inevitably attracts competition,
            and here the difference between the two companies is large. It is not
            enough to look at who sells the most today; you have to look at how long
            they can protect it.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <KPI value="from 2026" label="Semaglutide (Novo): patent expiry begins in several markets" highlight tone="red" />
            <KPI value="~2036-2041" label="Tirzepatide (Lilly): core and formulation patents" highlight tone="green" />
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            <strong>Patent expiry.</strong> Novo's semaglutide is already losing
            exclusivity in 2026 in a number of large markets: Canada (January), China,
            India and Brazil (March), where, among other things, 17 Chinese generic
            candidates are in phase 3. In the EU the protection holds to around
            2031-2032 and in the US to around 2032-2033. Lilly's tirzepatide, by
            contrast, is covered by a core patent to 2036 and formulation patents that
            can extend exclusivity to 2039-2041. In other words: Novo's most important
            molecule begins to come off patent about 5-10 years before Lilly's. That
            is a structural difference, not a sentiment-based one.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            <strong>Copies and compounders.</strong> While there was an official
            shortage in the US (2022-2024), pharmacies were legally allowed to make
            "compounded" copies of both semaglutide and tirzepatide, and a large grey
            market grew up via telemedicine. The FDA declared the shortage over
            (tirzepatide October 2024, semaglutide February 2025), and the transition
            deadlines expired in spring 2025, so large-scale compounding is no longer
            permitted. Even so, Novo still pointed to "persistent use of compounded
            GLP-1" as a key reason for its downgrade, so the leakage has not
            disappeared. On top of that come genuine generics in the markets where the
            semaglutide patent has already expired.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Concentration.</strong> Finally, it is worth remembering that
            Lilly is not a pure obesity stock. Incretin (Mounjaro and Zepbound) made
            up about 56% of revenue in 2025; the rest is broadly spread across oncology
            (Verzenio), immunology (Taltz), diabetes (Jardiance) and Alzheimer's
            (Kisunla/donanemab). Novo is far more concentrated: semaglutide alone
            (Ozempic, Wegovy, Rybelsus) is about three quarters (around 74%) of group
            revenue. That means the patent and copy risk above hits Novo harder, while
            Lilly has a broader base to stand on. It adds nuance to the momentum
            picture: Lilly leads not only on growth, but also on durability and diversification.
          </p>
        </section>

        {/* Section 7: The momentum shift */}
        <section className="mb-12">
          <SectionHeader n={7} title="The momentum shift" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <KPI value="≈DKK 515-530bn" label="Eli Lilly: 2026 guidance (USD 80-83 billion)" highlight tone="green" />
            <KPI value="-5 to -13%" label="Novo Nordisk: 2026 sales guidance (CER)" highlight tone="red" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The direct comparison is striking. Lilly's obesity product Zepbound sold
            for about DKK 87 billion (USD 13.5 billion) in 2025 against Novo's Wegovy
            at DKK 79.1 billion. At franchise level Lilly sold tirzepatide for about
            DKK 234 billion (USD 36.5 billion) against Novo's entire semaglutide
            franchise of about DKK 228 billion (Ozempic, Wegovy and Rybelsus), and
            Lilly grew at triple-digit quarterly rates while Novo cut its guidance.
            Since the GLP-1 boom accelerated in 2023, it is now Lilly rather than Novo
            that drives the narrative.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            That does not mean Novo is about to lose. The market looks set to be too
            large for a "winner-takes-all" dynamic, and Novo still has significant
            strengths: enormous manufacturing capacity after years of multibillion-kroner
            investments in plants in Denmark, the US, France, China and Brazil, a
            deeply embedded international distribution, decades of experience with
            chronic diabetes and GLP-1 markets, and probably greater price resilience
            outside the US, where prices are already lower. Even at a lower market
            share, Novo can remain one of the world's most profitable pharmaceutical
            companies. The point is not that Novo disappears, but that momentum right
            now lies with Lilly.
          </p>
        </section>

        {/* Section 8: The share prices */}
        <section className="mb-12">
          <SectionHeader n={8} title="The share prices: Novo vs Eli Lilly" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The same shift can be seen directly in the share prices. The chart shows
            the daily closing price for Novo Nordisk (NOVO B, in DKK) and Eli Lilly
            (LLY, in USD), both rebased to 100 at the start of 2023, so the two can be
            compared across currencies. It is the relative performance that counts,
            not the absolute price level.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Chart: Novo Nordisk and Eli Lilly share prices rebased to 100 from January 2023 to June 2026">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Novo Nordisk vs Eli Lilly (Jan 3, 2023 = 100)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Daily closing price, dividend-adjusted, local currency. Source: Yahoo Finance.</p>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={STOCK_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={formatStockDate}
                  minTickGap={48}
                />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 360]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => Number(v).toFixed(1)}
                  labelFormatter={(label) => formatStockDate(String(label))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="3 3" />
                <Line type="linear" dataKey="lilly" name="Eli Lilly" stroke="#10b981" strokeWidth={1.75} dot={false} />
                <Line type="linear" dataKey="novo" name="Novo Nordisk" stroke="#3b82f6" strokeWidth={1.75} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            The path falls into two phases. Up to mid-2024 the two moved together in a
            shared GLP-1 rally, and Novo peaked on June 25, 2024 (index 217, +117%).
            After that the paths diverged: Novo fell about 77% to its low in March
            2026 (index 50), while Lilly kept climbing. In total Novo ended about 39%
            lower, while Lilly rose about 204% (index 304).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            What is interesting is not the share price fall in itself, but why the
            multiples diverged. Lilly has traded on continual upgrades: rising
            estimates for Zepbound and Mounjaro have held or expanded the valuation,
            even at a high earnings level. Novo, by contrast, has gone through a
            de-rating, where the former growth premium was shaved off after
            disappointing CagriSema data, clear Zepbound competition, and a downgrade
            of growth. So it is both earnings and expectations, not just the share
            price, that have moved.
          </p>
        </section>

        {/* Section 9: The next battleground */}
        <section className="mb-12">
          <SectionHeader n={9} title="The next battleground: oral and next generation" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The market for weekly injections is maturing. The fight from 2026 onward
            is about two things: convenience (pills rather than needles) and the depth
            of the weight loss.
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed list-disc pl-6">
            <li>
              <strong>Oral GLP-1:</strong> Lilly's orforglipron launched in the US as
              Foundayo in April 2026 and opens a direct front against Novo's oral
              semaglutide (oral Wegovy). Goldman expects pills to make up about 24% of
              the market in 2030.
            </li>
            <li>
              <strong>Next generation of injectables:</strong> Lilly's retatrutide has
              in phase 2 shown weight loss of over 24%, a level approaching bariatric
              surgery, while Amgen's MariTide (monthly dosing) reached up to 20%.
            </li>
            <li>
              <strong>Novo's response:</strong> CagriSema (cagrilintide plus
              semaglutide) has disappointed relative to the market's high
              expectations, while amycretin is the more interesting next step as a
              single molecule.
            </li>
            <li>
              <strong>Challengers:</strong> Viking Therapeutics (VK2735), Pfizer (the
              amylin analog MET-233i) and Roche are the most credible players in the
              third wave. Beyond Novo there is also a Danish angle: Zealand Pharma is
              behind the amylin analog petrelintide, which Roche licensed in 2025 (up
              to USD 5.3 billion) and is now advancing toward phase 3, and Gubra is
              behind GUBamy, out-licensed to AbbVie (up to about USD 2.2 billion) and
              currently in phase 1.
            </li>
          </ul>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            That leads to a more fundamental discussion: some argue that obesity drugs
            are on their way to becoming a <em>consumer product</em> rather than a
            classic prescription medicine. The logic is that a pill removes the needle
            barrier, and that sales increasingly bypass insurance via self-pay
            channels and telemedicine: Lilly's LillyDirect reached over 1 million
            patients in 2025, its oral Foundayo is sold for cash at about USD 150-350 a
            month, and Novo routes much of the demand for oral Wegovy through its own
            NovoCare pharmacy. If the model really becomes "self-pay online," it
            potentially expands the market far beyond the insured part (cf. the
            penetration chart), but it also moves competition onto consumer price and
            brand, more like supplements or cosmetics than hospital medicine. Others
            warn that these are real drugs with real side effects, and that a pure
            consumer logic underestimates the clinical follow-up. Either way, it is a
            development that could change both the size of the market and the margin
            structure significantly.
          </p>
        </section>

        {/* Section 10: Conclusion */}
        <section className="mb-12">
          <SectionHeader n={10} title="Conclusion" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            The patient base is massive and growing: over 890 million adults with
            obesity in 2022 according to the WHO, and the number is expected to rise
            to about 1.13 billion in 2030 (World Obesity Atlas 2025) and over 1.5
            billion in 2035 (Atlas 2023). The drug market itself can plausibly reach
            about USD 95-105 billion (around DKK 610-675 billion) in 2030 according to
            the major banks, but the estimates are being trimmed, not raised, on
            concerns about price, persistence, patent expiry and copycat drugs.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            It remains a Novo/Lilly duopoly, but momentum has for now clearly tipped
            toward Lilly (triple-digit quarterly growth, oral launch), while Novo cuts
            its guidance. The difference is not just sentiment: Lilly has longer patent
            protection on tirzepatide (~2036-2041) and a broader portfolio, while
            Novo's semaglutide begins to lose exclusivity as early as 2026 in several
            markets and makes up the vast majority of group revenue. That divergence,
            together with a credible third wave from Amgen, Viking, Pfizer and Roche
            (plus Danish Zealand and Gubra behind leading amylin assets), is the most
            important investment observation right now. The ultimate value, though,
            depends at least as much on price, persistence and patent protection as on
            who wins the most market share.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            For Danish investors the point matters: Novo Nordisk is no longer the
            undisputed leader in a market it helped create. That makes both the Novo
            share and the Danish market as a whole more sensitive to how the race
            develops over the next few years.
          </p>
        </section>

        {/* Feedback widget */}
        <FeedbackWidget pageType="analysis" pageId={SLUG} />

        {/* Related */}
        <RelatedAnalyses currentSlug={SLUG} />

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Sources:</strong> WHO "Obesity and overweight" fact sheet and
            World Obesity Atlas 2025 (2010/2030) and 2023 (2035, costs) (prevalence
            and projections); CDC / NCHS, NHANES August 2021-August 2023 (US); KFF and
            RAND (GLP-1 use); real-world persistence studies and pharmacy data
            (persistence); Novo Nordisk annual report 2025 and Eli Lilly Q4 2025
            earnings release (sales figures); Goldman Sachs Research and Morgan Stanley
            Research (market estimates); IQVIA (pipeline outlook); company releases
            from Zealand Pharma, Roche, Gubra and AbbVie (amylin pipeline and
            licensing deals); FDA and patent databases (patent expiry and compounding);
            share prices from Yahoo Finance.{" "}
            <strong>Disclaimer:</strong>{" "}
            This analysis is for informational purposes only and does not constitute
            investment advice. Market estimates are analysts' guesses, not official
            figures, and past performance is no guarantee of future results. Always do
            your own analysis and seek professional advice before trading.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  June 4, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default ObesityMarketAnalysisPageEn;
