import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { analyses } from "../data/analyses";
import { trackEvent } from "../analytics";

const accentColors: Record<string, string> = {
  BAVA: "bg-emerald-500",
  ZEAL: "bg-violet-500",
  GN: "bg-amber-500",
  NOVO: "bg-sky-500",
};

function tickerFromTitle(title: string): string {
  const match = title.match(/\(([^)]+)\)/);
  return match ? match[1] : title.split(" ")[0];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MobileAnalysesCarousel() {
  const { i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");
  const [activeIndex, setActiveIndex] = useState(0);

  const shuffled = useMemo(() => shuffle(analyses), []);

  const next = useCallback(() => {
    setActiveIndex((i) => (i + 1) % shuffled.length);
  }, [shuffled.length]);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + shuffled.length) % shuffled.length);
  }, [shuffled.length]);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const id = setInterval(next, 8000);
    return () => clearInterval(id);
  }, [next]);

  if (shuffled.length === 0) return null;

  const a = shuffled[activeIndex];
  const ticker = tickerFromTitle(a.title);
  const accent = accentColors[ticker] ?? "bg-blue-500";

  return (
    <div className="xl:hidden fixed bottom-0 left-0 right-0 z-20 bg-indigo-600 dark:bg-indigo-900 shadow-[0_-2px_8px_rgba(0,0,0,0.15)]">
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Dots */}
        <div className="flex gap-1.5 shrink-0 mr-1 -mt-5">
          {shuffled.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === activeIndex
                  ? "w-2 h-2 bg-white"
                  : "w-1.5 h-1.5 bg-indigo-300/50"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <Link
          to={`/analyse/${a.slug}`}
          onClick={() =>
            trackEvent("analysis_link_click", {
              source: "mobile_carousel",
              slug: a.slug,
            })
          }
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <span className={`${accent} shrink-0 w-1 self-stretch rounded-full`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white leading-snug truncate">
              {isDa ? a.subtitle.da : a.subtitle.en}
            </p>
            <p className="text-xs text-indigo-200 truncate mt-0.5">
              {ticker} &middot; {isDa ? a.date.da : a.date.en}
            </p>
          </div>
        </Link>

        {/* Prev */}
        <button
          onClick={prev}
          aria-label="Previous"
          className="shrink-0 text-indigo-200 hover:text-white transition-colors p-1"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Next */}
        <button
          onClick={next}
          aria-label="Next"
          className="shrink-0 text-indigo-200 hover:text-white transition-colors p-1"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
