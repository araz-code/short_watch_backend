import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faArrowTrendDown,
} from "@fortawesome/free-solid-svg-icons";

const ChangeIndicator: React.FC<{
  value: number;
  prevValue: number;
}> = (props) => {
  const { value, prevValue } = props;

  const change = prevValue - value;

  return (
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
  );
};

export default ChangeIndicator;
