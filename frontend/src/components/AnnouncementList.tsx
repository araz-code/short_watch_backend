import { useTranslation } from "react-i18next";
import Announcement from "../models/Announcement";
import AnnouncementRow from "./AnnouncementRow";

const AnnouncementList: React.FC<{ announcements: Announcement[] }> = ({
  announcements,
}) => {
  const { t } = useTranslation();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentAnnouncements = announcements.filter((announcement) => {
    const publishedDate = new Date(announcement.publishedDate);
    return publishedDate >= thirtyDaysAgo;
  });

  return (
    <div className="min-h-[150px] h-[calc(100svh-13.3rem)] sm:h-[calc(100svh-31.1rem)]">
      <div className="overflow-y-auto h-full">
        {recentAnnouncements.length !== 0 && (
          <p className="text-xs pl-6 dark:text-white">
            {t("You can get more details by clicking on a row")}
          </p>
        )}
        <ul className="mx-4">
          {recentAnnouncements.length === 0 && (
            <div className="flex justify-center mt-10 dark:text-white">
              <p className="text-wrap">
                {t("No announcements in the last month")}
              </p>
            </div>
          )}
          {recentAnnouncements.length > 0 &&
            recentAnnouncements.map((announcement: Announcement) => (
              <li
                key={`${announcement.headline}-${announcement.publishedDate}`}
              >
                <AnnouncementRow {...announcement} />
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default AnnouncementList;
