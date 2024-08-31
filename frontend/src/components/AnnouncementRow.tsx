import { handleClick } from "../analytics";
import Announcement from "../models/Announcement";
import { formatTimestamp } from "../utils/dates";
import { useTranslation } from "react-i18next";

const AnnouncementRow: React.FC<Announcement> = (props) => {
  const { publishedDate, headline, headlineDanish, type, dfsaId } = props;
  const { i18n } = useTranslation();

  return (
    <div className="border px-3 py-2 m-2 hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="grid grid-cols-2 place-content-between mb-2 text-gray-500 dark:text-white">
        <div className="font-medium text-left">
          {formatTimestamp(publishedDate)}
        </div>
        <div className="font-medium text-right">{type}</div>
      </div>
      <div className="font-medium text-wrap hover:underline">
        <a
          href={`https://oam.finanstilsynet.dk/#!/announcement-details?Id=${dfsaId}`}
          target="_blank"
          onClick={() => {
            handleClick(`clicked on announcement detail: ${headline}`);
          }}
        >
          {i18n.language === "da" || i18n.language === "da-DK"
            ? headlineDanish
            : headline}
        </a>
      </div>
    </div>
  );
};

export default AnnouncementRow;
