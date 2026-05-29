import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchShortPositionDetails, HOST } from "../apis/ShortPositionAPI";
import PricePointChart from "../components/PricePointChart";
import ToggleSwitch from "../components/UI/RadioButtonToggle";
import { useEffect, useState } from "react";
import PageTemplate from "../components/PageTemplate";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { useTranslation } from "react-i18next";
import { trackEvent, trackPageView } from "../analytics";
import ChartPricePoint from "../models/ChartPricePoint";
import PricePointList from "../components/PricePointList";
import LargeShortSellingList from "../components/LargeShortSellingList";
import FavoriteToggleButton from "../components/UI/FavoriteToggleButton";
import ChangeIndicator from "../components/UI/ChangeIndicator";
import PriceFlowList from "../components/PriceFlowList";
import DetailsHelpDialog from "../components/DetailsHelpDialog";
import { formatNum } from "../utils/format";
import { computePriceFlow } from "../utils/computePriceFlow";
import RecentUpdatesSidebar from "../components/RecentUpdatesSidebar";
import AnalysesSidebar from "../components/AnalysesSidebar";
import MobileSidePanel from "../components/MobileSidePanel";
import { analyses } from "../data/analyses";
import { recordVisit } from "../utils/recentlyVisited";
import RecentlyVisitedSidebar from "../components/RecentlyVisitedSidebar";

const detailOptions = ["Historic data", "Largest sellers", "Price flow"];
const periodOptions = ["1W", "1M", "3M", "6M", "YTD", "Max"];

const enOrdinalSuffixes: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };

function formatOrdinal(n: number, locale: string): string {
  const rules = new Intl.PluralRules(locale, { type: "ordinal" });
  if (locale.startsWith("en")) {
    return `${n}${enOrdinalSuffixes[rules.select(n)] ?? "th"}`;
  }
  return `${n}.`;
}

const processChartValues = (
  pricePoints: ChartPricePoint[],
  period: string
): ChartPricePoint[] => {
  const newestEntries: { [key: string]: ChartPricePoint } = {};

  for (const pricePoint of pricePoints) {
    const timestamp = new Date(pricePoint.timestamp);
    const dateWithoutTime = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate()
    ).toISOString();

    if (newestEntries[dateWithoutTime]) {
      const currentNewestEntry = newestEntries[dateWithoutTime];
      if (pricePoint.timestamp > currentNewestEntry.timestamp) {
        newestEntries[dateWithoutTime] = pricePoint;
      }
    } else {
      newestEntries[dateWithoutTime] = pricePoint;
    }
  }

  const processed = Object.values(newestEntries);

  const sortedChartData = processed.sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );

  const getFilteredData = (days: number): ChartPricePoint[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return sortedChartData.filter(
      (pricePoint) => new Date(pricePoint.timestamp) >= cutoffDate
    );
  };

  const getFilteredDataByMonths = (months: number): ChartPricePoint[] => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    return sortedChartData.filter(
      (pricePoint) => new Date(pricePoint.timestamp) >= cutoffDate
    );
  };

  const getFilteredDataYTD = (): ChartPricePoint[] => {
    const currentYear = new Date().getFullYear();
    return sortedChartData.filter(
      (pricePoint) =>
        new Date(pricePoint.timestamp).getFullYear() === currentYear
    );
  };

  switch (period) {
    case "1W":
      return getFilteredData(7);
    case "1M":
      return getFilteredDataByMonths(1);
    case "3M":
      return getFilteredDataByMonths(3);
    case "6M":
      return getFilteredDataByMonths(6);
    case "YTD":
      return getFilteredDataYTD();
    case "Max":
      return sortedChartData;
    default:
      throw new Error("Invalid period");
  }
};

const TAB_PARAM_MAP: Record<string, string> = {
  "historic": "Historic data",
  "sellers": "Largest sellers",
  "flow": "Price flow",
};
const TAB_REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_PARAM_MAP).map(([k, v]) => [v, k])
);

const ShortPositionDetailsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedDetailOption, setSelectedDetailOption] = useState(() => {
    const tab = searchParams.get("tab");
    return (tab && TAB_PARAM_MAP[tab]) || detailOptions[0];
  });
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const savedSelectedPeriod = localStorage.getItem("selectedPeriod");
    return savedSelectedPeriod && periodOptions.includes(savedSelectedPeriod)
      ? savedSelectedPeriod
      : periodOptions[periodOptions.length - 1];
  });
  const [myList, setMyList] = useState<string[]>(() => {
    const savedMyList = localStorage.getItem("myList");
    return savedMyList ? JSON.parse(savedMyList) : [];
  });
  const [showHelp, setShowHelp] = useState(false);
  const code = searchParams.get("code");
  const isFavorite = code ? myList.includes(code) : false;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [searchParams.get("code")],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: ({ signal }) =>
      fetchShortPositionDetails({
        signal,
        category: isFavorite ? "watch" : "pick",
        code: code ?? "",
      }),
  });

  const stockName = data?.historic?.[0]?.name;
  const stockSymbol = data?.historic?.[0]?.symbol;

  // The price chart, volume and price flow are hidden when an admin unchecks
  // "show price data" on the stock (e.g. Noble, which has no Copenhagen price
  // feed). A missing/undefined flag is treated as "show" so older cached
  // responses keep working.
  const priceDataDisabled = data?.showPriceData === false;
  const visibleDetailOptions = priceDataDisabled
    ? detailOptions.filter((option) => option !== "Price flow")
    : detailOptions;
  const activeDetailOption = visibleDetailOptions.includes(selectedDetailOption)
    ? selectedDetailOption
    : visibleDetailOptions[0];

  useEffect(() => {
    localStorage.setItem("selectedPeriod", selectedPeriod);
    localStorage.setItem("myList", JSON.stringify(myList));
  }, [selectedPeriod, myList]);

  useEffect(() => {
    const tabKey = TAB_REVERSE_MAP[selectedDetailOption];
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabKey && tabKey !== "historic") {
        next.set("tab", tabKey);
      } else {
        next.delete("tab");
      }
      return next;
    }, { replace: true });
  }, [selectedDetailOption, setSearchParams]);

  useEffect(() => {
    if (selectedDetailOption === "Largest sellers") {
      trackEvent("largest_sellers_view", { position_code: code ?? "" });
    }
    if (selectedDetailOption === "Price flow") {
      trackEvent("price_flow_view", { position_code: code ?? "" });
      fetch(`${HOST}/stats/visit/price-flow/${code ?? ""}/`).catch(() => {});
    }
  }, [selectedDetailOption, code]);

  useEffect(() => {
    trackEvent("position_details_view", { position_code: code ?? "" });
    trackPageView(`/short-watch-details`, "short watch details");
  }, [code]);

  useEffect(() => {
    if (code && stockSymbol && stockName) {
      recordVisit({
        path: `/short-watch-details?code=${code}`,
        title: stockSymbol,
        subtitle: stockName,
        type: "stock_detail",
      });
    }
  }, [code, stockSymbol, stockName]);

  useEffect(() => {
    trackEvent("period_change", { page: "position_details", period: selectedPeriod });
  }, [selectedPeriod]);

  const addToMyList = () => {
    if (code) {
      setMyList((prev) => [...prev, code]);

      trackEvent("watchlist_add", { position_code: code });
    }
  };

  const removeFromMyList = () => {
    if (code) {
      setMyList((prev) => prev.filter((item) => item !== code));
      trackEvent("watchlist_remove", { position_code: code });
    }
  };

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
  } else if (data && data.historic.length === 0) {
    content = (
      <ErrorBlock
        title={t("Unknown stock")}
        message={t("Failed to fetch details.")}
      />
    );
  } else if (data) {
    const filteredChartValues = processChartValues(data.chartValues, selectedPeriod);
    const filteredPriceFlow = computePriceFlow(filteredChartValues, data.sharesOutstanding ?? null);

    const totalSellerPct = (data.sellers as { value: number }[] | null | undefined)?.reduce((sum, s) => sum + (s.value ?? 0), 0) ?? 0;
    const sellerCount = data.sellers?.length ?? 0;
    const analysisForStock = code ? analyses.find((a) => a.code === code) : undefined;

    content = (
      <>
        {/* Mobile/tablet: 3 compact KPI cards (big number lives in the table below) */}
        <div className="lg:hidden pb-1 sm:pb-2 dark:text-white shrink-0">
          <div className="grid grid-cols-3 gap-2 px-3">
            <dl className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1.5 text-center m-0">
              <dt className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold leading-tight">
                {t("percentile")}
              </dt>
              <dd className="ml-0 text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5 leading-tight">
                {data.percentileAllTime != null
                  ? formatOrdinal(Math.floor(data.percentileAllTime), i18n.language)
                  : "—"}
              </dd>
              <dd className="ml-0 text-[11px] leading-tight invisible" aria-hidden="true">·</dd>
            </dl>

            <dl className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1.5 text-center m-0">
              <dt className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold leading-tight">
                {t("days to cover")}
              </dt>
              <dd className="ml-0 text-base sm:text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-0.5 leading-tight">
                {data.daysToCover != null ? formatNum(data.daysToCover, 1) : "—"}
              </dd>
              <dd className="ml-0 text-[11px] leading-tight invisible" aria-hidden="true">·</dd>
            </dl>

            <dl className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-1.5 text-center m-0">
              <dt className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold leading-tight">
                {sellerCount === 1 ? t("large seller") : t("large sellers")}
              </dt>
              <dd className="ml-0 text-base sm:text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-0.5 leading-tight">
                {sellerCount}
              </dd>
              <dd className="ml-0 text-[11px] text-gray-600 dark:text-gray-300 tabular-nums leading-tight">
                {sellerCount > 0 ? `${formatNum(totalSellerPct, 2)}% ${t("combined")}` : "—"}
              </dd>
            </dl>
          </div>

          {analysisForStock && (
            <div className="text-center mt-2">
              <a
                href={`/analyse/${analysisForStock.slug}`}
                onClick={() => trackEvent("analysis_link_click", { click_source: "stock_detail", slug: analysisForStock.slug })}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                {t("Læs seneste analyse")} →
              </a>
            </div>
          )}
        </div>

        {/* Desktop KPI cards */}
        <div className="hidden lg:block pb-3 shrink-0 dark:text-white">
          <div className="flex gap-3">
            {/* Hero block: Short Interest */}
            <div className="basis-1/2 bg-blue-50/40 dark:bg-blue-950/20 border border-gray-100 dark:border-gray-800 rounded-lg px-5 py-4 text-center flex flex-col justify-center">
              <p className="text-5xl font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                {data.historic.length > 0 ? `${formatNum(data.historic[0].value, 2)}%` : "—"}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap min-h-[24px]">
                {data.historic.length > 1 && (
                  <ChangeIndicator
                    value={data.historic[0].value}
                    prevValue={data.historic[1].value}
                  />
                )}
                {data.velocity7d != null && (
                  <span className={`text-xs rounded-md px-1.5 py-0.5 font-medium tabular-nums ${
                    data.velocity7d > 0
                      ? "bg-red-500/10 dark:bg-red-500/25 text-red-600 dark:text-red-400"
                      : data.velocity7d < 0
                      ? "bg-emerald-500/10 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}>
                    {data.velocity7d >= 0 ? "+" : ""}{formatNum(data.velocity7d, 2)}% 7d
                  </span>
                )}
              </div>
              <p className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold mt-3">
                {t("Short interest")}
              </p>
            </div>

            {/* Right side: 3 mini KPIs */}
            <div className="basis-1/2 grid grid-cols-3 gap-3">
              <dl className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2.5 text-center flex flex-col justify-center m-0">
                <dt className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold">
                  {t("percentile")}
                </dt>
                <dd className="ml-0 text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
                  {data.percentileAllTime != null
                    ? formatOrdinal(Math.floor(data.percentileAllTime), i18n.language)
                    : "—"}
                </dd>
                <dd className="ml-0 text-[11px] invisible" aria-hidden="true">·</dd>
              </dl>

              <dl className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2.5 text-center flex flex-col justify-center m-0">
                <dt className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold">
                  {t("days to cover")}
                </dt>
                <dd className="ml-0 text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">
                  {data.daysToCover != null ? formatNum(data.daysToCover, 1) : "—"}
                </dd>
                <dd className="ml-0 text-[11px] invisible" aria-hidden="true">·</dd>
              </dl>

              <dl className="bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2.5 text-center flex flex-col justify-center m-0">
                <dt className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300 font-semibold">
                  {sellerCount === 1 ? t("large seller") : t("large sellers")}
                </dt>
                <dd className="ml-0 text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">
                  {sellerCount}
                </dd>
                <dd className="ml-0 text-[11px] text-gray-600 dark:text-gray-300 tabular-nums">
                  {sellerCount > 0 ? `${formatNum(totalSellerPct, 2)}% ${t("combined")}` : "—"}
                </dd>
              </dl>
            </div>
          </div>

          {analysisForStock && (
            <div className="text-center mt-2.5">
              <a
                href={`/analyse/${analysisForStock.slug}`}
                onClick={() => trackEvent("analysis_link_click", { click_source: "stock_detail", slug: analysisForStock.slug })}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                {t("Læs seneste analyse")} →
              </a>
            </div>
          )}
        </div>
        <div className="flex flex-col flex-1 min-h-0">
          {!priceDataDisabled && (
            <div className="mb-3 shrink-0">
              <PricePointChart
                data={filteredChartValues}
                priceFlow={filteredPriceFlow}
                symbol={data.historic.length > 0 && data.historic[0].symbol}
                periodControl={
                  <ToggleSwitch
                    options={periodOptions}
                    selectedOption={selectedPeriod}
                    onSelectChange={setSelectedPeriod}
                  />
                }
              />
            </div>
          )}
          <div className="mb-1 flex justify-center gap-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
            {visibleDetailOptions.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedDetailOption(option)}
                className={`pt-2 pb-3 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px ${
                  activeDetailOption === option
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                }`}
              >
                {t(option)}
              </button>
            ))}
          </div>

          {activeDetailOption === "Historic data" && (
            <PricePointList pricePoints={data.historic} />
          )}

          {activeDetailOption === "Largest sellers" && (
            <LargeShortSellingList sellings={data.sellers} />
          )}

          {activeDetailOption === "Price flow" && (
            <PriceFlowList buckets={filteredPriceFlow} />
          )}

        </div>
      </>
    );
  }

  return (
    <div className="h-dvh dark:bg-[#0d0d12] flex flex-col overflow-hidden [@media(max-height:900px)_and_(orientation:landscape)]:overflow-auto [@media(max-height:900px)_and_(orientation:landscape)]:h-auto [@media(max-height:900px)_and_(orientation:landscape)]:min-h-dvh">
      <title>{stockName ? `Zirium | ${stockSymbol} – ${stockName}` : "Zirium | Stock Details"}</title>
      {stockName && (
        <>
          <meta name="description" content={`View short position data, charts, and largest sellers for ${stockName} (${stockSymbol}).`} />
          <meta property="og:title" content={`${stockSymbol} – ${stockName} | Zirium`} />
          <meta property="og:description" content={`Se short-positioner, største short-sellere og historisk udvikling for ${stockName} (${stockSymbol}) på Zirium.`} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={`https://www.zirium.dk/short-watch-details?code=${code}`} />
          <meta property="og:image" content="https://www.zirium.dk/og-images/zirium-default.png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:type" content="image/png" />
          <meta property="og:site_name" content="Zirium" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${stockSymbol} – ${stockName} | Zirium`} />
          <meta name="twitter:description" content={`Se short-positioner, største short-sellere og historisk udvikling for ${stockName} (${stockSymbol}) på Zirium.`} />
          <meta name="twitter:image" content="https://www.zirium.dk/og-images/zirium-default.png" />
          <link rel="canonical" href={`https://www.zirium.dk/short-watch-details?code=${code}`} />
        </>
      )}
      <PageTemplate customLayout={true}>
        <div className="w-screen lg:justify-center lg:gap-4 m-auto flex flex-col flex-1 min-h-0 lg:flex-row">
          <div className="hidden xl:block xl:flex-1 relative">
            <div className="absolute inset-0 flex flex-col items-center pt-[88px] px-4 overflow-y-auto gap-4">
              {code && <RecentUpdatesSidebar code={code} />}
              <AnalysesSidebar code={code ?? undefined} source="sidebar_stock_detail" />
            </div>
          </div>
          <MobileSidePanel code={code ?? undefined} />

          <div className="lg:w-[900px] flex flex-col flex-1 min-h-0 lg:flex-initial">
            <div className="relative flex items-center justify-between shrink-0">
              <button
                className="text-blue-500 hover:text-blue-700 bg-transparent border-none text-base p-4 inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm min-h-[44px] min-w-[44px]"
                onClick={() => {
                  if (
                    window.history.length > 1 &&
                    window.history.state.idx > 0
                  ) {
                    navigate(-1);
                  } else {
                    navigate("/short-watch");
                  }
                }}
              >
                <span aria-hidden="true">←</span>
                {t("Back")}
              </button>
              <span className="absolute left-1/2 -translate-x-1/2 font-semibold text-sm tracking-wider dark:text-white pointer-events-none">
                {stockSymbol ?? code}
              </span>
              <div className="flex items-center gap-1 sm:gap-3 pr-2">
                <FavoriteToggleButton
                  isFavorite={isFavorite}
                  addToMyList={addToMyList}
                  removeFromMyList={removeFromMyList}
                />
                <button
                  type="button"
                  onClick={() => {
                    trackEvent("help_dialog_open", { page: "position_details" });
                    fetch(`${HOST}/stats/visit/help-details/`).catch(() => {});
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
          <DetailsHelpDialog onClose={() => setShowHelp(false)} sharesOutstanding={data?.sharesOutstanding ?? null} />
        </div>
      )}
    </div>
  );
};

export default ShortPositionDetailsPage;

/**
 * 
 *           <div className="w-1/3 justify-start items-center hidden">
            
            <a
              href="https://norskovcoaching.com/stresstilbud/"
              onClick={() => clicked("stresstilbud_clicked_detail")}
              target="_blank"
            >
              <img
                className="max-h-[350px] w-auto self-center pl-3"
                src={advertisement}
                onLoad={() => clicked("stresstilbud_appeared_detail")}
              />
            </a>
          </div>
 */
