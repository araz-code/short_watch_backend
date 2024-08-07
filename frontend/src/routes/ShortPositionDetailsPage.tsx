import { useQuery } from "react-query";
import PricePoint from "../models/PricePoint";
import PricePointRow from "../components/PricePointRow";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchShortPositionDetails } from "../apis/ShortPositionAPI";
import PricePointChart from "../components/PricePointChart";
import ToggleSwitch from "../components/UI/RadioButtonToggle";
import { useEffect, useState } from "react";
import ShortSellerRow from "../components/ShortSellerRow";
import PageTemplate from "../components/PageTemplate";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import ShortSeller from "../models/ShortSeller";
import Announcement from "../models/Announcement";
import AnnouncementRow from "../components/AnnouncementRow";
import { handleClick, sendCustomPageView } from "../analytics";

//import advertisement from "../static/stresstilbud.jpg";

const detailOptions = ["Historic data", "Largest sellers", "Announcements"];
const periodOptions = ["1W", "1M", "3M", "6M", "YTD", "Max."];

const processChartValues = (
  pricePoints: PricePoint[],
  period: string
): PricePoint[] => {
  const newestEntries: { [key: string]: PricePoint } = {};

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

  const getFilteredData = (days: number): PricePoint[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return sortedChartData.filter(
      (pricePoint) => new Date(pricePoint.timestamp) >= cutoffDate
    );
  };

  const getFilteredDataByMonths = (months: number): PricePoint[] => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    return sortedChartData.filter(
      (pricePoint) => new Date(pricePoint.timestamp) >= cutoffDate
    );
  };

  const getFilteredDataYTD = (): PricePoint[] => {
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
      : periodOptions[0];
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
                data={processChartValues(data.chartValues, selectedPeriod)}
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
            <div className="min-h-[150px] h-[calc(100svh-32.3rem)]">
              <div className="overflow-y-auto h-full">
                <ul className="mx-4">
                  {data.historic.map((short: PricePoint) => (
                    <li key={short.timestamp}>
                      <PricePointRow {...short} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {selectedDetailOption === "Largest sellers" && (
            <div className="min-h-[150px] h-[calc(100svh-32.3rem)]">
              <div className="overflow-y-auto h-full">
                <ul className="mx-4">
                  {data.sellers.length == 0 && (
                    <div className="flex justify-center mt-10 dark:text-white">
                      <p className="text-wrap">
                        {t(
                          "No short sellers with positions equal to or greater than 0.50%"
                        )}
                      </p>
                    </div>
                  )}
                  {data.sellers.length > 0 &&
                    data.sellers.map((seller: ShortSeller) => (
                      <li key={`${seller.name}-${seller.date}`}>
                        <ShortSellerRow {...seller} />
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}

          {selectedDetailOption === "Announcements" && (
            <div className="min-h-[150px] h-[calc(100svh-14.3rem)] sm:h-[calc(100svh-32.3rem)]">
              <div className="overflow-y-auto h-full">
                <ul className="mx-4">
                  {data.announcements.length == 0 && (
                    <div className="flex justify-center mt-10 dark:text-white">
                      <p className="text-wrap">
                        {t("No announcements in the last month")}
                      </p>
                    </div>
                  )}
                  {data.announcements.length > 0 &&
                    data.announcements.map((announcement: Announcement) => (
                      <li
                        key={`${announcement.headline}-${announcement.publishedDate}`}
                      >
                        <AnnouncementRow {...announcement} />
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="h-screen dark:bg-[#121212]">
      <PageTemplate>
        <div className="w-screen lg:flex lg:justify-center lg:gap-4  m-auto">
          <div className="w-1/3 justify-end items-center hidden"></div>

          <div className="lg:w-[900px]">
            <div className="flex items-center justify-between">
              <button
                className="text-blue-500 underline bg-transparent border-none text-lg pl-4 pt-4 w-full text-left"
                onClick={() => navigate("/short-watch")}
              >
                {t("Back")}
              </button>
              <button
                className="text-blue-500 underline bg-transparent border-none text-lg pr-4 pt-4 w-full text-end"
                onClick={() =>
                  isFavorite ? removeFromMyList() : addToMyList()
                }
                title={
                  isFavorite ? t("Remove from my list") : t("Add to my list")
                }
              >
                {isFavorite ? (
                  <FontAwesomeIcon icon={faTrash} />
                ) : (
                  <FontAwesomeIcon icon={faPlus} />
                )}
              </button>
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
