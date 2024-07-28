import { formatTimestamp } from "../utils/dates";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

interface ShortPositionRowProps {
  name: string;
  symbol: string;
  value: number;
  timestamp: string;
  showCheckmark: boolean;
}

const ShortPositionRow: React.FC<ShortPositionRowProps> = (props) => {
  const { name, symbol, value, timestamp, showCheckmark } = props;

  return (
    <div className="border px-3 py-2 m-2 grid grid-cols-2 place-content-between hover:bg-blue-100 dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="flex items-center space-x-2">
        <div className="font-semibold">{symbol}</div>
        {showCheckmark && (
          <FontAwesomeIcon
            icon={faStar}
            style={{ color: "#5BC236", fontSize: "13px" }}
          />
        )}
      </div>

      <div className="font-semibold text-right">{`${value.toFixed(2)}%`}</div>
      <div className="text-sm">{name}</div>
      <div className="text-sm text-right">{formatTimestamp(timestamp)}</div>
    </div>
  );
};

export default ShortPositionRow;
