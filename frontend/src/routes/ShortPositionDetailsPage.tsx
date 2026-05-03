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
import Modal from "../components/UI/Modal";
import { formatNum } from "../utils/format";

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
  const [showPriceFlowAnnouncement, setShowPriceFlowAnnouncement] = useState(
    () => localStorage.getItem("priceFlowAnnouncementDismissed") !== "1"
  );

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
    content = (
      <>
        <div className="text-center pb-1 sm:pb-2 dark:text-white shrink-0">
          <h1 className="text-base sm:text-xl">
            {data.historic.length > 0 && data.historic[0].name}
          </h1>
          {data.historic.length > 0 && (
            <>
              <div className="flex items-center justify-center gap-4 mt-1">
                <span className="text-4xl sm:text-5xl font-bold tabular-nums leading-none">
                  {formatNum(data.historic[0].value, 2)}%
                </span>
                <div className="flex flex-col gap-1">
                  {data.historic.length > 1 && (
                    <ChangeIndicator
                      value={data.historic[0].value}
                      prevValue={data.historic[1].value}
                      small
                    />
                  )}
                  {data.velocity7d != null && (
                    <span className={`text-[11px] rounded px-1 py-px font-medium tabular-nums w-full text-center ${
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
              </div>
              {(data.percentileAllTime != null || data.daysToCover != null) && (
                <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap text-xs sm:text-sm tabular-nums text-gray-600 dark:text-gray-300">
                  {data.percentileAllTime != null && (
                    <span className="rounded px-1.5 py-px font-medium bg-amber-500/10 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400">
                      {formatOrdinal(Math.round(data.percentileAllTime), i18n.language)} {t("percentile")}
                    </span>
                  )}
                  {data.percentileAllTime != null && data.daysToCover != null && (
                    <span aria-hidden="true">·</span>
                  )}
                  {data.daysToCover != null && (
                    <span>{formatNum(data.daysToCover, 1)} {t("days to cover")}</span>
                  )}
                </div>
              )}
            </>
          )}
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-0.5 tabular-nums">
            {data.sellers ? data.sellers.length : 0} {(data.sellers?.length ?? 0) === 1 ? t("large seller") : t("large sellers")}
            {(data.sellers?.length ?? 0) > 0 && (
              <>
                {" · "}
                {formatNum((data.sellers as { value: number }[]).reduce((sum, s) => sum + (s.value ?? 0), 0), 2)}% {t("combined")}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col flex-1 min-h-0">
          <div className="mb-3 shrink-0">
            <PricePointChart
              data={processChartValues(data.chartValues, selectedPeriod)}
              priceFlow={data.priceFlow ?? []}
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
          <div className="mb-1 flex justify-center gap-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
            {detailOptions.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedDetailOption(option)}
                className={`pt-2 pb-3 text-xs sm:text-sm font-medium transition-colors duration-200 border-b-2 -mb-px ${
                  selectedDetailOption === option
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                }`}
              >
                {t(option)}
              </button>
            ))}
          </div>

          {selectedDetailOption === "Historic data" && (
            <PricePointList pricePoints={data.historic} />
          )}

          {selectedDetailOption === "Largest sellers" && (
            <LargeShortSellingList sellings={data.sellers} />
          )}

          {selectedDetailOption === "Price flow" && (
            <PriceFlowList buckets={data.priceFlow ?? []} />
          )}

        </div>
      </>
    );
  }

  return (
    <div className="h-dvh dark:bg-[#121212] flex flex-col overflow-hidden [@media(max-height:900px)_and_(orientation:landscape)]:overflow-auto [@media(max-height:900px)_and_(orientation:landscape)]:h-auto [@media(max-height:900px)_and_(orientation:landscape)]:min-h-dvh">
      <title>{stockName ? `Zirium | ${stockSymbol} – ${stockName}` : "Zirium | Stock Details"}</title>
      {stockName && (
        <meta name="description" content={`View short position data, charts, and largest sellers for ${stockName} (${stockSymbol}).`} />
      )}
      <PageTemplate>
        <div className="w-screen lg:justify-center lg:gap-4 m-auto flex flex-col flex-1 min-h-0 lg:flex-row">
          <div className="w-1/3 justify-end items-center hidden"></div>

          <div className="lg:w-[900px] flex flex-col flex-1 min-h-0 lg:flex-initial">
            <div className="flex place-content-between shrink-0">
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
              <div className="flex items-center gap-1 sm:gap-3 pr-2 pt-4">
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
                  className="text-sm font-medium text-blue-500 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:ring-2 focus:ring-blue-300 transition-colors"
                >
                  {t("Help")}
                </button>
              </div>
            </div>
            {content}
          </div>

          <div className="w-1/3 justify-end items-center hidden"></div>
        </div>
      </PageTemplate>
      {showHelp && (
        <div className="w-screen lg:w-[900px] m-auto">
          <DetailsHelpDialog onClose={() => setShowHelp(false)} sharesOutstanding={data?.sharesOutstanding ?? null} />
        </div>
      )}
      {showPriceFlowAnnouncement && (
        <Modal
          title=""
          closeButtonTitle={t("Got it")}
          onClose={() => {
            setShowPriceFlowAnnouncement(false);
            localStorage.setItem("priceFlowAnnouncementDismissed", "1");
          }}
          enableXClose={true}
          centerOnMobile={true}
        >
          <div className="space-y-4">
            <div className="text-center pt-1 pb-2">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-700 bg-blue-50 dark:text-blue-200 dark:bg-blue-900/30 px-3 py-1 rounded-full mb-3">
                {t("New feature")}
              </span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {t("Price flow")}
              </h2>
              <p className="text-gray-700 dark:text-gray-200 text-base font-medium mt-1">
                {t("Know where shorts are trapped")}
              </p>
            </div>
            <div className="space-y-3 text-[15px]">
              <div className="flex gap-3">
                <span className="text-lg mt-0.5">📊</span>
                <p>{t("The Price flow tab breaks down all disclosed short changes into 2%-wide price bands, so you can spot at what price the pressure is concentrated.")}</p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg mt-0.5">📈</span>
                <p>{t("When closing prices are enabled on the chart, the same distribution is shown as a bar profile on the left edge of the chart.")}</p>
              </div>
            </div>
            <p className="text-sm pt-1">{t("Tap the Help button for a full explanation.")}</p>
          </div>
        </Modal>
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
