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
import { useEffect } from "react";
import { logEvent, logPageView } from "../analytics";

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

  useEffect(() => {
    logPageView("/", "Home");
  }, []);

  return (
    <div className="bg-white dark:bg-[#121212]">
      <div className="flex flex-col sm:h-screen sm:min-h-[850px]">
        <div className="bg-wave-pattern dark:bg-wave-pattern-dark bg-cover bg-no-repeat bg-bottom h-full flex flex-col pb-2 sm:pb-0">
          <Navigation />

          <main className="flex flex-col sm:flex-row sm:max-w-[1000px] sm:justify-end gap-10 sm:h-[70%] mt-10 px-5 self-center sm:px-[20px]">
            <div className="flex flex-col justify-center justify-items-center sm:pb-0 text-white gap-5 sm:w-[410px] sm:mr-5">
              <p className="text-2xl text-center sm:text-left sm:text-4xl font-bold">
                Danish Short Watch
              </p>
              <p className="sm:text-lg text-wrap">
                {t(
                  "An elegant and simplified solution for accessing information on short positions in Danish stocks."
                )}
              </p>
              <p className="sm:text-lg text-wrap">
                {t(
                  "Download the app from the App Store for iPhone, iPad, and Apple Watch, or access the web application."
                )}
              </p>

              <p className="sm:text-lg text-wrap text-black border border-gray-300 p-4 rounded-lg bg-white">
                <span className="font-bold text-blue-700">{t("NEWS: ")}</span>
                {t(
                  "The iPhone and iPad app now have push notifications, so you can get notified when your watchlist is updated."
                )}
              </p>

              <div className="flex flex-wrap justify-center gap-4 align-stretch">
                <a
                  href="https://apps.apple.com/dk/app/danish-short-watch/id6471075439"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white bg-black border border-white hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 py-2.5 flex items-center h-[45px]"
                  onClick={() => {
                    logEvent("user_action", "app store clicked");
                  }}
                >
                  <svg
                    className="w-7 h-7 me-2 -ms-3"
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
                    <p className="text-[9px]">Available on the</p>
                    <p className="text-[16px]">App Store</p>
                  </div>
                </a>

                <Link to="/short-watch">
                  <button
                    className="text-white bg-blue-400 border border-white hover:bg-[#85C1E9] focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 py-2.5 flex items-center h-[45px]"
                    onClick={() => {
                      logEvent("user_action", "web application clicked");
                    }}
                  >
                    <p className="text-[16px]"> {t("Web application")}</p>
                    <FontAwesomeIcon
                      className="ml-2 align-middle"
                      icon={faArrowRight}
                    />
                  </button>
                </Link>
              </div>
            </div>
            <AppImage />
          </main>
        </div>
        <section className="text-gray-800">
          <p className="text-3xl sm:text-4xl font-bold text-center my-10 sm:my-0 text-gray-800 dark:text-white">
            Features
          </p>
        </section>
      </div>

      <section className="flex flex-wrap gap-2 justify-center sm:mt-10 pb-[80px]">
        {cards.map((item) => (
          <Card
            icon={item.icon}
            title={t(item.title)}
            content={t(item.content)}
            key={item.title}
          />
        ))}
      </section>
    </div>
  );
};

export default HomePage;

/*
   <a
                  href="https://apps.apple.com/dk/app/danish-short-watch/id6471075439"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    className="inline-block box-shadow-none m-2 h-10 "
                    src={appStoreLogo}
                    alt="Floating Image"
                  />
                </a>
*/
