import { useQuery } from "@tanstack/react-query";
import { fetchShortPositions } from "../apis/ShortPositionAPI";
import PageTemplate from "../components/PageTemplate";
import ShortPositionRow from "../components/ShortPositionRow";
import PricePoint from "../models/PricePoint";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import DropDownMenu from "../components/UI/DropDownMenu";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import HelpDialog from "../components/HelpDialog";
import { useTranslation } from "react-i18next";
import { trackEvent, trackPageView } from "../analytics";
import { useSEO } from "../utils/useSEO";

const options = ["Symbol", "Name", "Date", "Value"];

const sort = (list: PricePoint[], selectedSorting: string) => {
  return list.sort((a, b) => {
    switch (selectedSorting) {
      case "Symbol":
        return a.symbol.localeCompare(b.symbol);
      case "Name":
        return a.name.localeCompare(b.name);
      case "Date":
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      case "Value":
        return +b.value - +a.value;
      default:
        return a.symbol.localeCompare(b.symbol);
    }
  });
};

const ShortWatchPage: React.FC = () => {
  const { t } = useTranslation();
  useSEO("Short Watch", "View all current short selling positions in Danish stocks with real-time data from the Danish Financial Supervisory Authority.");
  const searchElement = useRef<HTMLInputElement>(null);
  const [selectedSorting, setSelectedSorting] = useState<string>(() => {
    const savedSorting = localStorage.getItem("selectedSorting");
    return savedSorting && options.includes(savedSorting)
      ? savedSorting
      : options[0];
  });
  const [showMyList, setShowMyList] = useState<boolean>(() => {
    const savedShowMyList = localStorage.getItem("showMyList");
    return savedShowMyList ? JSON.parse(savedShowMyList) : false;
  });
  const [myList] = useState<string[]>(() => {
    const savedMyList = localStorage.getItem("myList");
    return savedMyList ? JSON.parse(savedMyList) : [];
  });
  const [showHelp, setShowHelp] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["shorts"],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: ({ signal }) =>
      fetchShortPositions({
        signal,
        category: showMyList ? "watch" : "pick",
      }),
  });

  const handleHelp = () => {
    trackEvent("help_dialog_open", { page: "short_watch" });
    setShowHelp(true);
  };

  useEffect(() => {
    localStorage.setItem("selectedSorting", selectedSorting);
    localStorage.setItem("showMyList", JSON.stringify(showMyList));
  }, [selectedSorting, showMyList]);

  useEffect(() => {
    trackEvent("sort_change", { page: "short_watch", sort_value: selectedSorting });
  }, [selectedSorting]);

  useEffect(() => {
    trackPageView(`/short-watch`, "short watch");
  }, []);

  let content;

  if (isLoading) {
    content = (
      <div className="grid place-items-center h-screen">
        <LoadingIndicator />;
      </div>
    );
  } else if (isError) {
    const errorInfo = error as { info?: { message?: string } };

    content = (
      <ErrorBlock
        title={t("An error occurred")}
        message={
          errorInfo.info?.message || t("Failed to fetch short positions.")
        }
      />
    );
  } else if (data) {
    let filteredData = data.filter(
      (item: PricePoint) =>
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredData = showMyList
      ? filteredData.filter((item: PricePoint) => myList.includes(item.code))
      : filteredData;

    content = (
      <ul>
        {filteredData.length === 0 && (
          <p className="text-center font-medium m-10 dark:text-white">
            {showMyList && searchTerm.length == 0
              ? t(
                  'Select stocks to "My list" by clicking the yellow star on the details page (top right corner).'
                )
              : t("No results found")}
          </p>
        )}
        {filteredData.length > 0 &&
          sort(filteredData, selectedSorting).map((short: PricePoint) => {
            const showCheckmark = myList.includes(short.code) && !showMyList;
            return (
              <li key={`${short.code}-${short.timestamp}`}>
                <Link to={`/short-watch-details?code=${short.code}`}>
                  <ShortPositionRow {...short} showCheckmark={showCheckmark} />
                </Link>
              </li>
            );
          })}
      </ul>
    );
  }

  return (
    <div className="h-screen xl:h-[calc(100dvh)] min-h-[620px] overflow-hidden [@media((max-height:900px)_and_(orientation:landscape))_or_(max-height:700px)]:overflow-auto [@media((max-height:900px)_and_(orientation:landscape))_or_(max-height:700px)]:h-auto [@media((max-height:900px)_and_(orientation:landscape))_or_(max-height:700px)]:min-h-screen">
      <PageTemplate>
        <div className="w-screen lg:flex lg:justify-center lg:gap-4  m-auto">
          <div className="w-1/3 justify-start items-center hidden"></div>
          <div className="lg:w-[900px]">
            <h1 className="text-2xl lg:text-3xl text-center py-6 dark:text-white">
              Danish Short Watch
            </h1>
            {/*<p className="text-red-600 font-semibold text-center text-sm lg:text-base px-2">
              {t("FSA website updated warning")}
            </p>*/}
            <section className="w-full">
              <div className="relative mx-2 flex items-center">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg
                    className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  aria-label={t("Search")}
                  placeholder={t("Search")}
                  ref={searchElement}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#1e1e1e] pl-11 pr-10 py-2.5 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                )}
              </div>
              <div className="p-2 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DropDownMenu
                      options={options}
                      selectedMenuItem={selectedSorting}
                      onSelectMenuItemChange={setSelectedSorting}
                    />
                    <button
                      className="font-medium text-blue-500 bg-transparent border-none ml-3 px-2.5 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors focus:ring-2 focus:ring-blue-300"
                      onClick={() => {
                        trackEvent("filter_change", {
                          page: "short_watch",
                          filter: "my_list",
                          enabled: !showMyList,
                        });

                        setShowMyList(!showMyList);
                      }}
                    >
                      {showMyList ? t("All shorts") : t("My list")}
                    </button>
                  </div>
                  <button
                    className="font-medium text-blue-500 bg-transparent border-none px-2.5 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors focus:ring-2 focus:ring-blue-300"
                    onClick={handleHelp}
                  >
                    {t("Help")}
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto min-h-[300px] h-[calc(100svh-15.7rem)] sm:h-[calc(100svh-16.2rem)]">
                <p className="text-xs pl-2 dark:text-white">
                  {t("You can get more details by clicking on a row")}
                </p>
                {content}
                <div className="h-4"></div>
              </div>
            </section>
          </div>
          <div className="w-1/3 justify-end items-center hidden"></div>
        </div>
      </PageTemplate>

      {showHelp && (
        <div className="w-screen lg:w-[900px] m-auto">
          <HelpDialog onClose={() => setShowHelp(false)} />
        </div>
      )}
    </div>
  );
};

export default ShortWatchPage;

// Activate advertisement by inserting lg:flex like this:

// <div className="w-1/3 justify-end items-center hidden lg:flex">
