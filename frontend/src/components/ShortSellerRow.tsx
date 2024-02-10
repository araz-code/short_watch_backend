import ShortSeller from "../models/ShortSeller";

const ShortSellerRow: React.FC<ShortSeller> = (props) => {
  const { name, value } = props;

  return (
    <div className="border p-2 m-2 grid grid-cols-2 place-content-between hover:bg-blue-100 text-sm dark:hover:bg-[#aaaaaa] dark:bg-[#212121] dark:text-white">
      <div className="font-medium text-wrap">{name}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
};

export default ShortSellerRow;
