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
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { handleClick } from "../analytics";
import { ChartPricePointWithAnnouncements } from "../models/ChartPricePointWithAnnouncements";
import { t } from "i18next";

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  pricePoints: ChartPricePointWithAnnouncements[];
  showLargeSellers: boolean;
}

const CustomTooltip: React.FC<CustomTooltipProps> = (props) => {
  const { active, payload, label, pricePoints, showLargeSellers } = props;
  if (active && payload && payload.length) {
    const sellings = pricePoints
      .filter((item) => item.timestamp == label)[0]
      .announcements.filter((item) => item.type === "Shortselling");
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

        {showLargeSellers && sellings.length > 0 && (
          <hr className="border-gray-300 my-4" />
        )}

        {showLargeSellers &&
          sellings.map((item) => {
            return (
              <p key={item.dfsaId} className="text-xs">
                <span>{item.shortSellerName}</span>: <span>{item.value}%</span>
              </p>
            );
          })}
      </div>
    );
  }

  return null;
};

interface CustomLegendProps extends LegendProps {
  showLargeSellers: boolean;
}

const RenderLegend: React.FC<CustomLegendProps> = (props) => {
  const { payload, showLargeSellers } = props;

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
      {showLargeSellers && (
        <li
          key="largeSeller"
          className="inline-block mr-2 mt-1 text-orange-500"
        >
          {t("Large seller")}
        </li>
      )}
    </ul>
  );
};

const renderDot = (totalLength: number, showLargeSellers: boolean) => {
  return (props: {
    cx: number;
    cy: number;
    value: number;
    payload: ChartPricePointWithAnnouncements;
  }) => {
    const { cx, cy, payload } = props;
    if (showLargeSellers && payload.announcements.length > 0) {
      return (
        <svg x={cx - 5} y={cy - 5} width={10} height={10}>
          <circle
            cx="5"
            cy="5"
            r={totalLength <= 200 ? "4" : "3"}
            fill="#f97316"
          />
        </svg>
      );
    }

    return <></>;
  };
};

const PricePointChart: React.FC<{
  data: ChartPricePointWithAnnouncements[];
}> = ({ data: pricePoints }) => {
  const { t } = useTranslation();
  const [showClosingPrices, setShowClosingPrices] = useState<boolean>(() => {
    const savedShowClosingPrices = localStorage.getItem("showClosingPrices");
    return savedShowClosingPrices ? JSON.parse(savedShowClosingPrices) : true;
  });
  const [showLargeSellers, setShowLargeSellers] = useState<boolean>(() => {
    const savedShowLargeSellers = localStorage.getItem("showLargeSellers");
    return savedShowLargeSellers ? JSON.parse(savedShowLargeSellers) : false;
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

  maxPriceY = maxPriceY + maxPriceY * 0.009;
  minPriceY = minPriceY - minPriceY * 0.009;

  if (minY < 0.3) minY = 0;

  const toggleClosingPrices = () => {
    setShowClosingPrices((prevValue) => {
      const newValue = !prevValue;
      handleClick(`clicked on toggle closing prices: ${newValue}`);
      return newValue;
    });
  };

  const toggleLargeSellers = () => {
    setShowLargeSellers((prevValue) => {
      const newValue = !prevValue;
      handleClick(`clicked on toggle large sellers: ${newValue}`);
      return newValue;
    });
  };

  useEffect(() => {
    localStorage.setItem(
      "showClosingPrices",
      JSON.stringify(showClosingPrices)
    );
  }, [showClosingPrices]);

  useEffect(() => {
    localStorage.setItem("showLargeSellers", JSON.stringify(showLargeSellers));
  }, [showLargeSellers]);

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
          width="15px"
          height="15px"
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

      <button
        onClick={toggleLargeSellers}
        className={`absolute top-[-23px] left-[50px] w-[23px] h-[23px] rounded-full border-none flex justify-center items-center cursor-pointer z-10 ${
          showLargeSellers
            ? "bg-orange-500 hover:bg-orange-400"
            : "bg-gray-300 hover:bg-gray-400"
        }`}
        title={
          showLargeSellers ? t("Hide closing prices") : t("Show closing prices")
        }
      >
        <svg
          fill="#fff"
          width="15px"
          height="15px"
          version="1.1"
          id="Layer_1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
        >
          <g>
            <g>
              <path
                d="M501.28,209.57l-179.2-128c-4.454-3.183-9.668-4.77-14.882-4.77s-10.428,1.587-14.882,4.77l-111.761,79.829
			c7.398,4.599,13.534,11.017,17.801,18.748L307.198,102.4l179.2,128h-51.2v230.4H181.4l-2.031,25.6h255.829
			c14.14,0,25.6-11.46,25.6-25.6V256h25.6c11.128,0,20.983-7.185,24.371-17.783C514.174,227.618,510.334,216.038,501.28,209.57z"
              />
            </g>
          </g>
          <g>
            <g>
              <path
                d="M204.38,341.018l-25.6-140.8c-2.21-12.169-12.809-21.018-25.182-21.018h-102.4c-12.373,0-22.972,8.849-25.182,21.026
			l-25.6,140.8c-1.357,7.467,0.666,15.155,5.53,20.983c4.864,5.828,12.066,9.19,19.652,9.19h16.358l9.327,117.231
			C52.341,501.734,63.443,512,76.798,512h51.2c13.355,0,24.465-10.266,25.523-23.569L162.84,371.2h16.358
			c7.595,0,14.788-3.371,19.652-9.199C203.714,356.173,205.737,348.493,204.38,341.018z M139.194,345.6l-11.196,140.8h-51.2
			L65.602,345.6H25.598l25.6-140.8h38.4v77.875c0,7.074,5.726,12.8,12.8,12.8c7.074,0,12.8-5.726,12.8-12.8V204.8h38.4l25.6,140.8
			H139.194z"
              />
            </g>
          </g>
          <g>
            <g>
              <path
                d="M102.398,0c-42.342,0-76.8,34.458-76.8,76.8s34.458,76.8,76.8,76.8c42.351,0,76.8-34.449,76.8-76.8
			C179.198,34.449,144.749,0,102.398,0z M102.398,128c-28.279,0-51.2-22.921-51.2-51.2s22.921-51.2,51.2-51.2s51.2,22.921,51.2,51.2
			S130.677,128,102.398,128z"
              />
            </g>
          </g>
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
              <CustomTooltip
                active={active}
                payload={payload}
                label={label}
                pricePoints={pricePoints}
                showLargeSellers={showLargeSellers}
              />
            )}
          />
          <Legend
            verticalAlign="bottom"
            height={6}
            content={<RenderLegend showLargeSellers={showLargeSellers} />}
          />
          <Area
            type="step"
            dataKey="value"
            stroke="#007AFF"
            fill="url(#colorUv)"
            isAnimationActive={false}
            yAxisId="1"
            name={t("Short position")}
            dot={renderDot(pricePoints.length, showLargeSellers)}
          />
          {showClosingPrices && (
            <Line
              dataKey="close"
              stroke="#9333ea"
              fill="#9333ea"
              yAxisId="2"
              type="linear"
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
