import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import ChartPricePoint from "../models/ChartPricePoint";
import { formatTimestamp } from "../utils/dates";
import { useTranslation } from "react-i18next";
import { handleClick } from "../analytics";

const PricePointChartInfo: React.FC<{
  pricePoints: ChartPricePoint[];
  symbol: string;
}> = (props) => {
  const { pricePoints, symbol } = props;
  const [showOverlay, setShowOverlay] = useState(false);
  const { t } = useTranslation();

  // Ref to access the overlay DOM element
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Toggle the overlay visibility
  const toggleOverlay = () => {
    handleClick(`clicked on show detail info for: ${symbol}`);

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

  let changeLabel: string;
  let changeTone: "neutral" | "down" | "up";

  if (change === 0) {
    changeLabel = t("No change");
    changeTone = "neutral";
  } else if (change > 0) {
    changeLabel = `${t("Decreased by")} ${Math.abs(change).toFixed(2)}%`;
    changeTone = "down";
  } else {
    changeLabel = `${t("Increased by")} ${Math.abs(change).toFixed(2)}%`;
    changeTone = "up";
  }

  const toneClasses: Record<typeof changeTone, string> = {
    neutral:
      "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200",
    down: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    up: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 border-b border-gray-100 dark:border-white/5 last:border-b-0">
      <span className="text-[13px] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className="text-[14px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );

  return (
    <div className="relative">
      {/* Info Button */}
      <button
        onClick={toggleOverlay}
        ref={buttonRef}
        className={`w-[23px] h-[23px] rounded-full border-none flex justify-center items-center cursor-pointer z-10 text-white italic focus:ring-2 focus:ring-blue-300 transition-colors ${
          showOverlay
            ? "bg-blue-700 hover:bg-blue-600"
            : "bg-blue-600 hover:bg-blue-500"
        }`}
        aria-label={t("Show summary")}
      >
        <FontAwesomeIcon icon={faInfo} size="xs" />
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
                {t("Selected period:")}
              </p>
              <p className="mt-1 text-[14px] font-medium text-gray-900 dark:text-gray-100 tabular-nums">
                {`${formatTimestamp(pricePoints[0].timestamp, "dateOnly")} — ${t(
                  "today"
                )}`}
              </p>
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
                value={`${startValue.toFixed(2)}%`}
              />
              <Row
                label={t("Current")}
                value={`${currentValue.toFixed(2)}%`}
              />
              <Row
                label={t("Lowest")}
                value={`${lowestPoint.value.toFixed(2)}%`}
              />
              <Row
                label={t("Highest")}
                value={`${highestPoint.value.toFixed(2)}%`}
              />
              <Row label={t("Average")} value={`${average.toFixed(2)}%`} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PricePointChartInfo;
