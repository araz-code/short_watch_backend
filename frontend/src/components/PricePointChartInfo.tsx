import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import ChartPricePoint from "../models/ChartPricePoint";
import { formatTimestamp } from "../utils/dates";
import { useTranslation } from "react-i18next";
import { handleClick } from "../analytics";

const PricePointChartInfo: React.FC<{
  pricePoints: ChartPricePoint[];
  symbol: string;
}> = (props) => {
  const { pricePoints, symbol } = props;
  const [showOverlay, setShowOverlay] = useState(false);
  const { t } = useTranslation();

  // Ref to access the overlay DOM element
  const overlayRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Toggle the overlay visibility
  const toggleOverlay = () => {
    handleClick(`clicked on show detail info for: ${symbol}`);

    setShowOverlay(!showOverlay);
  };

  // Handle clicks outside of the overlay
  const handleClickOutside = (event: MouseEvent) => {
    if (
      overlayRef.current &&
      !overlayRef.current.contains(event.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setShowOverlay(false);
    }
  };

  // Add event listener for clicks outside when the overlay is visible
  useEffect(() => {
    if (showOverlay) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOverlay]);

  const lowestPoint = pricePoints.reduce((prev, curr) =>
    curr.value < prev.value ? curr : prev
  );

  const highestPoint = pricePoints.reduce((prev, curr) =>
    curr.value > prev.value ? curr : prev
  );

  const change =
    pricePoints[0].value - pricePoints[pricePoints.length - 1].value;

  let changeElement;

  if (change === 0) {
    changeElement = <span>{t("No change")}</span>;
  } else if (change > 0) {
    changeElement = (
      <span>
        {t("Decreased by")} {Math.abs(change).toFixed(2)}%
      </span>
    );
  } else {
    changeElement = (
      <span>
        {t("Increased by")} {Math.abs(change).toFixed(2)}%
      </span>
    );
  }

  return (
    <div className="relative">
      {/* Info Button */}
      <button
        onClick={toggleOverlay}
        ref={buttonRef}
        className={`absolute top-[-23px] left-[50px] w-[23px] h-[23px] rounded-full border-none flex justify-center items-center cursor-pointer z-10 text-white italic ${
          showOverlay
            ? "bg-blue-600 hover:bg-blue-500"
            : "bg-blue-600 hover:bg-blue-500"
        }`}
        title={t("Show summery")}
      >
        <FontAwesomeIcon icon={faInfo} size="xs" />
      </button>

      {/* Info Overlay */}
      {showOverlay && (
        <div
          ref={overlayRef}
          className="absolute top-0 left-[80px] w-[290px] p-3 bg-white border border-gray-300 shadow-md rounded-md flex flex-col dark:bg-[#212121] dark:text-white dark:border"
          style={{ zIndex: 20 }} // Ensure it's above other elements
        >
          <div className="p-1 mx-auto">
            <h2 className="text-xl font-semibold mb-2">
              {t("Selected period:")}
            </h2>
            <p className="mb-4">
              {`${formatTimestamp(pricePoints[0].timestamp, "dateOnly")} - ${t(
                "today"
              )}`}
            </p>
            <h2 className="text-lg font-semibold mb-2">
              {t("Summary for the period:")}
            </h2>
            <ul className="list-disc pl-5">
              <li className="mb-2">
                <span className="font-medium">{t("Change")}:</span>{" "}
                {changeElement}
              </li>
              <li className="mb-2">
                <span className="font-medium">{t("Lowest")}:</span>{" "}
                <span>{`${lowestPoint.value.toFixed(2)}%`}</span>
              </li>
              <li className="mb-2">
                <span className="font-medium">{t("Highest")}:</span>{" "}
                <span>{`${highestPoint.value.toFixed(2)}%`}</span>
              </li>
              <li className="">
                <span className="font-medium">{t("Average")}:</span>{" "}
                <span>
                  {`${(
                    pricePoints.reduce((sum, curr) => sum + curr.value, 0) /
                    pricePoints.length
                  ).toFixed(2)}`}
                  %
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricePointChartInfo;
