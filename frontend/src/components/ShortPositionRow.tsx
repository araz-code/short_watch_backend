import PricePoint from "../models/PricePoint";
import { formatTimestamp } from "../utils/dates";

const ShortPositionRow: React.FC<PricePoint> = (props) => {
  const { name, symbol, value, timestamp } = props;

  return (
    <div className="border p-2 m-2 grid grid-cols-2 place-content-between hover:bg-blue-100 dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="font-semibold">{symbol}</div>
      <div className="font-semibold text-right">{`${value}%`}</div>
      <div className="text-sm">{name}</div>
      <div className="text-sm text-right">{formatTimestamp(timestamp)}</div>
    </div>
  );
};

export default ShortPositionRow;
