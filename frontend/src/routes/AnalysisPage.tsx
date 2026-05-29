import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faClock, faFileLines } from "@fortawesome/free-solid-svg-icons";
import PageTemplate from "../components/PageTemplate";
import { trackEvent, trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";
import { analyses } from "../data/analyses";

// The accent color per analysis comes from analyses.json (analysis.accentColor),
// so it is shared per stock and reused on iOS.

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

  const [featured, ...rest] = analyses;
  const featuredTicker = featured ? tickerFromTitle(featured.title) : "";

  const headerDescription = isDa
    ? "Dybdegående gennemgange af danske aktier: fra short-positioner og insider-handler til værdiansættelser og makroeksponering."
    : "In-depth analyses of Danish stocks: short positions, insider trades, valuations, and macro exposure.";

  const readingLabel = (minutes: number) =>
    isDa ? `${minutes} min læsning` : `${minutes} min read`;

  const featuredBadge = isDa ? "Seneste analyse" : "Latest analysis";
  const readMoreLabel = isDa ? "Læs hele analysen" : "Read full analysis";

  return (
    <PageTemplate>
      <title>Zirium | {t("Analysis")}</title>
      <meta
        name="description"
        content={
          isDa
            ? "Dybdegående analyser af danske aktier: short-positioner, værdiansættelser og makroeksponering."
            : "In-depth analyses of Danish stocks: short positions, valuations, and macro exposure."
        }
      />

      <div className="w-full max-w-[1000px] mx-auto px-5 sm:px-8 pb-16">
        {/* Page header */}
        <header className="pt-8 pb-6 sm:pt-10 sm:pb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            {t("Analysis")}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto sm:mx-0">
            {headerDescription}
          </p>
        </header>

        {/* Featured / hero card */}
        {featured && (
          <Link
            to={`/analyse/${featured.slug}`}
            onClick={() =>
              trackEvent("analysis_link_click", { click_source: "analysis_index_featured", slug: featured.slug })
            }
            className="group block mb-10 sm:mb-12 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#19191f] hover:shadow-xl hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-200"
          >
            {/* Colored top bar */}
            <div className="relative h-2" style={{ backgroundColor: featured.accentColor }} />

            <div className="grid sm:grid-cols-[180px_1fr] gap-6 sm:gap-8 p-6 sm:p-8">
              {/* Ticker badge column */}
              <div className="flex flex-col items-center sm:items-start gap-3">
                <div
                  className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: featured.accentColor }}
                >
                  <span className="text-white text-xl sm:text-2xl font-extrabold tracking-tight">
                    {featuredTicker}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                  <FontAwesomeIcon icon={faFileLines} className="text-[10px]" />
                  {featuredBadge}
                </span>
              </div>

              {/* Content column */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  {featured.title}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-snug mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {isDa ? featured.subtitle.da : featured.subtitle.en}
                </h2>
                <p className="text-[15px] sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
                  {isDa ? featured.excerpt.da : featured.excerpt.en}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span className="tabular-nums">
                    {isDa ? featured.date.da : featured.date.en}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <FontAwesomeIcon icon={faClock} className="text-xs" />
                    {readingLabel(featured.readingMinutes)}
                  </span>
                </div>

                <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all">
                  {readMoreLabel}
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="text-xs group-hover:translate-x-0.5 transition-transform"
                  />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Remaining analyses (grid) */}
        {rest.length > 0 && (
          <>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-5">
              {isDa ? "Tidligere analyser" : "Earlier analyses"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {rest.map((a) => {
                const ticker = tickerFromTitle(a.title);
                return (
                  <Link
                    key={a.slug}
                    to={`/analyse/${a.slug}`}
                    onClick={() =>
                      trackEvent("analysis_link_click", { click_source: "analysis_index", slug: a.slug })
                    }
                    className="group relative flex flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#19191f] hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {/* Header bar with ticker */}
                    <div className="relative h-14 flex items-center px-4" style={{ backgroundColor: a.accentColor }}>
                      <span className="text-white text-base font-extrabold tracking-tight">
                        {ticker}
                      </span>
                      <FontAwesomeIcon
                        icon={faFileLines}
                        className="absolute top-3 right-4 text-white/40 text-sm"
                      />
                    </div>

                    {/* Body */}
                    <div className="flex flex-col flex-1 p-5">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {isDa ? a.subtitle.da : a.subtitle.en}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4 line-clamp-3">
                        {isDa ? a.excerpt.da : a.excerpt.en}
                      </p>

                      {/* Footer pinned to bottom */}
                      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="tabular-nums">
                          {isDa ? a.date.da : a.date.en}
                        </span>
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                          {readingLabel(a.readingMinutes)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
};

export default AnalysisPage;
