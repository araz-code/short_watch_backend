import { useQuery } from "react-query";
import {
  useSearchParams,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import { fetchLargeShortSellerDetails } from "../apis/ShortPositionAPI";
import { useEffect } from "react";
import PageTemplate from "../components/PageTemplate";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { useTranslation } from "react-i18next";

import { handleClick, sendCustomPageView } from "../analytics";
import Announcement from "../models/Announcement";
import ShortSellerDetails from "../models/ShortSellerDetails";
import ShortSellerAnnouncementRow from "../components/ShortSellerAnnouncementRow";

interface GroupedAnnouncements {
  [key: string]: Announcement[];
}

const ShortSellerDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const seller = searchParams.get("seller");

  if (location.hash) {
    const elem = document.getElementById(location.hash.slice(1));
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  }

  const { data, isLoading, isError, error } = useQuery<ShortSellerDetails>({
    queryKey: [searchParams.get("seller")],
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: ({ signal }) =>
      fetchLargeShortSellerDetails({
        signal,
        seller: seller ?? "",
      }),
  });

  useEffect(() => {
    handleClick(`large short seller details shown for: ${seller}`);
    sendCustomPageView(`/short-seller-details`, "short seller details");
  }, [seller]);

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
  } else if (!data) {
    content = (
      <ErrorBlock
        title={t("Unknown stock")}
        message={t("Failed to fetch details.")}
      />
    );
  } else if (data) {
    const groupedAnnouncements: GroupedAnnouncements =
      data.announcements.reduce<GroupedAnnouncements>((acc, announcement) => {
        const symbol = announcement.stockSymbol;

        if (!acc[symbol]) {
          acc[symbol] = [];
        }

        acc[symbol].push(announcement);

        return acc;
      }, {});

    content = (
      <>
        <p className="text-lg text-center font-bold pb-5 dark:text-white">
          {data.name}
        </p>
        <div className="text-xs  dark:text-white italic pb-2 mx-4">
          <p className="pb-2">
            {t("Data on this page comes from announcements.")}
          </p>
          <p>{t("Danish FSA updates only positions above 0.5%.")}</p>
          <p>
            {t("Below 0.5%, updates occur only once it exceeds 0.5% again.")}
          </p>
        </div>
        <div className="min-h-[150px] h-[calc(100svh-14.3rem)]">
          <div className="overflow-y-auto h-full">
            <ul className="mx-4">
              {Object.keys(groupedAnnouncements).map((symbol) => (
                <div key={symbol}>
                  <div
                    className="font-medium text-left hover:underline dark:text-white"
                    id={symbol}
                  >
                    <Link
                      to={`/short-watch-details?code=${groupedAnnouncements[symbol][0].stockCode}`}
                      onClick={() => {
                        handleClick(
                          `clicked on link to shorts from seller ${data.name}: ${groupedAnnouncements[symbol][0].stockSymbol}`
                        );
                      }}
                    >
                      {symbol}
                    </Link>
                  </div>
                  <ul>
                    {groupedAnnouncements[symbol].map((announcement, index) => (
                      <li key={announcement.dfsaId}>
                        <ShortSellerAnnouncementRow
                          {...announcement}
                          first={index === 0}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </ul>
          </div>
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
            <button
              className="text-blue-500 underline bg-transparent border-none text-lg pl-4 pt-4 hover:text-blue-700"
              onClick={() => {
                if (window.history.length > 1 && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate("/short-sellers");
                }
              }}
            >
              {t("Back")}
            </button>
            <div></div>
            {content}
          </div>

          <div className="w-1/3 justify-end items-center hidden"></div>
        </div>
      </PageTemplate>
    </div>
  );
};

export default ShortSellerDetailsPage;
