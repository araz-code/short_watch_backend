import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faArrowTrendDown,
  faArrowsLeftRight,
} from "@fortawesome/free-solid-svg-icons";

const ChangeIndicator: React.FC<{ value: number; prevValue: number }> = ({
  value,
  prevValue,
}) => {
  if (prevValue == undefined) {
    return (
      <IndicatorWrapper bgColor="bg-yellow-200" textColor="text-yellow-900">
        <FontAwesomeIcon
          icon={faArrowsLeftRight}
          className="text-yellow-900 text-[14px]"
        />
        <div>Initial</div>
      </IndicatorWrapper>
    );
  }

  const change = prevValue - value;
  const isNegative = change < 0;

  return (
    <IndicatorWrapper
      bgColor={isNegative ? "bg-red-200" : "bg-green-200"}
      textColor={isNegative ? "text-red-900" : "text-green-900"}
    >
      <FontAwesomeIcon
        icon={isNegative ? faArrowTrendUp : faArrowTrendDown}
        className={`text-[14px] ${
          isNegative ? "text-red-900" : "text-green-900"
        }`}
      />
      <div>{`${Math.abs(change).toFixed(2)}%`}</div>
    </IndicatorWrapper>
  );
};

const IndicatorWrapper: React.FC<{
  bgColor: string;
  textColor: string;
  children: React.ReactNode;
}> = ({ bgColor, textColor, children }) => (
  <div
    className={`text-xs ${bgColor} ${textColor} rounded-md px-[4px] pt-[1.6px] font-normal flex items-center space-x-1`}
  >
    {children}
  </div>
);

export default ChangeIndicator;
