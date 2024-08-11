import { formatTimestamp } from "../utils/dates";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faArrowTrendDown,
} from "@fortawesome/free-solid-svg-icons";

interface ShortPositionRowProps {
  name: string;
  symbol: string;
  value: number;
  prevValue: number;
  timestamp: string;
  showCheckmark: boolean;
}

const ShortPositionRow: React.FC<ShortPositionRowProps> = (props) => {
  const { name, symbol, value, prevValue, timestamp, showCheckmark } = props;

  const change = prevValue - value;

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
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2 justify-end">
        <div
          className={`text-xs ${
            change < 0 ? "bg-red-200" : "bg-green-200"
          } rounded-md px-[4px] pt-[1.6px] ${
            change < 0 ? "text-red-900" : "text-green-900"
          } font-normal flex items-center space-x-1`}
        >
          <FontAwesomeIcon
            icon={change < 0 ? faArrowTrendUp : faArrowTrendDown}
            style={{
              color: change < 0 ? "#991b1b" : "#166534",
              fontSize: "14px",
            }}
          />
          <div>{`${Math.abs(change).toFixed(2)}%`}</div>
        </div>
        <div className="font-semibold">{`${value.toFixed(2)}%`}</div>
      </div>

      <div className="text-sm">{name}</div>
      <div className="text-sm text-right">{formatTimestamp(timestamp)}</div>
    </div>
  );
};

export default ShortPositionRow;

/* 

      <div className="flex items-center space-x-2 justify-end text-right">
        <span className="text-xs bg-green-200 rounded-md px-[5px] py-[1px] text-green-800 font-semibold">
          <FontAwesomeIcon
            icon={faArrowTrendUp}
            style={{ color: "#166534", fontSize: "13px" }}
          />{" "}
          1.20%
        </span>{" "}
        <span className="font-semibold">{`${value.toFixed(2)}%`}</span>
      </div>

*/
