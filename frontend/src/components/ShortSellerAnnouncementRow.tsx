import { useTranslation } from "react-i18next";
import Announcement from "../models/Announcement";
import { formatTimestamp } from "../utils/dates";
import { formatNum } from "../utils/format";

interface AnnouncementWithFirst extends Announcement {
  first: boolean;
  isEven: boolean;
}

const ShortSellerAnnouncementRow: React.FC<AnnouncementWithFirst> = (props) => {
  const { publishedDate, value, isHistoric, first, isEven } = props;
  const { t } = useTranslation();

  return (
    <div className={`mx-2 my-1 px-4 py-1.5 rounded-lg shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 text-sm dark:text-white border border-gray-100 dark:border-gray-800 ${isEven ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"}`}>
      <div className="grid grid-cols-2 place-content-between">
        <div className="font-medium">{formatTimestamp(publishedDate)}</div>
        <div className="font-medium text-right tabular-nums">{`${formatNum(value, 2)}%`}</div>
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
