import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { analyses } from "../data/analyses";
import { trackEvent } from "../analytics";

export default function AnalysesSidebar({ code, source = "sidebar" }: { code?: string; source?: string }) {
  const { t, i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");
  const filtered = code ? analyses.filter((a) => a.code === code) : analyses;

  if (filtered.length === 0) return null;

  return (
    <div
      className="w-full max-w-[240px] flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[#19191f] shadow-xs"
      role="region"
      aria-label={t("Analysis")}
    >
      <div className="px-3 py-2.5 bg-gray-50 dark:bg-[#131318] border-b border-gray-200 dark:border-gray-700 shrink-0">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          {t("Analysis")}
        </p>
      </div>

      <ul role="list">
        {filtered.map((a, idx) => (
          <li key={a.slug} role="listitem">
            <Link
              to={`/analyse/${a.slug}`}
              onClick={() => trackEvent("analysis_link_click", { source, slug: a.slug })}
              className={`block px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150 ${idx % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"}`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {isDa ? a.subtitle.da : a.subtitle.en}
              </p>
              <div className="flex items-baseline justify-between gap-1 mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {a.title}
                </p>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {isDa ? a.date.da : a.date.en}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
