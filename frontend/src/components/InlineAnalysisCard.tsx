import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Analysis } from "../data/analyses";
import { trackEvent } from "../analytics";

function tickerFromTitle(title: string): string {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : title.split(" ")[0];
}

interface Props {
  analysis: Analysis;
  source: string;
  position?: number;
}

export default function InlineAnalysisCard({ analysis, source, position }: Props) {
  const { i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");
  const ticker = tickerFromTitle(analysis.title);
  const readMoreLabel = isDa ? "Læs analyse" : "Read analysis";
  const badgeLabel = isDa ? "Analyse" : "Analysis";

  return (
    <Link
      to={`/analyse/${analysis.slug}`}
      onClick={() =>
        trackEvent("analysis_link_click", {
          click_source: source,
          slug: analysis.slug,
          ...(position !== undefined && { position }),
        })
      }
      className="mx-2 my-1 px-4 py-2.5 rounded-lg flex items-center justify-between shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-800/50"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="shrink-0 w-1 self-stretch rounded-full" style={{ backgroundColor: analysis.accentColor }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-white/70 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded">
              {badgeLabel}
            </span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {ticker}
            </span>
          </div>
          <div className="text-sm text-gray-900 dark:text-white font-medium leading-snug mt-1 line-clamp-2">
            {isDa ? analysis.subtitle.da : analysis.subtitle.en}
          </div>
        </div>
      </div>
      <div className="shrink-0 ml-3 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
        {readMoreLabel}
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  );
}
