import { useQuery } from "react-query";
import { fetchLargestShortSellers } from "../apis/ShortPositionAPI";
import PageTemplate from "../components/PageTemplate";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import InfoDialog from "../components/InfoDialog";
import { useTranslation } from "react-i18next";
import { handleClick, sendCustomPageView } from "../analytics";
import ShortSeller from "../models/ShortSeller";
import ShortSellerRow from "../components/ShortSellerRow";
import DropDownMenu from "../components/UI/DropDownMenu";

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
  const searchElement = useRef<HTMLInputElement>(null);

  const [showInfo, setShowInfo] = useState(false);
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
    handleClick(`sorting changed to: ${selectedSorting.toLowerCase()}`);
  }, [selectedSorting]);

  useEffect(() => {
    sendCustomPageView(`/short-sellers`, "short sellers");
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
    <div className="h-screen xl:h-[calc(100dvh)] min-h-[620px] overflow-hidden">
      <PageTemplate>
        <div className="w-screen lg:flex lg:justify-center lg:gap-4  m-auto">
          <div className="w-1/3 justify-start items-center hidden"></div>
          <div className="lg:w-[900px]">
            <p className="text-xl lg:text-3xl font-bold py-6 dark:text-white flex justify-center">
              Short Sellers
            </p>
            <div className="text-xs pl-2 dark:text-white italic">
              <p>{t("The Danish FSA only publishes the names of short")}</p>
              <p>{t("sellers with a position of 0.5% or greater.")}</p>
            </div>

            <section className="w-full pt-4">
              <div className="relative mx-2 flex items-center">
                <div className="absolute inset-y-0 left-0 flex items-center ps-3 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-3"
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
                  type="search"
                  id="search"
                  placeholder={t("Search")}
                  ref={searchElement}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="flex-1 border p-2 pl-9 rounded-l focus:outline-none w-full dark:bg-[#212121] dark:text-white"
                />
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
                      className="text-blue-500 text-center font-medium align-middle bg-transparent border-none text ml-5 hover:text-blue-700"
                      onClick={() => {
                        handleClick(
                          `current changed: ${
                            showCurrent ? t("All") : t("Current")
                          }`
                        );

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
              </div>
            </section>
          </div>
          <div className="w-1/3 justify-end items-center hidden"></div>
        </div>
      </PageTemplate>

      {showInfo && (
        <div className="w-screen lg:w-[900px] m-auto">
          <InfoDialog onClose={() => setShowInfo(false)} />
        </div>
      )}
    </div>
  );
};

export default ShortSellersPage;

// <div className="overflow-y-auto min-h-[300px] h-[calc(100svh-16.3rem)] sm:h-[calc(100svh-16.6rem)] mt-5">
