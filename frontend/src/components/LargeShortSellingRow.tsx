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
      <div className="border px-3 py-2 m-2 hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
        <div className="font-medium text-wrap mb-2">{name}</div>
        <div className="grid grid-cols-2 place-content-between text-gray-500 dark:text-white">
          <div className="font-medium text-left">
            {formatTimestamp(date, "dateOnly")}
          </div>

          <div className="flex items-center space-x-2 justify-end">
            <ChangeIndicator value={value} prevValue={prevValue} />
            <div className="font-medium text-right">{value.toFixed(2)}%</div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LargeShortSellingRow;
