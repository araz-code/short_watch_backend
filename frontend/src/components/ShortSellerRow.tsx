import { useTranslation } from "react-i18next";
import ShortSeller from "../models/ShortSeller";
import ChangeIndicator from "./UI/ChangeIndicator";
import { formatTimestamp } from "../utils/dates";

const ShortSellerRow: React.FC<ShortSeller> = (props) => {
  const { name, current, previous, lastUpdated } = props;
  const { t } = useTranslation();

  return (
    <div className="border px-3 py-2 m-2 grid grid-cols-1 md:grid-cols-2 gap-4 hover:bg-blue-100 dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="font-semibold">{name}</div>

      <div className="grid grid-cols-6 md:grid-cols-2 gap-5">
        <div className="col-span-4 md:col-span-1">
          <div className="font-normal text-sm text-gray-600 underline pb-1">
            {t("Current")}
          </div>
          {current.length > 0 && (
            <ul className="list-disc list-outside font-normal text-sm space-y-2 pl-4">
              {current.map((item, index) => (
                <li key={index}>
                  <div className="flex justify-between items-center">
                    <span>{item.stockSymbol}</span>
                    <div className="flex items-center gap-x-2">
                      <ChangeIndicator
                        value={item.value}
                        prevValue={item.prevValue}
                      />
                      <span>{`${Math.abs(item.value).toFixed(2)}%`}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="col-span-2 md:col-span-1">
          <div className="font-normal text-sm text-gray-600 underline pb-1">
            {t("Previous")}
          </div>
          {previous.length > 0 && (
            <ul className="list-disc list-outside font-normal text-sm space-y-2 pl-4">
              {previous.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="font-normal text-gray-600">
        {formatTimestamp(lastUpdated)}
      </div>
    </div>
  );
};

export default ShortSellerRow;
