import {
  AreaChart,
  CartesianGrid,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";
import PricePoint from "../models/PricePoint";
import { formatTimestamp } from "../utils/dates";

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="border rounded-md shadow-md p-3 bg-gray-100 dark:bg-[#212121] dark:text-white">
        <p className="text-center mb-2">{`${formatTimestamp(
          label!,
          "dateOnly"
        )}`}</p>
        <p className="text-center">{`${payload[0].value}%`}</p>
      </div>
    );
  }

  return null;
};

const PricePointChart: React.FC<{ data: PricePoint[] }> = ({
  data: pricePoints,
}) => {
  const maxY: number =
    pricePoints.reduce((max, point) => Math.max(max, point.value), -Infinity) +
    0.3;

  let minY: number =
    pricePoints.reduce((min, point) => Math.min(min, point.value), Infinity) -
    0.2;

  if (minY < 0.3) minY = 0;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        width={500}
        height={200}
        data={pricePoints}
        margin={{
          top: 10,
          right: 0,
          left: 30,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#007AFF" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="timestamp" hide />
        <YAxis
          type="number"
          unit="%"
          tick={{ fontSize: 10 }}
          tickFormatter={(value) => value.toFixed(2)}
          allowDecimals={true}
          orientation="right"
          domain={[minY, maxY]}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <CustomTooltip active={active} payload={payload} label={label} />
          )}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#007AFF"
          fill="url(#colorUv)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default PricePointChart;
