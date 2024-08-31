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
    <div className="border px-3 py-2 m-2 hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="grid grid-cols-2 place-content-between hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
        <div className="font-medium">{formatTimestamp(publishedDate)}</div>
        <div className="font-medium text-right">{`${value.toFixed(2)}%`}</div>
      </div>
      {first ? (
        isHistoric ? (
          <div className="text-red-600 font-medium">
            {t("Last published position")}
          </div>
        ) : (
          <div className="text-green-600 font-medium">{t("Current")}</div>
        )
      ) : undefined}
    </div>
  );
};

export default ShortSellerAnnouncementRow;
