import ShortSeller from "../models/ShortSeller";
import ChangeIndicator from "./UI/ChangeIndicator";
import { formatTimestamp } from "../utils/dates";
import { formatNum } from "../utils/format";

const ShortSellerRow: React.FC<ShortSeller & { isEven: boolean }> = (props) => {
  const { name, current, previous, lastUpdated, isEven } = props;

  return (
    <div className={`mx-2 my-1 px-4 py-3 rounded-lg shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 dark:text-white border border-gray-100 dark:border-gray-800 ${isEven ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"}`}>
      {/* Header: name + date */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-base">{name}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400 shrink-0 ml-4">
          {formatTimestamp(lastUpdated, "dateOnly")}
        </div>
      </div>

      {/* Current positions */}
      {current.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {current.map((item, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 text-sm bg-gray-50 dark:bg-[#282828] rounded-md px-2.5 py-1.5"
            >
              <span className="font-medium">{item.stockSymbol}</span>
              <span className="tabular-nums text-gray-600 dark:text-gray-300">
                {`${formatNum(Math.abs(item.value), 2)}%`}
              </span>
              <ChangeIndicator value={item.value} prevValue={item.prevValue} />
            </div>
          ))}
        </div>
      )}

      {/* Previous positions */}
      {previous.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {previous.map((item, index) => (
            <span
              key={index}
              className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#282828] rounded-sm px-2 py-0.5"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShortSellerRow;
