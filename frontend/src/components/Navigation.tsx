import { Link, NavLink } from "react-router-dom";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBoxOpen,
  faBalanceScale,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";

const defaultCollapseMenu = {
  mainMenu: true,
  legalMenu: true,
  productMenu: true,
};

const Navigation: React.FC = () => {
  const [collapseMenu, setCollapseMenu] = useState(defaultCollapseMenu);
  const { t } = useTranslation();

  const toggleMainMenu = () => {
    setCollapseMenu((prev) => ({
      mainMenu: !prev.mainMenu,
      legalMenu: true,
      productMenu: true,
    }));
  };

  const toggleLegalMenu = () => {
    setCollapseMenu((prev) => ({
      ...prev,
      productMenu: true,
      legalMenu: !prev.legalMenu,
    }));
  };

  const toggleProductMenu = () => {
    setCollapseMenu((prev) => ({
      ...prev,
      legalMenu: true,
      productMenu: !prev.productMenu,
    }));
  };

  const isLegalActive = [
    "/privacy-policy",
    "/cookie-policy",
    "/terms-of-agreement",
  ].includes(location.pathname);

  const isProductActive = ["/short-watch", "/short-sellers"].includes(
    location.pathname
  );

  const commonLinkClasses = "block md:hover:bg-blue-600 md:hover:rounded-lg";

  const commonActiveClasses =
    "underline md:no-underline md:bg-blue-700 md:rounded-lg md:text-white  hover:bg-blue-600 ";

  return (
    <>
      <nav className="relative px-4 md:px-10 py-2 text-2xl font-bold text-white font-display bg-[#0d1b4c] z-30">
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
                : "absolute top-[4.3rem] right-0 w-[90%] mr-2 md:static md:w-auto md:m-0 text-gray-800 dark:text-white"
            } md:block bg-transparent `}
          >
            <ul className="flex flex-col text-base p-4 md:p-0 mt-4 border border-gray-100 rounded-xl md:space-x-6 md:flex-row md:mt-0 md:border-0 bg-white dark:bg-[#121212] md:bg-[#0d1b4c] md:dark:bg-[#0d1b4c] ">
              <li>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `p-2 ${commonLinkClasses} ${
                      isActive ? `${commonActiveClasses}` : ""
                    }`
                  }
                  onClick={() => setCollapseMenu(defaultCollapseMenu)}
                >
                  <div>
                    <FontAwesomeIcon icon={faHome} />
                    <span className="ml-1">{t("Home")}</span>
                  </div>
                </NavLink>
              </li>
              <li>
                <button
                  className={`${commonLinkClasses} flex items-center justify-between w-full p-2 md:w-auto ${
                    isProductActive ? `${commonActiveClasses}` : ""
                  }`}
                  onClick={toggleProductMenu}
                >
                  <div>
                    <FontAwesomeIcon icon={faBoxOpen} />
                    <span className="ml-1">{t("Products")}</span>
                  </div>
                  <svg
                    className={`w-2.5 h-2.5 ms-2.5 transition-transform ${
                      collapseMenu.productMenu ? "" : "rotate-180"
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
                  className={`md:absolute md:z-10 md:shadow md:w-70 md:rounded-lg bg-white dark:bg-[#121212] font-normal divide-y divide-gray-100 md:border md:border-gray-100 text-gray-800 dark:text-white ${
                    collapseMenu.productMenu ? "hidden" : "top-[4.7rem]"
                  }`}
                >
                  <ul className="text-sm md:text-base">
                    <li>
                      <NavLink
                        to="/short-watch"
                        className={({ isActive }) =>
                          `$block px-4 py-2 md:pt-5 hover:text-gray-500  dark:hover:text-gray-300 ${
                            isActive ? "underline" : ""
                          }`
                        }
                        onClick={() => setCollapseMenu(defaultCollapseMenu)}
                      >
                        Short watch
                      </NavLink>
                    </li>
                    <li>
                      <NavLink
                        to="/short-sellers"
                        className={({ isActive }) =>
                          `block px-4 py-2  hover:text-gray-500  dark:hover:text-gray-300 ${
                            isActive ? "underline" : ""
                          }`
                        }
                        onClick={() => setCollapseMenu(defaultCollapseMenu)}
                      >
                        Short sellers
                      </NavLink>
                    </li>
                  </ul>
                </div>
              </li>
              <li>
                <button
                  className={`${commonLinkClasses} flex items-center justify-between w-full p-2 md:w-auto ${
                    isLegalActive ? `${commonActiveClasses}` : ""
                  }`}
                  onClick={toggleLegalMenu}
                >
                  <div>
                    <FontAwesomeIcon icon={faBalanceScale} />
                    <span className="ml-1">{t("Legal")}</span>
                  </div>

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
                  className={`md:absolute md:z-10 md:shadow md:w-70 md:rounded-lg bg-white dark:bg-[#121212] font-normal divide-y divide-gray-100 md:border md:border-gray-100 text-gray-800 dark:text-white ${
                    collapseMenu.legalMenu ? "hidden" : "top-[4.7rem]"
                  }`}
                >
                  <ul className="text-sm md:text-base">
                    <li>
                      <NavLink
                        to="/privacy-policy"
                        className={({ isActive }) =>
                          `block px-4 py-2 md:pt-5 hover:text-gray-500  dark:hover:text-gray-300 ${
                            isActive ? "underline" : ""
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
                          `block px-4 py-2 hover:text-gray-500  dark:hover:text-gray-300 ${
                            isActive ? "underline" : ""
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
                          `block px-4 py-2 hover:text-gray-500  dark:hover:text-gray-300 ${
                            isActive ? "underline" : ""
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
                    `p-2 ${commonLinkClasses} ${
                      isActive ? `${commonActiveClasses}` : ""
                    }`
                  }
                  onClick={() => setCollapseMenu(defaultCollapseMenu)}
                >
                  <div>
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span className="ml-1">{t("Contact")}</span>
                  </div>
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      {(!collapseMenu.mainMenu ||
        !collapseMenu.legalMenu ||
        !collapseMenu.productMenu) && (
        <div
          className="opacity-25 dark:opacity-50 fixed inset-0 z-20 bg-black"
          onClick={() => setCollapseMenu(defaultCollapseMenu)}
        ></div>
      )}
    </>
  );
};

export default Navigation;
