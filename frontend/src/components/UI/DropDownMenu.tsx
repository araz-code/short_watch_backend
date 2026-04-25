import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const DropDownMenu: React.FC<{
  options: string[];
  selectedMenuItem: string;
  onSelectMenuItemChange: (value: string) => void;
}> = ({ options, selectedMenuItem, onSelectMenuItemChange }) => {
  const { t } = useTranslation();
  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => (
        <>
          <Menu.Button className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-[#1e1e1e] px-3 py-2 text-sm font-semibold text-blue-500 shadow-xs ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-blue-300">
            {t(selectedMenuItem) || "Symbol"}
            <FontAwesomeIcon
              icon={faChevronDown}
              className={classNames(
                "h-4 w-4 text-gray-400 transition-transform duration-200",
                open ? "rotate-180" : ""
              )}
              aria-hidden="true"
            />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="transform opacity-0 scale-95 -translate-y-1"
            enterTo="transform opacity-100 scale-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 z-20 mt-2 w-56 origin-top-left rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl ring-1 ring-gray-100 dark:ring-gray-800 focus:outline-hidden overflow-hidden">
              <p className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {t("Sort list by")}
              </p>
              <div className="py-1">
                {options.map((option) => {
                  const isSelected = option === selectedMenuItem;
                  return (
                    <Menu.Item key={option}>
                      {({ active }) => (
                        <button
                          onClick={() => onSelectMenuItemChange(option)}
                          className={classNames(
                            "flex items-center justify-between w-full px-4 py-2 text-sm text-left transition-colors",
                            active
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : isSelected
                              ? "text-blue-500 dark:text-blue-400"
                              : "text-gray-700 dark:text-gray-200"
                          )}
                        >
                          <span className={isSelected ? "font-medium" : "font-normal"}>
                            {t(option)}
                          </span>
                          {isSelected && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              aria-hidden="true"
                            >
                              <path
                                d="M2 7.5L5.5 11L12 3.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                    </Menu.Item>
                  );
                })}
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default DropDownMenu;
