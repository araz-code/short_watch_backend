import { useTranslation } from "react-i18next";
import { formatNum } from "../utils/format";

export interface PriceFlowByAge {
  recent: number;
  mid: number;
  old: number;
}

export interface PriceFlowBucket {
  priceLow: number;
  priceHigh: number;
  sharesShorted: number;
  sharesCovered: number;
  shortedByAge?: PriceFlowByAge;
  coveredByAge?: PriceFlowByAge;
  lastShortedDate?: string | null;
  lastCoveredDate?: string | null;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatShares = (n: number) => {
  if (n >= 1_000_000) return `${formatNum(n / 1_000_000, 2)}M`;
  if (n >= 1_000) return `${formatNum(n / 1_000, 1)}k`;
  return n.toLocaleString();
};

const PriceFlowList: React.FC<{ buckets: PriceFlowBucket[] }> = ({
  buckets,
}) => {
  const { t } = useTranslation();

  if (!buckets || buckets.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
        {t("Not enough data to compute price flow.")}
      </div>
    );
  }

  const sorted = [...buckets].sort((a, b) => b.priceLow - a.priceLow);
  const maxFlow = Math.max(
    ...sorted.map((b) => Math.max(b.sharesShorted, b.sharesCovered))
  );

  return (
    <div className="flex-1 min-h-0 [@media(max-height:900px)_and_(orientation:landscape)]:flex-none">
      <div className="overflow-y-auto h-full [@media(max-height:900px)_and_(orientation:landscape)]:overflow-visible [@media(max-height:900px)_and_(orientation:landscape)]:h-auto">
        <div className="mx-4">
          <p className="text-xs text-gray-600 dark:text-gray-300 italic px-2 pt-0.5 pb-1.5">
            {t("price_flow_date_note")}
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-400 px-2 pb-2">
            {t("Tip: The period buttons also filter the flow.")}
          </p>
          <div className="lg:sticky lg:top-0 lg:z-10 bg-white dark:bg-[#121212]">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 mx-2 px-4 py-2 text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
              <span>{t("Price")}</span>
              <span className="text-right">{t("Shorted")}</span>
              <span className="text-right">{t("Covered")}</span>
              <span className="text-right">{t("Net")}</span>
            </div>
          </div>
          <ul>
            {sorted.map((b, i) => {
              const net = b.sharesShorted - b.sharesCovered;
              const shortedPct = maxFlow > 0 ? (b.sharesShorted / maxFlow) * 100 : 0;
              const coveredPct = maxFlow > 0 ? (b.sharesCovered / maxFlow) * 100 : 0;
              const netPct = maxFlow > 0 ? (Math.abs(net) / maxFlow) * 100 : 0;
              const netColor =
                net > 0
                  ? "text-red-600 dark:text-red-400"
                  : net < 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400";
              const netBarColor =
                net > 0
                  ? "bg-red-500/15 dark:bg-red-500/25"
                  : net < 0
                    ? "bg-green-500/15 dark:bg-green-500/25"
                    : "";
              const rowBg = i % 2 === 0
                ? "bg-white dark:bg-[#1e1e1e]"
                : "bg-gray-50 dark:bg-[#181818]";
              return (
                <li
                  key={`${b.priceLow}-${b.priceHigh}`}
                  className={`grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 mx-2 my-1 px-4 py-1 rounded-lg text-xs sm:text-sm tabular-nums border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 ${rowBg}`}
                >
                  <span className="flex flex-col leading-tight">
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      {Math.round((b.priceLow + b.priceHigh) / 2)}
                    </span>
                    <span className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-300">
                      {Math.round(b.priceLow)}–{Math.round(b.priceHigh)}
                    </span>
                  </span>
                  <div className="relative w-full flex items-center justify-end">
                    <div
                      className="absolute inset-y-0 right-0 bg-red-500/15 dark:bg-red-500/25 rounded"
                      style={{ width: `${shortedPct}%` }}
                      aria-hidden="true"
                    />
                    <span className="relative flex flex-col items-end leading-tight">
                      <span className="text-red-600 dark:text-red-400">{formatShares(b.sharesShorted)}</span>
                      {b.lastShortedDate && (
                        <span className="text-[11px] text-gray-600 dark:text-gray-200">{formatDate(b.lastShortedDate)}</span>
                      )}
                    </span>
                  </div>
                  <div className="relative w-full flex items-center justify-end">
                    <div
                      className="absolute inset-y-0 right-0 bg-green-500/15 dark:bg-green-500/25 rounded"
                      style={{ width: `${coveredPct}%` }}
                      aria-hidden="true"
                    />
                    <span className="relative flex flex-col items-end leading-tight">
                      <span className="text-green-600 dark:text-green-400">{formatShares(b.sharesCovered)}</span>
                      {b.lastCoveredDate && (
                        <span className="text-[11px] text-gray-600 dark:text-gray-200">{formatDate(b.lastCoveredDate)}</span>
                      )}
                    </span>
                  </div>
                  <div className="relative w-full flex items-center justify-end">
                    <div
                      className={`absolute inset-y-0 right-0 rounded ${netBarColor}`}
                      style={{ width: `${netPct}%` }}
                      aria-hidden="true"
                    />
                    <span className={`relative font-medium ${netColor}`}>
                      {net > 0 ? "+" : net < 0 ? "−" : ""}
                      {formatShares(Math.abs(net))}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
};

export default PriceFlowList;
