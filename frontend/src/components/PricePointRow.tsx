import Short from "../models/PricePoint";
import { formatTimestamp } from "../utils/dates";

const PricePointRow: React.FC<Short> = (props) => {
  const { value, timestamp } = props;

  return (
    <div className="border p-2 m-2 grid grid-cols-2 place-content-between hover:bg-blue-100 text-sm">
      <div className="font-medium">{formatTimestamp(timestamp)}</div>
      <div className="font-medium text-right">{`${value}%`}</div>
    </div>
  );
};

export default PricePointRow;
