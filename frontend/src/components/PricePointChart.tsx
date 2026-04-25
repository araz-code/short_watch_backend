import React, { useEffect, useState, useCallback } from "react";
import {
  CartesianGrid,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts";
import { useTranslation } from "react-i18next";
import { formatTimestamp } from "../utils/dates";
import ChartPricePoint from "../models/ChartPricePoint";
import { TooltipContentProps } from "recharts/types/component/Tooltip";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { trackEvent } from "../analytics";
import PricePointChartInfo from "./PricePointChartInfo";

const CustomTooltip: React.FC<TooltipContentProps<ValueType, NameType>> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#1e1e1e]/95 dark:text-white backdrop-blur-xs border border-gray-100 dark:border-gray-700">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mb-1">
          {`${formatTimestamp(String(label), "dateOnly")}`}
        </p>
        <p className="text-center font-bold text-lg tabular-nums">{`${(+(
          payload[0].value ?? 0
        )).toFixed(2)}%`}</p>
        {payload[1] && payload[1].value != null && (
          <p className="text-center text-sm text-purple-500 dark:text-purple-400 mt-0.5 tabular-nums">
            {`${(+(payload[1].value ?? 0)).toFixed(2)} DKK`}
          </p>
        )}
        {payload[2] && payload[2].value != null && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
            {`Vol: ${Number(payload[2].value).toLocaleString()}`}
          </p>
        )}
      </div>
    );
  }

  return null;
};

const PricePointChart: React.FC<{
  data: ChartPricePoint[];
  symbol: string;
  periodControl?: React.ReactNode;
}> = (props) => {
  const { data: pricePoints, symbol, periodControl } = props;
  const { t } = useTranslation();

  const periodChange =
    pricePoints.length >= 2
      ? pricePoints[pricePoints.length - 1].value - pricePoints[0].value
      : null;
  const getChartHeight = useCallback(
    () => (window.innerWidth >= 640 ? 290 : 160),
    []
  );
  const [chartHeight, setChartHeight] = useState(getChartHeight);

  useEffect(() => {
    const handleResize = () => setChartHeight(getChartHeight());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getChartHeight]);

  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
    pricePoints
      .filter((x) => x.close)
      .reduce((max, point) => Math.max(max, point.close), -Infinity) + 0;
  let minPriceY: number =
    pricePoints
      .filter((x) => x.close)
      .reduce((min, point) => Math.min(min, point.close), Infinity) - 0;

  maxPriceY = maxPriceY + maxPriceY * 0.003;
  minPriceY = minPriceY - minPriceY * 0.003;

  if (minY < 0.3) minY = 0;

  const maxVolume = pricePoints
    .filter((x) => x.volume)
    .reduce((max, point) => Math.max(max, point.volume ?? 0), 0);

  const toggleClosingPrices = () => {
    setShowClosingPrices((prevValue) => {
      const newValue = !prevValue;
      trackEvent("chart_toggle_closing_prices", { enabled: newValue });
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
    <div>
      <div className="flex items-center justify-between px-5 mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleClosingPrices}
            className={`w-8 h-8 rounded-lg border flex justify-center items-center cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-purple-300 ${
              showClosingPrices
                ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
            }`}
            aria-label={
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
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <line x1="4" y1="18" x2="4" y2="12" />
              <line x1="8" y1="18" x2="8" y2="9" />
              <line x1="12" y1="18" x2="12" y2="6" />
              <line x1="16" y1="18" x2="16" y2="10" />
              <line x1="20" y1="18" x2="20" y2="8" />
            </svg>
          </button>
          <PricePointChartInfo pricePoints={pricePoints} symbol={symbol} />
        </div>
        {periodControl}
      </div>
      {periodChange !== null && (
        <p className="text-center text-[11px] sm:text-xs mb-1 sm:mb-2">
          <span
            className={
              periodChange > 0
                ? "text-red-500"
                : periodChange < 0
                ? "text-emerald-500"
                : "text-gray-400"
            }
          >
            {periodChange > 0 ? "+" : ""}
            {periodChange.toFixed(2)}%
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            {" "}
            {t("in period")}
          </span>
        </p>
      )}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={pricePoints}
          margin={{
            top: 5,
            right: 0,
            left: 20,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="shortGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
              <stop offset="40%" stopColor="#007AFF" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            horizontal={true}
            vertical={false}
            stroke="#f0f0f0"
            strokeWidth={1}
          />
          <XAxis dataKey="timestamp" hide />
          <YAxis
            dataKey="value"
            type="number"
            unit="%"
            tick={{ fontSize: 11, fill: "#bbb", dx: -5 }}
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
              tick={{ fontSize: 11, fill: "#bbb" }}
              tickFormatter={(value) => value.toFixed(0)}
              orientation="left"
              type="number"
              yAxisId="2"
              domain={[minPriceY, maxPriceY]}
              hide
            />
          )}
          <Tooltip
            content={(props) => <CustomTooltip {...props} />}
            cursor={{
              stroke: "#007AFF",
              strokeWidth: 1,
              strokeOpacity: 0.3,
            }}
          />
          <Area
            type="step"
            dataKey="value"
            stroke="#007AFF"
            strokeWidth={2.5}
            fill="url(#shortGradient)"
            yAxisId="1"
            name={t("Short position")}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
            activeDot={{
              r: 5,
              fill: "#007AFF",
              stroke: "#fff",
              strokeWidth: 2,
              filter: "url(#glow)",
            }}
          />
          {pricePoints.length > 0 && (
            <ReferenceLine
              y={pricePoints[pricePoints.length - 1].value}
              yAxisId="1"
              stroke="#eab308"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          )}
          {showClosingPrices && (
            <Line
              dataKey="close"
              stroke="#a855f7"
              yAxisId="2"
              type="monotone"
              name={t("Closing price")}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#a855f7",
                stroke: "#fff",
                strokeWidth: 2,
              }}
              strokeWidth={2}
              strokeOpacity={0.8}
            />
          )}
          {showClosingPrices && maxVolume > 0 && (
            <>
              <YAxis
                dataKey="volume"
                yAxisId="3"
                hide
                domain={[0, maxVolume * 5]}
              />
              <Bar
                dataKey="volume"
                yAxisId="3"
                fill={isDarkMode ? "#d1d5db" : "#9ca3af"}
                opacity={isDarkMode ? 0.5 : 0.3}
                isAnimationActive={false}
                name={t("Volume")}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center px-5 mt-2">
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />
            Short
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-[2px]">
              <span className="w-[4px] h-[2px] bg-[#eab308] inline-block" />
              <span className="w-[4px] h-[2px] bg-[#eab308] inline-block" />
            </span>
            {t("Current")}
          </span>
          {showClosingPrices && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />
                {t("Price")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-xs bg-gray-300 dark:bg-gray-600 inline-block" />
                {t("Volume")}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricePointChart;
