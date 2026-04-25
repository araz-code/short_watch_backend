import PricePoint from "../models/PricePoint";
import { formatTimestamp } from "../utils/dates";
import ChangeIndicator from "./UI/ChangeIndicator";

interface ShortPositionRowProps extends PricePoint {
  showCheckmark: boolean;
}

const ShortPositionRow: React.FC<ShortPositionRowProps> = (props) => {
  const { name, symbol, value, prevValue, timestamp, showCheckmark } = props;

  return (
    <div className="mx-2 my-1.5 px-4 py-2.5 rounded-lg flex items-center justify-between bg-white dark:bg-[#1e1e1e] shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 dark:text-white border border-gray-100 dark:border-gray-800">
      {/* Left: symbol + name stacked */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold">{symbol}</span>
          {showCheckmark && (
            <span className="text-amber-500">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.27L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {name}
        </div>
      </div>

      {/* Right: value + change stacked above date */}
      <div className="shrink-0 ml-3 text-right">
        <div className="flex items-center gap-2 justify-end">
          <ChangeIndicator value={value} prevValue={prevValue} />
          <span className="font-semibold tabular-nums">{`${value.toFixed(2)}%`}</span>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {formatTimestamp(timestamp)}
        </div>
      </div>
    </div>
  );
};

export default ShortPositionRow;
