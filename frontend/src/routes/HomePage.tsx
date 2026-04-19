import Navigation from "../components/Navigation";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartSimple,
  faClockRotateLeft,
  faPerson,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import Card from "../components/UI/Card";
import { useTranslation } from "react-i18next";
import AppImage from "../components/Homepage/AppImage";
import { useEffect, useState } from "react";
import { handleClick, sendCustomPageView } from "../analytics";
import { useSEO } from "../utils/useSEO";
import { useQuery } from "react-query";
import { fetchStats, ShortStats } from "../apis/ShortPositionAPI";
import { formatTimestamp } from "../utils/dates";

const cards = [
  {
    icon: faChartSimple,
    title: "Personal list",
    content:
      "Build your own watchlist by selecting shorted Danish stocks that capture your interest or that you have in your portfolio.",
  },
  {
    icon: faClockRotateLeft,
    title: "Historic data",
    content:
      "Delve into the historical data of short positions for Danish stocks, presented in both tabular formats and visualized through comprehensive charts.",
  },
  {
    icon: faPerson,
    title: "Short sellers",
    content:
      "See a list of short sellers who hold positions equal to or exceeding 0.50% for a given Danish stock.",
  },
];

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  useSEO("Homepage", "Track short selling positions in Danish stocks in real-time. View historical data, largest short sellers, and trending stocks. Free app for iPhone, iPad, and Apple Watch.");

  const [showBanner, setShowBanner] = useState(() => {
    return localStorage.getItem("banner_dismissed_v1") !== "true";
  });

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("banner_dismissed_v1", "true");
  };

  const { data: stats } = useQuery<ShortStats>({
    queryKey: ["stats"],
    staleTime: 60000,
    queryFn: ({ signal }) => fetchStats({ signal }),
  });

  useEffect(() => {
    sendCustomPageView("/", "home");
  }, []);

  return (
    <div className="bg-white dark:bg-[#121212]">
      <div className="flex flex-col sm:min-h-[650px]">
        <div className="bg-wave-pattern dark:bg-wave-pattern-dark bg-cover bg-no-repeat bg-bottom h-[57%] flex flex-col pb-2 sm:pb-0 [@media(min-width:2000px)]:min-h-[770px]">
          <Navigation />

          {showBanner && (
            <div className="mx-auto max-w-[900px] mt-4 px-4">
              <div className="relative flex items-start gap-3 px-5 py-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-white text-sm">
                <span className="text-lg mt-0.5">✨</span>
                <div className="flex-1 leading-relaxed">
                  <p className="font-semibold mb-1">{t("announcement_title")}</p>
                  <p className="text-white/70">{t("announcement_body")}</p>
                  <div className="flex gap-3 mt-3">
                    <Link
                      to="/short-sellers"
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                      onClick={() => handleClick("banner short sellers clicked")}
                    >
                      {t("Short sellers")} →
                    </Link>
                    <Link
                      to="/top-lists"
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                      onClick={() => handleClick("banner top lists clicked")}
                    >
                      {t("Top Lists")} →
                    </Link>
                  </div>
                </div>
                <button
                  onClick={dismissBanner}
                  aria-label="Dismiss announcement"
                  className="text-white/50 hover:text-white text-lg leading-none p-1"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <main id="main-content" className="flex flex-col sm:flex-row sm:max-w-[1000px] sm:justify-end gap-10 sm:h-[80%] mt-14 px-5 self-center sm:px-[20px]">
            <div className="flex flex-col justify-start sm:pt-6 sm:pb-0 text-white gap-5 sm:w-[430px] sm:mr-5">
              <h1 className="text-3xl text-center sm:text-left sm:text-5xl tracking-tight">
                Danish Short Watch
              </h1>
              <p className="text-base text-white/80 leading-relaxed">
                {t(
                  "An elegant and simplified solution for accessing information on short positions in Danish stocks."
                )}
              </p>
              <p className="text-sm text-white/60 leading-relaxed">
                {t(
                  "Download the app from the App Store for iPhone, iPad, and Apple Watch, or access the web application."
                )}
              </p>

              <div className="flex flex-wrap justify-center sm:justify-start mt-3 gap-3">
                <a
                  href="https://apps.apple.com/dk/app/danish-short-watch/id6471075439"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 focus:ring-2 focus:ring-white/40 font-medium rounded-full text-sm px-5 py-2.5 flex items-center h-[45px] transition-all duration-200"
                  onClick={() => handleClick("app store clicked")}
                >
                  <svg
                    className="w-6 h-6 me-2"
                    aria-hidden="true"
                    focusable="false"
                    data-prefix="fab"
                    data-icon="apple"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 384 512"
                  >
                    <path
                      fill="currentColor"
                      d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
                    ></path>
                  </svg>
                  <div className="text-left leading-4">
                    <p className="text-[9px] text-white/70">Available on the</p>
                    <p className="text-[14px]">App Store</p>
                  </div>
                </a>

                <Link to="/short-watch">
                  <button
                    className="text-white bg-blue-500 hover:bg-blue-400 focus:ring-2 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 flex items-center h-[45px] transition-all duration-200 shadow-lg shadow-blue-500/25"
                    onClick={() => handleClick("short watch web app clicked")}
                  >
                    <FontAwesomeIcon
                      className="mr-2 text-lg"
                      icon={faChartSimple}
                    />
                    {t("Web application")}
                    <FontAwesomeIcon
                      className="ml-2 text-sm hidden sm:block"
                      icon={faArrowRight}
                    />
                  </button>
                </Link>
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                <Link to="/short-sellers">
                  <button
                    className="text-white bg-white/10 border border-white/20 hover:bg-white/20 focus:ring-2 focus:ring-white/40 font-medium rounded-full text-xs px-4 py-1.5 flex items-center transition-all duration-200"
                    onClick={() => handleClick("short sellers link clicked")}
                  >
                    {t("Short sellers")} →
                  </button>
                </Link>
                <Link to="/top-lists">
                  <button
                    className="text-white bg-white/10 border border-white/20 hover:bg-white/20 focus:ring-2 focus:ring-white/40 font-medium rounded-full text-xs px-4 py-1.5 flex items-center transition-all duration-200"
                    onClick={() => handleClick("top lists link clicked")}
                  >
                    {t("Top Lists")} →
                  </button>
                </Link>
              </div>
            </div>
            <AppImage />
          </main>
        </div>

        {/* Live stats */}
        {stats && (
          <section className="py-10 sm:py-12">
            <div className="max-w-[900px] mx-auto px-6">
              <div className="grid grid-cols-3 gap-y-8 gap-x-4 sm:gap-x-6">
                {stats.shortedCount > 0 && (
                  <div className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {stats.shortedCount}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t("Stocks shorted")}
                    </p>
                    {stats.shortedCountDelta != null && stats.shortedCountDelta !== 0 && (
                      <p
                        className={`text-[11px] mt-1 tabular-nums ${
                          stats.shortedCountDelta > 0
                            ? "text-red-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {stats.shortedCountDelta > 0 ? "+" : ""}
                        {stats.shortedCountDelta} {t("vs. 7d")}
                      </p>
                    )}
                  </div>
                )}
                {stats.mostShorted && (
                  <div className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {stats.mostShorted.value.toFixed(2)}%
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t("Most shorted")} · {stats.mostShorted.symbol}
                    </p>
                    {stats.mostShorted.prevValue != null && (() => {
                      const diff = stats.mostShorted!.value - stats.mostShorted!.prevValue!;
                      if (Math.abs(diff) < 0.01) return null;
                      return (
                        <p
                          className={`text-[11px] mt-1 tabular-nums ${
                            diff > 0 ? "text-red-500" : "text-emerald-500"
                          }`}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(2)}% {t("vs. 7d")}
                        </p>
                      );
                    })()}
                  </div>
                )}
                {stats.mostViewed && (
                  <div className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                      {stats.mostViewed.symbol}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t("Most viewed")}
                    </p>
                  </div>
                )}
              </div>
              {stats.updatedAt && (
                <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
                  {t("Updated")} {formatTimestamp(stats.updatedAt, "dateAndTime")}
                </p>
              )}
            </div>
          </section>
        )}

        <section className={stats ? "" : "mt-10 sm:mt-14"}>
          <p className="text-sm uppercase tracking-widest text-center text-gray-400 dark:text-gray-500 font-medium mb-2">
            {t("What you get")}
          </p>
        </section>
      </div>

      <section className="flex flex-wrap gap-2 justify-center sm:mt-4 pb-[20px]">
        {cards.map((item) => (
          <Card
            icon={item.icon}
            title={t(item.title)}
            content={t(item.content)}
            key={item.title}
          />
        ))}
      </section>

      <div className="py-6 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} Zirium. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default HomePage;
