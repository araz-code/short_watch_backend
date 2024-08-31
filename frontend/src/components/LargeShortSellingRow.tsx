import { Link } from "react-router-dom";
import LargestShortSelling from "../models/LargestShortSelling";
import { formatTimestamp } from "../utils/dates";
import { handleClick } from "../analytics";

const LargeShortSellingRow: React.FC<LargestShortSelling> = (props) => {
  const { name, value, date, shortSeller } = props;

  return (
    <div className="border px-3 py-2 m-2 hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="font-medium text-wrap mb-2 hover:underline">
        <Link
          to={`/short-seller-details?seller=${shortSeller}`}
          onClick={() => {
            handleClick(`clicked on link back to seller: ${name}`);
          }}
        >
          {name}
        </Link>
      </div>
      <div className="grid grid-cols-2 place-content-between text-gray-500 dark:text-white">
        <div className="font-medium text-left">{formatTimestamp(date)}</div>
        <div className="font-medium text-right">{value.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default LargeShortSellingRow;
