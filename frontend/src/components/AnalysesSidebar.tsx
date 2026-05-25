import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { analyses, type Analysis } from "../data/analyses";
import { trackEvent } from "../analytics";

// Deterministic colour per stock code — cycles through a palette
const PALETTE = [
  "#007AFF",
  "#a855f7",
  "#10b981",
  "#f59e0b",
  "#e63946",
  "#06b6d4",
];

// Build a stable code→colour map from the full analyses list
const codeColourMap: Record<string, typeof PALETTE[0]> = {};
let paletteIdx = 0;
for (const a of analyses) {
  if (!codeColourMap[a.code]) {
    codeColourMap[a.code] = PALETTE[paletteIdx % PALETTE.length];
    paletteIdx++;
  }
}

export default function AnalysesSidebar({ code, source = "sidebar" }: { code?: string; source?: string }) {
  const { t, i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");
  const filtered = code ? analyses.filter((a) => a.code === code) : analyses;

  // Locked-in random seed for this mount, so the "random" pick is stable
  // across re-renders but changes on each fresh page load.
  const [randomSeed] = useState<number>(() => Math.random());

  // When viewing a stock-specific list, suggest 2 additional analyses below:
  // the most recent one not already shown, plus a random other one.
  const extras = useMemo<Analysis[]>(() => {
    if (!code || filtered.length === 0) return [];
    const shown = new Set(filtered.map((a) => a.slug));
    const remaining = analyses.filter((a) => !shown.has(a.slug));
    if (remaining.length === 0) return [];
    const mostRecent = remaining[0]; // analyses array is sorted newest-first
    const pool = remaining.slice(1);
    if (pool.length === 0) return [mostRecent];
    const randomOne = pool[Math.floor(randomSeed * pool.length)];
    return [mostRecent, randomOne];
  }, [code, filtered, randomSeed]);

  if (filtered.length === 0) return null;

  const renderItem = (a: Analysis, stripeIndex: number, itemSource: string) => {
    const colour = codeColourMap[a.code] ?? PALETTE[0];
    return (
      <li key={a.slug} role="listitem">
        <Link
          to={`/analyse/${a.slug}`}
          onClick={() => trackEvent("analysis_link_click", { click_source: itemSource, slug: a.slug })}
          className={`block px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150 border-l-[3px] ${stripeIndex % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"}`}
          style={{ borderLeftColor: colour }}
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
    );
  };

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

      <ul role="list" className="overflow-y-auto max-h-[300px]">
        {filtered.map((a, i) => renderItem(a, i, source))}
        {extras.length > 0 && (
          <>
            <li role="presentation" className="px-3 py-1.5 bg-gray-100 dark:bg-[#131318] border-y border-gray-200 dark:border-gray-700">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("More short selling analyses")}
              </p>
            </li>
            {extras.map((a, i) => renderItem(a, filtered.length + i, `${source}_other`))}
          </>
        )}
      </ul>
    </div>
  );
}
