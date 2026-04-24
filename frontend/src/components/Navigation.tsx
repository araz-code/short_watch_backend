import { Link, NavLink, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const defaultCollapseMenu = {
  mainMenu: true,
  legalMenu: true,
};

const Navigation: React.FC = () => {
  const [collapseMenu, setCollapseMenu] = useState(defaultCollapseMenu);
  const { t } = useTranslation();
  const location = useLocation();
  const isHome = location.pathname === "/";

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
    "/cookie-policy",
    "/terms-of-agreement",
  ].includes(location.pathname);

  // Close menus on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCollapseMenu(defaultCollapseMenu);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const navClasses = isHome
    ? "bg-white/10 backdrop-blur-lg border border-white/15 shadow-lg shadow-black/5"
    : "bg-[#0d1b4c] shadow-lg shadow-black/10";

  const linkClasses =
    "block px-3 py-1.5 rounded-full transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 md:text-white/70 md:hover:text-white md:hover:bg-white/10 md:dark:text-white/70 md:dark:hover:text-white";

  const activeLinkClasses =
    "block px-3 py-1.5 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 md:text-white md:bg-white/15 md:dark:text-white md:dark:bg-white/15";

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-blue-600 focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>
      <div className="relative z-30 flex justify-center md:pt-3 md:px-4">
        <nav
          className={`w-full max-w-[900px] px-4 py-2 md:rounded-2xl ${navClasses}`}
        >
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-white font-bold text-lg tracking-wider"
            >
              ZIRIUM
            </Link>
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={!collapseMenu.mainMenu}
              className={`inline-flex items-center p-2 w-9 h-9 justify-center text-sm text-white/80 rounded-lg md:hidden hover:bg-white/10 focus:ring-2 focus:ring-white/40 ${
                collapseMenu.mainMenu
                  ? ""
                  : "bg-white/15 ring-1 ring-white/30"
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
                  : "absolute top-[3.2rem] right-4 left-4 md:static md:w-auto md:m-0"
              } md:block`}
            >
              <ul
                className={`flex flex-col text-sm p-3 md:p-0 rounded-xl md:flex-row md:items-center md:gap-1 md:rounded-none ${
                  collapseMenu.mainMenu
                    ? ""
                    : "bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-lg border border-gray-200 dark:border-gray-700 shadow-xl text-gray-700 dark:text-gray-200 md:bg-transparent md:dark:bg-transparent md:backdrop-blur-none md:border-0 md:shadow-none md:text-white"
                }`}
              >
                <li>
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      isActive ? activeLinkClasses : linkClasses
                    }
                    onClick={() => setCollapseMenu(defaultCollapseMenu)}
                  >
                    {t("Home")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/short-watch"
                    className={({ isActive }) =>
                      isActive ? activeLinkClasses : linkClasses
                    }
                    onClick={() => setCollapseMenu(defaultCollapseMenu)}
                  >
                    {t("Short Watch")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/short-sellers"
                    className={({ isActive }) =>
                      isActive ? activeLinkClasses : linkClasses
                    }
                    onClick={() => setCollapseMenu(defaultCollapseMenu)}
                  >
                    {t("Short Sellers")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/top-lists"
                    className={({ isActive }) =>
                      isActive ? activeLinkClasses : linkClasses
                    }
                    onClick={() => setCollapseMenu(defaultCollapseMenu)}
                  >
                    {t("Top Lists")}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/faq"
                    className={({ isActive }) =>
                      isActive ? activeLinkClasses : linkClasses
                    }
                    onClick={() => setCollapseMenu(defaultCollapseMenu)}
                  >
                    {t("FAQ")}
                  </NavLink>
                </li>
                <li className="relative">
                  <button
                    aria-expanded={!collapseMenu.legalMenu}
                    className={`flex items-center gap-1.5 w-full md:w-auto ${
                      isLegalActive ? activeLinkClasses : linkClasses
                    }`}
                    onClick={toggleLegalMenu}
                  >
                    {t("Legal")}
                    <svg
                      className={`w-2 h-2 transition-transform ${
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
                    className={`md:absolute md:z-10 md:right-0 md:mt-2 md:w-48 md:rounded-xl md:shadow-xl bg-white dark:bg-[#1e1e1e] md:border md:border-gray-200 dark:md:border-gray-700 text-gray-800 dark:text-white overflow-hidden ${
                      collapseMenu.legalMenu ? "hidden" : ""
                    }`}
                  >
                    <ul className="text-sm py-1">
                      <li>
                        <NavLink
                          to="/privacy-policy"
                          className={({ isActive }) =>
                            `block px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                              isActive ? "text-blue-500 font-medium" : ""
                            }`
                          }
                          onClick={() => setCollapseMenu(defaultCollapseMenu)}
                        >
                          {t("Privacy policy")}
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/cookie-policy"
                          className={({ isActive }) =>
                            `block px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                              isActive ? "text-blue-500 font-medium" : ""
                            }`
                          }
                          onClick={() => setCollapseMenu(defaultCollapseMenu)}
                        >
                          {t("Cookie policy")}
                        </NavLink>
                      </li>
                      <li>
                        <NavLink
                          to="/terms-of-agreement"
                          className={({ isActive }) =>
                            `block px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                              isActive ? "text-blue-500 font-medium" : ""
                            }`
                          }
                          onClick={() => setCollapseMenu(defaultCollapseMenu)}
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
                      isActive ? activeLinkClasses : linkClasses
                    }
                    onClick={() => setCollapseMenu(defaultCollapseMenu)}
                  >
                    {t("Contact")}
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </div>
      {(!collapseMenu.mainMenu || !collapseMenu.legalMenu) && (
        <div
          role="button"
          aria-label="Close menu"
          tabIndex={-1}
          className="opacity-25 dark:opacity-50 fixed inset-0 z-20 bg-black"
          onClick={() => setCollapseMenu(defaultCollapseMenu)}
        ></div>
      )}
    </>
  );
};

export default Navigation;
