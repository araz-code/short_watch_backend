import { useTranslation } from "react-i18next";
import Announcement from "../models/Announcement";
import { formatTimestamp } from "../utils/dates";

interface AnnouncementWithFirst extends Announcement {
  first: boolean;
}

const ShortSellerAnnouncementRow: React.FC<AnnouncementWithFirst> = (props) => {
  const { publishedDate, value, isHistoric, first } = props;
  const { t } = useTranslation();

  return (
    <div className="mx-2 my-1.5 px-4 py-2.5 rounded-lg bg-white dark:bg-[#1e1e1e] shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 text-sm dark:text-white border border-gray-100 dark:border-gray-800">
      <div className="grid grid-cols-2 place-content-between">
        <div className="font-medium">{formatTimestamp(publishedDate)}</div>
        <div className="font-medium text-right">{`${value.toFixed(2)}%`}</div>
      </div>
      {first ? (
        isHistoric ? (
          <div className="text-red-600 font-medium mt-1">
            {t("Last published position")}
          </div>
        ) : (
          <div className="text-green-600 font-medium mt-1">{t("Current")}</div>
        )
      ) : undefined}
    </div>
  );
};

export default ShortSellerAnnouncementRow;
