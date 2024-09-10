import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
  TooltipProps,
  LegendProps,
} from "recharts";
import { useTranslation } from "react-i18next";
import { formatTimestamp } from "../utils/dates";
import ChartPricePoint from "../models/ChartPricePoint";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { handleClick } from "../analytics";

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="border rounded-md shadow-md p-3 bg-gray-100 dark:bg-[#212121] dark:text-white">
        <p className="text-center mb-1">{`${formatTimestamp(
          label,
          "dateOnly"
        )}`}</p>
        <p className="text-center pb-1">{`${(+(payload[0].value ?? 0)).toFixed(
          2
        )}%`}</p>
        {payload[1] && (
          <p className="text-center text-sm">
            {`${(+(payload[1].value ?? 0)).toFixed(2)}DKK`}
          </p>
        )}
      </div>
    );
  }

  return null;
};

const RenderLegend: React.FC<LegendProps> = (props) => {
  const { payload } = props;

  return (
    <ul style={{ fontSize: "12px", paddingLeft: 0, marginBottom: 0 }}>
      {payload?.map((entry, index) => (
        <li
          key={`item-${index}`}
          className="inline-block mr-2 mt-1"
          style={{ color: entry?.color || "black" }}
        >
          {entry?.value}
        </li>
      ))}
    </ul>
  );
};

const PricePointChart: React.FC<{ data: ChartPricePoint[] }> = ({
  data: pricePoints,
}) => {
  const { t } = useTranslation();
  const [showClosingPrices, setShowClosingPrices] = useState<boolean>(() => {
    const savedShowClosingPrices = localStorage.getItem("showClosingPrices");
    return savedShowClosingPrices ? JSON.parse(savedShowClosingPrices) : true;
  });

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

  const toggleClosingPrices = () => {
    setShowClosingPrices((prevValue) => {
      const newValue = !prevValue;
      handleClick(`clicked on toggle closing prices: ${newValue}`);
      return newValue;
    });
  };

  useEffect(() => {
    localStorage.setItem(
      "showClosingPrices",
      JSON.stringify(showClosingPrices)
    );
  }, [showClosingPrices]);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={toggleClosingPrices}
        className={`absolute top-[-23px] left-[20px] w-[23px] h-[23px] rounded-full border-none flex justify-center items-center cursor-pointer z-10 ${
          showClosingPrices
            ? "bg-purple-600 hover:bg-purple-500"
            : "bg-gray-300 hover:bg-gray-400"
        }`}
        title={
          showClosingPrices
            ? t("Hide closing prices")
            : t("Show closing prices")
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          fill="none"
          stroke={showClosingPrices ? "#fff" : "#333"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <line x1="4" y1="18" x2="4" y2="12" /> {/* Shortest bar */}
          <line x1="8" y1="18" x2="8" y2="9" /> {/* Second shortest */}
          <line x1="12" y1="18" x2="12" y2="6" /> {/* Tallest */}
          <line x1="16" y1="18" x2="16" y2="10" /> {/* Middle height */}
          <line x1="20" y1="18" x2="20" y2="8" /> {/* Second tallest */}
        </svg>
      </button>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          height={200}
          data={pricePoints}
          margin={{
            top: 10,
            right: -5,
            left: 25,
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
            tick={{ fontSize: 11, fill: "#999", dx: -5 }}
            tickFormatter={(value) => value.toFixed(1)}
            allowDecimals={true}
            orientation="right"
            domain={[minY, maxY]}
            allowDataOverflow
            yAxisId="1"
            tickLine={false}
            axisLine={false}
          />
          {showClosingPrices && (
            <YAxis
              dataKey="close"
              unit="DKK"
              tick={{ fontSize: 11, fill: "#999" }}
              tickFormatter={(value) => value.toFixed(0)}
              orientation="left"
              type="number"
              yAxisId="2"
              domain={[minPriceY, maxPriceY]}
              hide
            />
          )}
          <Tooltip
            content={({ active, payload, label }) => (
              <CustomTooltip active={active} payload={payload} label={label} />
            )}
          />
          <Legend
            verticalAlign="bottom"
            height={6}
            content={<RenderLegend />}
          />
          <Area
            type="step"
            dataKey="value"
            stroke="#007AFF"
            fill="url(#colorUv)"
            isAnimationActive={false}
            yAxisId="1"
            name={t("Short position")}
          />
          {showClosingPrices && (
            <Line
              dataKey="close"
              stroke="#9333ea"
              fill="#9333ea"
              yAxisId="2"
              type="bumpX"
              name={t("Closing price")}
              isAnimationActive={false}
              dot={false}
              strokeWidth={1.5}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PricePointChart;
