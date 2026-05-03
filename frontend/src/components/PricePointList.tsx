import PricePoint from "../models/PricePoint";
import PricePointRow from "./PricePointRow";

const PricePointList: React.FC<{ pricePoints: [PricePoint] }> = ({
  pricePoints,
}) => {
  return (
    <div className="flex-1 min-h-0 [@media(max-height:900px)_and_(orientation:landscape)]:flex-none">
      <div className="overflow-y-auto h-full [@media(max-height:900px)_and_(orientation:landscape)]:overflow-visible [@media(max-height:900px)_and_(orientation:landscape)]:h-auto">
        <ul className="mx-4">
          {pricePoints.map((short: PricePoint, index: number) => (
            <li key={short.timestamp}>
              <PricePointRow {...short} isFirst={index === 0} isEven={index % 2 === 0} />
            </li>
          ))}
        </ul>
        <div className="h-6"></div>
      </div>
    </div>
  );
};

export default PricePointList;
