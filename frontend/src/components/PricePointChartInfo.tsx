import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import ChartPricePoint from "../models/ChartPricePoint";
import { formatTimestamp } from "../utils/dates";
import { useTranslation } from "react-i18next";
import { trackEvent } from "../analytics";
import { formatNum } from "../utils/format";

const Row: React.FC<{ label: string; value: string; sub?: string }> = ({
  label,
  value,
  sub,
}) => (
  <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 border-b border-gray-100 dark:border-white/5 last:border-b-0">
    <span className="text-[13px] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <div className="flex flex-col items-end">
      <span className="text-[14px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </span>
      {sub && (
        <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
          {sub}
        </span>
      )}
    </div>
  </div>
);

const PricePointChartInfo: React.FC<{
  pricePoints: ChartPricePoint[];
  symbol: string;
}> = (props) => {
  const { pricePoints, symbol } = props;
  const [showOverlay, setShowOverlay] = useState(false);
  const [now] = useState(() => Date.now());
  const { t } = useTranslation();

  // Ref to access the overlay DOM element
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Toggle the overlay visibility
  const toggleOverlay = () => {
    trackEvent("chart_info_open", { symbol });

    setShowOverlay(!showOverlay);
  };

  // Handle clicks outside of the overlay
  const handleClickOutside = (event: MouseEvent) => {
    if (
      overlayRef.current &&
      !overlayRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setShowOverlay(false);
    }
  };

  // Add event listeners for clicks outside and Escape key when the overlay is visible
  useEffect(() => {
    if (showOverlay) {
      document.addEventListener("mousedown", handleClickOutside);
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") setShowOverlay(false);
      };
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOverlay]);

  const lowestPoint = pricePoints.reduce((prev, curr) =>
    curr.value < prev.value ? curr : prev
  );

  const highestPoint = pricePoints.reduce((prev, curr) =>
    curr.value > prev.value ? curr : prev
  );

  const startValue = pricePoints[0].value;
  const currentValue = pricePoints[pricePoints.length - 1].value;
  const change = startValue - currentValue;
  const average =
    pricePoints.reduce((sum, curr) => sum + curr.value, 0) / pricePoints.length;

  const sortedValues = [...pricePoints.map((p) => p.value)].sort((a, b) => a - b);
  const median =
    sortedValues.length % 2 === 0
      ? (sortedValues[sortedValues.length / 2 - 1] +
          sortedValues[sortedValues.length / 2]) /
        2
      : sortedValues[Math.floor(sortedValues.length / 2)];

  const variance =
    pricePoints.reduce((sum, p) => sum + (p.value - average) ** 2, 0) /
    pricePoints.length;
  const volatility = Math.sqrt(variance);

  const range = highestPoint.value - lowestPoint.value;

  const currentVsAvg = currentValue - average;

  // Period span
  const firstTs = new Date(pricePoints[0].timestamp).getTime();
  const lastTs = new Date(
    pricePoints[pricePoints.length - 1].timestamp
  ).getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const daysSpan = Math.max(1, Math.round((lastTs - firstTs) / dayMs));
  const updatesCount = pricePoints.length;

  // Time since last change
  let lastChangeTs: number | null = null;
  for (let i = pricePoints.length - 2; i >= 0; i--) {
    if (pricePoints[i].value !== pricePoints[i + 1].value) {
      lastChangeTs = new Date(pricePoints[i + 1].timestamp).getTime();
      break;
    }
  }
  let lastChangeLabel: string;
  let lastChangeSub: string | undefined;
  if (lastChangeTs === null) {
    lastChangeLabel = t("Unchanged");
    lastChangeSub = t("for the whole period");
  } else {
    const daysSince = Math.max(0, Math.floor((now - lastChangeTs) / dayMs));
    if (daysSince === 0) {
      lastChangeLabel = t("Today");
    } else {
      lastChangeLabel = `${daysSince} ${daysSince === 1 ? t("day ago") : t("days ago")}`;
    }
  }


  let changeLabel: string;
  let changeTone: "neutral" | "down" | "up";

  if (change === 0) {
    changeLabel = t("No change");
    changeTone = "neutral";
  } else if (change > 0) {
    changeLabel = `${t("Decreased by")} ${formatNum(Math.abs(change), 2)}%`;
    changeTone = "down";
  } else {
    changeLabel = `${t("Increased by")} ${formatNum(Math.abs(change), 2)}%`;
    changeTone = "up";
  }

  const toneClasses: Record<typeof changeTone, string> = {
    neutral:
      "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200",
    down: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    up: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="relative">
      {/* Info Button */}
      <button
        onClick={toggleOverlay}
        ref={buttonRef}
        className={`w-8 h-8 rounded-lg border flex justify-center items-center cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-blue-300 ${
          showOverlay
            ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
        }`}
        aria-label={t("Show summary")}
      >
        <FontAwesomeIcon icon={faInfo} size="sm" />
      </button>

      {/* Info Overlay */}
      {showOverlay && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            aria-hidden="true"
          />
          <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("Summary for the period:")}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white dark:bg-[#19191f] border border-gray-100 dark:border-white/10 shadow-2xl rounded-2xl z-50"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100 dark:border-white/5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                  {t("Selected period:")}
                </p>
                <p className="mt-1 text-[14px] font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                  {`${formatTimestamp(pricePoints[0].timestamp, "dateOnly")} to ${t(
                    "today"
                  )}`}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                  {`${daysSpan} ${daysSpan === 1 ? t("day") : t("days")}`}
                  <span className="inline-block w-px h-3 mx-2 bg-gray-300 dark:bg-gray-600 align-middle" />
                  {`${updatesCount} ${updatesCount === 1 ? t("update") : t("updates")}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOverlay(false)}
                aria-label={t("Close")}
                className="shrink-0 w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-gray-300"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M1 1L13 13M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Change badge */}
            <div className="px-5 pt-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${toneClasses[changeTone]}`}
              >
                {changeLabel}
              </span>
            </div>

            {/* Stats */}
            <div className="px-5 py-3">
              <Row
                label={t("Period start")}
                value={`${formatNum(startValue, 2)}%`}
              />
              <Row
                label={t("Current")}
                value={`${formatNum(currentValue, 2)}%`}
                sub={
                  currentVsAvg === 0
                    ? t("at average")
                    : currentVsAvg > 0
                    ? `+${formatNum(currentVsAvg, 2)}% ${t("above average")}`
                    : `${formatNum(currentVsAvg, 2)}% ${t("below average")}`
                }
              />
              <Row
                label={t("Lowest")}
                value={`${formatNum(lowestPoint.value, 2)}%`}
                sub={formatTimestamp(lowestPoint.timestamp, "dateOnly")}
              />
              <Row
                label={t("Highest")}
                value={`${formatNum(highestPoint.value, 2)}%`}
                sub={formatTimestamp(highestPoint.timestamp, "dateOnly")}
              />
              <Row label={t("Range")} value={`${formatNum(range, 2)}%`} />
              <Row label={t("Average")} value={`${formatNum(average, 2)}%`} />
              <Row label={t("Median")} value={`${formatNum(median, 2)}%`} />
              <Row
                label={t("Volatility")}
                value={`±${formatNum(volatility, 2)}%`}
              />
              <Row
                label={t("Last change")}
                value={lastChangeLabel}
                sub={lastChangeSub}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PricePointChartInfo;
