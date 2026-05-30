import { useTranslation } from "react-i18next";
import ShortSeller from "../models/ShortSeller";
import ChangeIndicator from "./UI/ChangeIndicator";
import { formatTimestamp } from "../utils/dates";
import { formatNum } from "../utils/format";

const MAX_CURRENT_VISIBLE = 6;
const MAX_PREVIOUS_VISIBLE = 5;

const fmtComma = (n: number, d: number) => formatNum(Math.abs(n), d).replace(".", ",");

const pillTone = (value: number, prevValue: number): { border: string; bg: string } => {
  // Sammenlign nuværende værdi med tidligere for at vise retning.
  if (prevValue === undefined || prevValue === null || prevValue === value) {
    return {
      border: "border-gray-200 dark:border-gray-700",
      bg: "bg-white dark:bg-[#19191f]",
    };
  }
  if (value > prevValue) {
    return {
      border: "border-red-200 dark:border-red-800/60",
      bg: "bg-red-50/50 dark:bg-red-950/20",
    };
  }
  return {
    border: "border-emerald-200 dark:border-emerald-800/60",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
  };
};

const ShortSellerRow: React.FC<ShortSeller & { isEven: boolean }> = (props) => {
  const { name, current, previous, lastUpdated, isEven } = props;
  const { t } = useTranslation();

  const activeCount = current.length;
  const totalExposure = current.reduce((s, p) => s + p.value, 0);
  const biggest = activeCount > 0
    ? current.reduce((m, p) => (p.value > m.value ? p : m), current[0])
    : null;

  const visibleCurrent = current.slice(0, MAX_CURRENT_VISIBLE);
  const remainingCurrent = activeCount - visibleCurrent.length;
  const visiblePrevious = previous.slice(0, MAX_PREVIOUS_VISIBLE);
  const remainingPrevious = previous.length - visiblePrevious.length;

  // Accent intensitet baseret på antal aktive positioner
  const accentClass = activeCount === 0
    ? "bg-gray-300 dark:bg-gray-700"
    : activeCount >= 5
    ? "bg-blue-500"
    : activeCount >= 3
    ? "bg-blue-400"
    : "bg-blue-300 dark:bg-blue-600";

  return (
    <div className={`group relative mx-2 my-1.5 pl-4 pr-4 py-3 rounded-xl shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 dark:text-white border border-gray-100 dark:border-gray-800 overflow-hidden ${isEven ? "bg-white dark:bg-[#19191f]" : "bg-gray-50/70 dark:bg-[#131318]"}`}>
      {/* Accent stripe — venstre kant */}
      <span aria-hidden="true" className={`absolute left-0 top-0 bottom-0 w-1 ${accentClass}`} />

      {/* Header: name + status pill + date */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base leading-tight text-gray-900 dark:text-white">
            {name}
          </h3>
          {activeCount > 0 ? (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 tabular-nums">
              <span className="font-medium">{activeCount}</span> {activeCount === 1 ? t("active") : t("active_plural")}
              <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
              <span className="font-medium">{fmtComma(totalExposure, 2)}%</span> {t("total")}
              {biggest && (
                <>
                  <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                  {t("biggest")} <span className="font-medium">{biggest.stockSymbol}</span> {fmtComma(biggest.value, 2)}%
                </>
              )}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t("Only historic positions")}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 tabular-nums whitespace-nowrap">
          {formatTimestamp(lastUpdated, "todayWithTime")}
        </span>
      </div>

      {/* Current positions */}
      {visibleCurrent.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {visibleCurrent.map((item, index) => {
            const tone = pillTone(item.value, item.prevValue);
            return (
              <span
                key={index}
                className={`inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 border ${tone.bg} ${tone.border}`}
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">{item.stockSymbol}</span>
                <span className="tabular-nums text-gray-700 dark:text-gray-300">
                  {fmtComma(item.value, 2)}%
                </span>
                <ChangeIndicator value={item.value} prevValue={item.prevValue} />
              </span>
            );
          })}
          {remainingCurrent > 0 && (
            <span className="inline-flex items-center text-xs text-gray-600 dark:text-gray-300 rounded-md px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600">
              +{remainingCurrent} {t("more")}
            </span>
          )}
        </div>
      )}

      {/* Previous positions */}
      {visiblePrevious.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800">
          <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mr-1">
            {t("Previously")}
          </span>
          {visiblePrevious.map((item, index) => (
            <span
              key={index}
              className="text-[11px] text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#282828] rounded px-1.5 py-0.5"
            >
              {item}
            </span>
          ))}
          {remainingPrevious > 0 && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              +{remainingPrevious}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ShortSellerRow;
