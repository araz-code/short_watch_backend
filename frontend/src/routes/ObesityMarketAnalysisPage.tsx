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

const SLUG = "fedme/2026-05-31";

// ─── static data ────────────────────────────────────────────────────────────
// Voksne der lever med fedme, mio. på verdensplan. 2010 og 2030 fra World Obesity
// Atlas 2025 (2030 = fremskrivning); 2022 = faktisk tal fra WHO.
const OBESITY_TREND_DATA = [
  { year: "2010", millions: 524, projected: false },
  { year: "2022", millions: 890, projected: false },
  { year: "2030", millions: 1130, projected: true },
];

// Analytikerestimater for det globale fedmemedicin-marked i 2030 (mia. USD).
// IKKE officielle tal. Kilde: Goldman Sachs Research og Morgan Stanley Research.
const FORECAST_2030_DATA = [
  { label: "Goldman (tidl.)", value: 130, tone: "muted" },
  { label: "Goldman (nu)", value: 95, tone: "now" },
  { label: "Morgan Stanley", value: 105, tone: "now" },
  { label: "MS bull-case", value: 144, tone: "bull" },
];

// Salg 2025 (mia. DKK). Novo som rapporteret i DKK; Lilly omregnet fra USD
// ved ca. 6,41 DKK pr. USD (ultimo maj 2026). Kilder: selskabernes årsregnskaber.
const SALES_2025_DATA = [
  { drug: "Mounjaro", company: "Lilly", dkk: 147 },
  { drug: "Ozempic", company: "Novo", dkk: 127 },
  { drug: "Zepbound", company: "Lilly", dkk: 87 },
  { drug: "Wegovy", company: "Novo", dkk: 79 },
];

// Illustrativ scenarie-beregning (IKKE en prognose): markedsstørrelse (mia. USD)
// hvis en given andel af de ca. 1,13 mia. svært overvægtige voksne i 2030 behandles,
// ved tre antagelser om netto-omsætning pr. patient pr. år efter rabatter:
// bear 1.000, base 2.000, bull 4.000 USD. Marked = andel × 1.130 mio. × pris.
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

const DA_MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
// ISO "YYYY-MM-DD" -> "mmm yy" (dansk)
const formatStockDate = (iso: string): string => {
  const [y, m] = iso.split("-");
  return `${DA_MONTHS[parseInt(m, 10) - 1]} ${y.slice(2)}`;
};

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
      {n}. {title}
    </h2>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────
const ObesityMarketAnalysisPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackPageView(`/analyse/${SLUG}`, "fedmemarked analyse");
    fetch(`${HOST}/stats/visit/obesity-analysis/`).catch(() => {});
  }, []);

  return (
    <PageTemplate>
      <title>Fedmemedicin: Hvor stort er markedet, og hvor hurtigt vokser det? | Zirium</title>
      <meta
        name="description"
        content="WHO: over 890 mio. voksne lever med fedme. Analytikere ser et fedmemedicin-marked på 95-105 mia. USD i 2030. Vi gennemgår tallene og duopolet mellem Novo Nordisk og Eli Lilly."
      />
      <meta property="og:title" content="Fedmemedicin: Hvor stort er markedet, og hvor hurtigt vokser det?" />
      <meta property="og:description" content="890 mio. voksne med fedme (WHO). Et marked estimeret til 95-105 mia. USD i 2030. Novo Nordisk vs Eli Lilly: Hvem vinder kapløbet?" />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={`https://www.zirium.dk/analyse/${SLUG}`} />
      <meta property="og:image" content="https://www.zirium.dk/og-images/fedme-2026-05-31.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Fedmemedicin: Hvor stort er markedet, og hvor hurtigt vokser det?" />
      <meta name="twitter:description" content="890 mio. voksne med fedme (WHO). Et marked estimeret til 95-105 mia. USD i 2030. Novo Nordisk vs Eli Lilly." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/fedme-2026-05-31.png" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Fedmemedicin: Hvor stort er markedet, og hvor hurtigt vokser det?",
        "description": "WHO: over 890 mio. voksne lever med fedme. Analytikere ser et fedmemedicin-marked på 95-105 mia. USD i 2030. Novo Nordisk vs Eli Lilly.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-31",
        "mainEntityOfPage": `https://www.zirium.dk/analyse/${SLUG}`,
        "inLanguage": "da",
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
          Tilbage
        </button>

        {/* Header */}
        <header className="mb-10 mt-4">
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">
            Analyse lavet af Araz Bayat Makoo (Zirium) - 31. maj 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Fedmemedicin: Hvor stort er markedet, og hvor hurtigt vokser det?
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Novo Nordisk vs Eli Lilly i kapløbet om GLP-1
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Fedmemedicin (GLP-1-baserede behandlinger som Wegovy og Zepbound) er
            blevet et af de hurtigst voksende områder i hele lægemiddelindustrien.
            For en dansk investor er det ekstra relevant: Novo Nordisk har i årevis
            været Danmarks største selskab, og hele det danske aktiemarked påvirkes
            af, hvordan kapløbet udvikler sig.
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Denne analyse adskiller skarpt mellem tre slags tal: Officielle
            sundhedsdata fra WHO, officielle salgstal fra selskabernes
            årsregnskaber, og analytikerestimater for markedets fremtidige
            størrelse. De to første er fakta. Det tredje er kvalificerede gæt, der
            løbende bliver justeret, og det fremgår tydeligt hvilke tal der er hvad.
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="890 mio." label="voksne med fedme i 2022 (WHO)" highlight tone="blue" />
          <KPI value="~95-105 mia. USD" label="estimeret marked i 2030" highlight tone="green" />
          <KPI value="87 mia. DKK" label="Zepbound-salg 2025 (Lilly, omr.)" />
          <KPI value="79 mia. DKK" label="Wegovy-salg 2025 (Novo)" />
        </div>

        {/* Section 1: Patientgrundlaget */}
        <section className="mb-12">
          <SectionHeader n={1} title="Patientgrundlaget: stort og hastigt voksende" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den kliniske mulighed er enorm og stadig voksende. Ifølge WHO levede
            over 890 mio. voksne med fedme i 2022, svarende til cirka 16% af alle
            voksne på verdensplan. Yderligere 2,5 mia. voksne var overvægtige, og
            forekomsten af fedme er mere end fordoblet mellem 1990 og 2022. Også
            blandt børn er tallene høje: 160 mio. børn og unge (5 til 19 år) levede
            med fedme i 2022.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det vigtige for et marked er dog ikke kun niveauet, men retningen. World
            Obesity Federation fremskriver i World Obesity Atlas 2025, at antallet
            af voksne med fedme stiger fra 524 mio. i 2010 til cirka 1,13 mia. i
            2030, altså mere end en fordobling på tyve år. Ser man længere frem,
            anslog den tidligere World Obesity Atlas 2023, at over 1,5 mia. voksne
            vil leve med fedme i 2035, at 51% af jordens befolkning (mere end 4 mia.
            mennesker) vil være overvægtige eller svært overvægtige, og at de
            samlede økonomiske omkostninger når cirka 4,3 billioner USD årligt,
            svarende til omtrent 3% af det globale BNP.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            USA er det vigtigste enkeltmarked for fedmemedicin, og her er
            forekomsten endnu højere: 40,3% af voksne amerikanere havde fedme og
            9,7% svær fedme (CDC/NCHS, NHANES august 2021-august 2023), og 21,1% af
            børn og unge (2-19 år). Det er en stor del af forklaringen på, at netop amerikansk
            pris- og tilskudspolitik er så afgørende for, hvor stort markedet reelt
            bliver.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Graf: Antal voksne på verdensplan der lever med fedme, 2010, 2022 og 2030, hvor 2030 er en fremskrivning">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Voksne der lever med fedme (verden)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Mio. voksne. 2010 og 2022 faktiske tal; 2030 er en fremskrivning. Kilder: World Obesity Atlas 2025 (2010, 2030) og WHO (2022).</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={OBESITY_TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 1300]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, _n, p) => [`${v} mio.`, (p?.payload as { projected?: boolean })?.projected ? "Fremskrivning" : "Faktisk"]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  content={() => (
                    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-gray-700 dark:text-gray-300">
                      {[
                        { label: "Faktisk", color: "#14b8a6" },
                        { label: "Fremskrivning 2030 (World Obesity Atlas 2025)", color: "#6ee7b7" },
                      ].map((item) => (
                        <li key={item.label} className="flex items-center gap-1.5">
                          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  )}
                />
                <Bar dataKey="millions" name="Voksne med fedme" radius={[4, 4, 0, 0]}>
                  {OBESITY_TREND_DATA.map((d) => (
                    <Cell key={d.year} fill={d.projected ? "#6ee7b7" : "#14b8a6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
            Note: WHO skelner mellem overvægt (BMI 25 eller derover) og fedme
            (BMI 30 eller derover). Tallene for et voksende patientgrundlag er ikke
            det samme som markedet for medicin: Hvor stor en del af denne population,
            der reelt bliver behandlet og fastholdt på medicin, afhænger af pris,
            forsikrings- og tilskudsdækning samt frafald undervejs. Det er netop den
            usikkerhed, som hele investeringsdebatten handler om.
          </p>
        </section>

        {/* Section 2: Markedsstørrelse og vækst */}
        <section className="mb-12">
          <SectionHeader n={2} title="Markedsstørrelse og vækst (analytikerestimater)" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Der findes ikke ét officielt tal for markedets størrelse, så de
            sædvanlige referencer er investeringsbankerne. Det interessante er, at
            de har nedjusteret deres forventninger, og det er i sig selv en del af
            historien. Goldman Sachs ser nu et marked på cirka 95 mia. USD
            (ca. 610 mia. DKK) i 2030, ned fra et tidligere estimat på 130 mia. USD.
            Morgan Stanley ser cirka 105 mia. USD (ca. 675 mia. DKK) i 2030, med et
            bull-case helt op til 144 mia. USD, og et kombineret marked for fedme og
            type 2-diabetes på cirka 190 mia. USD i 2035.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Graf: Analytikerestimater for fedmemedicin-markedet i 2030">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Estimater for markedet i 2030 (mia. USD)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Analytikerestimater, ikke officielle tal. Kilder: Goldman Sachs, Morgan Stanley.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={FORECAST_2030_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 160]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `${v} mia. USD`}
                />
                <Bar dataKey="value" name="Estimat" radius={[4, 4, 0, 0]}>
                  {FORECAST_2030_DATA.map((d) => (
                    <Cell key={d.label} fill={d.tone === "muted" ? "#cbd5e1" : d.tone === "bull" ? "#6ee7b7" : "#14b8a6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Spændet (fra cirka 95 til 144 mia. USD i 2030) afspejler reel uenighed
            om priserosion, hvor hurtigt orale piller bliver udbredt, og om
            amerikansk tilskud (især Medicare-dækning). At Goldman har sænket sit
            tal er hovedpointen: Tesen er "kæmpe stort, men måske mindre og mere
            priskonkurrencepræget, end hypen i 2023 antydede". Goldman forventer,
            at orale piller alene tager cirka 24% af markedet i 2030.
          </p>
        </section>

        {/* Section 3: Duopolet */}
        <section className="mb-12">
          <SectionHeader n={3} title="Duopolet: Novo Nordisk vs Eli Lilly (officielle regnskaber)" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Markedet er i dag reelt et duopol. To selskaber står for langt
            størstedelen af salget, og deres seneste årsregnskaber (for 2025)
            tegner et tydeligt billede af, hvor momentum ligger.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Graf: Salg af de fire største GLP-1-produkter i 2025">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Salg 2025 for de fire største produkter (mia. DKK)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Grøn = Eli Lilly, blå = Novo Nordisk. Novo som rapporteret; Lilly omregnet fra USD ved ca. 6,41 DKK pr. USD.</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={SALES_2025_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="drug" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 160]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v, _n, p) => [`${Number(v).toFixed(0)} mia. DKK`, (p?.payload as { company?: string })?.company ?? ""]}
                />
                <Bar dataKey="dkk" name="Salg" radius={[4, 4, 0, 0]}>
                  {SALES_2025_DATA.map((d) => (
                    <Cell key={d.drug} fill={d.company === "Lilly" ? "#10b981" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            En vigtig afklaring til grafen: To af de fire produkter er strengt taget
            diabetes-lægemidler, ikke fedme-lægemidler. Ozempic og Mounjaro er
            godkendt og markedsført mod type 2-diabetes, mens Wegovy og Zepbound er
            de godkendte fedme-versioner. Men det er præcis de samme molekyler:
            Ozempic og Wegovy er begge semaglutid, og Mounjaro og Zepbound er begge
            tirzepatid, blot i forskellige doser og under forskellige navne. I
            praksis er skellet udvisket, fordi især Ozempic i vid udstrækning bruges
            "off-label" til vægttab. Derfor giver det mening at se på hele
            incretin-franchisen, diabetes-brandene inklusive, når man vurderer
            fedme-kapløbet, så længe man husker, at en del af salget formelt er
            diabetes-behandling.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-6">Novo Nordisk (FY2025)</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Novos semaglutid-franchise dækker både diabetes (Ozempic) og fedme
            (Wegovy). I 2025 voksede salget af fedmemedicin (Wegovy og Saxenda)
            til 82,3 mia. DKK, en stigning på 31% målt i faste valutakurser, hvoraf
            Wegovy alene stod for 79,1 mia. DKK. Ozempic var fortsat det største
            enkeltprodukt med 127,1 mia. DKK. Den samlede omsætning nåede cirka
            309 mia. DKK. Det vigtige signal er dog Novos forventninger til 2026:
            Selskabet guider et fald i salg og driftsresultat på 5-13% i faste
            valutakurser, drevet af lavere realiserede priser, den amerikanske
            "Most Favoured Nations"-aftale, patentudløb på semaglutid i visse
            markeder og skærpet konkurrence.
          </p>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-6">Eli Lilly (FY2025)</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Lillys tirzepatid-franchise (Mounjaro til diabetes, Zepbound til fedme)
            er den hurtigst voksende og tager markedsandele. I 2025 nåede den
            samlede omsætning ca. 418 mia. DKK (65,2 mia. USD), hvoraf Mounjaro stod
            for ca. 147 mia. DKK (23,0 mia. USD) og Zepbound for ca. 87 mia. DKK
            (13,5 mia. USD). Tilsammen udgjorde de to produkter cirka 56% af hele
            Lillys omsætning. Hvor Novo guider ned for 2026, guider Lilly op til
            ca. 515-530 mia. DKK (80-83 mia. USD). Det er det centrale signal lige nu.
          </p>
        </section>

        {/* Section 4: Hvad væksten betyder for Novo og Lilly */}
        <section className="mb-12">
          <SectionHeader n={4} title="Hvad betyder den voksende fedme for Novo og Lilly?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Her er den enkleste måde at se det på. Selv om Novo og Lilly i 2025
            tilsammen solgte fedmemedicin (Wegovy og Zepbound) for cirka 25 mia. USD,
            er det stadig en lille del af patientgrundlaget, og brugen er stærkt
            koncentreret i USA. Spørgeskemaundersøgelser fra KFF og RAND finder, at
            omkring 1 ud af 8 voksne amerikanere (cirka 12%) aktuelt tager et
            GLP-1-middel, mens receptbaserede opgørelser ligger lavere; uanset metode
            er det et tocifret millionantal i ét enkelt land. Målt mod de over 1 mia.
            svært overvægtige på verdensplan er det fortsat kun en lav encifret
            procentdel, der er i behandling. Med 1,13 mia. svært overvægtige voksne i
            2030 er det den ubehandlede del, der definerer mulighederne.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Grafen oversætter det til kroner og ører med tre prisscenarier. Den
            afgørende ukendte er netto-omsætningen pr. patient pr. år efter rabatter,
            og den varierer enormt geografisk: I USA er listeprisen cirka 13.000-16.000
            USD, men nettoprisen langt lavere (kontantpris for Wegovy cirka 4.200
            USD, Medicare-forhandlet cirka 2.900 USD), i Europa lavere endnu, og i
            emerging markets minimal. Derfor regner vi med tre globalt blandede
            niveauer: bear 1.000, base 2.000 og bull 4.000 USD pr. patient pr. år.
            Det er ikke en prognose, men en størrelsesorden, der gør følsomheden
            tydelig.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Graf: Markedsstørrelse ved stigende behandlingsgrad af de svært overvægtige i 2030 under tre prisscenarier">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Markedet ved stigende behandlingsgrad i 2030 (mia. USD)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Illustrativ: andel af 1,13 mia. svært overvægtige × netto pr. patient pr. år (bear 1.000 / base 2.000 / bull 4.000 USD). Ikke en prognose.</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={PENETRATION_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} />
                <XAxis dataKey="pen" tick={{ fontSize: 12, fill: "#6b7280" }} label={{ value: "Behandlingsgrad", position: "insideBottom", offset: -2, fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[0, 950]} tickFormatter={(v) => `${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => `${v} mia. USD`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={100} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: "Analytikerestimat 2030 (~100)", position: "insideTopRight", fontSize: 10, fill: "#6b7280" }} />
                <Line type="monotone" dataKey="bull" name="Bull (4.000 USD)" stroke="#0d9488" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="base" name="Base (2.000 USD)" stroke="#14b8a6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bear" name="Bear (1.000 USD)" stroke="#6ee7b7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            To ting springer i øjnene. For det første: Bankernes estimat på cirka
            95-105 mia. USD i 2030 svarer i base-scenariet kun til, at omkring 5% af
            de svært overvægtige behandles (eller cirka 9% i bear-scenariet). Selv
            det "kæmpe" markedstal forudsætter altså, at langt de fleste stadig står
            uden for. For det andet: Følsomheden er voldsom. I base-scenariet vokser
            markedet fra cirka 113 mia. USD ved 5% behandling til 452 mia. USD ved
            20%, og hele udfaldsrummet spænder fra under 60 mia. USD (bear, 5%) til
            over 900 mia. USD (bull, 20%).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det fører til den egentlige pointe for Novo og Lilly. Den vigtigste
            variabel er ikke, om markedet vokser, men hvem der ender med at sidde på
            andelen, og til hvilken nettopris. Netop derfor handler de næste afsnit
            om de faktorer, der afgør det: først pris og fastholdelse, dernæst
            patentbeskyttelse og kopikonkurrence, som tilsammen kan løfte eller dæmpe
            hele udfaldsrummet ovenfor, og til sidst selve momentum-skiftet mellem de
            to selskaber.
          </p>
        </section>

        {/* Section 5: Pris, betaler og fastholdelse */}
        <section className="mb-12">
          <SectionHeader n={5} title="De to jokere: pris og fastholdelse" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Modellen ovenfor gør det tydeligt, at det største spørgsmål ikke er, om
            folk vil have medicinen, men hvem der vil betale for den. I USA kæmper
            arbejdsgivere allerede med GLP-1-regningen, PBM'erne (de store
            indkøbsmellemled) presser nettopriserne, og myndighederne vil næsten
            sikkert forsøge at sænke dem yderligere. Novo skar i 2025 sine
            amerikanske GLP-1-priser med op til cirka 75%. Hvis nettoprisen pr. patient
            falder hurtigere, end antallet af patienter stiger, kan markedet vokse i
            mennesker uden at omsætningen eksploderer tilsvarende. Det er i praksis
            en hovedårsag til, at Goldman sænkede sit estimat fra 130 til 95 mia. USD.
            Dertil kommer, at den betalbare målgruppe ofte er smallere end forekomsten:
            Tilskud og indikationer afhænger typisk af BMI-grænser (ofte svær overvægt
            med BMI 30+, eller BMI 27+ med følgesygdomme), så det reimbursable marked
            er mindre end de rå tal for overvægt (BMI 25+).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Den anden joker er fastholdelse. I kliniske forsøg bliver over 80% på
            behandlingen, men i den virkelige verden stopper en stor del langt
            hurtigere: Flere studier finder, at 40-50% er holdt op inden for et år
            (et dansk befolkningsstudie fandt 52%), ofte på grund af bivirkninger,
            pris eller tabt forsikringsdækning. Det er dog på vej i den rigtige
            retning: Apoteksdata viser, at 63% af dem, der startede på Wegovy eller
            Zepbound i 2024, stadig var i behandling efter et år, op fra 40% i
            2023-årgangen. Forskellen mellem "peak patients" (alle, der nogensinde
            starter) og aktivt fastholdte patienter afgør den reelle livstidsværdi,
            og dermed hvor høj og holdbar toppen i salget bliver. Det er en af de mest
            undervurderede usikkerheder i hele sektoren.
          </p>
        </section>

        {/* Section 6: Patentudløb, kopier og koncentration */}
        <section className="mb-12">
          <SectionHeader n={6} title="Patentudløb, kopier og koncentration" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Et marked på flere hundrede milliarder tiltrækker uvægerligt
            konkurrence, og her er forskellen mellem de to selskaber stor. Det er
            ikke nok at kigge på, hvem der sælger mest i dag; man skal se på, hvor
            længe de kan beskytte det.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <KPI value="fra 2026" label="Semaglutid (Novo): patentudløb begynder i flere markeder" highlight tone="red" />
            <KPI value="~2036-2041" label="Tirzepatid (Lilly): kerne- og formuleringspatenter" highlight tone="green" />
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            <strong>Patentudløb.</strong> Novos semaglutid mister allerede
            eksklusivitet i 2026 i en række store markeder: Canada (januar), Kina,
            Indien og Brasilien (marts), hvor blandt andet 17 kinesiske generiske
            kandidater er i fase 3. I USA og EU holder beskyttelsen til omkring
            2031-2032. Lillys tirzepatid er derimod dækket af et kerne-patent til
            2036 og formuleringspatenter, der kan strække eksklusiviteten til
            2039-2041. Med andre ord: Novos vigtigste molekyle begynder at falde fri
            cirka 5-10 år før Lillys. Det er en strukturel, ikke en
            stemnings-baseret, forskel.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            <strong>Kopier og compounders.</strong> Mens der var officiel mangel i
            USA (2022-2024), måtte apoteker lovligt fremstille "compounded" kopier
            af både semaglutid og tirzepatid, og et stort gråt marked voksede frem
            via telemedicin. FDA erklærede manglen ophørt (tirzepatid oktober 2024,
            semaglutid februar 2025), og overgangsfristerne udløb i foråret 2025, så
            storskala-compounding ikke længere er tilladt. Alligevel pegede Novo
            fortsat på "vedvarende brug af compounded GLP-1" som en hovedårsag til
            sin nedjustering, så lækagen er ikke forsvundet. Oven i kommer ægte
            generika i de markeder, hvor semaglutid-patentet allerede er udløbet.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Koncentration.</strong> Endelig er det værd at huske, at Lilly
            ikke er en ren fedme-aktie. Incretin (Mounjaro og Zepbound) udgjorde
            cirka 56% af omsætningen i 2025; resten er bredt fordelt på kræft
            (Verzenio), immunologi (Taltz), diabetes (Jardiance) og Alzheimers
            (Kisunla/donanemab). Novo er langt mere koncentreret: Semaglutid alene
            (Ozempic, Wegovy, Rybelsus) er omkring tre fjerdedele (cirka 74%) af koncernens
            omsætning. Det betyder, at netop patent- og kopirisikoen ovenfor rammer
            Novo hårdere, mens Lilly har en bredere base at stå på. Det nuancerer
            momentum-billedet: Lilly fører ikke kun på vækst, men også på
            holdbarhed og spredning.
          </p>
        </section>

        {/* Section 7: Momentum-skiftet */}
        <section className="mb-12">
          <SectionHeader n={7} title="Momentum-skiftet" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <KPI value="≈515-530 mia. DKK" label="Eli Lilly: guidance 2026 (80-83 mia. USD)" highlight tone="green" />
            <KPI value="-5 til -13%" label="Novo Nordisk: salgs-guidance 2026 (CER)" highlight tone="red" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Den direkte sammenligning er slående. Lillys obesity-produkt Zepbound
            solgte i 2025 for ca. 87 mia. DKK (13,5 mia. USD) mod Novos Wegovy på
            79,1 mia. DKK. På franchise-niveau solgte Lilly tirzepatid for ca. 234
            mia. DKK (36,5 mia. USD) mod Novos samlede semaglutid-franchise på cirka
            228 mia. DKK (Ozempic, Wegovy og Rybelsus), og Lilly voksede med
            trecifrede vækstrater på kvartalsbasis, samtidig med at Novo nedjusterede.
            Siden GLP-1-boomet accelererede i 2023, er det nu Lilly snarere end Novo,
            der driver narrativet.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
            Det betyder ikke, at Novo er ved at tabe. Markedet bliver efter alt at
            dømme for stort til en "vinderen-tager-alt"-dynamik, og Novo har stadig
            betydelige styrker: Enorm produktionskapacitet efter års
            milliardinvesteringer i fabrikker i Danmark, USA, Frankrig, Kina og
            Brasilien, en dybt indarbejdet international distribution, årtiers erfaring
            med kroniske diabetes- og GLP-1-markeder, og formentlig større
            prisrobusthed uden for USA, hvor priserne i forvejen er lavere. Selv ved
            en lavere markedsandel kan Novo forblive et af verdens mest profitable
            lægemiddelselskaber. Pointen er ikke, at Novo forsvinder, men at
            initiativet lige nu ligger hos Lilly.
          </p>
        </section>

        {/* Section 8: Aktiekurserne */}
        <section className="mb-12">
          <SectionHeader n={8} title="Aktiekurserne: Novo vs Eli Lilly" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det samme skift kan ses direkte i aktiekurserne. Grafen viser daglig
            lukkekurs for Novo Nordisk (NOVO B, i DKK) og Eli Lilly (LLY, i USD),
            begge rebaseret til 100 ved årets start 2023, så de to kan sammenlignes
            på tværs af valuta. Det er den relative udvikling, der tæller, ikke det
            absolutte kursniveau.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5 mb-4" role="img" aria-label="Graf: Novo Nordisk og Eli Lilly aktiekurser rebaseret til 100 fra januar 2023 til maj 2026">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Novo Nordisk vs Eli Lilly (3. jan 2023 = 100)</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Daglig lukkekurs, udbyttejusteret, lokal valuta. Kilde: Yahoo Finance.</p>
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
            Forløbet falder i to faser. Frem til midten af 2024 fulgtes de to ad i en
            fælles GLP-1-optur, og Novo toppede 25. juni 2024 (indeks 217, +117%).
            Derefter skiltes vejene: Novo faldt cirka 77% til bunden i marts 2026
            (indeks 50), mens Lilly fortsatte op. Samlet endte Novo cirka 34% lavere,
            mens Lilly steg cirka 211% (indeks 311).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Det interessante er ikke kursfaldet i sig selv, men hvorfor multiplerne
            skiltes. Lilly har handlet på løbende opjusteringer: Stigende estimater
            for Zepbound og Mounjaro har holdt eller udvidet prisfastsættelsen, selv
            på et højt indtjeningsniveau. Novo har omvendt gennemgået en de-rating,
            hvor den tidligere vækstpræmie blev barberet væk efter skuffende
            CagriSema-data, tydelig Zepbound-konkurrence og en nedjustering af
            væksten. Det er altså både indtjening og forventninger, ikke bare kursen,
            der har bevæget sig.
          </p>
        </section>

        {/* Section 9: Næste slagmark */}
        <section className="mb-12">
          <SectionHeader n={9} title="Næste slagmark: orale og næste generation" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Markedet for ugentlige injektioner modnes. Kampen fra 2026 og frem
            handler om to ting: Bekvemmelighed (piller frem for sprøjter) og
            dybden af vægttabet.
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed list-disc pl-6">
            <li>
              <strong>Orale GLP-1:</strong> Lillys orforglipron blev lanceret i USA
              som Foundayo i april 2026 og åbner en direkte front mod Novos orale
              semaglutid (oral Wegovy). Goldman forventer, at piller udgør cirka
              24% af markedet i 2030.
            </li>
            <li>
              <strong>Næste generation af injektioner:</strong> Lillys retatrutide
              har i fase 2 vist vægttab på over 24%, et niveau der nærmer sig
              fedmekirurgi, mens Amgens MariTide (månedlig dosering) nåede op mod 20%.
            </li>
            <li>
              <strong>Novos svar:</strong> CagriSema (cagrilintid plus semaglutid)
              har skuffet i forhold til markedets høje forventninger, mens
              amycretin er det mere interessante næste skridt som ét molekyle.
            </li>
            <li>
              <strong>Udfordrere:</strong> Viking Therapeutics (VK2735), Pfizer
              (amylin-analogen MET-233i) og Roche er de mest troværdige aktører i
              den tredje bølge.
            </li>
          </ul>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            Det fører til en mere grundlæggende diskussion: Nogle argumenterer for,
            at fedmemedicin er på vej til at blive et <em>forbrugerprodukt</em> snarere
            end et klassisk receptpligtigt lægemiddel. Logikken er, at en pille
            fjerner sprøjte-barrieren, og at salget i stigende grad går uden om
            forsikring via selvbetalings-kanaler og telemedicin: Lillys LillyDirect
            nåede over 1 mio. patienter i 2025, dens orale Foundayo sælges kontant
            til cirka 150-350 USD om måneden, og Novo sender meget af efterspørgslen
            på oral Wegovy gennem sin egen NovoCare-apotek. Hvis modellen for alvor
            bliver "betal selv online", udvider det potentielt markedet langt ud over
            den forsikringsdækkede del (jf. penetrations-grafen), men det flytter også
            konkurrencen over på forbruger-pris og brand, mere som kosttilskud eller
            kosmetik end som hospitalsmedicin. Andre advarer om, at det er rigtige
            lægemidler med reelle bivirkninger, og at en ren forbruger-logik
            undervurderer den lægefaglige opfølgning. Uanset hvad er det en udvikling,
            der kan ændre både markedets størrelse og marginstrukturen markant.
          </p>
        </section>

        {/* Section 10: Konklusion */}
        <section className="mb-12">
          <SectionHeader n={10} title="Konklusion" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Patientgrundlaget er massivt og voksende: Over 890 mio. voksne med
            fedme i 2022 ifølge WHO, og tallet ventes at stige til cirka 1,13 mia. i
            2030 (World Obesity Atlas 2025) og over 1,5 mia. i 2035 (Atlas 2023).
            Selve medicin-markedet kan plausibelt nå cirka 95-105 mia. USD (ca. 610-675
            mia. DKK) i 2030 ifølge de store banker, men estimaterne bliver trimmet,
            ikke hævet, på grund af bekymringer om pris, fastholdelse, patentudløb og
            kopimedicin.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            Det er fortsat et Novo/Lilly-duopol, men momentum er for tiden klart
            tippet over mod Lilly (trecifret vækst, oral lancering), mens Novo
            nedjusterer sin guidance. Forskellen er ikke kun stemning: Lilly har
            længere patentbeskyttelse på tirzepatid (~2036-2041) og en bredere
            portefølje, mens Novos semaglutid begynder at miste eksklusivitet
            allerede i 2026 i flere markeder og udgør langt størstedelen af
            koncernens omsætning. Den divergens, sammen med en troværdig tredje bølge
            fra Amgen, Viking, Pfizer og Roche, er den vigtigste investeringsmæssige
            observation lige nu. Den endelige værdi afhænger dog mindst lige så meget
            af pris, fastholdelse og patentbeskyttelse som af, hvem der vinder mest
            markedsandel.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            For danske investorer er pointen vigtig: Novo Nordisk er ikke længere
            den uantastede leder i et marked, selskabet selv var med til at skabe.
            Det gør både Novo-aktien og det samlede danske marked mere følsomt over
            for, hvordan kapløbet udvikler sig de næste par år.
          </p>
        </section>

        {/* Feedback widget */}
        <FeedbackWidget pageType="analysis" pageId={SLUG} />

        {/* Related */}
        <RelatedAnalyses currentSlug={SLUG} />

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Kilder:</strong> WHO "Obesity and overweight" fact sheet samt
            World Obesity Atlas 2025 (2010/2030) og 2023 (2035, omkostninger)
            (forekomst og fremskrivninger); CDC / NCHS, NHANES august 2021-august 2023 (USA); KFF og
            RAND (GLP-1-anvendelse); real-world persistensstudier og apoteksdata
            (fastholdelse); Novo Nordisk årsrapport 2025 og Eli Lilly Q4 2025
            resultatmeddelelse (salgstal); Goldman Sachs Research og Morgan Stanley
            Research (markedsestimater); IQVIA (pipeline-udsigt); FDA og
            patentdatabaser (patentudløb og compounding); aktiekurser fra
            Yahoo Finance.{" "}
            <strong>Ansvarsfraskrivelse:</strong>{" "}
            Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Markedsestimater er analytikeres gæt, ikke
            officielle tal, og historiske resultater er ingen garanti for fremtiden.
            Foretag altid din egen analyse, og søg professionel rådgivning før du
            handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  31. maj 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default ObesityMarketAnalysisPage;
