import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import Modal from "./UI/Modal";
import { analyses } from "../data/analyses";
import { trackEvent } from "../analytics";
import { fetchRecentFeed, RecentFeedItem } from "../apis/ShortPositionAPI";

// Single floating icon button visible only below the xl breakpoint, where the
// desktop sidebars are hidden. Opens one modal split in two sections: recent
// updates on top, analyses below. Items in both sections share the same row
// styling.
interface Props {
  code?: string;
  codes?: string[];
  feedTypes?: "all" | "insider";
  feedDays?: number;
}

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

export default function MobileSidePanel({ code, codes, feedTypes, feedDays }: Props) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isDa = i18n.language.startsWith("da");
  const [open, setOpen] = useState(false);
  const filteredAnalyses = code ? analyses.filter((a) => a.code === code) : analyses;
  const todayLabel = t("today");

  const isEmptyList = codes !== undefined && codes.length === 0;
  const { data: feed, isLoading } = useQuery({
    queryKey: ["recent-feed-mobile", code ?? null, codes?.join(",") ?? null, feedTypes ?? null, feedDays ?? null],
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: open && !isEmptyList,
    queryFn: ({ signal }) => fetchRecentFeed({ signal, code, codes, types: feedTypes, days: feedDays }),
  });

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={t("Recent updates") + " & " + t("Analysis")}
        onClick={() => {
          trackEvent("analysis_panel_open", { code: code ?? "all" });
          setOpen(true);
        }}
        className="xl:hidden fixed bottom-3 right-2 sm:right-3 z-30 w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/40 ring-2 ring-white dark:ring-[#0d0d12] focus:outline-none focus:ring-blue-400 focus:ring-offset-2"
      >
        <FontAwesomeIcon icon={faLayerGroup} className="text-sm" />
      </button>

      {open && (
        <Modal
          title={t("Recent updates") + " & " + t("Analysis")}
          closeButtonTitle="Close"
          onClose={() => setOpen(false)}
          enableXClose
        >
          <div className="h-[70vh] flex flex-col gap-5">
            <section className="flex flex-col min-h-0 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">
                {t("Recent updates")}
              </h4>

              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              {isLoading && (
                <div className="px-3 py-2 space-y-3" aria-busy="true">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse space-y-1">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && (isEmptyList || !feed || feed.length === 0) && (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 italic">
                  {t("No recent updates")}
                </p>
              )}

              {!isLoading && !isEmptyList && feed && feed.length > 0 && (
                <ul className="flex flex-col">
                  {feed.map((item: RecentFeedItem, idx: number) => {
                    const dot = item.type === "large_seller" ? "large_seller" : (item.transactionCategory ?? "other");
                    const label = isDa ? dotLabel[dot]?.da : dotLabel[dot]?.en;
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.type === "large_seller" && item.sellerId) {
                              navigate(`/short-seller-details?seller=${item.sellerId}#${item.stockSymbol}`);
                            } else if (item.type === "insider" && item.issuerCvr) {
                              navigate(`/insider-details?cvr=${item.issuerCvr}`);
                            }
                            setOpen(false);
                          }}
                          className="w-full text-left block px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[dot]}`} aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight [overflow-wrap:anywhere]">
                                {item.type === "large_seller"
                                  ? `${item.stockSymbol}${item.value != null ? " · " + item.value.toFixed(2) + "%" : ""}`
                                  : (item.stockSymbol || item.issuerName)}
                              </p>
                              <div className="flex items-baseline justify-between gap-2 mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 [overflow-wrap:anywhere] min-w-0 flex-1">
                                  {item.type === "large_seller"
                                    ? (item.sellerName ?? label)
                                    : (item.personName
                                        ? `${item.personName} · ${label}${item.totalAmount != null ? " · " + formatAmount(item.totalAmount) + (item.currency ? " " + item.currency : "") : ""}`
                                        : label)}
                                </p>
                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                  {formatFeedDate(item.date, todayLabel)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              </div>
            </section>

            {filteredAnalyses.length > 0 && (
              <section className="flex flex-col min-h-0 flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">
                  {t("Analysis")}
                </h4>
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                <ul className="flex flex-col">
                  {filteredAnalyses.map((a) => (
                    <li key={a.slug}>
                      <Link
                        to={`/analyse/${a.slug}`}
                        onClick={() => {
                          trackEvent("analysis_link_click", { click_source: "mobile_panel" });
                          setOpen(false);
                        }}
                        className="block px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight [overflow-wrap:anywhere]">
                          {isDa ? a.subtitle.da : a.subtitle.en}
                        </p>
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 [overflow-wrap:anywhere] min-w-0 flex-1">
                            {a.title}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                            {isDa ? a.date.da : a.date.en}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                </div>
              </section>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
