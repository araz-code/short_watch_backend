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
      <div className="mx-2 my-1.5 px-4 py-3 rounded-lg bg-white dark:bg-[#1e1e1e] shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 text-sm dark:text-white border border-gray-100 dark:border-gray-800">
        <div className="font-medium text-wrap mb-2">{name}</div>
        <div className="grid grid-cols-2 place-content-between text-gray-500 dark:text-gray-400">
          <div className="font-medium text-left">
            {formatTimestamp(date, "dateOnly")}
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <ChangeIndicator value={value} prevValue={prevValue} />
            <div className="font-medium text-right tabular-nums">{value.toFixed(2)}%</div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LargeShortSellingRow;
