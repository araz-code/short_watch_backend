import { useQuery } from "@tanstack/react-query";
import { fetchLargestShortSellers, HOST } from "../apis/ShortPositionAPI";
import PageTemplate from "../components/PageTemplate";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { useTranslation } from "react-i18next";
import { trackEvent, trackPageView } from "../analytics";
import ShortSeller from "../models/ShortSeller";
import ShortSellerRow from "../components/ShortSellerRow";
import DropDownMenu from "../components/UI/DropDownMenu";
import ShortSellersHelpDialog from "../components/ShortSellersHelpDialog";
import RecentUpdatesSidebar from "../components/RecentUpdatesSidebar";
import AnalysesSidebar from "../components/AnalysesSidebar";

const options = ["Name", "Date", "Size", "Activity"];

const maxCurrentValue = (s: ShortSeller): number =>
  s.current.length > 0 ? Math.max(...s.current.map((p) => p.value)) : 0;

const sort = (list: ShortSeller[], selectedSorting: string) => {
  return list.sort((a, b) => {
    switch (selectedSorting) {
      case "Name":
        return a.name.localeCompare(b.name);
      case "Date":
        return (
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
      case "Size":
        return maxCurrentValue(b) - maxCurrentValue(a);
      case "Activity":
        return b.current.length - a.current.length;
      default:
        return a.name.localeCompare(b.name);
    }
  });
};

const ShortSellersPage: React.FC = () => {
  const { t } = useTranslation();
  const searchElement = useRef<HTMLInputElement>(null);

  const [showHelp, setShowHelp] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSorting, setSelectedSorting] = useState<string>(() => {
    const savedSorting = localStorage.getItem("selectedSellersSorting");
    return savedSorting && options.includes(savedSorting)
      ? savedSorting
      : options[0];
  });
  const [showCurrent, setShowCurrent] = useState<boolean>(() => {
    const savedShowCurrent = localStorage.getItem("showCurrent");
    return savedShowCurrent ? JSON.parse(savedShowCurrent) : false;
  });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["shortSellers"],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: ({ signal }) =>
      fetchLargestShortSellers({
        signal,
      }),
  });

  useEffect(() => {
    localStorage.setItem("selectedSellersSorting", selectedSorting);
    localStorage.setItem("showCurrent", JSON.stringify(showCurrent));
  }, [selectedSorting, showCurrent]);

  useEffect(() => {
    trackEvent("sort_change", { page: "short_sellers", sort_value: selectedSorting });
  }, [selectedSorting]);

  useEffect(() => {
    trackPageView(`/short-sellers`, "short sellers");
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
    let filteredData = data.filter((item: ShortSeller) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filteredData = showCurrent
      ? filteredData.filter((item: ShortSeller) => item.current.length > 0)
      : filteredData;

    content = (
      <ul>
        {filteredData.length === 0 && (
          <p className="text-center font-medium m-10 dark:text-white">
            {t("No results found")}
          </p>
        )}
        {filteredData.length > 0 &&
          sort(filteredData, selectedSorting).map((seller: ShortSeller, index: number) => {
            return (
              <li key={`${seller.id}`}>
                <Link to={`/short-seller-details?seller=${seller.id}`}>
                  <ShortSellerRow {...seller} isEven={index % 2 === 0} />
                </Link>
              </li>
            );
          })}
      </ul>
    );
  }

  return (
    <div className="h-dvh min-h-[620px] flex flex-col overflow-hidden [@media(max-height:900px)_and_(orientation:landscape)]:overflow-auto [@media(max-height:900px)_and_(orientation:landscape)]:h-auto [@media(max-height:900px)_and_(orientation:landscape)]:min-h-dvh">
      <title>Zirium | Short Sellers</title>
      <meta name="description" content="See which hedge funds and institutions hold large short positions in Danish stocks. Positions of 0.5% or greater reported by the Danish FSA." />
      <PageTemplate>
        <div className="w-screen lg:justify-center lg:gap-4 m-auto flex flex-col flex-1 min-h-0 lg:flex-row">
          <div className="hidden xl:block xl:flex-1 relative">
            <div className="absolute inset-0 flex flex-col items-center pt-[88px] px-4 overflow-y-auto gap-4">
              <RecentUpdatesSidebar days={30} />
              <AnalysesSidebar source="sidebar_short_sellers" />
            </div>
          </div>
          <div className="lg:w-[900px] flex flex-col flex-1 min-h-0 lg:flex-initial">
            <div className="pt-6 pb-4 px-2 shrink-0">
              <h1 className="text-2xl lg:text-3xl dark:text-white text-center">
                {t("Short sellers")}
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-2">
                {t("The Danish FSA only publishes the names of short")}{" "}
                {t("sellers with a position of 0.5% or greater.")}
              </p>
            </div>

            <section className="w-full flex flex-col flex-1 min-h-0">
              <div className="relative mx-2 flex items-center shrink-0">
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
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#19191f] pl-11 pr-10 py-2.5 rounded-xl text-base sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-400/30 transition-colors"
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
              <div className="p-2 pb-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DropDownMenu
                      options={options}
                      selectedMenuItem={selectedSorting}
                      onSelectMenuItemChange={setSelectedSorting}
                    />
                    <button
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-500 dark:border-blue-700 ml-3 px-3 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors focus:ring-2 focus:ring-blue-300"
                      onClick={() => {
                        trackEvent("filter_change", {
                          page: "short_sellers",
                          filter: "current_only",
                          enabled: !showCurrent,
                        });
                        setShowCurrent(!showCurrent);
                      }}
                    >
                      {showCurrent ? t("All") : t("Current")}
                    </button>
                  </div>
                  <button
                    className="bg-transparent border-none text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 focus:ring-2 focus:ring-blue-300 rounded-sm"
                    aria-label={t("Help")}
                    onClick={() => {
                      trackEvent("help_dialog_open", { page: "short_sellers" });
                      fetch(`${HOST}/stats/visit/help-short-sellers/`).catch(() => {});
                      setShowHelp(true);
                    }}
                  >
                    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto [@media(max-height:900px)_and_(orientation:landscape)]:flex-none [@media(max-height:900px)_and_(orientation:landscape)]:overflow-visible">
                <p className="text-xs pl-2 italic text-gray-600 dark:text-gray-300">
                  {t("You can get more details by clicking on a row")}
                </p>
                {content}
                <div className="h-6"></div>
              </div>
            </section>
          </div>
          <div className="hidden xl:block xl:flex-1" aria-hidden="true"></div>
        </div>
      </PageTemplate>

      {showHelp && (
        <div className="w-screen lg:w-[900px] m-auto">
          <ShortSellersHelpDialog onClose={() => setShowHelp(false)} />
        </div>
      )}
    </div>
  );
};

export default ShortSellersPage;
