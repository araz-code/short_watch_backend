import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTrendUp,
  faArrowTrendDown,
  faArrowsLeftRight,
} from "@fortawesome/free-solid-svg-icons";
import { formatNum } from "../../utils/format";

const ChangeIndicator: React.FC<{ value: number; prevValue: number; small?: boolean }> = ({
  value,
  prevValue,
  small,
}) => {
  if (prevValue == undefined) {
    return (
      <IndicatorWrapper bgColor="bg-amber-500/10 dark:bg-amber-500/25" textColor="text-amber-600 dark:text-amber-400" small={small} ariaLabel="Initial value">
        <FontAwesomeIcon
          icon={faArrowsLeftRight}
          className="text-[14px]"
          aria-hidden="true"
        />
        <div>Initial</div>
      </IndicatorWrapper>
    );
  }

  const change = prevValue - value;
  const isNegative = change < 0;
  const absChange = formatNum(Math.abs(change), 2);

  return (
    <IndicatorWrapper
      bgColor={isNegative ? "bg-red-500/10 dark:bg-red-500/25" : "bg-emerald-500/10 dark:bg-emerald-500/25"}
      textColor={isNegative ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
      small={small}
      ariaLabel={`${isNegative ? "Increased" : "Decreased"} by ${absChange}%`}
    >
      <FontAwesomeIcon
        icon={isNegative ? faArrowTrendUp : faArrowTrendDown}
        className="text-[14px]"
        aria-hidden="true"
      />
      <div className="tabular-nums">{`${absChange}%`}</div>
    </IndicatorWrapper>
  );
};

const IndicatorWrapper: React.FC<{
  bgColor: string;
  textColor: string;
  small?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}> = ({ bgColor, textColor, small, ariaLabel, children }) => (
  <div
    role="img"
    aria-label={ariaLabel}
    className={`${small ? "text-xs rounded px-1 py-px w-full justify-center" : "text-xs rounded-md px-1.5 py-0.5"} ${bgColor} ${textColor} font-medium flex items-center space-x-1`}
  >
    {children}
  </div>
);

export default ChangeIndicator;
