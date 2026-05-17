import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import PageTemplate from "../components/PageTemplate";
import { trackEvent, trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";
import { analyses } from "../data/analyses";

// Per-ticker gradient so each row has a small splash of color tied to the stock.
const gradients: Record<string, string> = {
  BAVA: "from-emerald-500 to-teal-600",
  ZEAL: "from-violet-500 to-indigo-600",
  GN: "from-amber-500 to-orange-600",
};

function tickerFromTitle(title: string): string {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : title.split(" ")[0];
}

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

      <div className="w-full max-w-[900px] mx-auto px-5 sm:px-8 pb-12">
        <h1 className="text-2xl lg:text-3xl text-center py-6 dark:text-white">
          {t("Analysis")}
        </h1>

        <div className="flex flex-col gap-3">
          {analyses.map((a) => {
            const ticker = tickerFromTitle(a.title);
            const gradient = gradients[ticker] ?? "from-blue-500 to-indigo-600";
            return (
              <Link
                key={a.slug}
                to={`/analyse/${a.slug}`}
                onClick={() => trackEvent("analysis_link_click", { source: "analysis_index", slug: a.slug })}
                className="group relative flex items-center gap-4 sm:gap-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#19191f] p-4 sm:p-5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-px transition-all"
              >
                {/* Ticker badge */}
                <div className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                  <span className="text-white text-sm sm:text-base font-bold tracking-tight">
                    {ticker}
                  </span>
                </div>

                {/* Subtitle + title */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors [overflow-wrap:anywhere]">
                    {isDa ? a.subtitle.da : a.subtitle.en}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {a.title}
                  </p>
                </div>

                {/* Date + arrow */}
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                    {isDa ? a.date.da : a.date.en}
                  </span>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="text-blue-500 dark:text-blue-400 text-sm group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PageTemplate>
  );
};

export default AnalysisPage;
