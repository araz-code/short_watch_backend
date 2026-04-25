import { trackEvent } from "../analytics";
import Announcement from "../models/Announcement";
import { formatTimestamp } from "../utils/dates";
import { useTranslation } from "react-i18next";

const AnnouncementRow: React.FC<Announcement> = (props) => {
  const { publishedDate, headline, headlineDanish, type, dfsaId } = props;
  const { i18n } = useTranslation();

  return (
    <a
      href={`https://oam.finanstilsynet.dk/#!/announcement-details?Id=${dfsaId}`}
      target="_blank"
      onClick={() => {
        trackEvent("announcement_open", { headline, dfsa_id: dfsaId });
      }}
    >
      <div className="mx-2 my-1.5 px-4 py-2.5 rounded-lg bg-white dark:bg-[#1e1e1e] shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 text-sm dark:text-white border border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-2 place-content-between mb-2 text-gray-500 dark:text-gray-400">
          <div className="font-medium text-left">
            {formatTimestamp(publishedDate)}
          </div>
          <div className="font-medium text-right">{type}</div>
        </div>
        <div className="font-medium text-wrap hover:underline">
          {i18n.language === "da" || i18n.language === "da-DK"
            ? headlineDanish
            : headline}
        </div>
      </div>
    </a>
  );
};

export default AnnouncementRow;
