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
      <div>
        <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-blue-500 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-[#212121]">
          {t(selectedMenuItem) || "Symbol"}
          <FontAwesomeIcon
            icon={faChevronDown}
            className="-mr-1 h-5 w-5 text-gray-400"
            aria-hidden="true"
          />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 left-5 z-10 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-[#121212] shadow-lg ring-1 ring-black dark:ring-white  ring-opacity-5 focus:outline-none">
          <p className="py-3 px-3 border-b-[1.6px] border-gray-200 text-gray-600 dark:text-gray-300 text-base">
            {t("Sort list by")}
          </p>
          {options.map((option) => (
            <Menu.Item key={option}>
              {({ active }) => (
                <button
                  onClick={() => onSelectMenuItemChange(option)}
                  className={classNames(
                    active
                      ? "bg-gray-200 dark:bg-gray-400  text-black"
                      : "text-black dark:text-white",
                    "block px-4 py-2 text-base w-full text-left font-normal"
                  )}
                >
                  {t(option)}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default DropDownMenu;
