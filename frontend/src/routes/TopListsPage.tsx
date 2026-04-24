import { useQuery } from "react-query";
import { fetchTopLists, TopLists, TopListStock, TopListShortedStock, TopListActiveStock } from "../apis/ShortPositionAPI";
import PageTemplate from "../components/PageTemplate";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { useTranslation } from "react-i18next";
import { trackPageView } from "../analytics";
import { useSEO } from "../utils/useSEO";

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
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        {subtitle}
      </p>
      <div className="space-y-2">
        {items.map((stock, index) => (
          <Link
            key={stock.code}
            to={`/short-watch-details?code=${stock.code}`}
          >
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 mb-2">
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
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                  {stock.name}
                </p>
              </div>
              {renderExtra && renderExtra(stock, index)}
              <svg
                className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
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

  useSEO("Top Lists", "Discover the top 10 most shorted, most viewed, and most followed Danish stocks. Updated daily.");

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
            <span className="text-sm font-semibold text-red-500 tabular-nums shrink-0">
              {(stock as TopListShortedStock).value.toFixed(2)}%
            </span>
          )}
        />
        <RankList
          title={t("Most position changes")}
          subtitle={t("Top 10 stocks with most position changes in the last 30 days")}
          items={data.mostActive}
          renderExtra={(stock) => (
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-[#121212] overflow-auto">
      <PageTemplate>
        <div className="w-screen lg:flex lg:justify-center lg:gap-4 m-auto">
          <div className="lg:w-[900px]">
            <div className="pt-6 pb-6 px-2 text-center">
              <h1 className="text-2xl lg:text-3xl dark:text-white">
                {t("Top Lists")}
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                {t("Based on activity from the last 30 days")}
              </p>
              <div className="mt-3 mx-auto w-12 h-0.5 rounded-full bg-blue-500/40" />
            </div>
            {content}
            <div className="h-8"></div>
          </div>
        </div>
      </PageTemplate>
    </div>
  );
};

export default TopListsPage;
