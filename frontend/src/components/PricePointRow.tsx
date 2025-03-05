import Short from "../models/PricePoint";
import { formatTimestamp } from "../utils/dates";
import ChangeIndicator from "./UI/ChangeIndicator";

const PricePointRow: React.FC<Short & { isFirst: boolean }> = (props) => {
  const { value, prevValue, timestamp, isFirst } = props;

  return (
    <div className="border px-3 py-2 m-2 grid grid-cols-2 place-content-between hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="font-medium">{formatTimestamp(timestamp)}</div>

      <div className="flex items-center space-x-2 justify-end">
        {isFirst && <ChangeIndicator value={value} prevValue={prevValue} />}
        <div className="font-medium text-right">{`${value.toFixed(2)}%`}</div>
      </div>
    </div>
  );
};

export default PricePointRow;
