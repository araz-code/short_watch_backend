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
      <IndicatorWrapper bgColor="bg-amber-50 dark:bg-amber-900/20" textColor="text-amber-600 dark:text-amber-400">
        <FontAwesomeIcon
          icon={faArrowsLeftRight}
          className="text-[14px]"
        />
        <div>Initial</div>
      </IndicatorWrapper>
    );
  }

  const change = prevValue - value;
  const isNegative = change < 0;

  return (
    <IndicatorWrapper
      bgColor={isNegative ? "bg-red-50 dark:bg-red-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"}
      textColor={isNegative ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
    >
      <FontAwesomeIcon
        icon={isNegative ? faArrowTrendUp : faArrowTrendDown}
        className="text-[14px]"
      />
      <div className="tabular-nums">{`${Math.abs(change).toFixed(2)}%`}</div>
    </IndicatorWrapper>
  );
};

const IndicatorWrapper: React.FC<{
  bgColor: string;
  textColor: string;
  children: React.ReactNode;
}> = ({ bgColor, textColor, children }) => (
  <div
    className={`text-xs ${bgColor} ${textColor} rounded-md px-1.5 py-0.5 font-medium flex items-center space-x-1`}
  >
    {children}
  </div>
);

export default ChangeIndicator;
