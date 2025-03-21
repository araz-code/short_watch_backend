import PricePoint from "../models/PricePoint";
import PricePointRow from "./PricePointRow";

const PricePointList: React.FC<{ pricePoints: [PricePoint] }> = ({
  pricePoints,
}) => {
  return (
    <div className="min-h-[150px] h-[calc(100svh-31.1rem)]">
      <div className="overflow-y-auto h-full">
        <ul className="mx-4">
          {pricePoints.map((short: PricePoint, index: number) => (
            <li key={short.timestamp}>
              <PricePointRow {...short} isFirst={index === 0} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PricePointList;
