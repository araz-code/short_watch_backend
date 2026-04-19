import { useQuery } from "react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchShortPositionDetails } from "../apis/ShortPositionAPI";
import PricePointChart from "../components/PricePointChart";
import ToggleSwitch from "../components/UI/RadioButtonToggle";
import { useEffect, useState } from "react";
import PageTemplate from "../components/PageTemplate";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { useTranslation } from "react-i18next";
import { handleClick, sendCustomPageView } from "../analytics";
import ChartPricePoint from "../models/ChartPricePoint";
import PricePointList from "../components/PricePointList";
import LargeShortSellingList from "../components/LargeShortSellingList";
import FavoriteToggleButton from "../components/UI/FavoriteToggleButton";
import ChangeIndicator from "../components/UI/ChangeIndicator";
import { useSEO } from "../utils/useSEO";

const detailOptions = ["Historic data", "Largest sellers"];
const periodOptions = ["1W", "1M", "3M", "6M", "YTD", "Max."];

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
    case "Max.":
      return sortedChartData;
    default:
      throw new Error("Invalid period");
  }
};

const ShortPositionDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedDetailOption, setSelectedDetailOption] = useState(
    detailOptions[0]
  );
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
  useSEO(
    stockName ? `${stockSymbol} – ${stockName}` : "Stock Details",
    stockName ? `View short position data, charts, and largest sellers for ${stockName} (${stockSymbol}).` : undefined
  );

  useEffect(() => {
    localStorage.setItem("selectedPeriod", selectedPeriod);
    localStorage.setItem("myList", JSON.stringify(myList));
  }, [selectedPeriod, myList]);

  useEffect(() => {
    if (selectedDetailOption === "Largest sellers") {
      handleClick(`largest sellers clicked for: ${code}`);
    }
  }, [selectedDetailOption, code]);

  useEffect(() => {
    handleClick(`details shown for: ${code}`);
    sendCustomPageView(`/short-watch-details`, "short watch details");
  }, [code]);

  useEffect(() => {
    handleClick(`period changed to: ${selectedPeriod.toLowerCase()}`);
  }, [selectedPeriod]);

  const addToMyList = () => {
    if (code) {
      setMyList((prev) => [...prev, code]);

      handleClick(`added to list: ${code}`);
    }
  };

  const removeFromMyList = () => {
    if (code) {
      setMyList((prev) => prev.filter((item) => item !== code));
      handleClick(`removed from list: ${code}`);
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
        <div className="text-center pb-4 dark:text-white">
          <h1 className="text-xl">
            {data.historic.length > 0 && data.historic[0].name}
          </h1>
          {data.historic.length > 0 && (
            <div className="hidden sm:flex items-center justify-center gap-2 mt-1">
              <span className="text-3xl font-bold tabular-nums">
                {data.historic[0].value.toFixed(2)}%
              </span>
              {data.historic.length > 1 && (
                <ChangeIndicator
                  value={data.historic[0].value}
                  prevValue={data.historic[1].value}
                />
              )}
            </div>
          )}
          <div className="mt-3 mx-auto w-12 h-0.5 rounded-full bg-blue-500/40" />
        </div>
        <div className="">
          <div className="mb-3">
            <div className="px-8 grid w-full place-content-end mb-1">
              <div className="overflow-x-auto w-full">
                <ToggleSwitch
                  options={periodOptions}
                  selectedOption={selectedPeriod}
                  onSelectChange={setSelectedPeriod}
                />
              </div>
            </div>
            <PricePointChart
              data={processChartValues(data.chartValues, selectedPeriod)}
              symbol={data.historic.length > 0 && data.historic[0].symbol}
            />
          </div>
          <div className="mb-4 flex justify-center gap-6 border-b border-gray-200 dark:border-gray-700">
            {detailOptions.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedDetailOption(option)}
                className={`pb-2 text-sm font-medium transition-colors duration-200 border-b-2 -mb-px ${
                  selectedDetailOption === option
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
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

        </div>
      </>
    );
  }

  return (
    <div className="h-screen dark:bg-[#121212] overflow-hidden max-md:landscape:overflow-auto max-md:landscape:h-auto max-md:landscape:min-h-screen">
      <PageTemplate>
        <div className="w-screen lg:flex lg:justify-center lg:gap-4  m-auto">
          <div className="w-1/3 justify-end items-center hidden"></div>

          <div className="lg:w-[900px]">
            <div className="flex place-content-between">
              <button
                className="text-blue-500 underline bg-transparent border-none text-lg pl-4 pt-4 hover:text-blue-700 focus:ring-2 focus:ring-blue-300 rounded"
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
                {t("Back")}
              </button>
              <FavoriteToggleButton
                isFavorite={isFavorite}
                addToMyList={addToMyList}
                removeFromMyList={removeFromMyList}
              />
            </div>
            {content}
          </div>

          <div className="w-1/3 justify-end items-center hidden"></div>
        </div>
      </PageTemplate>
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
