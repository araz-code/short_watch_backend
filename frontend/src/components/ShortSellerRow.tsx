import Short from "../models/PricePoint";

const ShortSellerRow: React.FC<Short> = (props) => {
  const { name, value } = props;

  return (
    <div className="border p-2 m-2 grid grid-cols-2 place-content-between hover:bg-blue-100 text-sm">
      <div className="font-medium text-wrap">{name}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
};

export default ShortSellerRow;
