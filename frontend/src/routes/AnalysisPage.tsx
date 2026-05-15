import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import { trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";

interface AnalysisEntry {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
}

const analyses: AnalysisEntry[] = [
  {
    slug: "zeal/gennemsnitspris/2026-05-14",
    title: "Zealand Pharma (ZEAL)",
    subtitle: "Til hvilken kurs har de shortet Zealand Pharma?",
    date: "14. maj 2026",
  },
  {
    slug: "gn/2026-05-14",
    title: "GN Store Nord (GN)",
    subtitle: "Shortanalyse: Shorterne holder fast trods Amplifon-salget",
    date: "14. maj 2026",
  },
  {
    slug: "zeal/2026-05-13",
    title: "Zealand Pharma (ZEAL)",
    subtitle: "Shortanalyse: Hvem vædder imod Zealand Pharma?",
    date: "13. maj 2026",
  },
];

const AnalysisPage: React.FC = () => {
  const { t } = useTranslation();

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
                    {a.subtitle}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {a.title}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-gray-400 dark:text-gray-500">
                  {a.date}
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
