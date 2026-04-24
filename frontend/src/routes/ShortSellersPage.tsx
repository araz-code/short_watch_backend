import { useQuery } from "react-query";
import { fetchLargestShortSellers } from "../apis/ShortPositionAPI";
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
import { useSEO } from "../utils/useSEO";

const options = ["Name", "Date"];

const sort = (list: ShortSeller[], selectedSorting: string) => {
  return list.sort((a, b) => {
    switch (selectedSorting) {
      case "Name":
        return a.name.localeCompare(b.name);
      case "Date":
        return (
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
      default:
        return a.name.localeCompare(b.name);
    }
  });
};

const ShortSellersPage: React.FC = () => {
  const { t } = useTranslation();
  useSEO("Short Sellers", "See which hedge funds and institutions hold large short positions in Danish stocks. Positions of 0.5% or greater reported by the Danish FSA.");
  const searchElement = useRef<HTMLInputElement>(null);

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
          sort(filteredData, selectedSorting).map((seller: ShortSeller) => {
            return (
              <li key={`${seller.id}`}>
                <Link to={`/short-seller-details?seller=${seller.id}`}>
                  <ShortSellerRow {...seller} />
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
        <div className="w-screen lg:flex lg:justify-center lg:gap-4 m-auto">
          <div className="w-1/3 justify-start items-center hidden"></div>
          <div className="lg:w-[900px]">
            <div className="pt-6 pb-4 px-2">
              <h1 className="text-2xl lg:text-3xl dark:text-white text-center">
                {t("Short sellers")}
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
                {t("The Danish FSA only publishes the names of short")}{" "}
                {t("sellers with a position of 0.5% or greater.")}
              </p>
            </div>

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
                </div>
              </div>

              <div className="overflow-y-auto min-h-[300px] h-[calc(100svh-18.5rem)] sm:h-[calc(100svh-18.8rem)]">
                <p className="text-xs pl-2 dark:text-white">
                  {t("You can get more details by clicking on a row")}
                </p>
                {content}
                <div className="h-6"></div>
              </div>
            </section>
          </div>
          <div className="w-1/3 justify-end items-center hidden"></div>
        </div>
      </PageTemplate>
    </div>
  );
};

export default ShortSellersPage;
