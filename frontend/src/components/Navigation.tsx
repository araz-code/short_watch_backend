import { Link, NavLink } from "react-router-dom";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

const Navigation: React.FC = () => {
  const [collapseMenu, setCollapseMenu] = useState({
    mainMenu: true,
    legalMenu: true,
  });
  const { t, i18n } = useTranslation();

  const toggleMainMenu = () => {
    setCollapseMenu((prev) => ({
      mainMenu: !prev.mainMenu,
      legalMenu: true,
    }));
  };

  const toggleLegalMenu = () => {
    setCollapseMenu((prev) => ({
      ...prev,
      legalMenu: !prev.legalMenu,
    }));
  };

  const isLegalActive = [
    "/privacy-policy",
    "/privatlivspolitik",
    "/terms-of-agreement",
    "/aftalevilkaar",
  ].includes(location.pathname);

  const commonLinkClasses = "block md:inline py-2";

  return (
    <nav className="relative px-4 sm:px-10 py-5 text-2xl font-bold text-white font-display bg-[#0d1b4c]">
      <div className="flex flex-wrap items-center justify-between">
        <Link to="/">ZIRIUM</Link>
        <button
          type="button"
          className={`inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-white rounded-lg md:hidden ${
            collapseMenu.mainMenu
              ? ""
              : "outline-none ring-2 ring-gray-200 bg-blue-400"
          }`}
          onClick={toggleMainMenu}
        >
          <svg
            className="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 17 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M1 1h15M1 7h15M1 13h15"
            />
          </svg>
        </button>
        <div
          className={`${
            collapseMenu.mainMenu
              ? "md:w-auto hidden"
              : "absolute top-16 right-0 z-10 w-[90%] mr-2 md:static md:w-auto md:m-0"
          } md:block bg-transparent`}
        >
          <ul className="flex flex-col text-base p-4 md:p-0 mt-4 border border-gray-100 rounded-xl md:space-x-8 md:flex-row md:mt-0 md:border-0 bg-[#0d1b4c]">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `${commonLinkClasses} ${isActive ? "underline" : ""}`
                }
              >
                {t("Home")}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/short-watch"
                className={({ isActive }) =>
                  `${commonLinkClasses} ${isActive ? "underline" : ""}`
                }
              >
                Short watch
              </NavLink>
            </li>
            <li>
              <button
                className={`flex items-center justify-between w-full py-2 md:p-0 md:w-auto ${
                  isLegalActive ? "underline" : ""
                }`}
                onClick={toggleLegalMenu}
              >
                {t("Legal")}
                <svg
                  className={`w-2.5 h-2.5 ms-2.5 transition-transform ${
                    collapseMenu.legalMenu ? "" : "rotate-180"
                  }`}
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 10 6"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 4 4 4-4"
                  />
                </svg>
              </button>
              <div
                className={`md:absolute md:z-10 md:shadow md:w-70 md:rounded-lg md:bg-[#0d1b4c] font-normal divide-y divide-gray-100 md:border md:border-gray-100 ${
                  collapseMenu.legalMenu ? "hidden" : ""
                }`}
              >
                <ul className="text-sm md:text-base">
                  <li>
                    <NavLink
                      to={
                        i18n.language === "da" || i18n.language === "da-DK"
                          ? "/privatlivspolitik"
                          : "/privacy-policy"
                      }
                      className={({ isActive }) =>
                        `block px-4 py-2 md:pt-5  ${
                          isActive ? "underline" : ""
                        }`
                      }
                    >
                      {t("Privacy policy")}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to={
                        i18n.language === "da" || i18n.language === "da-DK"
                          ? "/aftalevilkaar"
                          : "/terms-of-agreement"
                      }
                      className={({ isActive }) =>
                        `block px-4 py-2 ${isActive ? "underline" : ""}`
                      }
                    >
                      {t("Terms of agreement")}
                    </NavLink>
                  </li>
                </ul>
              </div>
            </li>
            <li>
              <NavLink
                to="/contact"
                className={({ isActive }) =>
                  `${commonLinkClasses} ${isActive ? "underline" : ""}`
                }
              >
                {t("Contact")}
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;