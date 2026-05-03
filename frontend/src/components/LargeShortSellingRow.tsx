import { Link } from "react-router-dom";
import LargestShortSelling from "../models/LargestShortSelling";
import { formatTimestamp } from "../utils/dates";
import { trackEvent } from "../analytics";
import ChangeIndicator from "./UI/ChangeIndicator";
import { formatNum } from "../utils/format";

const LargeShortSellingRow: React.FC<LargestShortSelling & { isEven: boolean }> = (props) => {
  const { name, value, prevValue, date, shortSeller, stockSymbol, isEven } = props;

  return (
    <Link
      to={{
        pathname: `/short-seller-details`,
        search: `?seller=${shortSeller}`,
        hash: `#${stockSymbol}`,
      }}
      onClick={() => {
        trackEvent("seller_link_click", { seller_name: name, symbol: stockSymbol });
      }}
    >
      <div className={`mx-2 my-1 px-4 py-2 rounded-lg flex items-center justify-between shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 text-sm dark:text-white border border-gray-100 dark:border-gray-800 ${isEven ? "bg-white dark:bg-[#1e1e1e]" : "bg-gray-50 dark:bg-[#181818]"}`}>
        {/* Left: name + date stacked */}
        <div className="min-w-0">
          <div className="font-medium truncate">{name}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {formatTimestamp(date, "dateOnly")}
          </div>
        </div>

        {/* Right: value + change */}
        <div className="shrink-0 ml-3 text-right">
          <div className="flex items-center gap-2 justify-end">
            <ChangeIndicator value={value} prevValue={prevValue} />
            <span className="font-semibold tabular-nums">{formatNum(value, 2)}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LargeShortSellingRow;
