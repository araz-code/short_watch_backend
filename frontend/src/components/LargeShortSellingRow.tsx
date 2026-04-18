import { Link } from "react-router-dom";
import LargestShortSelling from "../models/LargestShortSelling";
import { formatTimestamp } from "../utils/dates";
import { handleClick } from "../analytics";
import ChangeIndicator from "./UI/ChangeIndicator";

const LargeShortSellingRow: React.FC<LargestShortSelling> = (props) => {
  const { name, value, prevValue, date, shortSeller, stockSymbol } = props;

  return (
    <Link
      to={{
        pathname: `/short-seller-details`,
        search: `?seller=${shortSeller}`,
        hash: `#${stockSymbol}`,
      }}
      onClick={() => {
        handleClick(`clicked on link back to seller: ${name}`);
      }}
    >
      <div className="mx-2 my-1.5 px-4 py-3 rounded-lg flex items-center justify-between bg-white dark:bg-[#1e1e1e] shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 text-sm dark:text-white border border-gray-100 dark:border-gray-800">
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
            <span className="font-semibold tabular-nums">{value.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LargeShortSellingRow;
