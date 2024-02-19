import { useQuery } from "react-query";
import { clicked, fetchShortPositions } from "../apis/ShortPositionAPI";
import PageTemplate from "../components/PageTemplate";
import ShortPositionRow from "../components/ShortPositionRow";
import PricePoint from "../models/PricePoint";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import DropDownMenu from "../components/UI/DropDownMenu";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import Modal from "../components/UI/Modal";
import Info from "../components/Info";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();
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
  const [showInfo, setShowInfo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["shorts"],
    queryFn: ({ signal }) =>
      fetchShortPositions({
        signal,
        category: showMyList ? "watch" : "pick",
      }),
  });

  const handleInfo = () => {
    clicked("info");
    setShowInfo(true);
  };

  useEffect(() => {
    localStorage.setItem("selectedSorting", selectedSorting);
    localStorage.setItem("showMyList", JSON.stringify(showMyList));
  }, [selectedSorting, showMyList]);

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
                  'Select stocks to "My list" by clicking + on details page (top right corner)'
                )
              : t("No results found")}
          </p>
        )}
        {filteredData.length > 0 &&
          sort(filteredData, selectedSorting).map((short: PricePoint) => (
            <li key={`${short.code}-${short.timestamp}`}>
              <Link to={`/short-watch-details?code=${short.code}`}>
                <ShortPositionRow {...short} />
              </Link>
            </li>
          ))}
      </ul>
    );
  }

  return (
    <div className="h-screen xl:h-[calc(100dvh)] min-h-[620px] overflow-hidden">
      <PageTemplate>
        <div className="w-screen lg:w-[900px] m-auto">
          <p className="text-xl lg:text-3xl text-center font-bold py-6 dark:text-white">
            Danish Short Watch
          </p>
          <section className="w-full">
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
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
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
                    className="text-blue-500 text-center font-medium align-middle bg-transparent border-none text ml-5"
                    onClick={() => setShowMyList(!showMyList)}
                  >
                    {showMyList ? t("My list") : t("All shorts")}
                  </button>
                </div>
                <button
                  className="text-blue-500 text-center font-medium align-middle bg-transparent border-none ml-4"
                  onClick={handleInfo}
                >
                  Info
                </button>
              </div>
            </div>
            <div className="overflow-y-auto min-h-[300px] h-[calc(100svh-20rem)]">
              <p className="text-sm pl-2 dark:text-white">
                {t("You can get more details by clicking on a row")}
              </p>
              {content}
            </div>
            <div className="mx-3 mt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Link
                    to={
                      i18n.language === "da" || i18n.language === "da-DK"
                        ? "/privatlivspolitik"
                        : "/privacy-policy"
                    }
                    className="text-blue-500 underline text-sm"
                  >
                    {t("Privacy policy")}
                  </Link>

                  <Link
                    to={
                      i18n.language === "da" || i18n.language === "da-DK"
                        ? "/aftalevilkaar"
                        : "/terms-of-agreement"
                    }
                    className="text-blue-500 underline text-sm ml-5"
                  >
                    {t("Terms of agreement")}
                  </Link>
                </div>
                <a
                  href="mailto:contact@zirium.dk"
                  className="text-blue-500 underline text-sm"
                  onClick={() => clicked("feedback")}
                >
                  Feedback
                </a>
              </div>
            </div>
          </section>
        </div>
      </PageTemplate>

      {showInfo && (
        <div className="w-screen lg:w-[900px] m-auto">
          <Modal title="Information" onClose={() => setShowInfo(false)}>
            <Info />
          </Modal>
        </div>
      )}
    </div>
  );
};

export default ShortWatchPage;
