import { useTranslation } from "react-i18next";
import LargestShortSelling from "../models/LargestShortSelling";
import LargeShortSellingRow from "./LargeShortSellingRow";

const LargeShortSellingList: React.FC<{ sellings: LargestShortSelling[] }> = ({
  sellings,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-[150px] h-[calc(100svh-31.1rem)]">
      <div className="overflow-y-auto h-full">
        {sellings.length !== 0 && (
          <p className="text-xs pl-6 dark:text-white">
            {t("You can get more details by clicking on a row")}
          </p>
        )}
        <ul className="mx-4">
          {sellings.length === 0 && (
            <div className="flex justify-center mt-10 dark:text-white">
              <p className="text-wrap">
                {t(
                  "No short sellers with positions equal to or greater than 0.50%"
                )}
              </p>
            </div>
          )}
          {sellings.length > 0 &&
            sellings.map((seller: LargestShortSelling) => (
              <li key={`${seller.name}-${seller.date}`}>
                <LargeShortSellingRow {...seller} />
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default LargeShortSellingList;
