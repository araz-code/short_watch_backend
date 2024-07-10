import {
  CartesianGrid,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
  ComposedChart,
  Scatter,
  Bar,
  Legend,
} from "recharts";
import {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";
import PricePoint from "../models/PricePoint";
import { formatTimestamp } from "../utils/dates";
import ChartPricePoint from "../models/ChartPricePoint";

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
        <p className="text-center">{`${(+(payload[0].value ?? 0)).toFixed(
          2
        )}%`}</p>
        <p className="text-center">{`${(+(
          (payload[1] && payload[1].value) ??
          0
        )).toFixed(2)}DKK`}</p>
      </div>
    );
  }

  return null;
};

const PricePointChart: React.FC<{ data: ChartPricePoint[] }> = ({
  data: pricePoints,
}) => {
  const maxY: number =
    pricePoints.reduce((max, point) => Math.max(max, point.value), -Infinity) +
    0.3;

  let minY: number =
    pricePoints.reduce((min, point) => Math.min(min, point.value), Infinity) -
    0.2;

  let maxPriceY: number =
    pricePoints.reduce((max, point) => Math.max(max, point.close), -Infinity) +
    0;

  let minPriceY: number =
    pricePoints
      .filter((x) => x.close)
      .reduce((min, point) => Math.min(min, point.close), Infinity) - 0;

  maxPriceY = maxPriceY + maxPriceY * 0.1;
  minPriceY = minPriceY - minPriceY * 0.2;

  if (minY < 0.3) minY = 0;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart
        width={500}
        height={200}
        data={pricePoints}
        margin={{
          top: 10,
          right: 3,
          left: 30,
          bottom: 0,
        }}
      >
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#007AFF" stopOpacity={1} />
            <stop offset="95%" stopColor="#007AFF" stopOpacity={0.19} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="timestamp" hide />
        <YAxis
          dataKey="value"
          type="number"
          unit="%"
          tick={{ fontSize: 11, fill: "#999" }}
          tickFormatter={(value) => value.toFixed(2)}
          allowDecimals={true}
          orientation="right"
          domain={[minY, maxY]}
          allowDataOverflow
          yAxisId="1"
        />
        <YAxis
          dataKey="close"
          unit="DKK"
          tick={{ fontSize: 11, fill: "#999" }}
          tickFormatter={(value) => value.toFixed(0)}
          orientation="left"
          type="number"
          yAxisId="2"
          domain={[minPriceY, maxPriceY]}
        />
        <YAxis
          dataKey="close"
          unit="DKK"
          tick={{ fontSize: 11, fill: "#999" }}
          tickFormatter={(value) => value.toFixed(0)}
          type="number"
          yAxisId="3"
          domain={[0, 11000000]}
          hide
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <CustomTooltip active={active} payload={payload} label={label} />
          )}
        />
        {false && <Legend verticalAlign="top" height={36} />}
        <Area
          type="step"
          dataKey="value"
          stroke="#007AFF"
          fill="url(#colorUv)"
          isAnimationActive={false}
          yAxisId="1"
          name="Short"
        />
        <Scatter
          dataKey="close"
          stroke="#FFBF00"
          fill="#FFBF00"
          yAxisId="2"
          type="bumpX"
          name="Close Price"
        />
        <Bar dataKey="volume" yAxisId="3" name="Volume" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default PricePointChart;
