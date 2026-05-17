import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faFileLines } from "@fortawesome/free-solid-svg-icons";
import { analyses } from "../data/analyses";
import { trackEvent } from "../analytics";

// Featured analyses block intended for the homepage so visitors landing from
// Google immediately see that analyses exist rather than discovering them
// through a separate nav link.

// Each card gets a deterministic gradient based on the stock ticker so the
// cards have visual variety without needing real image assets.
const gradients: Record<string, string> = {
  BAVA: "from-emerald-500 to-teal-600",
  ZEAL: "from-violet-500 to-indigo-600",
  GN: "from-amber-500 to-orange-600",
};

function tickerFromTitle(title: string): string {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : title.split(" ")[0];
}

export default function FeaturedAnalyses() {
  const { t, i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");

  // Curated list of analyses to feature on the homepage (by slug, in display order).
  const featuredSlugs = [
    "bava/2026-05-17",
    "zeal/2026-05-13",
    "gn/2026-05-14",
  ];
  const featured = featuredSlugs
    .map((slug) => analyses.find((a) => a.slug === slug))
    .filter((a): a is (typeof analyses)[number] => a !== undefined);

  if (featured.length === 0) return null;

  return (
    <section className="max-w-[1000px] mx-auto px-6 py-8 sm:py-10">
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
          {t("Latest analyses")}
        </h2>
        <Link
          to="/analyse"
          onClick={() => trackEvent("analysis_link_click", { source: "homepage_featured_seeall" })}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0"
        >
          {t("See all")} <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {featured.map((a) => {
          const ticker = tickerFromTitle(a.title);
          const gradient = gradients[ticker] ?? "from-blue-500 to-indigo-600";
          return (
            <Link
              key={a.slug}
              to={`/analyse/${a.slug}`}
              onClick={() => trackEvent("analysis_link_click", { source: "homepage_featured", slug: a.slug })}
              className="group block rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#19191f] hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <div className={`relative bg-gradient-to-br ${gradient} h-14 sm:h-16 flex items-center justify-center px-4`}>
                <span className="text-white text-xl sm:text-2xl font-bold tracking-tight">
                  {ticker}
                </span>
                <FontAwesomeIcon
                  icon={faFileLines}
                  className="absolute top-2 right-3 text-white/40 text-sm"
                />
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {isDa ? a.subtitle.da : a.subtitle.en}
                </h3>
                <div className="flex items-baseline justify-between gap-2 mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {a.title}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {isDa ? a.date.da : a.date.en}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

    </section>
  );
}
