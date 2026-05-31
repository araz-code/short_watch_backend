import { useQuery } from "@tanstack/react-query";
import { fetchTopLists, TopLists, TopListStock, TopListShortedStock, TopListActiveStock, TopListDeltaStock, TopListDaysToCoverStock, TopListShortSellersStock } from "../apis/ShortPositionAPI";
import PageTemplate from "../components/PageTemplate";
import RecentUpdatesSidebar from "../components/RecentUpdatesSidebar";
import RecentlyVisitedSidebar from "../components/RecentlyVisitedSidebar";
import AnalysesSidebar from "../components/AnalysesSidebar";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { useTranslation } from "react-i18next";
import { trackPageView } from "../analytics";
import { formatNum } from "../utils/format";

const medals = ["🥇", "🥈", "🥉"];

const RankList: React.FC<{
  title: string;
  subtitle: string;
  items: TopListStock[];
  renderExtra?: (item: TopListStock, index: number) => React.ReactNode;
}> = ({ title, subtitle, items, renderExtra }) => {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {title}
      </h2>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
        {subtitle}
      </p>
      <div className="space-y-2">
        {items.map((stock, index) => (
          <Link
            key={stock.code}
            to={`/short-watch-details?code=${stock.code}`}
          >
            <div className={`flex items-center gap-4 px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 mb-2 ${index % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"}`}>
              <span className="text-xl w-8 text-center shrink-0">
                {index < 3 ? medals[index] : (
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500">
                    {index + 1}
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                  {stock.symbol}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {stock.name}
                </p>
              </div>
              {renderExtra && renderExtra(stock, index)}
              <svg
                className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const TopListsPage: React.FC = () => {
  const { t } = useTranslation();

  const { data, isLoading, isError, error } = useQuery<TopLists>({
    queryKey: ["topLists"],
    staleTime: 60000,
    queryFn: ({ signal }) => fetchTopLists({ signal }),
  });

  useEffect(() => {
    trackPageView("/top-lists", "top lists");
  }, []);

  let content;

  if (isLoading) {
    content = (
      <div className="grid place-items-center h-screen">
        <LoadingIndicator />
      </div>
    );
  } else if (isError) {
    const errorInfo = error as { info?: { message?: string } };
    content = (
      <ErrorBlock
        title={t("An error occurred")}
        message={errorInfo.info?.message || t("Failed to fetch data.")}
      />
    );
  } else if (data) {
    content = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12 px-4">
        <RankList
          title={t("Most shorted")}
          subtitle={t("Top 10 highest short positions right now")}
          items={data.mostShorted}
          renderExtra={(stock) => (
            <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums shrink-0">
              {formatNum((stock as TopListShortedStock).value, 2)}%
            </span>
          )}
        />
        <RankList
          title={t("Most position changes")}
          subtitle={t("Top 10 stocks with most position changes in the last 30 days")}
          items={data.mostActive}
          renderExtra={(stock) => (
            <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums shrink-0">
              {(stock as TopListActiveStock).updates} {t("updates")}
            </span>
          )}
        />
        <RankList
          title={t("Most viewed")}
          subtitle={t("Top 10 most viewed stocks in the last 30 days")}
          items={data.mostViewed}
        />
        <RankList
          title={t("Most followed")}
          subtitle={t("Top 10 most followed stocks by app users")}
          items={data.mostFollowed}
        />
        <RankList
          title={t("Longest days to cover")}
          subtitle={t("Top 10 stocks with the most days needed to cover short positions based on 30-day avg volume")}
          items={data.mostDaysToCover}
          renderExtra={(stock) => (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums shrink-0">
              {formatNum((stock as TopListDaysToCoverStock).days, 1)}d
            </span>
          )}
        />
        <RankList
          title={t("Most short sellers")}
          subtitle={t("Top 10 stocks with the most unique active short sellers")}
          items={data.mostShortSellers}
          renderExtra={(stock) => (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums shrink-0">
              {(stock as TopListShortSellersStock).sellers} {t("sellers")}
            </span>
          )}
        />
        <RankList
          title={t("Largest increases")}
          subtitle={t("Top 10 largest increases in short position over the last 30 days")}
          items={data.mostRising}
          renderExtra={(stock) => (
            <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums shrink-0">
              +{formatNum((stock as TopListDeltaStock).delta, 2)}%
            </span>
          )}
        />
        <RankList
          title={t("Largest decreases")}
          subtitle={t("Top 10 largest decreases in short position over the last 30 days")}
          items={data.mostFalling}
          renderExtra={(stock) => (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
              {formatNum((stock as TopListDeltaStock).delta, 2)}%
            </span>
          )}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#0d0d12]">
      <title>Zirium | Top Lists</title>
      <meta name="description" content="Discover the top 10 most shorted, most viewed, and most followed Danish stocks. Updated daily." />
      <PageTemplate customLayout={true}>
        <div className="w-screen lg:flex lg:justify-center lg:gap-4 m-auto">
          <aside className="hidden xl:block xl:flex-1">
            <div className="sticky top-0 flex flex-col items-center pt-6 px-4 gap-4 max-h-screen overflow-y-auto">
              <RecentUpdatesSidebar days={30} />
              <AnalysesSidebar source="sidebar_top_lists" />
            </div>
          </aside>
          <div className="lg:w-[900px]">
            <div className="pt-6 pb-6 px-2 text-center">
              <h1 className="text-2xl lg:text-3xl dark:text-white">
                {t("Top Lists")}
              </h1>
            </div>
            {content}
            <div className="h-8"></div>
          </div>
          <aside className="hidden xl:block xl:flex-1">
            <div className="flex flex-col items-center pt-[88px] px-4 gap-4">
              <RecentlyVisitedSidebar />
            </div>
          </aside>
        </div>
      </PageTemplate>
    </div>
  );
};

export default TopListsPage;
