import { useQuery } from "@tanstack/react-query";
import {
  useSearchParams,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import { fetchLargeShortSellerDetails, HOST } from "../apis/ShortPositionAPI";
import { useEffect, useState } from "react";
import PageTemplate from "../components/PageTemplate";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import { useTranslation } from "react-i18next";

import { trackEvent, trackPageView } from "../analytics";
import Announcement from "../models/Announcement";
import ShortSellerDetails from "../models/ShortSellerDetails";
import ShortSellerAnnouncementRow from "../components/ShortSellerAnnouncementRow";
import ShortSellerDetailsHelpDialog from "../components/ShortSellerDetailsHelpDialog";

interface GroupedAnnouncements {
  [key: string]: Announcement[];
}

const ShortSellerDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const seller = searchParams.get("seller");
  const [showHelp, setShowHelp] = useState(false);


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
    trackEvent("seller_details_view", { seller: seller ?? "" });
    trackPageView(`/short-seller-details`, "short seller details");
  }, [seller]);

  useEffect(() => {
    if (!data || !location.hash) return;
    const id = location.hash.slice(1);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  }, [data, location.hash]);

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
        <div className="text-center pb-4 dark:text-white shrink-0">
          <h1 className="text-xl">{data.name}</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {t("Data on this page comes from announcements.")}{" "}
            {t("Danish FSA updates only positions above 0.5%.")}
          </p>
          <div className="mt-3 mx-auto w-12 h-0.5 rounded-full bg-blue-500/40" />
        </div>
        <div className="flex-1 min-h-0 [@media(max-height:900px)_and_(orientation:landscape)]:flex-none">
          <div className="overflow-y-auto h-full [@media(max-height:900px)_and_(orientation:landscape)]:overflow-visible [@media(max-height:900px)_and_(orientation:landscape)]:h-auto">
            <ul className="mx-4">
              {Object.keys(groupedAnnouncements).map((symbol) => (
                <div key={symbol}>
                  <div
                    className="mt-3 mb-1 ml-2"
                    id={symbol}
                  >
                    <Link
                      to={`/short-watch-details?code=${groupedAnnouncements[symbol][0].stockCode}`}
                      onClick={() => {
                        trackEvent("seller_to_position_click", {
                          seller: data.name,
                          symbol: groupedAnnouncements[symbol][0].stockSymbol,
                        });
                      }}
                      className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      {symbol} →
                    </Link>
                  </div>
                  <ul>
                    {groupedAnnouncements[symbol].map((announcement, index) => (
                      <li key={announcement.dfsaId}>
                        <ShortSellerAnnouncementRow
                          {...announcement}
                          first={index === 0}
                          isEven={index % 2 === 0}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </ul>
            <div className="h-6"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-dvh dark:bg-[#0d0d12] flex flex-col overflow-hidden [@media(max-height:900px)_and_(orientation:landscape)]:overflow-auto [@media(max-height:900px)_and_(orientation:landscape)]:h-auto [@media(max-height:900px)_and_(orientation:landscape)]:min-h-dvh">
      <title>{data?.name ? `Zirium | ${data.name}` : "Zirium | Short Seller Details"}</title>
      {data?.name && (
        <meta name="description" content={`View all short selling positions held by ${data.name} in Danish stocks.`} />
      )}
      <PageTemplate>
        <div className="w-screen lg:justify-center lg:gap-4 m-auto flex flex-col flex-1 min-h-0 lg:flex-row">
          <div className="w-1/3 justify-end items-center hidden"></div>

          <div className="lg:w-[900px] flex flex-col flex-1 min-h-0 lg:flex-initial">
            <div className="flex items-center justify-between pr-2 shrink-0">
              <button
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-transparent border-none text-base pl-4 pt-4 inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm self-start"
                onClick={() => {
                  if (window.history.length > 1 && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate("/short-sellers");
                  }
                }}
              >
                <span aria-hidden="true">←</span>
                {t("Back")}
              </button>
              <button
                type="button"
                onClick={() => {
                  trackEvent("help_dialog_open", { page: "seller_details" });
                  fetch(`${HOST}/stats/visit/help-seller-details/`).catch(() => {});
                  setShowHelp(true);
                }}
                aria-label={t("Help")}
                className="text-sm font-medium text-blue-500 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-1.5 mt-4 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:ring-2 focus:ring-blue-300 transition-colors"
              >
                {t("Help")}
              </button>
            </div>
            {content}
          </div>

          <div className="w-1/3 justify-end items-center hidden"></div>
        </div>
      </PageTemplate>

      {showHelp && (
        <div className="w-screen lg:w-[900px] m-auto">
          <ShortSellerDetailsHelpDialog onClose={() => setShowHelp(false)} />
        </div>
      )}
    </div>
  );
};

export default ShortSellerDetailsPage;
