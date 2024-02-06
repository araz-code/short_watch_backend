import appImages from "../static/app.png";
import appStoreLogo from "../static/app-store.png";
import Header from "../components/Header";
import { Link } from "react-router-dom";
import {
  faChartSimple,
  faClockRotateLeft,
  faPerson,
} from "@fortawesome/free-solid-svg-icons";
import BoxWithIcon from "../components/UI/BoxWithIcon";

const HomePage: React.FC = () => {
  return (
    <>
      <div className="flex flex-col sm:h-screen sm:min-h-[850px]">
        <div className="bg-wave-pattern sm:h-[15rem] bg-cover bg-no-repeat bg-bottom grow flex flex-col pb-2 sm:pb-0">
          <Header />

          <main className="grid grid-cols sm:grid-cols-2 place-items-center sm:place-items-end max-w-[1000px] mx-auto mt-[40px] sm:mt-[60px]">
            <div className="flex flex-col justify-center justify-items-center grow px-10 pb-10 sm:pb-0 text-white m-auto">
              <p className="text-2xl text-center sm:text-left sm:text-4xl font-bold pb-5">
                Danish Short Watch
              </p>
              <p className="sm:text-lg pb-5 text-wrap">
                An elegant and simplified solution for accessing information on
                short positions in Danish stocks.
              </p>
              <p className="sm:text-lg pb-5 text-wrap">
                Download the app from the App Store for iPhone, iPad, and Apple
                Watch, or access the web service.
              </p>

              <div className="flex justify-center items-center">
                <a
                  href="https://apps.apple.com/dk/app/danish-short-watch/id6471075439"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    className="inline-block box-shadow-none m-2 h-10"
                    src={appStoreLogo}
                    alt="Floating Image"
                  />
                </a>
                <Link to="/short-watch">
                  <button className="text-white border border-white rounded px-4 py-2 transition duration-300 ease-in-out bg-gradient-to-r from-gray-800 via-black to-gray-800">
                    Web service
                  </button>
                </Link>
              </div>
            </div>
            <img
              className="max-h-[500px] v-auto"
              src={appImages}
              alt="app images"
            />
          </main>
        </div>
        <section className=" text-gray-800 m-auto">
          <p className="text-3xl sm:text-4xl font-bold text-center my-10 sm:my-0">
            Features
          </p>
        </section>
      </div>
      <section className="grid grid-cols sm:grid-cols-3 gap-6 place-items-center place-content-center sm:mt-10 sm:w-11/12 lg:w-[1200px] mx-auto mb-[100px]">
        <BoxWithIcon
          icon={faChartSimple}
          title="Personal list"
          content="Customize your own watchlist by selecting shorted Danish stocks that capture your interest or align with your investment goals."
        />
        <BoxWithIcon
          icon={faClockRotateLeft}
          title="Historic data"
          content="Delve into the historical data of short positions for Danish stocks, presented in both tabular formats and visualized through comprehensive charts."
        />
        <BoxWithIcon
          icon={faPerson}
          title="Short sellers"
          content="See a list of short sellers who hold positions equal to or exceeding 0.50% for a given Danish stock."
        />
      </section>

      <footer className="py-4 bg-white text-gray-800 text-center">
        <div>
          <h2>Contact Us</h2>
          <p>
            If you have any questions, feedback, or need assistance, please
            email us at:
          </p>
          <a href="mailto:contact@zirium.dk" className="underline">
            contact@zirium.dk
          </a>
        </div>
      </footer>
    </>
  );
};

export default HomePage;
