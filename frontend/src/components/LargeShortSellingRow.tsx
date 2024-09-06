import { Link } from "react-router-dom";
import LargestShortSelling from "../models/LargestShortSelling";
import { formatTimestamp } from "../utils/dates";
import { handleClick } from "../analytics";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faArrowTrendDown,
} from "@fortawesome/free-solid-svg-icons";

const LargeShortSellingRow: React.FC<LargestShortSelling> = (props) => {
  const { name, value, prevValue, date, shortSeller } = props;

  const change = prevValue - value;

  return (
    <Link
      to={`/short-seller-details?seller=${shortSeller}`}
      onClick={() => {
        handleClick(`clicked on link back to seller: ${name}`);
      }}
    >
      <div className="border px-3 py-2 m-2 hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
        <div className="font-medium text-wrap mb-2">{name}</div>
        <div className="grid grid-cols-2 place-content-between text-gray-500 dark:text-white">
          <div className="font-medium text-left">{formatTimestamp(date)}</div>

          <div className="flex items-center space-x-2 justify-end">
            {prevValue && (
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
            )}
            <div className="font-medium text-right">{value.toFixed(2)}%</div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LargeShortSellingRow;
