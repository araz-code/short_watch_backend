import PricePoint from "../models/PricePoint";
import { formatTimestamp } from "../utils/dates";
import ChangeIndicator from "./UI/ChangeIndicator";

interface ShortPositionRowProps extends PricePoint {
  showCheckmark: boolean;
}

const ShortPositionRow: React.FC<ShortPositionRowProps> = (props) => {
  const { name, symbol, value, prevValue, timestamp, showCheckmark } = props;

  return (
    <div className="border px-3 py-1 m-2 grid grid-cols-2 space-y-1 place-content-between hover:bg-blue-100 dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="flex items-center space-x-2">
        <span className="font-semibold">{symbol}</span>
        {showCheckmark && (
          <span className="text-[#daa520]">
            <svg
              width="16"
              height="16"
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
      <div className="flex items-center space-x-2 justify-end">
        <ChangeIndicator value={value} prevValue={prevValue} />
        <div className="font-semibold">{`${value.toFixed(2)}%`}</div>
      </div>

      <div className="text-sm">{name}</div>
      <div className="text-sm text-right">{formatTimestamp(timestamp)}</div>
    </div>
  );
};

export default ShortPositionRow;
