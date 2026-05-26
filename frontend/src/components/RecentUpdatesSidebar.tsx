import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchRecentFeed, RecentFeedItem } from "../apis/ShortPositionAPI";

function formatAmount(amount: number | null | undefined): string {
  if (!amount) return "";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return `${Math.round(amount)}`;
}

function formatFeedDate(dateStr: string, todayLabel: string): string {
  const itemDate = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())) /
      86_400_000
  );
  if (diffDays <= 0) return todayLabel;
  if (diffDays === 1) return "1d";
  return `${diffDays}d`;
}

const dotColor: Record<string, string> = {
  buy: "bg-green-600",
  sell: "bg-red-600",
  grant: "bg-blue-500",
  other: "bg-gray-500",
  large_seller: "bg-amber-500",
};

const dotLabel: Record<string, { da: string; en: string }> = {
  buy: { da: "Køb", en: "Buy" },
  sell: { da: "Salg", en: "Sell" },
  grant: { da: "Tildeling", en: "Grant" },
  other: { da: "Andet", en: "Other" },
  large_seller: { da: "Stor sælger", en: "Large seller" },
};

interface Props {
  code?: string;
  codes?: string[];
  types?: 'all' | 'insider';
  days?: number;
}

export default function RecentUpdatesSidebar({ code, codes, types, days }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isDa = i18n.language.startsWith("da");

  // When filtering by my list but list is empty, skip the fetch and show nothing
  const isEmptyList = codes !== undefined && codes.length === 0;

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["recent-feed", code ?? null, codes?.join(",") ?? null, types ?? null, days ?? null],
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: !isEmptyList,
    queryFn: ({ signal }) => fetchRecentFeed({ signal, code, codes, types, days }),
  });

  // Insider trades temporarily hidden until Finanstilsynet data is reliable
  // across all stocks. Re-enable by removing this filter and the disabled
  // header text below.
  const data = rawData?.filter((item) => item.type !== "insider");

  const todayLabel = t("today");

  return (
    <div
      className="w-full max-w-[240px] h-[30vh] flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-[#19191f] shadow-xs"
      role="region"
      aria-label={t("Recent updates")}
    >
      {/* Header */}
      <div className="px-3 py-2.5 bg-gray-50 dark:bg-[#131318] border-b border-gray-200 dark:border-gray-700 shrink-0">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          {t("Recent updates")}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {isDa ? "Store sælgere" : "Large sellers"}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && (
          <div className="px-3 py-2 space-y-3" aria-busy="true" aria-label={t("Loading")}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-1">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (isEmptyList || !data || data.length === 0) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-3 italic">
            {t("No recent updates")}
          </p>
        )}

        {!isLoading && !isEmptyList && data && data.length > 0 && (
          <ul role="list">
            {data.map((item: RecentFeedItem, idx: number) => {
              const dot = item.type === "large_seller" ? "large_seller" : (item.transactionCategory ?? "other");
              const isEven = idx % 2 === 0;
              const label = isDa ? dotLabel[dot]?.da : dotLabel[dot]?.en;
              const ariaLabel = item.type === "large_seller"
                ? `${item.stockSymbol} – ${item.sellerName ?? ""} ${item.value != null ? item.value.toFixed(2) + "%" : ""}`
                : `${item.stockSymbol || item.issuerName} – ${item.personName ?? ""} – ${label}`;
              return (
                <li key={idx} role="listitem">
                  <button
                    aria-label={ariaLabel}
                    className={`w-full text-left cursor-pointer px-3 py-2.5 flex items-start gap-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 transition-colors duration-150 ${isEven ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"}`}
                    onClick={() => {
                      if (item.type === "large_seller" && item.sellerId) {
                        navigate(`/short-seller-details?seller=${item.sellerId}#${item.stockSymbol}`);
                      } else if (item.type === "insider" && item.issuerCvr) {
                        navigate(`/insider-details?cvr=${item.issuerCvr}`);
                      }
                    }}
                  >
                    {/* Color dot with accessible label */}
                    <span
                      className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[dot]}`}
                      aria-hidden="true"
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {item.type === "large_seller" ? (
                        <>
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {item.stockSymbol}
                            </span>
                            {item.value != null && (
                              <span className="text-xs text-gray-600 dark:text-gray-300 shrink-0 tabular-nums">
                                {item.value.toFixed(2)}%
                              </span>
                            )}
                          </div>
                          {item.sellerName && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate leading-tight">
                              {item.sellerName}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFeedDate(item.date, todayLabel)}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {item.stockSymbol || item.issuerName}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-300 shrink-0">
                              {formatFeedDate(item.date, todayLabel)}
                            </span>
                          </div>
                          {item.personName && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate leading-tight">
                              {item.personName}
                            </p>
                          )}
                          <p className="text-xs font-medium" style={{ color: dot === "buy" ? "#16a34a" : dot === "sell" ? "#dc2626" : "#3b82f6" }}>
                            {isDa
                              ? dotLabel[dot]?.da
                              : dotLabel[dot]?.en}
                            {item.totalAmount != null ? ` · ${formatAmount(item.totalAmount)}${item.currency ? " " + item.currency : ""}` : ""}
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
