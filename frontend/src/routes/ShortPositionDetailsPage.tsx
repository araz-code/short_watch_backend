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
import FavoriteToggleButton from "../components/UI/FavoriteToggleButton";
import PricePointList from "../components/PricePointList";
import LargeShortSellingList from "../components/LargeShortSellingList";
import AnnouncementList from "../components/AnnouncementList";
import Announcement from "../models/Announcement";
import { ChartPricePointWithAnnouncements } from "../models/ChartPricePointWithAnnouncements";

//import advertisement from "../static/stresstilbud.jpg";

const detailOptions = ["Historic data", "Largest sellers", "Announcements"];
const periodOptions = ["1W", "1M", "3M", "6M", "YTD", "Max."];

const extractDate = (dateString: string): string => {
  return new Date(dateString).toISOString().split("T")[0];
};

const extendChartPricePointsWithAnnouncements = (
  pricePoints: ChartPricePoint[],
  announcements: Announcement[]
): ChartPricePointWithAnnouncements[] => {
  return pricePoints.map((pricePoint) => {
    // Extract date part from pricePoint's timestamp
    const pricePointDate = extractDate(pricePoint.timestamp);

    // Filter announcements matching the date part of the pricePoint's timestamp
    const matchingAnnouncements = announcements.filter(
      (announcement) =>
        extractDate(announcement.publishedDate) === pricePointDate &&
        announcement.type === "Shortselling"
    );

    // Return a new object extending ChartPricePoint with matching announcements
    return {
      ...pricePoint,
      announcements: matchingAnnouncements,
    };
  });
};

const processChartValues = (
  pricePoints: ChartPricePointWithAnnouncements[],
  period: string
): ChartPricePointWithAnnouncements[] => {
  const newestEntries: { [key: string]: ChartPricePointWithAnnouncements } = {};

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

  const getFilteredData = (
    days: number
  ): ChartPricePointWithAnnouncements[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return sortedChartData.filter(
      (pricePoint) => new Date(pricePoint.timestamp) >= cutoffDate
    );
  };

  const getFilteredDataByMonths = (
    months: number
  ): ChartPricePointWithAnnouncements[] => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    return sortedChartData.filter(
      (pricePoint) => new Date(pricePoint.timestamp) >= cutoffDate
    );
  };

  const getFilteredDataYTD = (): ChartPricePointWithAnnouncements[] => {
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
  const [isChartVisible, setIsChartVisible] = useState(
    selectedDetailOption !== "Announcements"
  );
  const [chartDisplay, setChartDisplay] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const code = searchParams.get("code");
  const isFavorite = code ? myList.includes(code) : false;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [searchParams.get("code")],
    queryFn: ({ signal }) =>
      fetchShortPositionDetails({
        signal,
        category: isFavorite ? "watch" : "pick",
        code: code ?? "",
      }),
  });

  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedPeriod", selectedPeriod);
    localStorage.setItem("myList", JSON.stringify(myList));
  }, [selectedPeriod, myList]);

  useEffect(() => {
    if (selectedDetailOption !== "Announcements") {
      setIsChartVisible(true);
      setChartDisplay(true);
    } else if (isMobile) {
      setIsChartVisible(false);
      setTimeout(() => setChartDisplay(false), 190);
    }

    if (selectedDetailOption === "Announcements") {
      handleClick(`announcements clicked for: ${code}`);
    }
    if (selectedDetailOption === "Largest sellers") {
      handleClick(`largest sellers clicked for: ${code}`);
    }
  }, [selectedDetailOption, isMobile, code]);

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
    const chartValues = extendChartPricePointsWithAnnouncements(
      data.chartValues,
      data.announcements
    );

    content = (
      <>
        <p className="text-lg text-center font-bold pb-5 dark:text-white">
          {data.historic.length > 0 && data.historic[0].name}
        </p>
        {chartDisplay && (
          <div
            className={`mb-1 px-8 grid w-full place-content-end ${
              isChartVisible ? "animate-fadeIn" : "animate-fadeOut"
            }`}
          >
            <div className="overflow-x-auto w-full pb-3">
              <ToggleSwitch
                options={periodOptions}
                selectedOption={selectedPeriod}
                onSelectChange={setSelectedPeriod}
              />
            </div>
          </div>
        )}

        <div className="">
          {chartDisplay && (
            <div
              className={`mb-5 ${
                isChartVisible ? "animate-fadeIn" : "animate-fadeOut"
              }`}
            >
              <PricePointChart
                data={processChartValues(chartValues, selectedPeriod)}
              />
            </div>
          )}
          <div className="mb-5 grid w-full place-items-center">
            <ToggleSwitch
              options={detailOptions}
              selectedOption={selectedDetailOption}
              onSelectChange={setSelectedDetailOption}
            />
          </div>

          {selectedDetailOption === "Historic data" && (
            <PricePointList pricePoints={data.historic} />
          )}

          {selectedDetailOption === "Largest sellers" && (
            <LargeShortSellingList sellings={data.sellers} />
          )}

          {selectedDetailOption === "Announcements" && (
            <AnnouncementList announcements={data.announcements} />
          )}
        </div>
      </>
    );
  }

  return (
    <div className="h-screen dark:bg-[#121212] overflow-hidden">
      <PageTemplate>
        <div className="w-screen lg:flex lg:justify-center lg:gap-4  m-auto">
          <div className="w-1/3 justify-end items-center hidden"></div>

          <div className="lg:w-[900px]">
            <div className="flex place-content-between">
              <button
                className="text-blue-500 underline bg-transparent border-none text-lg pl-4 pt-4 hover:text-blue-700"
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
