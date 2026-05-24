import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import { analyses } from "../data/analyses";
import { trackEvent } from "../analytics";

const gradients: Record<string, string> = {
  BAVA: "from-emerald-500 to-teal-600",
  ZEAL: "from-violet-500 to-indigo-600",
  GN: "from-amber-500 to-orange-600",
  NOVO: "from-sky-500 to-blue-600",
  PNDORA: "from-pink-500 to-rose-600",
};

function tickerFromTitle(title: string): string {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : title.split(" ")[0];
}

// Shown at the bottom of every individual analysis page. Surfaces up to three
// other analyses so a reader who just finished one piece has an obvious next
// step, instead of bouncing back to the SERP.
interface Props {
  currentSlug: string;
  max?: number;
}

export default function RelatedAnalyses({ currentSlug, max = 3 }: Props) {
  const { t, i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");

  const others = analyses.filter((a) => a.slug !== currentSlug).slice(0, max);
  if (others.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mb-1">
        {t("Read also")}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {t("More short selling analyses")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {others.map((a) => {
          const ticker = tickerFromTitle(a.title);
          const gradient = gradients[ticker] ?? "from-blue-500 to-indigo-600";
          return (
            <Link
              key={a.slug}
              to={`/analyse/${a.slug}`}
              onClick={() =>
                trackEvent("analysis_link_click", {
                  click_source: "related_analyses",
                  slug: a.slug,
                  from_slug: currentSlug,
                })
              }
              className="group block rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#19191f] hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <div className={`relative bg-gradient-to-br ${gradient} h-9 flex items-center px-3`}>
                <span className="text-white text-sm font-bold tracking-tight">
                  {ticker}
                </span>
                <FontAwesomeIcon
                  icon={faFileLines}
                  className="absolute top-2 right-3 text-white/40 text-xs"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {isDa ? a.subtitle.da : a.subtitle.en}
                </h3>
                <div className="flex items-baseline justify-between gap-2 mt-2">
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
