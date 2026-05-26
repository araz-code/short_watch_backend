import Navigation from "../components/Navigation";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartSimple,
  faClockRotateLeft,
  faPerson,
  faArrowRight,
  faFileLines,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import AppImage from "../components/Homepage/AppImage";
import FeaturedAnalyses from "../components/FeaturedAnalyses";
import { useEffect, useState } from "react";
import { trackEvent, trackPageView } from "../analytics";
import { useQuery } from "@tanstack/react-query";
import { fetchStats, ShortStats } from "../apis/ShortPositionAPI";
import { formatTimestamp } from "../utils/dates";
import { formatNum } from "../utils/format";

type HomeCard = {
  icon: typeof faChartSimple;
  title: string;
  content: string;
  to: string;
  slug: string;
};

const cards: HomeCard[] = [
  {
    icon: faChartSimple,
    title: "Personal list",
    content:
      "Build a watchlist of the Danish stocks you care about.",
    to: "/short-watch",
    slug: "personal_list",
  },
  {
    icon: faClockRotateLeft,
    title: "Historic data",
    content:
      "Explore short positions over time, tables and charts included.",
    to: "/short-watch",
    slug: "historic_data",
  },
  {
    icon: faPerson,
    title: "Short sellers",
    content:
      "See every short seller holding 0.50% or more in a given stock.",
    to: "/short-sellers",
    slug: "short_sellers",
  },
  {
    icon: faTrophy,
    title: "Top Lists",
    content:
      "See which stocks are most shorted, trending, and most viewed.",
    to: "/top-lists",
    slug: "top_lists",
  },
  {
    icon: faFileLines,
    title: "In-depth analysis",
    content:
      "Read our analyses that combine short positions with company events, insider trades, and market context.",
    to: "/analyse",
    slug: "analysis",
  },
];

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  // Toggle to true and bump the storage key (e.g. _v2) when announcing a new feature.
  const BANNER_ENABLED = false;
  const [showBanner, setShowBanner] = useState(() => {
    return BANNER_ENABLED && localStorage.getItem("banner_dismissed_v1") !== "true";
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
    trackPageView("/", "home");
  }, []);

  return (
    <div className="bg-white dark:bg-[#0d0d12]">
      <title>Zirium | Homepage</title>
      <meta name="description" content="Track short selling positions in Danish stocks in real-time. View historical data, largest short sellers, and trending stocks. Free app for iPhone, iPad, and Apple Watch." />
      <div className="flex flex-col sm:min-h-[650px]">
        <div className="bg-wave-pattern dark:bg-wave-pattern-dark bg-cover bg-no-repeat bg-bottom h-[57%] flex flex-col pb-2 sm:pb-0 [@media(min-width:2000px)]:min-h-[770px]">
          <Navigation />

          {showBanner && (
            <div className="mx-auto max-w-[900px] mt-4 px-4">
              <div className="relative flex items-start gap-3 px-5 py-4 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-white text-sm">
                <span className="text-lg mt-0.5">✨</span>
                <div className="flex-1 leading-relaxed">
                  <p className="font-semibold mb-1">{t("announcement_title")}</p>
                  <p className="text-white/70">{t("announcement_body")}</p>
                  <div className="flex gap-3 mt-3">
                    <Link
                      to="/short-sellers"
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                      onClick={() => trackEvent("banner_click", { destination: "short_sellers" })}
                    >
                      {t("Short sellers")} →
                    </Link>
                    <Link
                      to="/top-lists"
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
                      onClick={() => trackEvent("banner_click", { destination: "top_lists" })}
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
                  className="text-white bg-white/10 backdrop-blur-xs border border-white/20 hover:bg-white/20 focus:ring-2 focus:ring-white/40 font-medium rounded-full text-sm px-5 py-2.5 flex items-center h-[45px] transition-all duration-200"
                  onClick={() => trackEvent("outbound_click", { destination: "app_store" })}
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
                    onClick={() => trackEvent("outbound_click", { destination: "web_app" })}
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

            </div>
            <AppImage />
          </main>
        </div>

        {/* Featured analyses */}
        <FeaturedAnalyses />

        {/* Live stats */}
        {stats && (
          <section className="py-10 sm:py-12">
            <div className="max-w-[900px] mx-auto px-6">
              <div className="grid grid-cols-3 gap-y-8 gap-x-2 sm:gap-x-4">
                {stats.shortedCount > 0 && (
                  <Link
                    to="/short-watch"
                    onClick={() => trackEvent("homepage_stat_click", { stat: "stocks_shorted" })}
                    className="text-center rounded-lg p-2 sm:p-3 -mx-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tabular-nums group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {stats.shortedCount}
                    </p>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                      {t("Stocks shorted")}
                    </p>
                    {stats.shortedCountDelta != null && stats.shortedCountDelta !== 0 && (
                      <p
                        className={`text-[11px] sm:text-sm mt-1 tabular-nums ${
                          stats.shortedCountDelta > 0
                            ? "text-red-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {stats.shortedCountDelta > 0 ? "+" : ""}
                        {stats.shortedCountDelta} {t("vs. 7d")}
                      </p>
                    )}
                  </Link>
                )}
                {stats.mostShorted && (
                  <Link
                    to={`/short-watch-details?code=${stats.mostShorted.code}`}
                    onClick={() => trackEvent("homepage_stat_click", { stat: "most_shorted", code: stats.mostShorted!.code })}
                    className="text-center rounded-lg p-2 sm:p-3 -mx-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tabular-nums group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {formatNum(stats.mostShorted.value, 2)}%
                    </p>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                      {t("Most shorted")} · {stats.mostShorted.symbol}
                    </p>
                    {stats.mostShorted.prevValue != null && (() => {
                      const diff = stats.mostShorted!.value - stats.mostShorted!.prevValue!;
                      if (Math.abs(diff) < 0.01) return null;
                      return (
                        <p
                          className={`text-[11px] sm:text-sm mt-1 tabular-nums ${
                            diff > 0 ? "text-red-500" : "text-emerald-500"
                          }`}
                        >
                          {diff > 0 ? "+" : ""}
                          {formatNum(diff, 2)}% {t("vs. 7d")}
                        </p>
                      );
                    })()}
                  </Link>
                )}
                {stats.mostViewed && (
                  <Link
                    to={`/short-watch-details?code=${stats.mostViewed.code}`}
                    onClick={() => trackEvent("homepage_stat_click", { stat: "most_viewed", code: stats.mostViewed!.code })}
                    className="text-center rounded-lg p-2 sm:p-3 -mx-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {stats.mostViewed.symbol}
                    </p>
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                      {t("Most viewed")}
                    </p>
                  </Link>
                )}
              </div>
              {stats.updatedAt && (
                <p className="text-center text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-6">
                  {t("Updated")} {formatTimestamp(stats.updatedAt, "dateAndTime")}
                </p>
              )}
            </div>
          </section>
        )}

        <section className={stats ? "mt-4" : "mt-10 sm:mt-14"}>
          <p className="text-xs uppercase tracking-widest text-center text-blue-500 dark:text-blue-400 font-semibold mb-3">
            {t("What you get")}
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-center text-gray-900 dark:text-white tracking-tight max-w-[600px] mx-auto px-4">
            {t("Everything you need to track Danish short positions")}
          </h2>
        </section>
      </div>

      <section className="mt-8 sm:mt-10 pb-[20px] max-w-[900px] mx-auto px-6">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
          {cards.map((item) => (
            <li key={item.title}>
              <Link
                to={item.to}
                onClick={() => {
                  if (item.slug === "analysis") {
                    trackEvent("analysis_link_click", { click_source: "homepage_card" });
                  } else {
                    trackEvent("homepage_card_click", { card: item.slug });
                  }
                }}
                className="group flex items-start gap-4 -m-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                  <FontAwesomeIcon icon={item.icon} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors inline-flex items-center gap-2">
                    {t(item.title)}
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{t(item.content)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 mt-4">
        <div className="max-w-[1000px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 order-2 sm:order-1">
            &copy; {new Date().getFullYear()} Zirium. All rights reserved.
          </p>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400 order-1 sm:order-2">
            <Link to="/faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {t("FAQ")}
            </Link>
            <Link to="/privacy-policy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {t("Privacy")}
            </Link>
            <Link to="/terms-of-agreement" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {t("Terms")}
            </Link>
            <Link to="/cookie-policy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {t("Cookies")}
            </Link>
            <Link to="/contact" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              {t("Contact")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
