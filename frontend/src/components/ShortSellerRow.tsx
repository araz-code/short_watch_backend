import ShortSeller from "../models/ShortSeller";
import { formatTimestamp } from "../utils/dates";

const ShortSellerRow: React.FC<ShortSeller> = (props) => {
  const { name, value, date } = props;

  return (
    <div className="border px-3 py-2 m-2 hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="font-medium text-wrap mb-2">{name}</div>
      <div className="grid grid-cols-2 place-content-between text-gray-500 dark:text-white">
        <div className="font-medium text-left">{formatTimestamp(date)}</div>
        <div className="font-medium text-right">{value.toFixed(2)}</div>
      </div>
    </div>
  );
};

export default ShortSellerRow;
