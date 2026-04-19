import PricePoint from "../models/PricePoint";
import PricePointRow from "./PricePointRow";

const PricePointList: React.FC<{ pricePoints: [PricePoint] }> = ({
  pricePoints,
}) => {
  return (
    <div className="min-h-[150px] h-[calc(100svh-35rem)] sm:h-[calc(100svh-40.5rem)]">
      <div className="overflow-y-auto h-full">
        <ul className="mx-4">
          {pricePoints.map((short: PricePoint, index: number) => (
            <li key={short.timestamp}>
              <PricePointRow {...short} isFirst={index === 0} />
            </li>
          ))}
        </ul>
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default PricePointList;
