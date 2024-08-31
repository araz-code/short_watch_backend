import { useTranslation } from "react-i18next";
import ShortSeller from "../models/ShortSeller";

const ShortSellerRow: React.FC<ShortSeller> = (props) => {
  const { name, current, previous } = props;
  const { t } = useTranslation();

  return (
    <div className="border px-3 py-1 m-2 grid grid-cols-1 md:grid-cols-2 gap-4 hover:bg-blue-100 dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="font-semibold">{name}</div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-normal text-sm text-gray-600 underline pb-1">
            {t("Current")}
          </div>
          {current.length > 0 && (
            <ul className="list-disc list-inside font-normal text-sm">
              {current.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="font-normal text-sm text-gray-600 underline pb-1">
            {t("Previous")}
          </div>
          {previous.length > 0 && (
            <ul className="list-disc list-inside font-normal text-sm">
              {previous.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortSellerRow;
