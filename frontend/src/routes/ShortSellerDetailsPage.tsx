import { useQuery } from "@tanstack/react-query";
import {
  useSearchParams,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import { fetchLargeShortSellerDetails, fetchLargestShortSellers, HOST } from "../apis/ShortPositionAPI";
import { useEffect, useMemo, useState } from "react";
import ShortSeller from "../models/ShortSeller";
import PageTemplate from "../components/PageTemplate";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { trackEvent, trackPageView } from "../analytics";
import Announcement from "../models/Announcement";
import ShortSellerDetails from "../models/ShortSellerDetails";
import ShortSellerAnnouncementRow from "../components/ShortSellerAnnouncementRow";
import ShortSellerDetailsHelpDialog from "../components/ShortSellerDetailsHelpDialog";
import RecentlyVisitedSidebar from "../components/RecentlyVisitedSidebar";
import RecentUpdatesSidebar from "../components/RecentUpdatesSidebar";
import AnalysesSidebar from "../components/AnalysesSidebar";
import { recordVisit } from "../utils/recentlyVisited";

interface GroupedAnnouncements {
  [key: string]: Announcement[];
}

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "2-digit" });
};

const SellerChart: React.FC<{ announcements: Announcement[] }> = ({ announcements }) => {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const sorted = [...announcements].sort((a, b) => a.publishedDate.localeCompare(b.publishedDate));
  const data = sorted.map((a) => ({ date: a.publishedDate.slice(0, 10), value: a.value }));
  const minY = Math.max(0, Math.min(...data.map((d) => d.value)) - 0.2);
  const maxY = Math.max(...data.map((d) => d.value)) + 0.3;

  return (
    <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 px-2 pt-3 pb-2 mb-3">
      <ResponsiveContainer width="100%" height={130}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sellerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#007AFF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid horizontal vertical={false} stroke={isDark ? "#2a2a35" : "#f0f0f0"} strokeWidth={1} />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: isDark ? "#666" : "#bbb" }} tickFormatter={fmtDate} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: isDark ? "#666" : "#bbb" }} tickFormatter={(v) => `${v}%`} domain={[minY, maxY]} width={32} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: isDark ? "#19191f" : "#fff", border: "1px solid #e5e5e5", borderRadius: 12, fontSize: 12 }}
            formatter={(v) => [`${Number(v).toFixed(2)}%`, ""]}
            labelFormatter={(label) => fmtDate(String(label))}
          />
          <Area type="step" dataKey="value" stroke="#007AFF" strokeWidth={2.5} fill="url(#sellerGrad)" dot={{ r: 3, fill: "#007AFF", strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const ShortSellerDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const seller = searchParams.get("seller");
  const [showHelp, setShowHelp] = useState(false);


  const { data, isLoading, isError, error } = useQuery<ShortSellerDetails>({
    queryKey: [searchParams.get("seller")],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: ({ signal }) =>
      fetchLargeShortSellerDetails({
        signal,
        seller: seller ?? "",
      }),
  });

  // Genbruger samme queryKey som ShortSellersPage — react-query dedupliker.
  const { data: allSellers } = useQuery<ShortSeller[]>({
    queryKey: ["shortSellers"],
    staleTime: 30000,
    queryFn: ({ signal }) => fetchLargestShortSellers({ signal }),
  });

  // Map: stockCode → liste af ANDRE sellers (ikke den aktuelle) med current position i denne aktie.
  const otherSellersByStock = useMemo(() => {
    const map: Record<string, Array<{ id: string; name: string; value: number }>> = {};
    if (!allSellers || !data) return map;
    for (const other of allSellers) {
      if (other.id === data.id) continue;
      for (const pos of other.current) {
        const code = pos.stockCode;
        if (!map[code]) map[code] = [];
        map[code].push({ id: other.id, name: other.name, value: pos.value });
      }
    }
    for (const code in map) {
      map[code].sort((a, b) => b.value - a.value);
    }
    return map;
  }, [allSellers, data?.id]);

  useEffect(() => {
    trackEvent("seller_details_view", { seller: seller ?? "" });
    trackPageView(`/short-seller-details`, "short seller details");
  }, [seller]);

  useEffect(() => {
    if (seller && data?.name) {
      recordVisit({
        path: `/short-seller-details?seller=${seller}`,
        title: data.name,
        type: "seller_detail",
      });
    }
  }, [seller, data?.name]);

  useEffect(() => {
    if (!data || !location.hash) return;
    const id = location.hash.slice(1);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  }, [data, location.hash]);

  let content;

  if (isLoading) {
    content = (
      <div className="grid place-items-center h-[calc(100dvh)]">
        <LoadingIndicator />;
      </div>
    );
  } else if (isError) {
    const errorInfo = error as { info?: { message?: string } };

    content = (
      <ErrorBlock
        title={t("An error occurred")}
        message={errorInfo.info?.message || t("Failed to fetch details.")}
      />
    );
  } else if (!data) {
    content = (
      <ErrorBlock
        title={t("Unknown stock")}
        message={t("Failed to fetch details.")}
      />
    );
  } else if (data) {
    const groupedAnnouncements: GroupedAnnouncements =
      data.announcements.reduce<GroupedAnnouncements>((acc, announcement) => {
        const symbol = announcement.stockSymbol;

        if (!acc[symbol]) {
          acc[symbol] = [];
        }

        acc[symbol].push(announcement);

        return acc;
      }, {});

    // Aggregeret oversigt: hver gruppes første announcement er den seneste.
    // isHistoric = true betyder positionen er lukket (faldet under 0,5%).
    const stockSummaries = Object.entries(groupedAnnouncements).map(([symbol, list]) => {
      const latest = list[0];
      const oldest = list[list.length - 1];
      return {
        symbol,
        stockCode: latest.stockCode,
        latestValue: latest.value,
        latestDate: latest.publishedDate,
        firstDate: oldest.publishedDate,
        isActive: !latest.isHistoric,
        announcementCount: list.length,
      };
    });

    const active = stockSummaries.filter((s) => s.isActive);
    const closed = stockSummaries.filter((s) => !s.isActive);
    const totalExposure = active.reduce((sum, s) => sum + s.latestValue, 0);
    const biggest = active.length > 0
      ? active.reduce((max, s) => (s.latestValue > max.latestValue ? s : max), active[0])
      : null;
    const latestActivity = stockSummaries.length > 0
      ? stockSummaries.reduce((max, s) => (s.latestDate > max.latestDate ? s : max), stockSummaries[0]).latestDate
      : null;

    const fmtNumComma = (n: number, decimals: number) =>
      n.toFixed(decimals).replace(".", ",");

    const fmtRelative = (iso: string | null): string => {
      if (!iso) return "—";
      const then = new Date(iso);
      const now = new Date();
      const diffDays = Math.round(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
          Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())) / 86_400_000
      );
      if (diffDays <= 0) return t("today");
      if (diffDays === 1) return "1d";
      if (diffDays < 30) return `${diffDays}d`;
      const months = Math.round(diffDays / 30);
      if (months < 12) return `${months}mo`;
      const years = (diffDays / 365).toFixed(1).replace(".", ",");
      return `${years} år`;
    };

    content = (
      <>
        <div className="text-center pb-4 dark:text-white shrink-0">
          <h1 className="text-xl">{data.name}</h1>
        </div>

        <div className="flex-1 min-h-0 [@media(max-height:900px)_and_(orientation:landscape)]:flex-none">
          <div className="overflow-y-auto h-full [@media(max-height:900px)_and_(orientation:landscape)]:overflow-visible [@media(max-height:900px)_and_(orientation:landscape)]:h-auto">
            {/* Fund-profile aggregeret oversigt (inde i scroll så det også scroller på små skærme) */}
            <div className="mx-2 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold">
                    {t("Active positions")}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">
                    {active.length}
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">
                    {active.length === 1 ? t("stock") : t("stocks")}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold">
                    {t("Total exposure")}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">
                    {fmtNumComma(totalExposure, 2)}%
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">{t("combined")}</p>
                </div>
                <div className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold">
                    {t("Biggest position")}
                  </p>
                  {biggest ? (
                    <>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">
                        {biggest.symbol}
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 tabular-nums">
                        {fmtNumComma(biggest.latestValue, 2)}%
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl sm:text-2xl font-bold text-gray-400 dark:text-gray-500 tabular-nums mt-1">
                        —
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300">{t("none")}</p>
                    </>
                  )}
                </div>
                <div className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold">
                    {t("Last activity")}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">
                    {fmtRelative(latestActivity)}
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">{t("ago")}</p>
                </div>
              </div>

              {closed.length > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-300 text-center mt-2.5">
                  {closed.length} {closed.length === 1 ? t("closed position") : t("closed positions")}
                </p>
              )}
            </div>
            <ul className="mx-4">
              {Object.keys(groupedAnnouncements).map((symbol) => (
                <div key={symbol}>
                  <div
                    className="mt-3 mb-1 ml-2"
                    id={symbol}
                  >
                    <Link
                      to={`/short-watch-details?code=${groupedAnnouncements[symbol][0].stockCode}`}
                      onClick={() => {
                        trackEvent("seller_to_position_click", {
                          seller: data.name,
                          symbol: groupedAnnouncements[symbol][0].stockSymbol,
                        });
                      }}
                      className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      {symbol} →
                    </Link>
                  </div>
                  {groupedAnnouncements[symbol].length > 1 && (
                    <SellerChart announcements={groupedAnnouncements[symbol]} />
                  )}
                  <ul>
                    {groupedAnnouncements[symbol].map((announcement, index) => (
                      <li key={announcement.dfsaId}>
                        <ShortSellerAnnouncementRow
                          {...announcement}
                          first={index === 0}
                          isEven={index % 2 === 0}
                        />
                      </li>
                    ))}
                  </ul>
                  {(() => {
                    const stockCode = groupedAnnouncements[symbol][0].stockCode;
                    const others = otherSellersByStock[stockCode] || [];
                    if (others.length === 0) return null;
                    const visible = others.slice(0, 5);
                    const remaining = others.length - visible.length;
                    return (
                      <p className="mx-4 mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        <span className="text-gray-500 dark:text-gray-400">
                          {t("Also shorted by")}:{" "}
                        </span>
                        {visible.map((o, i) => (
                          <span key={o.id}>
                            <Link
                              to={`/short-seller-details?seller=${o.id}#${symbol}`}
                              onClick={() =>
                                trackEvent("seller_link_click", {
                                  click_source: "overlap",
                                  from_seller: data.name,
                                  to_seller: o.name,
                                  symbol,
                                })
                              }
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {o.name}
                            </Link>
                            {i < visible.length - 1 && (
                              <span className="text-gray-400 dark:text-gray-500"> · </span>
                            )}
                          </span>
                        ))}
                        {remaining > 0 && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {" "}+{remaining} {t("more")}
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </div>
              ))}
            </ul>
            <div className="h-6"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-dvh dark:bg-[#0d0d12] flex flex-col overflow-hidden [@media(max-height:900px)_and_(orientation:landscape)]:overflow-auto [@media(max-height:900px)_and_(orientation:landscape)]:h-auto [@media(max-height:900px)_and_(orientation:landscape)]:min-h-dvh">
      <title>{data?.name ? `Zirium | ${data.name}` : "Zirium | Short Seller Details"}</title>
      {data?.name && (
        <meta name="description" content={`View all short selling positions held by ${data.name} in Danish stocks.`} />
      )}
      <PageTemplate customLayout={true}>
        <div className="w-screen lg:justify-center lg:gap-4 m-auto flex flex-col flex-1 min-h-0 lg:flex-row">
          <div className="hidden xl:block xl:flex-1 relative">
            <div className="absolute inset-0 flex flex-col items-center pt-[88px] px-4 overflow-y-auto gap-4">
              <RecentUpdatesSidebar days={30} />
              <AnalysesSidebar source="sidebar_seller_detail" />
            </div>
          </div>

          <div className="lg:w-[900px] flex flex-col flex-1 min-h-0 lg:flex-initial">
            <div className="flex items-center justify-between pr-2 shrink-0">
              <button
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-transparent border-none text-base pl-4 pt-4 inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm self-start"
                onClick={() => {
                  if (window.history.length > 1 && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate("/short-sellers");
                  }
                }}
              >
                <span aria-hidden="true">←</span>
                {t("Back")}
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent("help_dialog_open", { page: "seller_details" });
                  fetch(`${HOST}/stats/visit/help-seller-details/`).catch(() => {});
                  setShowHelp(true);
                }}
                aria-label={t("Help")}
                className="bg-transparent border-none text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 focus:ring-2 focus:ring-blue-300 rounded-sm"
              >
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </button>
            </div>
            {content}
          </div>

          <div className="hidden xl:block xl:flex-1 relative">
            <div className="absolute inset-0 flex flex-col items-center pt-[88px] px-4 overflow-y-auto gap-4">
              <RecentlyVisitedSidebar />
            </div>
          </div>
        </div>
      </PageTemplate>

      {showHelp && (
        <div className="w-screen lg:w-[900px] m-auto">
          <ShortSellerDetailsHelpDialog onClose={() => setShowHelp(false)} />
        </div>
      )}
    </div>
  );
};

export default ShortSellerDetailsPage;
