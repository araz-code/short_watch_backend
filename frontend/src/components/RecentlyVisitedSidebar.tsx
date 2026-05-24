import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRecentlyVisited, VisitEntryType } from "../utils/recentlyVisited";

const dotColor: Record<VisitEntryType, string> = {
  stock_detail: "bg-blue-500",
  analysis: "bg-emerald-500",
  seller_detail: "bg-amber-500",
  insider_detail: "bg-violet-500",
};

const typeLabel: Record<VisitEntryType, { da: string; en: string }> = {
  stock_detail: { da: "Aktie", en: "Stock" },
  analysis: { da: "Analyse", en: "Analysis" },
  seller_detail: { da: "Sælger", en: "Seller" },
  insider_detail: { da: "Insider", en: "Insider" },
};

function formatRelative(ts: number, isDa: boolean): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return isDa ? "nu" : "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}t`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function RecentlyVisitedSidebar() {
  const { i18n } = useTranslation();
  const entries = useRecentlyVisited();
  const isDa = i18n.language.startsWith("da");

  if (entries.length === 0) return null;

  return (
    <div
      className="w-full max-w-[240px] flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[#19191f] shadow-xs"
      role="region"
      aria-label={isDa ? "Senest besøgt" : "Recently visited"}
    >
      {/* Header */}
      <div className="px-3 py-2.5 bg-gray-50 dark:bg-[#131318] border-b border-gray-200 dark:border-gray-700 shrink-0">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          {isDa ? "Senest besøgt" : "Recently visited"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {isDa ? "Dine seneste sider" : "Your latest pages"}
        </p>
      </div>

      {/* Body */}
      <ul role="list" className="flex-1 min-h-0 overflow-y-auto">
        {entries.map((entry, idx) => {
          const isEven = idx % 2 === 0;
          const ariaLabel = `${typeLabel[entry.type][isDa ? "da" : "en"]}: ${entry.title}${entry.subtitle ? " – " + entry.subtitle : ""}`;
          return (
            <li key={entry.path} role="listitem">
              <Link
                to={entry.path}
                aria-label={ariaLabel}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 transition-colors duration-150 ${
                  isEven ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"
                }`}
              >
                {/* Color dot for type */}
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[entry.type]}`}
                  aria-hidden="true"
                />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {entry.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums">
                      {formatRelative(entry.timestamp, isDa)}
                    </span>
                  </div>
                  {entry.subtitle && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate leading-tight">
                      {entry.subtitle}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
