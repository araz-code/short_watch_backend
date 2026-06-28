import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import RelatedAnalyses from "../components/RelatedAnalyses";
import FeedbackWidget from "../components/FeedbackWidget";
import { trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TooltipContentProps } from "recharts/types/component/Tooltip";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

// ─── static data ────────────────────────────────────────────────────────────
// Daily short interest and close price since November 2023 (Finanstilsynet + Nasdaq).
// Full series, every trading day, feeding the section 2 context chart.
const POSITION_HISTORY = [
  { date: "2023-11-06", short: 6.03, close: 121.1 },
  { date: "2023-11-07", short: 5.93, close: 116.7 },
  { date: "2023-11-08", short: 6.02, close: 119.75 },
  { date: "2023-11-09", short: 5.78, close: 121.95 },
  { date: "2023-11-10", short: 5.6, close: 135.35 },
  { date: "2023-11-13", short: 5.78, close: 139.5 },
  { date: "2023-11-14", short: 5.91, close: 148.35 },
  { date: "2023-11-15", short: 5.68, close: 150.85 },
  { date: "2023-11-16", short: 5.3, close: 149.55 },
  { date: "2023-11-17", short: 5.2, close: 148.1 },
  { date: "2023-11-20", short: 5.59, close: 152.05 },
  { date: "2023-11-21", short: 5.59, close: 149.8 },
  { date: "2023-11-22", short: 5.49, close: 149.95 },
  { date: "2023-11-23", short: 5.49, close: 149.6 },
  { date: "2023-11-24", short: 5.49, close: 149.6 },
  { date: "2023-11-27", short: 5.49, close: 155.6 },
  { date: "2023-11-28", short: 5.3, close: 153.3 },
  { date: "2023-11-29", short: 5.4, close: 159.15 },
  { date: "2023-11-30", short: 5.4, close: 161.1 },
  { date: "2023-12-01", short: 5.62, close: 158.5 },
  { date: "2023-12-04", short: 6.16, close: 159.95 },
  { date: "2023-12-05", short: 6.16, close: 160 },
  { date: "2023-12-06", short: 6.29, close: 162.7 },
  { date: "2023-12-07", short: 6.29, close: 161.15 },
  { date: "2023-12-08", short: 6.29, close: 160.3 },
  { date: "2023-12-11", short: 6.29, close: 160.95 },
  { date: "2023-12-12", short: 6.29, close: 161.15 },
  { date: "2023-12-13", short: 6.29, close: 161.6 },
  { date: "2023-12-14", short: 6.29, close: 177.2 },
  { date: "2023-12-15", short: 5.5, close: 177.65 },
  { date: "2023-12-18", short: 5.68, close: 177 },
  { date: "2023-12-19", short: 5.68, close: 180.75 },
  { date: "2023-12-20", short: 5.58, close: 181.45 },
  { date: "2023-12-21", short: 5.58, close: 175.9 },
  { date: "2023-12-22", short: 5.38, close: 176.2 },
  { date: "2023-12-25", short: 5.38, close: 176.2 },
  { date: "2023-12-26", short: 5.38, close: 176.2 },
  { date: "2023-12-27", short: 5.38, close: 173.4 },
  { date: "2023-12-28", short: 5.38, close: 173.5 },
  { date: "2023-12-29", short: 5.28, close: 171.8 },
  { date: "2024-01-01", short: 5.28, close: 171.8 },
  { date: "2024-01-02", short: 5.09, close: 175.5 },
  { date: "2024-01-03", short: 5.19, close: 170 },
  { date: "2024-01-04", short: 5.3, close: 169.75 },
  { date: "2024-01-05", short: 5.38, close: 168.15 },
  { date: "2024-01-08", short: 5.49, close: 167.05 },
  { date: "2024-01-09", short: 5.36, close: 170.85 },
  { date: "2024-01-10", short: 5.36, close: 169.55 },
  { date: "2024-01-11", short: 5.3, close: 173.45 },
  { date: "2024-01-12", short: 4.96, close: 182.6 },
  { date: "2024-01-15", short: 4.98, close: 181.65 },
  { date: "2024-01-16", short: 4.98, close: 178 },
  { date: "2024-01-17", short: 4.98, close: 176.85 },
  { date: "2024-01-18", short: 5.09, close: 182.5 },
  { date: "2024-01-19", short: 5.08, close: 180.7 },
  { date: "2024-01-22", short: 5.19, close: 180.7 },
  { date: "2024-01-23", short: 5.18, close: 169.35 },
  { date: "2024-01-24", short: 5.18, close: 168.7 },
  { date: "2024-01-25", short: 5.3, close: 172.55 },
  { date: "2024-01-26", short: 5.4, close: 170.05 },
  { date: "2024-01-29", short: 5.4, close: 167.25 },
  { date: "2024-01-30", short: 5.4, close: 165.5 },
  { date: "2024-01-31", short: 5.44, close: 163.6 },
  { date: "2024-02-01", short: 5.54, close: 162.5 },
  { date: "2024-02-02", short: 5.87, close: 163.25 },
  { date: "2024-02-05", short: 6.16, close: 164.05 },
  { date: "2024-02-06", short: 6.16, close: 162.55 },
  { date: "2024-02-07", short: 6.61, close: 164.15 },
  { date: "2024-02-08", short: 6.61, close: 174.5 },
  { date: "2024-02-09", short: 6.79, close: 179.55 },
  { date: "2024-02-12", short: 7.04, close: 180.2 },
  { date: "2024-02-13", short: 7.04, close: 175 },
  { date: "2024-02-14", short: 7.04, close: 175.8 },
  { date: "2024-02-15", short: 6.94, close: 183.45 },
  { date: "2024-02-16", short: 6.94, close: 179.25 },
  { date: "2024-02-19", short: 7.04, close: 177.05 },
  { date: "2024-02-20", short: 6.9, close: 174.25 },
  { date: "2024-02-21", short: 6.99, close: 169.85 },
  { date: "2024-02-22", short: 6.88, close: 170.05 },
  { date: "2024-02-23", short: 6.88, close: 167 },
  { date: "2024-02-26", short: 6.88, close: 166 },
  { date: "2024-02-27", short: 6.73, close: 167.05 },
  { date: "2024-02-28", short: 6.79, close: 161.5 },
  { date: "2024-02-29", short: 6.97, close: 161.15 },
  { date: "2024-03-01", short: 6.9, close: 163.2 },
  { date: "2024-03-04", short: 6.99, close: 155.5 },
  { date: "2024-03-05", short: 6.93, close: 149.95 },
  { date: "2024-03-06", short: 6.79, close: 154.7 },
  { date: "2024-03-07", short: 6.52, close: 155 },
  { date: "2024-03-08", short: 6.58, close: 154.3 },
  { date: "2024-03-11", short: 6.52, close: 152.65 },
  { date: "2024-03-12", short: 6.63, close: 152.95 },
  { date: "2024-03-13", short: 6.63, close: 152.85 },
  { date: "2024-03-14", short: 6.47, close: 155.6 },
  { date: "2024-03-15", short: 6.31, close: 153.25 },
  { date: "2024-03-18", short: 6.06, close: 159.7 },
  { date: "2024-03-19", short: 6.07, close: 164.65 },
  { date: "2024-03-20", short: 6.07, close: 174.65 },
  { date: "2024-03-21", short: 5.92, close: 179.05 },
  { date: "2024-03-22", short: 6.15, close: 182.15 },
  { date: "2024-03-25", short: 6.05, close: 186.2 },
  { date: "2024-03-26", short: 6.17, close: 188.15 },
  { date: "2024-03-27", short: 6.05, close: 182.6 },
  { date: "2024-03-28", short: 6.04, close: 182.6 },
  { date: "2024-03-29", short: 6.04, close: 182.6 },
  { date: "2024-04-01", short: 6.04, close: 182.6 },
  { date: "2024-04-02", short: 6.04, close: 178.65 },
  { date: "2024-04-03", short: 6.05, close: 183.4 },
  { date: "2024-04-04", short: 6.05, close: 184.95 },
  { date: "2024-04-05", short: 6.15, close: 181.75 },
  { date: "2024-04-08", short: 6.15, close: 185.55 },
  { date: "2024-04-09", short: 6.15, close: 186.6 },
  { date: "2024-04-10", short: 6.13, close: 179.65 },
  { date: "2024-04-11", short: 6.24, close: 177 },
  { date: "2024-04-12", short: 6.24, close: 172.5 },
  { date: "2024-04-15", short: 6.34, close: 170.5 },
  { date: "2024-04-16", short: 6.34, close: 166.95 },
  { date: "2024-04-17", short: 6.34, close: 168.9 },
  { date: "2024-04-18", short: 6.34, close: 166 },
  { date: "2024-04-19", short: 6.32, close: 172.85 },
  { date: "2024-04-22", short: 6.32, close: 182 },
  { date: "2024-04-23", short: 6.49, close: 184.15 },
  { date: "2024-04-24", short: 6.44, close: 187.85 },
  { date: "2024-04-25", short: 6.45, close: 179 },
  { date: "2024-04-26", short: 6.45, close: 188.05 },
  { date: "2024-04-29", short: 6.55, close: 190.75 },
  { date: "2024-04-30", short: 6.55, close: 190.6 },
  { date: "2024-05-01", short: 6.54, close: 186.4 },
  { date: "2024-05-02", short: 6.49, close: 208.6 },
  { date: "2024-05-03", short: 5.9, close: 200 },
  { date: "2024-05-06", short: 5.88, close: 208.4 },
  { date: "2024-05-07", short: 5.89, close: 202 },
  { date: "2024-05-08", short: 6, close: 202.6 },
  { date: "2024-05-09", short: 5.9, close: 202.6 },
  { date: "2024-05-10", short: 5.9, close: 202.6 },
  { date: "2024-05-13", short: 5.9, close: 203.5 },
  { date: "2024-05-14", short: 5.6, close: 201.6 },
  { date: "2024-05-15", short: 5.74, close: 208 },
  { date: "2024-05-16", short: 5.73, close: 214.3 },
  { date: "2024-05-17", short: 5.49, close: 221.3 },
  { date: "2024-05-20", short: 5.31, close: 221.3 },
  { date: "2024-05-21", short: 5.31, close: 216.4 },
  { date: "2024-05-22", short: 5.28, close: 211.3 },
  { date: "2024-05-23", short: 5.28, close: 221.7 },
  { date: "2024-05-24", short: 5.28, close: 221.2 },
  { date: "2024-05-27", short: 5.28, close: 222.3 },
  { date: "2024-05-28", short: 5.28, close: 221.8 },
  { date: "2024-05-29", short: 5.2, close: 214.6 },
  { date: "2024-05-30", short: 5.21, close: 215.5 },
  { date: "2024-05-31", short: 5.21, close: 217.2 },
  { date: "2024-06-03", short: 5.18, close: 223.3 },
  { date: "2024-06-04", short: 5.18, close: 217.7 },
  { date: "2024-06-05", short: 5.18, close: 217.7 },
  { date: "2024-06-06", short: 5.18, close: 224.2 },
  { date: "2024-06-07", short: 5.22, close: 221.8 },
  { date: "2024-06-10", short: 5.22, close: 223.8 },
  { date: "2024-06-11", short: 5.73, close: 214.5 },
  { date: "2024-06-12", short: 5.61, close: 222.7 },
  { date: "2024-06-13", short: 5.64, close: 218.1 },
  { date: "2024-06-14", short: 5.64, close: 208.1 },
  { date: "2024-06-17", short: 5.69, close: 207.1 },
  { date: "2024-06-18", short: 5.5, close: 204.9 },
  { date: "2024-06-19", short: 5.59, close: 206.7 },
  { date: "2024-06-20", short: 5.59, close: 209.6 },
  { date: "2024-06-21", short: 5.73, close: 204.7 },
  { date: "2024-06-24", short: 5.85, close: 202.4 },
  { date: "2024-06-25", short: 5.55, close: 200.7 },
  { date: "2024-06-26", short: 5.64, close: 197.65 },
  { date: "2024-06-27", short: 5.42, close: 196.75 },
  { date: "2024-06-28", short: 5.6, close: 194.1 },
  { date: "2024-07-01", short: 5.51, close: 192.3 },
  { date: "2024-07-02", short: 5.6, close: 190.4 },
  { date: "2024-07-03", short: 5.93, close: 192.85 },
  { date: "2024-07-04", short: 5.72, close: 191.75 },
  { date: "2024-07-05", short: 5.72, close: 190.9 },
  { date: "2024-07-08", short: 5.72, close: 188 },
  { date: "2024-07-09", short: 5.72, close: 185.95 },
  { date: "2024-07-10", short: 5.94, close: 184 },
  { date: "2024-07-11", short: 6.09, close: 190.6 },
  { date: "2024-07-12", short: 6.16, close: 189.15 },
  { date: "2024-07-15", short: 6.16, close: 188.1 },
  { date: "2024-07-16", short: 6.09, close: 188.6 },
  { date: "2024-07-17", short: 5.96, close: 176.75 },
  { date: "2024-07-18", short: 5.82, close: 175.85 },
  { date: "2024-07-19", short: 6.01, close: 173.3 },
  { date: "2024-07-22", short: 5.94, close: 170 },
  { date: "2024-07-23", short: 6.28, close: 173.65 },
  { date: "2024-07-24", short: 6.21, close: 175.25 },
  { date: "2024-07-25", short: 6.4, close: 170.85 },
  { date: "2024-07-26", short: 6.41, close: 174.95 },
  { date: "2024-07-29", short: 6.38, close: 175.2 },
  { date: "2024-07-30", short: 6.38, close: 178.35 },
  { date: "2024-07-31", short: 6.33, close: 180.65 },
  { date: "2024-08-01", short: 6.33, close: 178.9 },
  { date: "2024-08-02", short: 6.33, close: 169.85 },
  { date: "2024-08-05", short: 6.62, close: 164.8 },
  { date: "2024-08-06", short: 6.84, close: 165.85 },
  { date: "2024-08-07", short: 6.9, close: 167.25 },
  { date: "2024-08-08", short: 6.89, close: 172.55 },
  { date: "2024-08-09", short: 6.89, close: 173.7 },
  { date: "2024-08-12", short: 6.87, close: 172 },
  { date: "2024-08-13", short: 6.72, close: 173.5 },
  { date: "2024-08-14", short: 6.63, close: 179.55 },
  { date: "2024-08-15", short: 6.34, close: 184.8 },
  { date: "2024-08-16", short: 6.32, close: 182 },
  { date: "2024-08-19", short: 6.22, close: 187.05 },
  { date: "2024-08-20", short: 6.22, close: 183.35 },
  { date: "2024-08-21", short: 6.12, close: 183.15 },
  { date: "2024-08-22", short: 6.32, close: 166.35 },
  { date: "2024-08-23", short: 6.22, close: 164.65 },
  { date: "2024-08-26", short: 6.36, close: 158.75 },
  { date: "2024-08-27", short: 6.5, close: 159 },
  { date: "2024-08-28", short: 6.68, close: 153.15 },
  { date: "2024-08-29", short: 6.84, close: 153.45 },
  { date: "2024-08-30", short: 7, close: 153.7 },
  { date: "2024-09-02", short: 7.01, close: 154.2 },
  { date: "2024-09-03", short: 7.2, close: 158.8 },
  { date: "2024-09-04", short: 6.99, close: 164.05 },
  { date: "2024-09-05", short: 6.83, close: 162.75 },
  { date: "2024-09-06", short: 6.96, close: 164.85 },
  { date: "2024-09-09", short: 6.88, close: 163.95 },
  { date: "2024-09-10", short: 6.99, close: 158.5 },
  { date: "2024-09-11", short: 7.01, close: 160.55 },
  { date: "2024-09-12", short: 7.05, close: 159.5 },
  { date: "2024-09-13", short: 7.08, close: 164.5 },
  { date: "2024-09-16", short: 7.11, close: 163.05 },
  { date: "2024-09-17", short: 7.11, close: 170.05 },
  { date: "2024-09-18", short: 7.25, close: 166.85 },
  { date: "2024-09-19", short: 7.11, close: 163 },
  { date: "2024-09-20", short: 7.28, close: 159.65 },
  { date: "2024-09-23", short: 7.1, close: 158.55 },
  { date: "2024-09-24", short: 7.13, close: 156.15 },
  { date: "2024-09-25", short: 7.33, close: 154.55 },
  { date: "2024-09-26", short: 7.62, close: 158.35 },
  { date: "2024-09-27", short: 7.76, close: 155.85 },
  { date: "2024-09-30", short: 7.92, close: 149.75 },
  { date: "2024-10-01", short: 8.11, close: 148.7 },
  { date: "2024-10-02", short: 8.2, close: 148.95 },
  { date: "2024-10-03", short: 8.33, close: 145 },
  { date: "2024-10-04", short: 8.8, close: 146.8 },
  { date: "2024-10-07", short: 8.7, close: 145.7 },
  { date: "2024-10-08", short: 8.9, close: 144.9 },
  { date: "2024-10-09", short: 9.02, close: 144 },
  { date: "2024-10-10", short: 9.11, close: 140.2 },
  { date: "2024-10-11", short: 9.06, close: 140 },
  { date: "2024-10-14", short: 9.46, close: 137.15 },
  { date: "2024-10-15", short: 9.95, close: 136.5 },
  { date: "2024-10-16", short: 9.83, close: 135.75 },
  { date: "2024-10-17", short: 10.15, close: 135.4 },
  { date: "2024-10-18", short: 10.41, close: 135.2 },
  { date: "2024-10-21", short: 10.46, close: 134.8 },
  { date: "2024-10-22", short: 10.23, close: 130 },
  { date: "2024-10-23", short: 10.51, close: 130.4 },
  { date: "2024-10-24", short: 10.6, close: 134.35 },
  { date: "2024-10-25", short: 10.71, close: 131.1 },
  { date: "2024-10-28", short: 10.71, close: 131.5 },
  { date: "2024-10-29", short: 10.96, close: 134.55 },
  { date: "2024-10-30", short: 10.6, close: 133.7 },
  { date: "2024-10-31", short: 10.47, close: 133.35 },
  { date: "2024-11-01", short: 10.47, close: 135.8 },
  { date: "2024-11-04", short: 10.56, close: 136.35 },
  { date: "2024-11-05", short: 10.47, close: 134.35 },
  { date: "2024-11-06", short: 10.07, close: 131.35 },
  { date: "2024-11-07", short: 10.03, close: 133.6 },
  { date: "2024-11-08", short: 9.91, close: 139.05 },
  { date: "2024-11-11", short: 9.94, close: 142.65 },
  { date: "2024-11-12", short: 9.71, close: 137.95 },
  { date: "2024-11-13", short: 9.95, close: 133.2 },
  { date: "2024-11-14", short: 10.25, close: 139.15 },
  { date: "2024-11-15", short: 10.45, close: 135.4 },
  { date: "2024-11-18", short: 10.51, close: 131.4 },
  { date: "2024-11-19", short: 10.35, close: 130.75 },
  { date: "2024-11-20", short: 10.37, close: 130.2 },
  { date: "2024-11-21", short: 10.44, close: 131.05 },
  { date: "2024-11-22", short: 10.44, close: 134.95 },
  { date: "2024-11-25", short: 10.35, close: 134.85 },
  { date: "2024-11-26", short: 10.36, close: 131.75 },
  { date: "2024-11-27", short: 10.23, close: 131.15 },
  { date: "2024-11-28", short: 10.45, close: 133.9 },
  { date: "2024-11-29", short: 10.44, close: 135 },
  { date: "2024-12-02", short: 10.41, close: 136.95 },
  { date: "2024-12-03", short: 10.41, close: 129.85 },
  { date: "2024-12-04", short: 10.46, close: 135.15 },
  { date: "2024-12-05", short: 10.45, close: 134.35 },
  { date: "2024-12-06", short: 10.55, close: 135.75 },
  { date: "2024-12-09", short: 10.55, close: 138.2 },
  { date: "2024-12-10", short: 10.6, close: 137.2 },
  { date: "2024-12-11", short: 10.74, close: 136.65 },
  { date: "2024-12-12", short: 10.6, close: 138.75 },
  { date: "2024-12-13", short: 10.58, close: 138.2 },
  { date: "2024-12-16", short: 10.68, close: 129.45 },
  { date: "2024-12-17", short: 10.78, close: 126.2 },
  { date: "2024-12-18", short: 10.78, close: 135.6 },
  { date: "2024-12-19", short: 10.8, close: 130.7 },
  { date: "2024-12-20", short: 10.83, close: 131.3 },
  { date: "2024-12-23", short: 10.73, close: 130.7 },
  { date: "2024-12-24", short: 10.85, close: 130.7 },
  { date: "2024-12-25", short: 10.85, close: 130.7 },
  { date: "2024-12-26", short: 10.85, close: 130.7 },
  { date: "2024-12-27", short: 10.85, close: 135.65 },
  { date: "2024-12-30", short: 10.81, close: 133.75 },
  { date: "2024-12-31", short: 10.92, close: 133.75 },
  { date: "2025-01-01", short: 10.92, close: 133.75 },
  { date: "2025-01-02", short: 10.92, close: 138 },
  { date: "2025-01-03", short: 10.92, close: 135.15 },
  { date: "2025-01-06", short: 10.96, close: 136.1 },
  { date: "2025-01-07", short: 10.86, close: 138.7 },
  { date: "2025-01-08", short: 10.69, close: 134.2 },
  { date: "2025-01-09", short: 10.59, close: 134.25 },
  { date: "2025-01-10", short: 10.49, close: 124.95 },
  { date: "2025-01-13", short: 10.83, close: 123.3 },
  { date: "2025-01-14", short: 11.2, close: 123.9 },
  { date: "2025-01-15", short: 11.34, close: 128.3 },
  { date: "2025-01-16", short: 10.97, close: 123.25 },
  { date: "2025-01-17", short: 11.13, close: 124.25 },
  { date: "2025-01-20", short: 11.12, close: 128.65 },
  { date: "2025-01-21", short: 11.02, close: 131.2 },
  { date: "2025-01-22", short: 10.98, close: 132.5 },
  { date: "2025-01-23", short: 11.05, close: 132.7 },
  { date: "2025-01-24", short: 11.26, close: 132.7 },
  { date: "2025-01-27", short: 11.26, close: 136.55 },
  { date: "2025-01-28", short: 11.22, close: 134.7 },
  { date: "2025-01-29", short: 11.27, close: 143 },
  { date: "2025-01-30", short: 11.19, close: 151.2 },
  { date: "2025-01-31", short: 10.6, close: 148.2 },
  { date: "2025-02-03", short: 10.17, close: 142 },
  { date: "2025-02-04", short: 10.26, close: 153.95 },
  { date: "2025-02-05", short: 9.78, close: 150.6 },
  { date: "2025-02-06", short: 9.7, close: 149 },
  { date: "2025-02-07", short: 9.98, close: 144.05 },
  { date: "2025-02-10", short: 9.97, close: 139.9 },
  { date: "2025-02-11", short: 9.88, close: 142.85 },
  { date: "2025-02-12", short: 9.49, close: 141.35 },
  { date: "2025-02-13", short: 9.63, close: 141.5 },
  { date: "2025-02-14", short: 9.7, close: 143.05 },
  { date: "2025-02-17", short: 9.7, close: 139.6 },
  { date: "2025-02-18", short: 9.85, close: 142.25 },
  { date: "2025-02-19", short: 9.95, close: 137.95 },
  { date: "2025-02-20", short: 9.95, close: 137.55 },
  { date: "2025-02-21", short: 9.95, close: 137.6 },
  { date: "2025-02-24", short: 9.95, close: 135.35 },
  { date: "2025-02-25", short: 9.7, close: 134.4 },
  { date: "2025-02-26", short: 9.6, close: 137.05 },
  { date: "2025-02-27", short: 9.6, close: 128.8 },
  { date: "2025-02-28", short: 9.56, close: 127.5 },
  { date: "2025-03-03", short: 9.61, close: 127.8 },
  { date: "2025-03-04", short: 9.69, close: 117.1 },
  { date: "2025-03-05", short: 9.83, close: 123 },
  { date: "2025-03-06", short: 9.83, close: 124.6 },
  { date: "2025-03-07", short: 9.83, close: 125 },
  { date: "2025-03-10", short: 9.94, close: 122.55 },
  { date: "2025-03-11", short: 9.91, close: 119.25 },
  { date: "2025-03-12", short: 10.02, close: 117.35 },
  { date: "2025-03-13", short: 10.02, close: 118.15 },
  { date: "2025-03-14", short: 10.1, close: 117.65 },
  { date: "2025-03-17", short: 10.1, close: 118.4 },
  { date: "2025-03-18", short: 9.8, close: 118.5 },
  { date: "2025-03-19", short: 9.97, close: 122.15 },
  { date: "2025-03-20", short: 9.97, close: 121.4 },
  { date: "2025-03-21", short: 10.19, close: 117.2 },
  { date: "2025-03-24", short: 10.39, close: 119.1 },
  { date: "2025-03-25", short: 10.29, close: 120.2 },
  { date: "2025-03-26", short: 10.28, close: 116.5 },
  { date: "2025-03-27", short: 10.29, close: 111.7 },
  { date: "2025-03-28", short: 10.11, close: 114.1 },
  { date: "2025-03-31", short: 10.04, close: 107.05 },
  { date: "2025-04-01", short: 9.88, close: 110.2 },
  { date: "2025-04-02", short: 9.65, close: 108.5 },
  { date: "2025-04-03", short: 9.8, close: 99.52 },
  { date: "2025-04-04", short: 9.45, close: 91.18 },
  { date: "2025-04-07", short: 9.81, close: 91.42 },
  { date: "2025-04-08", short: 9.53, close: 90.66 },
  { date: "2025-04-09", short: 8.85, close: 82.56 },
  { date: "2025-04-10", short: 9.17, close: 88.52 },
  { date: "2025-04-11", short: 8.95, close: 88.76 },
  { date: "2025-04-14", short: 8.74, close: 94.32 },
  { date: "2025-04-15", short: 8.28, close: 95.54 },
  { date: "2025-04-16", short: 7.99, close: 93.98 },
  { date: "2025-04-17", short: 7.81, close: 93.98 },
  { date: "2025-04-18", short: 7.81, close: 93.98 },
  { date: "2025-04-21", short: 7.81, close: 93.98 },
  { date: "2025-04-22", short: 7.81, close: 92.26 },
  { date: "2025-04-23", short: 7.98, close: 102 },
  { date: "2025-04-24", short: 8.41, close: 100 },
  { date: "2025-04-25", short: 8.3, close: 98.92 },
  { date: "2025-04-28", short: 8.38, close: 98.7 },
  { date: "2025-04-29", short: 8.48, close: 99.52 },
  { date: "2025-04-30", short: 8.56, close: 98.58 },
  { date: "2025-05-01", short: 8.56, close: 86.76 },
  { date: "2025-05-02", short: 8.95, close: 90.54 },
  { date: "2025-05-05", short: 9.51, close: 90.9 },
  { date: "2025-05-06", short: 9.94, close: 90 },
  { date: "2025-05-07", short: 10.14, close: 87.96 },
  { date: "2025-05-08", short: 10.09, close: 88.58 },
  { date: "2025-05-09", short: 9.81, close: 91.2 },
  { date: "2025-05-12", short: 9.31, close: 97.12 },
  { date: "2025-05-13", short: 9.1, close: 95.9 },
  { date: "2025-05-14", short: 9.47, close: 95 },
  { date: "2025-05-15", short: 9.59, close: 93.74 },
  { date: "2025-05-16", short: 9.76, close: 92.6 },
  { date: "2025-05-19", short: 10.03, close: 92.06 },
  { date: "2025-05-20", short: 9.84, close: 94.8 },
  { date: "2025-05-21", short: 9.83, close: 94.3 },
  { date: "2025-05-22", short: 9.83, close: 91.28 },
  { date: "2025-05-23", short: 9.59, close: 89.54 },
  { date: "2025-05-26", short: 9.41, close: 91.26 },
  { date: "2025-05-27", short: 9.41, close: 94.7 },
  { date: "2025-05-28", short: 9.24, close: 96.18 },
  { date: "2025-05-29", short: 9.32, close: 96.18 },
  { date: "2025-05-30", short: 9.32, close: 96.18 },
  { date: "2025-06-02", short: 9.32, close: 93.88 },
  { date: "2025-06-03", short: 9.87, close: 93.46 },
  { date: "2025-06-04", short: 9.57, close: 93.7 },
  { date: "2025-06-05", short: 9.53, close: 93.7 },
  { date: "2025-06-06", short: 9.53, close: 94.92 },
  { date: "2025-06-09", short: 9.54, close: 94.92 },
  { date: "2025-06-10", short: 9.54, close: 101.3 },
  { date: "2025-06-11", short: 9.42, close: 102.45 },
  { date: "2025-06-12", short: 8.89, close: 99.18 },
  { date: "2025-06-13", short: 8.83, close: 97.6 },
  { date: "2025-06-16", short: 8.69, close: 100.55 },
  { date: "2025-06-17", short: 8.62, close: 98.34 },
  { date: "2025-06-18", short: 8.59, close: 97.4 },
  { date: "2025-06-19", short: 8.68, close: 96.24 },
  { date: "2025-06-20", short: 8.72, close: 94.98 },
  { date: "2025-06-23", short: 8.68, close: 94.74 },
  { date: "2025-06-24", short: 8.56, close: 99.34 },
  { date: "2025-06-25", short: 8.52, close: 95.4 },
  { date: "2025-06-26", short: 8.71, close: 97.14 },
  { date: "2025-06-27", short: 8.61, close: 97.7 },
  { date: "2025-06-30", short: 8.7, close: 97.5 },
  { date: "2025-07-01", short: 8.6, close: 99.5 },
  { date: "2025-07-02", short: 8.52, close: 103.15 },
  { date: "2025-07-03", short: 8.25, close: 102.65 },
  { date: "2025-07-04", short: 8.25, close: 99.88 },
  { date: "2025-07-07", short: 8.57, close: 97.16 },
  { date: "2025-07-08", short: 8.93, close: 99.1 },
  { date: "2025-07-09", short: 8.72, close: 99 },
  { date: "2025-07-10", short: 8.72, close: 100.5 },
  { date: "2025-07-11", short: 8.47, close: 96.04 },
  { date: "2025-07-14", short: 8.47, close: 94.78 },
  { date: "2025-07-15", short: 8.29, close: 97.44 },
  { date: "2025-07-16", short: 8.29, close: 98.3 },
  { date: "2025-07-17", short: 8.3, close: 100.1 },
  { date: "2025-07-18", short: 8.08, close: 100.05 },
  { date: "2025-07-21", short: 7.99, close: 98.14 },
  { date: "2025-07-22", short: 7.99, close: 97.86 },
  { date: "2025-07-23", short: 8, close: 102.25 },
  { date: "2025-07-24", short: 7.61, close: 103.25 },
  { date: "2025-07-25", short: 7.71, close: 102.85 },
  { date: "2025-07-28", short: 7.71, close: 103.15 },
  { date: "2025-07-29", short: 7.61, close: 101.3 },
  { date: "2025-07-30", short: 7.77, close: 93.44 },
  { date: "2025-07-31", short: 7.63, close: 93.74 },
  { date: "2025-08-01", short: 7.85, close: 91 },
  { date: "2025-08-04", short: 7.85, close: 92.3 },
  { date: "2025-08-05", short: 7.96, close: 93.58 },
  { date: "2025-08-06", short: 8.06, close: 92.82 },
  { date: "2025-08-07", short: 8.2, close: 96.46 },
  { date: "2025-08-08", short: 8.15, close: 97.3 },
  { date: "2025-08-11", short: 8.31, close: 96.3 },
  { date: "2025-08-12", short: 8.36, close: 97.74 },
  { date: "2025-08-13", short: 8.18, close: 94.74 },
  { date: "2025-08-14", short: 8.27, close: 96.5 },
  { date: "2025-08-15", short: 8.27, close: 98 },
  { date: "2025-08-18", short: 8.15, close: 100.05 },
  { date: "2025-08-19", short: 8.25, close: 103.55 },
  { date: "2025-08-20", short: 8.25, close: 102.3 },
  { date: "2025-08-21", short: 7.7, close: 122.7 },
  { date: "2025-08-22", short: 7.58, close: 119.5 },
  { date: "2025-08-25", short: 7.58, close: 115 },
  { date: "2025-08-26", short: 7.51, close: 116 },
  { date: "2025-08-27", short: 7.57, close: 116 },
  { date: "2025-08-28", short: 7.28, close: 116 },
  { date: "2025-08-29", short: 7.28, close: 115.6 },
  { date: "2025-09-01", short: 7.18, close: 115.6 },
  { date: "2025-09-02", short: 7.18, close: 112 },
  { date: "2025-09-03", short: 7.11, close: 111 },
  { date: "2025-09-04", short: 7.23, close: 111.5 },
  { date: "2025-09-05", short: 7.17, close: 113.95 },
  { date: "2025-09-08", short: 7.17, close: 118.95 },
  { date: "2025-09-09", short: 6.98, close: 118.9 },
  { date: "2025-09-10", short: 7.06, close: 118.15 },
  { date: "2025-09-11", short: 7, close: 116.05 },
  { date: "2025-09-12", short: 7, close: 116.3 },
  { date: "2025-09-15", short: 6.88, close: 116.6 },
  { date: "2025-09-16", short: 6.87, close: 117.6 },
  { date: "2025-09-17", short: 6.87, close: 118.3 },
  { date: "2025-09-18", short: 6.87, close: 116.7 },
  { date: "2025-09-19", short: 6.75, close: 115.65 },
  { date: "2025-09-22", short: 6.75, close: 115 },
  { date: "2025-09-23", short: 6.75, close: 117.9 },
  { date: "2025-09-24", short: 6.75, close: 116.3 },
  { date: "2025-09-25", short: 6.76, close: 108.6 },
  { date: "2025-09-26", short: 6.76, close: 107.4 },
  { date: "2025-09-29", short: 7.39, close: 110.35 },
  { date: "2025-09-30", short: 7.54, close: 107.4 },
  { date: "2025-10-01", short: 7.97, close: 107.15 },
  { date: "2025-10-02", short: 8.49, close: 107.15 },
  { date: "2025-10-03", short: 8.61, close: 111.15 },
  { date: "2025-10-06", short: 8.52, close: 118.9 },
  { date: "2025-10-07", short: 8.5, close: 117.65 },
  { date: "2025-10-08", short: 8.4, close: 119.55 },
  { date: "2025-10-09", short: 8.48, close: 118.05 },
  { date: "2025-10-10", short: 8.47, close: 117.35 },
  { date: "2025-10-13", short: 8.47, close: 113.3 },
  { date: "2025-10-14", short: 8.57, close: 110.35 },
  { date: "2025-10-15", short: 8.82, close: 111.6 },
  { date: "2025-10-16", short: 8.92, close: 114 },
  { date: "2025-10-17", short: 8.92, close: 115.65 },
  { date: "2025-10-20", short: 8.92, close: 115.8 },
  { date: "2025-10-21", short: 9.01, close: 116.4 },
  { date: "2025-10-22", short: 9.01, close: 116.75 },
  { date: "2025-10-23", short: 9.12, close: 115.6 },
  { date: "2025-10-24", short: 9.12, close: 115.15 },
  { date: "2025-10-27", short: 9.13, close: 112.15 },
  { date: "2025-10-28", short: 9.13, close: 110.8 },
  { date: "2025-10-29", short: 9.31, close: 115.3 },
  { date: "2025-10-30", short: 9.35, close: 115.75 },
  { date: "2025-10-31", short: 9.36, close: 113.45 },
  { date: "2025-11-03", short: 9.46, close: 110.15 },
  { date: "2025-11-04", short: 9.47, close: 107.05 },
  { date: "2025-11-05", short: 9.55, close: 107.85 },
  { date: "2025-11-06", short: 9.48, close: 106.75 },
  { date: "2025-11-07", short: 9.77, close: 102.1 },
  { date: "2025-11-10", short: 9.79, close: 103.45 },
  { date: "2025-11-11", short: 9.52, close: 107.4 },
  { date: "2025-11-12", short: 9.42, close: 109.9 },
  { date: "2025-11-13", short: 9.2, close: 107.3 },
  { date: "2025-11-14", short: 9.09, close: 102.45 },
  { date: "2025-11-17", short: 9.32, close: 98.8 },
  { date: "2025-11-18", short: 9.32, close: 93.34 },
  { date: "2025-11-19", short: 9.27, close: 94.74 },
  { date: "2025-11-20", short: 9.16, close: 93.5 },
  { date: "2025-11-21", short: 9.38, close: 95.38 },
  { date: "2025-11-24", short: 9.35, close: 96.94 },
  { date: "2025-11-25", short: 9.35, close: 98.2 },
  { date: "2025-11-26", short: 9.35, close: 97.6 },
  { date: "2025-11-27", short: 9.35, close: 103.35 },
  { date: "2025-11-28", short: 9.35, close: 103.55 },
  { date: "2025-12-01", short: 9.35, close: 106.5 },
  { date: "2025-12-03", short: 9.35, close: 101.7 },
  { date: "2025-12-04", short: 9.35, close: 104.3 },
  { date: "2025-12-05", short: 9.35, close: 102.25 },
  { date: "2025-12-08", short: 9.35, close: 102.1 },
  { date: "2025-12-09", short: 9.35, close: 102 },
  { date: "2025-12-10", short: 9.35, close: 105.3 },
  { date: "2025-12-11", short: 9.35, close: 112.3 },
  { date: "2025-12-12", short: 9.35, close: 113.05 },
  { date: "2025-12-15", short: 9.35, close: 108.6 },
  { date: "2025-12-16", short: 9.35, close: 106.65 },
  { date: "2025-12-17", short: 9.35, close: 105.05 },
  { date: "2025-12-18", short: 9.35, close: 103.5 },
  { date: "2025-12-19", short: 9.35, close: 102.8 },
  { date: "2026-01-07", short: 10.11, close: 112.9 },
  { date: "2026-01-08", short: 9.95, close: 111.7 },
  { date: "2026-01-09", short: 9.76, close: 112.05 },
  { date: "2026-01-12", short: 9.85, close: 112.35 },
  { date: "2026-01-13", short: 9.75, close: 118.2 },
  { date: "2026-01-14", short: 9.56, close: 117.1 },
  { date: "2026-01-15", short: 9.48, close: 116.6 },
  { date: "2026-01-16", short: 9.41, close: 117.5 },
  { date: "2026-01-19", short: 9.41, close: 110 },
  { date: "2026-01-20", short: 9.41, close: 112.05 },
  { date: "2026-01-21", short: 9.55, close: 111.8 },
  { date: "2026-01-22", short: 9.69, close: 110.6 },
  { date: "2026-01-23", short: 10.03, close: 111 },
  { date: "2026-01-26", short: 10.5, close: 112.55 },
  { date: "2026-01-27", short: 10.57, close: 111 },
  { date: "2026-01-28", short: 10.73, close: 107.85 },
  { date: "2026-01-29", short: 11.07, close: 108.2 },
  { date: "2026-01-30", short: 11.02, close: 111.05 },
  { date: "2026-02-02", short: 11.4, close: 112.1 },
  { date: "2026-02-03", short: 11.63, close: 107.45 },
  { date: "2026-02-04", short: 12.05, close: 106.35 },
  { date: "2026-02-05", short: 12.25, close: 92.76 },
  { date: "2026-02-06", short: 12.15, close: 98.86 },
  { date: "2026-02-09", short: 12.18, close: 97 },
  { date: "2026-02-10", short: 12.59, close: 98.7 },
  { date: "2026-02-11", short: 12.59, close: 96.5 },
  { date: "2026-02-12", short: 12.59, close: 96.68 },
  { date: "2026-02-13", short: 12.43, close: 98 },
  { date: "2026-02-16", short: 12.28, close: 99.18 },
  { date: "2026-02-17", short: 12.25, close: 96.88 },
  { date: "2026-02-18", short: 12.19, close: 97.9 },
  { date: "2026-02-19", short: 12.29, close: 95.34 },
  { date: "2026-02-20", short: 12.29, close: 98.04 },
  { date: "2026-02-23", short: 12.69, close: 93.4 },
  { date: "2026-02-24", short: 12.84, close: 91.32 },
  { date: "2026-02-25", short: 12.85, close: 92.98 },
  { date: "2026-02-26", short: 12.88, close: 95.48 },
  { date: "2026-02-27", short: 12.63, close: 93.64 },
  { date: "2026-03-02", short: 12.66, close: 94.38 },
  { date: "2026-03-03", short: 12.66, close: 91 },
  { date: "2026-03-04", short: 12.44, close: 93.98 },
  { date: "2026-03-05", short: 12.44, close: 92.8 },
  { date: "2026-03-06", short: 12.43, close: 90.86 },
  { date: "2026-03-09", short: 12.61, close: 92 },
  { date: "2026-03-10", short: 12.57, close: 91.14 },
  { date: "2026-03-11", short: 12.9, close: 89 },
  { date: "2026-03-12", short: 12.72, close: 87.08 },
  { date: "2026-03-13", short: 12.84, close: 86.9 },
  { date: "2026-03-16", short: 13.04, close: 105.3 },
  { date: "2026-03-17", short: 11.36, close: 105.2 },
  { date: "2026-03-18", short: 10.85, close: 98 },
  { date: "2026-03-19", short: 11.04, close: 91.9 },
  { date: "2026-03-20", short: 11.32, close: 96.5 },
  { date: "2026-03-23", short: 10.89, close: 96.06 },
  { date: "2026-03-24", short: 10.81, close: 94.24 },
  { date: "2026-03-25", short: 10.84, close: 94 },
  { date: "2026-03-26", short: 11.21, close: 95.86 },
  { date: "2026-03-27", short: 11.03, close: 94.82 },
  { date: "2026-03-30", short: 11.11, close: 97.26 },
  { date: "2026-03-31", short: 10.93, close: 100.85 },
  { date: "2026-04-01", short: 10.31, close: 100.7 },
  { date: "2026-04-02", short: 10.4, close: 100.7 },
  { date: "2026-04-03", short: 10.4, close: 100.7 },
  { date: "2026-04-06", short: 10.4, close: 100.7 },
  { date: "2026-04-07", short: 10.4, close: 98.04 },
  { date: "2026-04-08", short: 10.4, close: 98.22 },
  { date: "2026-04-09", short: 10.42, close: 95.42 },
  { date: "2026-04-10", short: 10.34, close: 96.68 },
  { date: "2026-04-13", short: 10.55, close: 95.64 },
  { date: "2026-04-14", short: 10.54, close: 98.16 },
  { date: "2026-04-15", short: 10.54, close: 101.75 },
  { date: "2026-04-16", short: 10.71, close: 104.5 },
  { date: "2026-04-17", short: 10.5, close: 109.7 },
  { date: "2026-04-20", short: 10.12, close: 108.1 },
  { date: "2026-04-21", short: 10.02, close: 104.3 },
  { date: "2026-04-22", short: 10.22, close: 101.05 },
  { date: "2026-04-23", short: 10.52, close: 99 },
  { date: "2026-04-24", short: 10.52, close: 97.48 },
  { date: "2026-04-27", short: 10.73, close: 97.92 },
  { date: "2026-04-28", short: 10.83, close: 98.74 },
  { date: "2026-04-29", short: 10.72, close: 96.86 },
  { date: "2026-04-30", short: 10.97, close: 95.74 },
  { date: "2026-05-01", short: 11.11, close: 99.8 },
  { date: "2026-05-04", short: 11.04, close: 99.52 },
  { date: "2026-05-05", short: 11.34, close: 99.02 },
  { date: "2026-05-06", short: 10.85, close: 103.7 },
  { date: "2026-05-07", short: 11.15, close: 96.72 },
  { date: "2026-05-08", short: 10.2, close: 95.44 },
  { date: "2026-05-11", short: 9.99, close: 97 },
  { date: "2026-05-12", short: 9.92, close: 95.58 },
  { date: "2026-05-13", short: 9.7, close: 94.5 },
  { date: "2026-05-14", short: 9.7, close: 94.5 },
  { date: "2026-05-15", short: 9.7, close: 94.5 },
  { date: "2026-05-18", short: 9.71, close: 95.26 },
  { date: "2026-05-19", short: 9.61, close: 92.78 },
  { date: "2026-05-20", short: 9.61, close: 94.1 },
  { date: "2026-05-21", short: 9.6, close: 93.66 },
  { date: "2026-05-22", short: 9.48, close: 94.54 },
  { date: "2026-05-25", short: 9.5, close: 94.54 },
  { date: "2026-05-26", short: 9.5, close: 97.12 },
  { date: "2026-05-27", short: 9.39, close: 97.52 },
  { date: "2026-05-28", short: 9.4, close: 95.94 },
  { date: "2026-05-29", short: 9.4, close: 98.26 },
  { date: "2026-06-01", short: 9.3, close: 96.22 },
  { date: "2026-06-02", short: 9.37, close: 97.12 },
  { date: "2026-06-03", short: 9.34, close: 95.28 },
  { date: "2026-06-04", short: 9.17, close: 95.44 },
  { date: "2026-06-05", short: 9.38, close: 95.44 },
  { date: "2026-06-08", short: 9.38, close: 95.12 },
  { date: "2026-06-09", short: 9.43, close: 93.9 },
  { date: "2026-06-10", short: 9.43, close: 92.52 },
  { date: "2026-06-11", short: 9.51, close: 89.84 },
  { date: "2026-06-12", short: 9.47, close: 90.36 },
  { date: "2026-06-15", short: 9.61, close: 90.78 },
  { date: "2026-06-16", short: 9.51, close: 89.04 },
  { date: "2026-06-17", short: 9.6, close: 88.8 },
  { date: "2026-06-18", short: 9.6, close: 88.56 },
  { date: "2026-06-19", short: 9.9, close: 91.86 },
  { date: "2026-06-22", short: 10.15, close: 89.02 },
  { date: "2026-06-23", short: 10.01, close: 89.58 },
  { date: "2026-06-24", short: 9.91, close: 89.44 },
  { date: "2026-06-25", short: 9.91, close: 89.32 },
  { date: "2026-06-26", short: 9.85, close: 87.3 },
];

// Full-period price flow per 2%-wide band, in millions of shares.
// Computed from daily short interest changes assigned to the previous
// trading day's typical price (high+low+close)/3 (same method as the
// Prisstrøm tab in computePriceFlow.ts).
const FLOW_FULL = [
  { mid: 84.1, shorted: 0.47, covered: 0.0, net: 0.47 },
  { mid: 87.5, shorted: 0.47, covered: 0.41, net: 0.06 },
  { mid: 89.2, shorted: 1.95, covered: 1.49, net: 0.47 },
  { mid: 91.0, shorted: 2.24, covered: 2.87, net: -0.63 },
  { mid: 92.8, shorted: 2.42, covered: 1.11, net: 1.31 },
  { mid: 94.7, shorted: 3.29, covered: 4.05, net: -0.76 },
  { mid: 96.6, shorted: 2.62, covered: 3.09, net: -0.47 },
  { mid: 98.5, shorted: 3.06, covered: 5.14, net: -2.08 },
  { mid: 100.5, shorted: 1.88, covered: 2.9, net: -1.02 },
  { mid: 102.5, shorted: 1.24, covered: 1.5, net: -0.26 },
  { mid: 104.6, shorted: 1.91, covered: 1.28, net: 0.63 },
  { mid: 106.6, shorted: 0.68, covered: 0.15, net: 0.54 },
  { mid: 108.8, shorted: 3.95, covered: 1.4, net: 2.55 },
  { mid: 110.9, shorted: 3.35, covered: 3.61, net: -0.26 },
  { mid: 113.2, shorted: 0.83, covered: 0.7, net: 0.13 },
  { mid: 115.4, shorted: 0.67, covered: 0.77, net: -0.1 },
  { mid: 117.7, shorted: 0.83, covered: 1.75, net: -0.92 },
  { mid: 120.1, shorted: 0.93, covered: 0.68, net: 0.25 },
  { mid: 122.5, shorted: 0.54, covered: 0.47, net: 0.07 },
  { mid: 124.9, shorted: 0.6, covered: 0.0, net: 0.6 },
  { mid: 127.4, shorted: 0.68, covered: 0.68, net: -0.0 },
  { mid: 130.0, shorted: 0.95, covered: 0.26, net: 0.68 },
  { mid: 132.6, shorted: 1.44, covered: 1.41, net: 0.03 },
  { mid: 135.2, shorted: 2.4, covered: 2.3, net: 0.1 },
  { mid: 138.0, shorted: 1.94, covered: 0.63, net: 1.31 },
  { mid: 140.7, shorted: 1.34, covered: 0.89, net: 0.45 },
  { mid: 143.5, shorted: 0.31, covered: 0.35, net: -0.04 },
  { mid: 146.4, shorted: 0.98, covered: 0.48, net: 0.5 },
  { mid: 149.3, shorted: 1.57, covered: 2.74, net: -1.16 },
  { mid: 152.3, shorted: 0.96, covered: 2.01, net: -1.05 },
  { mid: 155.4, shorted: 0.74, covered: 0.32, net: 0.42 },
  { mid: 158.5, shorted: 2.04, covered: 0.39, net: 1.65 },
  { mid: 161.6, shorted: 1.83, covered: 0.6, net: 1.24 },
  { mid: 164.9, shorted: 2.24, covered: 0.33, net: 1.91 },
  { mid: 168.2, shorted: 0.6, covered: 0.58, net: 0.01 },
  { mid: 171.5, shorted: 1.62, covered: 1.3, net: 0.32 },
  { mid: 175.0, shorted: 1.14, covered: 2.07, net: -0.93 },
  { mid: 178.5, shorted: 1.22, covered: 1.14, net: 0.09 },
  { mid: 182.0, shorted: 0.79, covered: 0.5, net: 0.29 },
  { mid: 185.7, shorted: 1.0, covered: 0.45, net: 0.55 },
  { mid: 189.4, shorted: 0.6, covered: 0.35, net: 0.25 },
  { mid: 193.2, shorted: 0.13, covered: 0.32, net: -0.19 },
  { mid: 197.0, shorted: 0.26, covered: 0.13, net: 0.13 },
  { mid: 201.0, shorted: 0.33, covered: 0.47, net: -0.13 },
  { mid: 205.0, shorted: 0.6, covered: 1.05, net: -0.45 },
  { mid: 209.1, shorted: 0.22, covered: 1.14, net: -0.92 },
  { mid: 213.3, shorted: 0.22, covered: 0.67, net: -0.45 },
  { mid: 217.5, shorted: 0.01, covered: 0.35, net: -0.33 },
  { mid: 221.9, shorted: 0.84, covered: 0.12, net: 0.73 },
];

// Price flow for the last 3 months (since the end of March 2026), millions of
// shares, sorted by price band, highest first (typical-price bands, as in the app)
const FLOW_3M = [
  { band: "107,53-109,68", shorted: 0.0, covered: 0.7, net: -0.7 },
  { band: "105,42-107,53", shorted: 0.29, covered: 0.0, net: 0.29 },
  { band: "103,36-105,42", shorted: 0.0, covered: 0.31, net: -0.31 },
  { band: "101,33-103,36", shorted: 1.0, covered: 0.0, net: 1.0 },
  { band: "99,34-101,33", shorted: 0.71, covered: 0.0, net: 0.71 },
  { band: "97,39-99,34", shorted: 0.47, covered: 3.41, net: -2.94 },
  { band: "95,48-97,39", shorted: 0.77, covered: 1.25, net: -0.48 },
  { band: "93,61-95,48", shorted: 0.74, covered: 0.66, net: 0.09 },
  { band: "91,78-93,61", shorted: 0.12, covered: 0.0, net: 0.12 },
  { band: "89,98-91,78", shorted: 0.57, covered: 0.2, net: 0.36 },
  { band: "88,21-89,98", shorted: 0.57, covered: 0.44, net: 0.13 },
];

// ─── format helpers ─────────────────────────────────────────────────────────
function fmtShortDate(d: string) {
  const parts = d.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
}

function fmtMio(v: number) {
  return `${v.toFixed(2).replace(".", ",")} mio.`;
}

// ─── tooltips ───────────────────────────────────────────────────────────────
function ShortPriceTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const shortVal = payload.find((p) => p.dataKey === "short");
  const priceVal = payload.find((p) => p.dataKey === "close");
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">{String(label)}</p>
      {shortVal && <p className="text-center font-bold text-lg tabular-nums text-[#007AFF]">{Number(shortVal.value).toFixed(2)}%</p>}
      {priceVal && priceVal.value != null && <p className="text-center text-purple-500 dark:text-purple-400 tabular-nums">{Number(priceVal.value).toFixed(1)} DKK</p>}
    </div>
  );
}

function FlowTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as { mid: number; shorted: number; covered: number; net: number };
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">Kursbånd omkring {String(d.mid).replace(".", ",")} DKK</p>
      <p className="text-center text-red-500 tabular-nums">Shortet: {fmtMio(d.shorted)}</p>
      <p className="text-center text-green-600 dark:text-green-400 tabular-nums">Dækket: {fmtMio(d.covered)}</p>
      <p className="text-center font-bold tabular-nums text-gray-900 dark:text-white">Netto: {d.net > 0 ? "+" : ""}{fmtMio(d.net)}</p>
    </div>
  );
}

function KPI({ value, label, highlight, tone = "blue" }: { value: string; label: string; highlight?: boolean; tone?: "blue" | "red" | "green" }) {
  const toneClasses = {
    blue:  { bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",             text: "text-blue-600 dark:text-blue-400" },
    red:   { bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",                 text: "text-red-700 dark:text-red-400" },
    green: { bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400" },
  };
  const t = toneClasses[tone];
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 text-center ${highlight ? t.bg : "bg-white dark:bg-[#19191f] border-gray-100 dark:border-gray-800"}`}>
      <p className={`text-lg sm:text-xl font-bold tabular-nums ${highlight ? t.text : "text-gray-900 dark:text-white"}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 leading-tight">{label}</p>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────
const GNPriceFlowAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/gn/flow/2026-06-28", "gn_priceflow_analysis");
    fetch(`${HOST}/stats/visit/gn-priceflow-analysis/`).catch(() => {});
  }, []);

  const [isDark, setIsDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const getChartHeight = useCallback(() => (window.innerWidth < 640 ? 220 : 320), []);
  const [chartHeight, setChartHeight] = useState(getChartHeight);
  useEffect(() => {
    const h = () => setChartHeight(getChartHeight());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [getChartHeight]);

  const gridColor = isDark ? "#2a2a35" : "#f0f0f0";
  const tickColor = isDark ? "#999" : "#888";

  return (
    <PageTemplate>
      <title>Zirium | GN Store Nord (GN) - Prisstrøm</title>
      <meta name="description" content="Sådan bruger du prisstrømmen på Zirium. Med GN Store Nord som case viser vi, ved hvilke kurser shorterne har åbnet og dækket deres positioner." />
      <meta property="og:title" content="Sådan bruger du prisstrømmen: Hvor har shorterne handlet GN?" />
      <meta property="og:description" content="Med GN Store Nord som case viser vi, ved hvilke kurser shorterne har åbnet og dækket deres positioner, og hvordan du selv læser prisstrømmen." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/gn/flow/2026-06-28" />
      <meta property="og:image" content="https://www.zirium.dk/og-images/gn-flow-2026-06-28.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Sådan bruger du prisstrømmen: Hvor har shorterne handlet GN?" />
      <meta name="twitter:description" content="Med GN Store Nord som case viser vi, ved hvilke kurser shorterne har åbnet og dækket deres positioner, og hvordan du selv læser prisstrømmen." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/gn-flow-2026-06-28.png" />
      <link rel="canonical" href="https://www.zirium.dk/analyse/gn/flow/2026-06-28" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Sådan bruger du prisstrømmen: Hvor har shorterne handlet GN?",
        "description": "Med GN Store Nord som case viser vi, ved hvilke kurser shorterne har åbnet og dækket deres positioner, og hvordan du selv læser prisstrømmen.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-06-28",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/gn/flow/2026-06-28",
        "inLanguage": "da",
      })}</script>

      <article className="w-full max-w-[900px] mx-auto px-5 sm:px-8 pb-10 sm:pb-16">
        <button
          className="text-blue-500 hover:text-blue-700 bg-transparent border-none text-base inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm min-h-[44px] min-w-[44px]"
          onClick={() => {
            if (window.history.length > 1 && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate("/analyse");
            }
          }}
        >
          <span aria-hidden="true">←</span>
          {t("Back")}
        </button>

        {/* ── Header ── */}
        <header className="mb-10 mt-4">
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">Analyse lavet af Araz Bayat Makoo (Zirium) - 28. juni 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Sådan bruger du prisstrømmen: Hvor har shorterne handlet GN?
          </h1>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            GN Store Nord (GN)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Prisstrømmen er en fane på aktiens detaljeside, der fordeler alle indberettede
            shortændringer på kursniveau, så du kan se, ved hvilke kurser shorts er åbnet og dækket.
            Denne analyse bruger GN Store Nord som case og viser trin for trin, hvordan du læser
            tallene, hvad de kan fortælle dig, og hvor metodens grænser går.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="9,85%" label="Short-interesse (26. juni)" highlight tone="blue" />
          <KPI value="87,30 DKK" label="Seneste lukkekurs (26. juni)" />
          <KPI value="62,9 mio." label="Aktier shortet siden nov. 2023" highlight tone="red" />
          <KPI value="57,4 mio." label="Aktier dækket siden nov. 2023" highlight tone="green" />
        </div>

        {/* ── 1. Hvad er prisstrømmen ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. Hvad er prisstrømmen?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Finanstilsynets data viser hver dag den samlede shortinteresse i en aktie, men ikke til
            hvilke kurser positionerne er handlet. Prisstrømmen er et estimat, der udfylder det hul.
            Beregningen sker i tre trin:
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 mb-4">
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              <span><strong>Dag-til-dag ændringer:</strong> Hver dag sammenlignes shortinteressen med dagen før.
              Stiger den, er der netto åbnet nye shorts. Falder den, er der netto dækket. Ændringen i
              procentpoint omregnes til aktier. For GN svarer 1 procentpoint til ca. 1,46 mio. aktier.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              <span><strong>Kursen sættes til forrige handelsdag:</strong> Ændringer indberettes typisk dagen
              efter handlen (T+1). En ændring, der bliver synlig tirsdag, afspejler derfor mest sandsynligt
              en handel mandag, og den tildeles gennemsnittet af mandagens høj, lav og luk.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">3.</span>
              <span><strong>Aktierne fordeles i kursbånd:</strong> Alle ændringer samles i 2%-brede kursbånd.
              Rød betyder åbnede shorts, grøn betyder dækkede shorts, og nettokolonnen viser retningen i
              hvert bånd.</span>
            </li>
          </ul>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Du finder prisstrømmen på aktiens detaljeside under fanen Prisstrøm, både på zirium.dk og i
            appen. Resultatet minder om det, man i teknisk analyse kalder en volumenprofil, men her er
            det udelukkende short-aktiviteten, der fordeles på kursniveau. Du kan åbne GN's prisstrøm
            direkte <a href="https://www.zirium.dk/short-watch-details?code=DK0010272632&tab=flow" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline">her</a>.
          </p>
        </section>

        {/* ── 2. Short-interesse vs. aktiekurs ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Konteksten: Short-interesse vs. aktiekurs</h2>
          <p className="text-gray-500 dark:text-gray-300 mb-4">
            Historik siden november 2023. Blå = short-interesse, lilla = lukkekurs. Det er disse to
            kurver, prisstrømmen kombinerer til ét billede.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Short-interesse vs. aktiekurs for GN Store Nord siden november 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={POSITION_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gnPfShortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[4, 14]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[60, 240]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#gnPfShortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short-interesse</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Lukkekurs</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
            GN er et godt eksempel, fordi aktien i den viste periode har været igennem hele spektret: En
            top på 224 DKK i juni 2024 (aktien har været højere før 2023), et bundniveau på 82,56 DKK i
            april 2025 og et hop på Amplifon-nyheden i marts 2026.
            Samtidig er shortinteressen gået fra 6% til over 13% og ned igen til 9,85%. Siden november 2023
            er der brutto åbnet shorts for 62,9 mio. aktier og dækket 57,4 mio. Det er ca. 4,4 gange den
            nuværende shortposition på ca. 14,3 mio. aktier, så der har været rigeligt med aktivitet at
            fordele på kursbåndene.
          </p>
        </section>

        {/* ── 3. Hele historikken ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">3. Hele historikken i ét billede</h2>
          <p className="text-gray-500 dark:text-gray-300 mb-4">
            Nettostrøm per 2%-bredt kursbånd siden november 2023. Rød = netto åbnede shorts, grøn = netto
            dækkede shorts. Den stiplede linje markerer den aktuelle kurs.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Netto prisstrøm per kursbånd for GN Store Nord siden november 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FLOW_FULL} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="mid" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${Math.round(Number(v))}`} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} label={{ value: "mio. aktier", angle: -90, position: "insideLeft", fontSize: 10, fill: tickColor }} />
                <Tooltip content={FlowTooltip} cursor={{ fill: isDark ? "#ffffff10" : "#00000008" }} />
                <ReferenceLine y={0} stroke={isDark ? "#555" : "#ccc"} />
                <ReferenceLine x={87.5} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                  {FLOW_FULL.map((b) => (
                    <Cell key={b.mid} fill={b.net > 0 ? "#e63946" : "#2a9d8f"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#e63946] inline-block" />Netto åbnet</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#2a9d8f] inline-block" />Netto dækket</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Kurs i dag (87,30 DKK)</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4 mb-4">
            Det største røde bånd ligger ved 107,70-109,85 DKK, hvor der netto er åbnet 2,55 mio. aktier.
            Derudover er der store røde bånd højere oppe, ved 156,89-160,03 (netto 1,65 mio.), 160,03-163,23
            (1,24 mio.) og 163,23-166,50 DKK (1,91 mio.), som primært blev åbnet i 2024, da aktien handlede
            over 150 DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            De største grønne bånd ligger til gengæld lavere: 97,54-99,50 DKK (netto dækket 2,08 mio. aktier),
            99,50-101,49 DKK (netto 1,02 mio.), 147,84-150,80 DKK (netto 1,16 mio.) og 150,80-153,82 DKK
            (netto 1,05 mio.). Mønstret er altså, at shorts netto er åbnet på høje kursniveauer og dækket
            på lavere: Over 100 DKK er der netto åbnet ca. 7,2 mio. aktier, mens der under 100 netto er
            dækket ca. 1,6 mio. Bemærk dog ét rødt bånd helt nede ved 91,92-93,76 DKK (netto åbnet 1,3 mio.),
            de første tegn på, at nogle shorts åbner igen på de lave niveauer.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Hvad kan man bruge det til? Hvis de positioner, der blev åbnet ved 108 og 157-166 DKK,
            stadig er åbne, sidder de på solide gevinster ved den aktuelle kurs på ca. 87 DKK. Det er
            shorts med en stor buffer, som ikke er tvunget til at reagere på mindre kursudsving. Den massive
            dækning ved 97-101 DKK var ligeledes gevinsthjemtagning, ikke panik. Derfor er den fortsat høje
            shortinteresse på over 9% ikke en sammenpresset fjeder af nødlidende positioner: Hovedparten af
            de tilbageværende shorts er åbnet højere oppe og sidder i plus, så de kan selv vælge, hvornår de
            dækker.
          </p>
        </section>

        {/* ── 4. Amplifon-casen ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Casen: Amplifon-dagene viser, hvordan strømmen skal læses</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den 16. marts 2026 annoncerede GN salget af sin høreapparatdivision (GN Hearing) til Amplifon
            for 17 mia. kr. Aktien sprang voldsomt: Den var oppe i 123,75 DKK intradag og lukkede i 105,30
            efter en meget urolig session. I de følgende to dage faldt shortinteressen fra 13,04%
            (datasættets højeste) til 10,85%, altså 2,19 procentpoint eller ca. 3,2 mio. aktier, som
            shorterne dækkede.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Casen viser også, hvorfor prisstrømmen bruger dagens gennemsnitskurs, altså gennemsnittet af
            høj, lav og luk, frem for lukkekursen. Den 16. marts var lukkekursen 105,30, men
            gennemsnitskursen 111,43, fordi aktien havde været helt oppe i 123,75 undervejs. Den største enkeltstående dækning i
            hele datasættet, 2,45 mio. aktier den 17. marts, bliver derfor placeret ved ca. 111 DKK, ikke
            ved 105. På en rolig dag ligger de to kurser tæt, men på en vild dag som denne skiller de godt
            6 DKK, en påmindelse om, at placeringen er et estimat, ikke en eksakt handelskurs.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Bemærk, at denne dækning næsten forsvinder i grafen i afsnit 3, der kun viser netto: Ved 111
            DKK er der shortet omtrent lige så meget på andre tidspunkter, så nettoen går i nul (forbehold
            1 i praksis). I appens liste, hvor shortet og dækket står hver for sig, kan du derimod godt se
            den, med marts-datoen ved siden af.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Pointen er generel: Store udsving i strømmen har næsten altid en konkret anledning, et
            regnskab, en nedjustering eller, som her, et frasalg. Datokolonnen i appen viser, hvornår
            hvert bånd sidst var aktivt, så du kan koble strømmen til konkrete nyheder.
          </p>
        </section>

        {/* ── 5. Seneste 3 måneder ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">5. De seneste 3 måneder: Mild dækning og ny shorting omkring 100 DKK</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Periodeknapperne på detaljesiden filtrerer også prisstrømmen. Det er vigtigt, for det fulde
            billede ovenfor blander to år gamle handler sammen med sidste uges. Vælger man kun de seneste
            3 måneder, ser tabellen sådan ud:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Prisstrøm for GN Store Nord de seneste 3 måneder</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Kursbånd (DKK)</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Shortet</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Dækket</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Netto</th>
                </tr>
              </thead>
              <tbody>
                {FLOW_3M.map((b, i) => (
                  <tr key={b.band} className={i % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50/50 dark:bg-[#15151a]"}>
                    <td className="px-4 py-3 text-sm font-medium tabular-nums text-gray-900 dark:text-white whitespace-nowrap">{b.band}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-red-500">{b.shorted > 0 ? fmtMio(b.shorted) : "-"}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-green-600 dark:text-green-400">{b.covered > 0 ? fmtMio(b.covered) : "-"}</td>
                    <td className={`px-4 py-3 text-sm tabular-nums font-semibold ${b.net > 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>{b.net > 0 ? "+" : ""}{fmtMio(b.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Siden slutningen af marts er der netto dækket ca. 1,7 mio. aktier, og shortinteressen er
            faldet fra 11,03% til 9,85%. Brutto er der dækket 7,0 mio. aktier og åbnet 5,2 mio. Dækningen
            er stærkt koncentreret ved 97-99 DKK, hvor der netto er dækket knap 3 mio. aktier, da aktien
            handlede der i april og maj. Bemærk, at de store Amplifon-dage fra marts nu er gledet ud af
            3-måneders-vinduet, så billedet her er renset for det enkeltstående hop og viser, hvad
            shorterne har gjort siden.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Mere interessant er de røde bånd: Mens shorterne dækkede ved 98, åbnede de samtidig nye
            positioner lige over, ved 99-103 DKK (godt 1,7 mio. aktier tilsammen), og lagde lidt nyt til
            spredt ud ved 88-95 DKK. Det er altså mindre ren gevinsthjemtagning og mere en rokering af
            positionerne omkring 100 DKK. Shortinteressen har i juni svinget mellem ca. 9,5% og 10,2% og
            ligger nu på 9,85%, så presset er ikke for alvor aftaget.
          </p>
        </section>

        {/* ── 6. Sådan bruger du fanen ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">6. Sådan bruger du fanen i praksis</h2>
          <div className="space-y-4 text-gray-600 dark:text-gray-300">
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Brug periodeknapperne aktivt</h4>
              <p>Det fulde billede viser, hvor de historiske positioner er bygget op, mens 1M/3M viser, hvad shorterne gør lige nu. Som i GN-eksemplet kan de to fortælle vidt forskellige historier: Historisk netto-shorting ved 108 DKK, men overvejende dækning de seneste måneder.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Læg mærke til bjælkelængden og datoerne</h4>
              <p>Bag tallene i hver række ligger en bjælke, hvis længde viser, hvor meget der er shortet eller dækket i båndet, skaleret efter det største bånd. Under tallene står datoen for, hvornår båndet sidst blev shortet henholdsvis dækket. De to ting er uafhængige: Bjælkens længde er den samlede mængde, der kan være bygget op over lang tid, mens datoen kun fortæller, hvornår båndet sidst var aktivt, ikke at hele mængden er ny.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Sammenlign med den aktuelle kurs</h4>
              <p>Ligger kursen under de store røde bånd, er shorterne samlet set i plus og har råd til at være tålmodige, såfremt de ikke allerede har dækket. Ligger kursen over dem, er de pressede, og en yderligere kursstigning kan tvinge dem til at dække. For GN ligger de store røde bånd ved 108 og 157-166 DKK, altså et godt stykke over den aktuelle kurs på ca. 87 DKK, men om de positioner stadig er åbne, viser prisstrømmen ikke.</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Kobl store bånd til begivenheder</h4>
              <p>Store udsving i strømmen har næsten altid en konkret anledning: Et regnskab, en nedjustering eller, som i GN's tilfælde, et frasalg. Brug datoerne til at finde begivenheden, før du tolker på mønstret.</p>
            </div>
          </div>
        </section>

        {/* ── 7. Forbehold ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Forbehold: Hvad prisstrømmen ikke kan</h2>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 mb-4">
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              <span><strong>Den ser kun nettoændringer:</strong> Hvis en fond dækker 500.000 aktier, og en anden
              åbner 500.000 den samme dag, viser strømmen nul. Den reelle aktivitet er altid større end
              det, der kan aflæses.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              <span><strong>Kursen er en antagelse:</strong> Vi tildeler ændringen forrige handelsdags
              gennemsnitskurs (høj, lav, luk) på grund af T+1-indberetning. Den faktiske handelskurs inden
              for dagen kender vi ikke, og ved store intradag-udsving, som på Amplifon-dagen, kan
              afvigelsen være betydelig.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">3.</span>
              <span><strong>Den skelner ikke mellem aktører:</strong> Strømmen er summen af de indberettede shorts,
              både de offentliggjorte positioner over 0,50% og de anonyme mellem 0,1% og 0,50%. Et rødt bånd fortæller, at nogen
              shortede på det niveau, ikke hvem, og heller ikke om de stadig holder positionen. Med en
              bruttoaktivitet på 4,4 gange den nuværende position kan mange af de viste handler for længst
              være modsvaret af senere handler.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">4.</span>
              <span><strong>Båndene er estimater:</strong> 2%-brede kursbånd er valgt som kompromis mellem detalje
              og støj. Tallene skal læses som niveauer og størrelsesordener, ikke som præcise handelskurser.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">5.</span>
              <span><strong>Båndene flytter sig med perioden:</strong> Grænserne beregnes ud fra den laveste kurs i
              det viste vindue, så de samme kursniveauer kan få lidt forskellige båndgrænser i fx 3M- og
              fuld-visningen. Sammenlign derfor båndene inden for én periode ad gangen.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-500 font-bold shrink-0">6.</span>
              <span><strong>Positioner under 0,1% er ikke med:</strong> Net-shortpositioner skal kun indberettes fra
              0,1% (og offentliggøres med navn fra 0,5%). Alt under 0,1% rapporteres ingen steder, så den
              reelle shortinteresse kan være lidt højere end den, vi viser.</span>
            </li>
          </ul>
        </section>

        {/* ── 8. Konklusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Konklusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Prisstrømmen besvarer det spørgsmål, som den rå shortinteresse ikke kan: Ikke bare hvor meget
            der er shortet, men hvor. For GN viser den, at den shortning, vi kan følge siden november 2023,
            primært er bygget op ved 108 DKK og oppe ved 157-166 DKK, mens der under 100 DKK netto er blevet
            dækket. Ved den aktuelle kurs på ca. 87 DKK sidder de positioner derfor i plus, forudsat de
            stadig er åbne, for prisstrømmen viser ikke, om de allerede er lukket højere oppe. Og selvom
            de seneste 3 måneder samlet set har været domineret af gevinsthjemtagning, er der samtidig
            dukket ny netto-shorting op omkring 100 DKK og spredt i de lave bånd.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Og det er netop det mest interessante at holde øje med herfra: Farven på båndene omkring
            87-95 DKK, hvor kursen ligger nu. I 3M-visningen er der allerede dukket lidt ny netto-shorting
            op her. Bliver de bånd ved med at være røde, genopbygger shorterne positioner på de lave
            niveauer, og så er historien om GN som en af de mest shortede danske aktier langtfra slut.
            Vender de til grøn, er dækningen i gang igen. Prisstrømmen giver dig svaret løbende, opdateret
            hver dag på aktiens detaljeside.
          </p>
        </section>

        <FeedbackWidget pageType="analysis" pageId="gn/flow/2026-06-28" />
        <RelatedAnalyses currentSlug="gn/flow/2026-06-28" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Prisstrømmen er et estimat baseret på offentligt tilgængelige data fra
            Finanstilsynet og markedspriser. De faktiske handelskurser kan afvige væsentligt. Foretag altid
            din egen analyse, og søg professionel rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  28. juni 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default GNPriceFlowAnalysisPage;
