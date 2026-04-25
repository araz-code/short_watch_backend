import ShortSeller from "../models/ShortSeller";
import ChangeIndicator from "./UI/ChangeIndicator";
import { formatTimestamp } from "../utils/dates";

const ShortSellerRow: React.FC<ShortSeller> = (props) => {
  const { name, current, previous, lastUpdated } = props;

  return (
    <div className="mx-2 my-1.5 px-4 py-4 rounded-lg bg-white dark:bg-[#1e1e1e] shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 dark:text-white border border-gray-100 dark:border-gray-800">
      {/* Header: name + date */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-base">{name}</div>
        <div className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-4">
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
                {`${Math.abs(item.value).toFixed(2)}%`}
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
              className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#282828] rounded-sm px-2 py-0.5"
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
