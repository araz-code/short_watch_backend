import Short from "../models/PricePoint";
import { formatTimestamp } from "../utils/dates";
import ChangeIndicator from "./UI/ChangeIndicator";

const PricePointRow: React.FC<Short & { isFirst: boolean }> = (props) => {
  const { value, prevValue, timestamp, isFirst } = props;

  return (
    <div className="mx-2 my-1.5 px-4 py-2.5 rounded-lg grid grid-cols-2 place-content-between bg-white dark:bg-[#1e1e1e] shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200 text-sm dark:text-white border border-gray-100 dark:border-gray-800">
      <div className="font-medium">{formatTimestamp(timestamp)}</div>

      <div className="flex items-center space-x-2 justify-end">
        {isFirst && <ChangeIndicator value={value} prevValue={prevValue} />}
        <div className="font-medium text-right">{`${value.toFixed(2)}%`}</div>
      </div>
    </div>
  );
};

export default PricePointRow;
