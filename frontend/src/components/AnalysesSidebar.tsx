import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const analyses = [
  {
    slug: "zeal/gennemsnitspris/2026-05-14",
    title: "Zealand Pharma (ZEAL)",
    subtitle: "Til hvilken kurs har de shortet Zealand Pharma?",
    date: "15. maj 2026",
    code: "DK0060257814",
  },
  {
    slug: "gn/2026-05-14",
    title: "GN Store Nord (GN)",
    subtitle: "Shortanalyse: Shorterne holder fast trods Amplifon-salget",
    date: "14. maj 2026",
    code: "DK0010272632",
  },
  {
    slug: "zeal/2026-05-13",
    title: "Zealand Pharma (ZEAL)",
    subtitle: "Shortanalyse: Hvem vædder imod Zealand Pharma?",
    date: "13. maj 2026",
    code: "DK0060257814",
  },
];

export default function AnalysesSidebar({ code }: { code?: string }) {
  const { t } = useTranslation();
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
              className={`block px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150 ${idx % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"}`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {a.subtitle}
              </p>
              <div className="flex items-baseline justify-between gap-1 mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {a.title}
                </p>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {a.date}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
