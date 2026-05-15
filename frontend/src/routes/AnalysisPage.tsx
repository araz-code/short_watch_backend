import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import { trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";

interface AnalysisEntry {
  slug: string;
  title: string;
  subtitle: { da: string; en: string };
  date: { da: string; en: string };
}

const analyses: AnalysisEntry[] = [
  {
    slug: "zeal/gennemsnitspris/2026-05-14",
    title: "Zealand Pharma (ZEAL)",
    subtitle: {
      da: "Til hvilken kurs har de shortet Zealand Pharma?",
      en: "At what price did they short Zealand Pharma?",
    },
    date: { da: "15. maj 2026", en: "May 15, 2026" },
  },
  {
    slug: "gn/2026-05-14",
    title: "GN Store Nord (GN)",
    subtitle: {
      da: "Shortanalyse: Shorterne holder fast trods Amplifon-salget",
      en: "Short selling analysis: Short sellers hold firm despite Amplifon sale",
    },
    date: { da: "14. maj 2026", en: "May 14, 2026" },
  },
  {
    slug: "zeal/2026-05-13",
    title: "Zealand Pharma (ZEAL)",
    subtitle: {
      da: "Shortanalyse: Hvem vædder imod Zealand Pharma?",
      en: "Short selling analysis: Who is betting against Zealand Pharma?",
    },
    date: { da: "13. maj 2026", en: "May 13, 2026" },
  },
];

const AnalysisPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");

  useEffect(() => {
    trackPageView("/analyse", "analysis_overview");
    fetch(`${HOST}/stats/visit/analysis/`).catch(() => {});
  }, []);

  return (
    <PageTemplate>
      <title>Zirium | {t("Analysis")}</title>
      <meta
        name="description"
        content="Dybdegående analyser af short-positioner i danske aktier."
      />

      <div className="w-full max-w-[900px] mx-auto px-5 sm:px-8">
        <h1 className="text-2xl lg:text-3xl text-center py-6 dark:text-white">
          {t("Analysis")}
        </h1>

        <div className="flex flex-col gap-4">
          {analyses.map((a) => (
            <Link
              key={a.slug}
              to={`/analyse/${a.slug}`}
              className="group block rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#19191f] p-5 sm:p-6 transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {isDa ? a.subtitle.da : a.subtitle.en}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {a.title}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-gray-400 dark:text-gray-500">
                  {isDa ? a.date.da : a.date.en}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PageTemplate>
  );
};

export default AnalysisPage;
