import { useQuery } from "react-query";
import PricePoint from "../models/PricePoint";
import PricePointRow from "../components/PricePointRow";
import { useParams, useNavigate } from "react-router-dom";
import { fetchShortPositionDetails } from "../apis/ShortPositionAPI";
import PricePointChart from "../components/PricePointChart";
import ToggleSwitch from "../components/UI/RadioButtonToggle";
import { useState } from "react";
import ShortSellerRow from "../components/ShortSellerRow";
import PageTemplate from "../components/PageTemplate";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";

const detailOptions = ["Historic data", "Largest sellers"];
const periodOptions = ["7 days", "14 days", "30 days"];

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
  const { code } = useParams();
  const navigate = useNavigate();
  const [selectedDetailOption, setSelectedDetailOption] = useState(
    detailOptions[0]
  );
  const [selectedPeriodOption, setSelectedPeriodOption] = useState(
    periodOptions[0]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [code],
    queryFn: ({ signal }) =>
      fetchShortPositionDetails({ signal, category: "pick", code: code ?? "" }),
  });

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
        title="An error occurred"
        message={errorInfo.info?.message || "Failed to fetch details."}
      />
    );
  } else if (data && data.historic.length === 0) {
    content = (
      <ErrorBlock title="Unknown stock" message={"Failed to fetch details."} />
    );
  } else if (data) {
    const numberOfdays =
      selectedPeriodOption === "7 days"
        ? 7
        : selectedPeriodOption === "14 days"
        ? 14
        : 30;
    content = (
      <>
        <p className="text-xl text-center font-bold pb-5">
          {data.historic.length > 0 && data.historic[0].name}
        </p>
        <div className="mb-1 pr-8 grid w-full place-items-end">
          <ToggleSwitch
            options={periodOptions}
            selectedOption={selectedPeriodOption}
            onSelectChange={setSelectedPeriodOption}
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

          {selectedDetailOption === "Historic data" && (
            <div className="min-h-[150px] h-[calc(100vh-36rem)]">
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
            <div className="min-h-[150px] h-[calc(100vh-39rem)]">
              <div className="overflow-y-auto h-full">
                <ul className="mx-4">
                  {data.sellers.length == 0 && (
                    <div className="flex justify-center mt-10">
                      <p className="text-wrap">
                        No short sellers with positions equal to or greater than
                        0.50%
                      </p>
                    </div>
                  )}
                  {data.sellers.length > 0 &&
                    data.sellers.map((short: PricePoint) => (
                      <li key={short.timestamp}>
                        <ShortSellerRow {...short} />
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
    <div className="h-[calc(100dvh)] ">
      <PageTemplate>
        <div className="w-full lg:w-[900px] lg:m-auto">
          <button
            className="text-blue-500 underline bg-transparent border-none text-lg pl-4 pt-4 w-full text-left"
            onClick={() => navigate("/short-watch")}
          >
            Back
          </button>
          {content}
        </div>
      </PageTemplate>
    </div>
  );
};

export default ShortPositionDetailsPage;
