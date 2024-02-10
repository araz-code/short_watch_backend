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

const detailOptions = ["historicData", "largestSellers"];
const periodOptions = ["7Days", "14Days", "30Days", "90Days"];

const processChartValues = (
  pricePoints: PricePoint[],
  numberOfdays: number
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

  return sortedChartData.slice(-numberOfdays);
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

  useEffect(() => {
    localStorage.setItem("selectedPeriod", selectedPeriod);
    localStorage.setItem("myList", JSON.stringify(myList));
  }, [selectedPeriod, myList]);

  const addToMyList = () => {
    if (code) {
      setMyList((prev) => [...prev, code]);
    }
  };

  const removeFromMyList = () => {
    if (code) {
      setMyList((prev) => prev.filter((item) => item !== code));
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
        title={t("errorTitle")}
        message={errorInfo.info?.message || t("failedFetchDetails")}
      />
    );
  } else if (data && data.historic.length === 0) {
    content = (
      <ErrorBlock title={t("unknownStock")} message={t("failedFetchDetails")} />
    );
  } else if (data) {
    const numberOfdays =
      selectedPeriod === "7Days"
        ? 7
        : selectedPeriod === "14Days"
        ? 14
        : selectedPeriod === "30Days"
        ? 30
        : 90;

    content = (
      <>
        <p className="text-lg text-center font-bold pb-5 dark:text-white">
          {data.historic.length > 0 && data.historic[0].name}
        </p>
        <div className="mb-1 pr-8 grid w-full place-items-end">
          <ToggleSwitch
            options={periodOptions}
            selectedOption={selectedPeriod}
            onSelectChange={setSelectedPeriod}
          />
        </div>
        <div className="">
          <div className="mb-5">
            <PricePointChart
              data={processChartValues(data.chartValues, numberOfdays)}
            />
          </div>
          <div className="mb-5 grid w-full place-items-center">
            <ToggleSwitch
              options={detailOptions}
              selectedOption={selectedDetailOption}
              onSelectChange={setSelectedDetailOption}
            />
          </div>

          {selectedDetailOption === "historicData" && (
            <div className="min-h-[150px] h-[calc(100vh-39rem)]">
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

          {selectedDetailOption === "largestSellers" && (
            <div className="min-h-[150px] h-[calc(100vh-39rem)]">
              <div className="overflow-y-auto h-full">
                <ul className="mx-4">
                  {data.sellers.length == 0 && (
                    <div className="flex justify-center mt-10 dark:text-white">
                      <p className="text-wrap">{t("noSellers")}</p>
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
        </div>
      </>
    );
  }

  return (
    <div className="h-[calc(100dvh)] dark:bg-[#121212]">
      <PageTemplate>
        <div className="w-full lg:w-[900px] lg:m-auto">
          <div className="flex items-center justify-between">
            <button
              className="text-blue-500 underline bg-transparent border-none text-lg pl-4 pt-4 w-full text-left"
              onClick={() => navigate("/short-watch")}
            >
              {t("back")}
            </button>
            <button
              className="text-blue-500 underline bg-transparent border-none text-lg pr-4 pt-4 w-full text-end"
              onClick={() => (isFavorite ? removeFromMyList() : addToMyList())}
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
      </PageTemplate>
    </div>
  );
};

export default ShortPositionDetailsPage;
