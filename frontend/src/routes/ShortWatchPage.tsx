import { useQuery } from "react-query";
import { fetchShortPositions } from "../apis/ShortPositionAPI";
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

const options = ["symbol", "date", "value"];

const sort = (list: PricePoint[], selectedSorting: string) => {
  return list.sort((a, b) => {
    switch (selectedSorting) {
      case "Symbol":
        return a.symbol.localeCompare(b.symbol);
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
        title="An error occurred"
        message={errorInfo.info?.message || "Failed to fetch short positions."}
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
              ? t("emptyMyList")
              : t("noSearchResult")}
          </p>
        )}
        {filteredData.length > 0 &&
          sort(filteredData, selectedSorting).map((short: PricePoint) => (
            <li key={short.code}>
              <Link to={`/short-watch-details?code=${short.code}`}>
                <ShortPositionRow {...short} />
              </Link>
            </li>
          ))}
      </ul>
    );
  }

  return (
    <div className="h-[calc(100dvh - 5rem)] xl:h-[calc(100dvh)] min-h-[620px] overflow-hidden">
      <PageTemplate>
        <div className="w-screen lg:w-[900px] m-auto">
          <p className="text-xl lg:text-3xl text-center font-bold py-6 dark:text-white">
            Danish Short Watch
          </p>
          <section className="w-full">
            <div className="flex items-center mx-2">
              <input
                type="search"
                placeholder={t("search")}
                ref={searchElement}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="flex-1 border p-2 rounded-l focus:outline-none w-full dark:bg-[#212121] dark:text-white"
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
                    {showMyList ? t("myList") : t("allShorts")}
                  </button>
                </div>
                <button
                  className="text-blue-500 text-center font-medium align-middle bg-transparent border-none ml-4"
                  onClick={() => setShowInfo(true)}
                >
                  Info
                </button>
              </div>
            </div>
            <div className="overflow-y-auto min-h-[300px] h-[calc(100vh-25rem)]">
              <p className="text-sm pl-2">{t("helpRowsClickable")}</p>
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
                    {t("privacyPolicy")}
                  </Link>

                  <Link
                    to={
                      i18n.language === "da" || i18n.language === "da-DK"
                        ? "/aftalevilkaar"
                        : "/terms-of-agreement"
                    }
                    className="text-blue-500 underline text-sm ml-5"
                  >
                    {t("termsOfAgreement")}
                  </Link>
                </div>
                <a
                  href="mailto:contact@zirium.dk"
                  className="text-blue-500 underline text-sm "
                >
                  {t("contact")}
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
