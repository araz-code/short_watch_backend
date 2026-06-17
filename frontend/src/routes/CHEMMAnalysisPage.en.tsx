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
// Short interest and close price, sampled weekly plus key event days
const FULL_HISTORY = [
  { date: "2023-11-06", short: 8.03, close: 323.03 },
  { date: "2023-11-12", short: 8.72, close: 323.81 },
  { date: "2023-11-19", short: 8.87, close: 344.76 },
  { date: "2023-11-26", short: 8.98, close: 352.79 },
  { date: "2023-12-03", short: 8.99, close: 329.69 },
  { date: "2023-12-10", short: 8.67, close: 339.87 },
  { date: "2023-12-17", short: 8.38, close: 401.54 },
  { date: "2023-12-24", short: 8.28, close: 385.29 },
  { date: "2023-12-31", short: 8.28, close: 379.81 },
  { date: "2024-01-07", short: 7.94, close: 367.86 },
  { date: "2024-01-14", short: 7.96, close: 370.8 },
  { date: "2024-01-21", short: 8.35, close: 361.79 },
  { date: "2024-01-28", short: 8.27, close: 401.73 },
  { date: "2024-02-04", short: 8.85, close: 354.75 },
  { date: "2024-02-11", short: 8.75, close: 452.05 },
  { date: "2024-02-18", short: 8.11, close: 434.82 },
  { date: "2024-02-25", short: 8.13, close: 455.96 },
  { date: "2024-03-03", short: 7.98, close: 496.29 },
  { date: "2024-03-10", short: 7.88, close: 541.81 },
  { date: "2024-03-17", short: 8.08, close: 423.86 },
  { date: "2024-03-24", short: 8.47, close: 411.33 },
  { date: "2024-03-31", short: 8.6, close: 414.85 },
  { date: "2024-04-07", short: 8.13, close: 368.65 },
  { date: "2024-04-14", short: 8.13, close: 288.77 },
  { date: "2024-04-21", short: 9.14, close: 279.18 },
  { date: "2024-04-28", short: 9.06, close: 280.55 },
  { date: "2024-05-05", short: 8.77, close: 290.53 },
  { date: "2024-05-12", short: 8.53, close: 306.19 },
  { date: "2024-05-19", short: 8.67, close: 352.98 },
  { date: "2024-05-26", short: 8.57, close: 358.86 },
  { date: "2024-06-02", short: 8.2, close: 355.53 },
  { date: "2024-06-09", short: 8.68, close: 324.99 },
  { date: "2024-06-16", short: 8.93, close: 308.54 },
  { date: "2024-06-23", short: 9, close: 294.64 },
  { date: "2024-06-30", short: 9.14, close: 298.17 },
  { date: "2024-07-07", short: 9.46, close: 352.98 },
  { date: "2024-07-10", short: 9.81, close: 369.82 },
  { date: "2024-07-14", short: 9.71, close: 375.11 },
  { date: "2024-07-21", short: 9.78, close: 357.49 },
  { date: "2024-07-28", short: 9.46, close: 378.83 },
  { date: "2024-08-04", short: 9.45, close: 350.64 },
  { date: "2024-08-11", short: 9.03, close: 371.78 },
  { date: "2024-08-18", short: 8.83, close: 376.87 },
  { date: "2024-08-25", short: 8.64, close: 385.29 },
  { date: "2024-09-01", short: 8.41, close: 366.69 },
  { date: "2024-09-08", short: 7.97, close: 393.51 },
  { date: "2024-09-15", short: 6.92, close: 444.41 },
  { date: "2024-09-22", short: 6.92, close: 420.92 },
  { date: "2024-09-29", short: 6.82, close: 409.17 },
  { date: "2024-10-06", short: 6.79, close: 377.07 },
  { date: "2024-10-13", short: 6.69, close: 353.57 },
  { date: "2024-10-20", short: 6.5, close: 435.52 },
  { date: "2024-10-27", short: 6.14, close: 405.63 },
  { date: "2024-11-03", short: 6, close: 403.85 },
  { date: "2024-11-10", short: 5.65, close: 479.47 },
  { date: "2024-11-17", short: 4.5, close: 443.24 },
  { date: "2024-11-24", short: 4.45, close: 467.59 },
  { date: "2024-12-01", short: 4.56, close: 468.78 },
  { date: "2024-12-08", short: 4.23, close: 476.9 },
  { date: "2024-12-15", short: 4.25, close: 471.95 },
  { date: "2024-12-22", short: 4.06, close: 486 },
  { date: "2024-12-29", short: 4.06, close: 502.83 },
  { date: "2025-01-05", short: 4.06, close: 496.4 },
  { date: "2025-01-12", short: 3.97, close: 543.41 },
  { date: "2025-01-19", short: 3.75, close: 516.69 },
  { date: "2025-01-26", short: 2.69, close: 492.74 },
  { date: "2025-02-02", short: 2.45, close: 554.3 },
  { date: "2025-02-09", short: 2.22, close: 557.27 },
  { date: "2025-02-16", short: 2.22, close: 566.18 },
  { date: "2025-02-23", short: 2.3, close: 593.4 },
  { date: "2025-03-02", short: 2.3, close: 575.09 },
  { date: "2025-03-09", short: 2.2, close: 548.86 },
  { date: "2025-03-16", short: 2.2, close: 526.59 },
  { date: "2025-03-23", short: 2.2, close: 528.57 },
  { date: "2025-03-30", short: 2.2, close: 504.81 },
  { date: "2025-04-06", short: 2.34, close: 420.68 },
  { date: "2025-04-13", short: 2.48, close: 453.54 },
  { date: "2025-04-20", short: 2.48, close: 474.52 },
  { date: "2025-04-27", short: 2.48, close: 461.46 },
  { date: "2025-05-04", short: 2.53, close: 481.85 },
  { date: "2025-05-11", short: 2.6, close: 485.01 },
  { date: "2025-05-18", short: 2.6, close: 514.21 },
  { date: "2025-05-25", short: 2.41, close: 503.82 },
  { date: "2025-06-01", short: 2.51, close: 522.63 },
  { date: "2025-06-08", short: 2.51, close: 517.68 },
  { date: "2025-06-15", short: 2.34, close: 525.6 },
  { date: "2025-06-22", short: 2.34, close: 516.19 },
  { date: "2025-06-29", short: 2.34, close: 562.72 },
  { date: "2025-07-06", short: 2.27, close: 554.3 },
  { date: "2025-07-13", short: 2.27, close: 532.53 },
  { date: "2025-07-20", short: 2.17, close: 519.66 },
  { date: "2025-07-27", short: 2.06, close: 509.76 },
  { date: "2025-08-03", short: 1.87, close: 481.06 },
  { date: "2025-08-10", short: 1.97, close: 492.34 },
  { date: "2025-08-17", short: 1.63, close: 495.9 },
  { date: "2025-08-24", short: 1.45, close: 521.14 },
  { date: "2025-08-31", short: 1.17, close: 515.7 },
  { date: "2025-09-07", short: 1.17, close: 536.49 },
  { date: "2025-09-14", short: 1.17, close: 603.3 },
  { date: "2025-09-21", short: 1.66, close: 646.36 },
  { date: "2025-09-28", short: 1.55, close: 615.67 },
  { date: "2025-10-05", short: 1.56, close: 671.1 },
  { date: "2025-10-12", short: 1.34, close: 678.5 },
  { date: "2025-10-19", short: 1.15, close: 670 },
  { date: "2025-10-26", short: 1.04, close: 700 },
  { date: "2025-10-30", short: 0.85, close: 792 },
  { date: "2025-11-02", short: 0.67, close: 791 },
  { date: "2025-11-09", short: 0.78, close: 694 },
  { date: "2025-11-16", short: 0.78, close: 766 },
  { date: "2025-11-23", short: 0.78, close: 751.5 },
  { date: "2025-11-30", short: 0.53, close: 782.5 },
  { date: "2025-12-07", short: 0.53, close: 742 },
  { date: "2025-12-14", short: 0.53, close: 701 },
  { date: "2025-12-19", short: 0.53, close: 682 },
  { date: "2026-01-11", short: 0.44, close: 711.5 },
  { date: "2026-01-18", short: 0.18, close: 712 },
  { date: "2026-01-25", short: 0.44, close: 684 },
  { date: "2026-02-01", short: 0.29, close: 609.5 },
  { date: "2026-02-04", short: 0.29, close: 579.5 },
  { date: "2026-02-05", short: 0.41, close: 463 },
  { date: "2026-02-08", short: 0.79, close: 432 },
  { date: "2026-02-15", short: 0.84, close: 403.4 },
  { date: "2026-02-22", short: 1.05, close: 400 },
  { date: "2026-03-01", short: 0.98, close: 420.4 },
  { date: "2026-03-08", short: 1.01, close: 414 },
  { date: "2026-03-15", short: 1.57, close: 399.6 },
  { date: "2026-03-22", short: 1.49, close: 398.6 },
  { date: "2026-03-23", short: 1.38, close: 398.6 },
  { date: "2026-03-24", short: 1.54, close: 236.8 },
  { date: "2026-03-29", short: 1.93, close: 290 },
  { date: "2026-04-05", short: 2.19, close: 309 },
  { date: "2026-04-12", short: 2.08, close: 303.4 },
  { date: "2026-04-19", short: 2.19, close: 350 },
  { date: "2026-04-26", short: 2.62, close: 327.4 },
  { date: "2026-05-03", short: 3.04, close: 326 },
  { date: "2026-05-06", short: 3.36, close: 321.6 },
  { date: "2026-05-10", short: 3.56, close: 314.8 },
  { date: "2026-05-17", short: 3.37, close: 313.4 },
  { date: "2026-05-24", short: 3.22, close: 336.2 },
  { date: "2026-05-31", short: 3.42, close: 375 },
  { date: "2026-06-07", short: 3.33, close: 377.6 },
  { date: "2026-06-14", short: 3.4, close: 374.6 },
  { date: "2026-06-16", short: 3.54, close: 368.8 },
];

// Daily detail for 2026 (every trading day)
const ZOOM_2026 = [
  { date: "2026-02-02", short: 0.29, close: 606.5 },
  { date: "2026-02-03", short: 0.29, close: 613 },
  { date: "2026-02-04", short: 0.29, close: 579.5 },
  { date: "2026-02-05", short: 0.41, close: 463 },
  { date: "2026-02-06", short: 0.79, close: 432 },
  { date: "2026-02-09", short: 1.01, close: 407 },
  { date: "2026-02-10", short: 0.86, close: 413 },
  { date: "2026-02-11", short: 0.62, close: 395 },
  { date: "2026-02-12", short: 0.62, close: 406.8 },
  { date: "2026-02-13", short: 0.84, close: 403.4 },
  { date: "2026-02-16", short: 0.73, close: 400.8 },
  { date: "2026-02-17", short: 0.93, close: 402.2 },
  { date: "2026-02-18", short: 0.93, close: 409.6 },
  { date: "2026-02-19", short: 0.88, close: 397 },
  { date: "2026-02-20", short: 1.05, close: 400 },
  { date: "2026-02-23", short: 0.79, close: 389.2 },
  { date: "2026-02-24", short: 0.87, close: 386 },
  { date: "2026-02-25", short: 0.87, close: 385.2 },
  { date: "2026-02-26", short: 0.87, close: 413 },
  { date: "2026-02-27", short: 0.98, close: 420.4 },
  { date: "2026-03-02", short: 1.14, close: 410.6 },
  { date: "2026-03-03", short: 0.98, close: 405.8 },
  { date: "2026-03-04", short: 0.98, close: 428.6 },
  { date: "2026-03-05", short: 0.98, close: 420.6 },
  { date: "2026-03-06", short: 1.01, close: 414 },
  { date: "2026-03-09", short: 1.01, close: 409.8 },
  { date: "2026-03-10", short: 1.13, close: 420.6 },
  { date: "2026-03-11", short: 1.23, close: 401.6 },
  { date: "2026-03-12", short: 1.19, close: 400.6 },
  { date: "2026-03-13", short: 1.41, close: 399.6 },
  { date: "2026-03-16", short: 1.41, close: 400.4 },
  { date: "2026-03-17", short: 1.5, close: 412.8 },
  { date: "2026-03-18", short: 1.5, close: 403.2 },
  { date: "2026-03-19", short: 1.6, close: 394.2 },
  { date: "2026-03-20", short: 1.49, close: 398.6 },
  { date: "2026-03-23", short: 1.38, close: 398.6 },
  { date: "2026-03-24", short: 1.54, close: 236.8 },
  { date: "2026-03-25", short: 1.74, close: 280.6 },
  { date: "2026-03-26", short: 1.95, close: 297 },
  { date: "2026-03-27", short: 1.93, close: 290 },
  { date: "2026-03-30", short: 1.93, close: 294.6 },
  { date: "2026-03-31", short: 2.09, close: 300.8 },
  { date: "2026-04-01", short: 2.03, close: 309 },
  { date: "2026-04-02", short: 2.03, close: 309 },
  { date: "2026-04-03", short: 2.19, close: 309 },
  { date: "2026-04-06", short: 2.19, close: 309 },
  { date: "2026-04-07", short: 2.19, close: 293.4 },
  { date: "2026-04-08", short: 1.89, close: 305.8 },
  { date: "2026-04-09", short: 1.9, close: 300.2 },
  { date: "2026-04-10", short: 2.08, close: 303.4 },
  { date: "2026-04-13", short: 2.22, close: 302.6 },
  { date: "2026-04-14", short: 2.32, close: 323 },
  { date: "2026-04-15", short: 2.48, close: 330.6 },
  { date: "2026-04-16", short: 2.19, close: 336.8 },
  { date: "2026-04-17", short: 2.19, close: 350 },
  { date: "2026-04-20", short: 2.35, close: 345 },
  { date: "2026-04-21", short: 2.4, close: 346 },
  { date: "2026-04-22", short: 2.3, close: 342.2 },
  { date: "2026-04-23", short: 2.41, close: 326.6 },
  { date: "2026-04-24", short: 2.62, close: 327.4 },
  { date: "2026-04-27", short: 2.78, close: 328.2 },
  { date: "2026-04-28", short: 2.84, close: 318.8 },
  { date: "2026-04-29", short: 2.95, close: 320 },
  { date: "2026-04-30", short: 2.95, close: 320 },
  { date: "2026-05-01", short: 3.04, close: 326 },
  { date: "2026-05-04", short: 3.04, close: 323.4 },
  { date: "2026-05-05", short: 3.04, close: 305 },
  { date: "2026-05-06", short: 3.36, close: 321.6 },
  { date: "2026-05-07", short: 3.46, close: 322.2 },
  { date: "2026-05-08", short: 3.56, close: 314.8 },
  { date: "2026-05-11", short: 3.67, close: 316 },
  { date: "2026-05-12", short: 3.6, close: 320.6 },
  { date: "2026-05-13", short: 3.34, close: 313.4 },
  { date: "2026-05-14", short: 3.37, close: 313.4 },
  { date: "2026-05-15", short: 3.37, close: 313.4 },
  { date: "2026-05-18", short: 3.37, close: 323.2 },
  { date: "2026-05-19", short: 3.37, close: 323.8 },
  { date: "2026-05-20", short: 3.47, close: 342 },
  { date: "2026-05-21", short: 3.48, close: 340 },
  { date: "2026-05-22", short: 3.22, close: 336.2 },
  { date: "2026-05-25", short: 3.32, close: 336.2 },
  { date: "2026-05-26", short: 3.32, close: 352.8 },
  { date: "2026-05-27", short: 3.3, close: 351.6 },
  { date: "2026-05-28", short: 3.3, close: 356.2 },
  { date: "2026-05-29", short: 3.3, close: 375 },
  { date: "2026-06-01", short: 3.79, close: 357.4 },
  { date: "2026-06-02", short: 3.63, close: 366 },
  { date: "2026-06-03", short: 3.52, close: 355 },
  { date: "2026-06-04", short: 3.68, close: 377.6 },
  { date: "2026-06-05", short: 3.33, close: 377.6 },
  { date: "2026-06-08", short: 3.33, close: 376.2 },
  { date: "2026-06-09", short: 3.47, close: 383.6 },
  { date: "2026-06-10", short: 3.54, close: 382 },
  { date: "2026-06-11", short: 3.4, close: 376.6 },
  { date: "2026-06-12", short: 3.56, close: 374.6 },
  { date: "2026-06-15", short: 3.7, close: 377.8 },
  { date: "2026-06-16", short: 3.54, close: 368.8 },
];

// Price flow of the 2026 rebuild (since Feb 1), thousands of shares per
// 2%-wide band, assigned to the previous trading day's close (T+1)
const FLOW_2026 = [
  { mid: 239.2, shorted: 34.8, covered: 0.0, net: 34.8 },
  { mid: 280.2, shorted: 36.5, covered: 0.0, net: 36.5 },
  { mid: 291.5, shorted: 0.0, covered: 52.2, net: -52.2 },
  { mid: 297.4, shorted: 59.2, covered: 3.5, net: 55.7 },
  { mid: 303.3, shorted: 99.2, covered: 10.4, net: 88.8 },
  { mid: 309.4, shorted: 27.8, covered: 0.0, net: 27.8 },
  { mid: 315.6, shorted: 24.4, covered: 12.2, net: 12.2 },
  { mid: 321.9, shorted: 114.9, covered: 45.2, net: 69.6 },
  { mid: 328.3, shorted: 74.8, covered: 50.5, net: 24.4 },
  { mid: 334.9, shorted: 17.4, covered: 0.0, net: 17.4 },
  { mid: 341.6, shorted: 20.9, covered: 45.2, net: -24.4 },
  { mid: 348.4, shorted: 36.5, covered: 17.4, net: 19.1 },
  { mid: 355.4, shorted: 27.8, covered: 31.3, net: -3.5 },
  { mid: 362.5, shorted: 0.0, covered: 19.1, net: -19.1 },
  { mid: 377.1, shorted: 109.6, covered: 60.9, net: 48.7 },
  { mid: 392.4, shorted: 13.9, covered: 19.1, net: -5.2 },
  { mid: 400.2, shorted: 191.4, covered: 118.3, net: 73.1 },
  { mid: 408.2, shorted: 59.2, covered: 62.6, net: -3.5 },
  { mid: 416.4, shorted: 47.0, covered: 41.8, net: 5.2 },
  { mid: 424.7, shorted: 22.6, covered: 0.0, net: 22.6 },
  { mid: 433.2, shorted: 38.3, covered: 0.0, net: 38.3 },
  { mid: 459.7, shorted: 66.1, covered: 0.0, net: 66.1 },
  { mid: 583.1, shorted: 20.9, covered: 0.0, net: 20.9 },
];

// Historical disclosed sellers (announcements to the Danish FSA)
const PAST_SELLERS = [
  { name: "Qube Research & Technologies", count: 75, period: "Jun 2023 - Jan 2025" },
  { name: "Brummer Multi-Strategy", count: 26, period: "Sep 2023 - Oct 2025" },
  { name: "Millennium Intl Mgmt", count: 22, period: "Aug 2023 - May 2024" },
  { name: "Boone Capital Mgmt", count: 14, period: "Sep 2023 - Sep 2024" },
  { name: "Wellington Mgmt Intl", count: 10, period: "Sep 2024 - Oct 2025" },
  { name: "Marshall Wace", count: 9, period: "Feb 2024 - Apr 2024" },
  { name: "WorldQuant", count: 8, period: "Mar 2023 - May 2024" },
];

// ─── format helpers ─────────────────────────────────────────────────────────
function fmtShortDate(d: string) {
  const parts = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
}

function fmtDayMonth(d: string) {
  const parts = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`;
}

function fmtThousand(v: number) {
  return `${Math.round(v * 1000).toLocaleString("en-US")} shares`;
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
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">Price band around {String(d.mid)} DKK</p>
      <p className="text-center text-red-500 tabular-nums">Shorted: {fmtThousand(d.shorted)}</p>
      <p className="text-center text-green-600 dark:text-green-400 tabular-nums">Covered: {fmtThousand(d.covered)}</p>
      <p className="text-center font-bold tabular-nums text-gray-900 dark:text-white">Net: {d.net > 0 ? "+" : ""}{fmtThousand(d.net)}</p>
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

function TimelineEvent({ date, title, children, color }: { date: string; title: string; children: React.ReactNode; color: string }) {
  return (
    <div className="relative pl-8 pb-8 last:pb-0 group">
      <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#0d0d12] z-10" style={{ backgroundColor: color }} />
      <div className="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 group-last:hidden" />
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{date}</p>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-1.5">{title}</h4>
      <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────
const CHEMMAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/chemm", "chemm_analysis");
    fetch(`${HOST}/stats/visit/chemm-analysis/`).catch(() => {});
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
      <title>Zirium | ChemoMetec (CHEMM) - Short Selling Analysis</title>
      <meta name="description" content="In-depth analysis of short positions in ChemoMetec (CHEMM). The shorts were almost out when the stock collapsed, and are now building up again after the rebound." />
      <meta property="og:title" content="Short selling analysis of ChemoMetec: The shorts missed the collapse and now chase the rebound" />
      <meta property="og:description" content="In-depth analysis of short positions in ChemoMetec (CHEMM). The shorts were almost out when the stock collapsed, and are now building up again after the rebound." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/chemm/2026-06-17" />
      <meta property="og:image" content="https://www.zirium.dk/og-images/chemm-2026-06-17-en.png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Short selling analysis of ChemoMetec: The shorts missed the collapse and now chase the rebound" />
      <meta name="twitter:description" content="In-depth analysis of short positions in ChemoMetec (CHEMM). The shorts were almost out when the stock collapsed, and are now building up again after the rebound." />
      <meta name="twitter:image" content="https://www.zirium.dk/og-images/chemm-2026-06-17-en.png" />
      <link rel="canonical" href="https://www.zirium.dk/analyse/chemm/2026-06-17" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Short selling analysis of ChemoMetec: The shorts missed the collapse and now chase the rebound",
        "description": "In-depth analysis of short positions in ChemoMetec (CHEMM). The shorts were almost out when the stock collapsed, and are now building up again after the rebound.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-06-17",
        "dateModified": "2026-06-17",
        "image": "https://www.zirium.dk/og-images/chemm-2026-06-17-en.png",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/chemm/2026-06-17",
        "inLanguage": "en",
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
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">Analysis by Araz Bayat Makoo (Zirium) - June 17, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Short selling analysis of ChemoMetec: The shorts missed the collapse and now chase the rebound
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            ChemoMetec A/S (CHEMM)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            ChemoMetec is one of the strangest short stories on the Danish market. The stock was among the
            most heavily shorted in 2023-24, but when it delivered its largest single-day drop ever in the
            spring of 2026, the shorts were largely gone. Now, after the stock has risen about 56% from the
            bottom, an entirely new group of funds is building positions again. This analysis walks through
            the story in four acts and weaves in the fundamental backdrop along the way.
          </p>
        </header>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value="3.54%" label="Short interest (June 16)" highlight tone="blue" />
          <KPI value="368.80 DKK" label="Latest close (June 16)" />
          <KPI value="-53%" label="From the 2025 high (792 DKK)" highlight tone="red" />
          <KPI value="+56%" label="From the bottom (236.80 DKK, March 24)" highlight tone="green" />
        </div>

        {/* ── 1. The big picture ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">1. The big picture</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            ChemoMetec develops and sells instruments for cell counting and cell analysis (the NucleoCounter
            and the newer XcytoMatic platform), primarily for customers within cell and gene therapy and
            bioprocessing. The business model combines instrument sales with recurring sales of consumables,
            and the company has unusually high margins: in the 2024/25 financial year, revenue grew 22% to
            DKK 495.6 million with EBITDA of DKK 258.0 million.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Precisely because the growth story is so dependent on the North American market and on customers'
            appetite to invest in cell and gene therapy, the stock has always been highly volatile. The past
            three years have taken it from around 320 DKK to 792 DKK and down to 236.80 DKK, and short
            interest has moved almost perfectly in reverse: high when the stock was low, near zero at the top,
            and rising again after the collapse. That is the story the numbers below tell.
          </p>
        </section>

        {/* ── 2. Chart: full history ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">2. Short interest vs. share price</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">History since November 2023. Blue = short interest, purple = closing price. Note the almost mirror-image pattern.</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest vs. share price for ChemoMetec since November 2023">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FULL_HISTORY} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="chemmShortGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 10]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[150, 850]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="short" type="step" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#chemmShortGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Closing price</span>
            </div>
          </div>
        </section>

        {/* ── 3. Act 1 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">3. Act 1: One of Denmark's most shorted stocks (2023-24)</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            In 2023 and 2024, ChemoMetec was a pronounced consensus short. The stock had fallen hard from its
            2021 record (an all-time high of 1,149 DKK on September 23, 2021), growth had stalled, and short
            interest held steadily between 8% and 9%, peaking at 9.81% on July 10, 2024. That corresponded to
            about 1.7 million shares out of only 17.4 million outstanding.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The crowd behind it was the large quantitative and multi-strategy funds: Qube Research &
            Technologies alone accounts for 75 disclosures to the Danish FSA (Finanstilsynet) between June
            2023 and January 2025, and Millennium, Brummer, Boone Capital, Marshall Wace and WorldQuant were
            all in with positions above 0.50% along the way. Our estimate, based on the daily changes, is that
            positions in this period were net built up at an average price of around 355 DKK.
          </p>
        </section>

        {/* ── 4. Act 2 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">4. Act 2: The big covering during the rally (2024-25)</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            From the autumn of 2024, the fundamentals turned. Growth returned, and the 2024/25 financial year
            (ended June 30, 2025) closed with 22% revenue growth to DKK 495.6 million and 39% EBITDA growth to
            DKK 258.0 million. The new XcytoMatic platform began to sell (DKK 27.7 million versus DKK 8.3
            million the year before), and on October 28, 2025 the company raised its guidance for 2025/26 to
            revenue of DKK 565-580 million. The stock peaked at 792 DKK two days later.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The shorts capitulated along the way. From August 2024 to early February 2026, roughly 2.2 million
            shares were gross covered at an estimated average price of around 498 DKK, well above the ~355 DKK
            at which positions had on average been opened. For the funds that held on the whole way,
            ChemoMetec was, in other words, an expensive short. Qube left the list in January 2025, and by the
            autumn of 2025 only Brummer and Wellington remained with positions right around the threshold.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            At the price peak on October 30, 2025, short interest was down to 0.85%, and around the turn of
            the year it hit bottom at just 0.18% (January 2026); even at the half-year report in early
            February it was only 0.29%. As always, the figures should be read with the caveat that we only see
            net changes, but the direction is unambiguous: when the stock was most expensive, almost no one
            was short.
          </p>
        </section>

        {/* ── 5. Act 3 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">5. Act 3: The collapse that (almost) no one shorted</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            On February 4, 2026, the half-year report for 2025/26 arrived, and it disappointed: revenue fell
            1% to DKK 249 million (organic +3%), the second quarter alone fell 8%, and the long US government
            shutdown cost, according to the company, about DKK 20 million in November revenue. Guidance was
            maintained, but the market lost confidence: the stock fell about 24% over two trading days, from
            613 to 463 DKK.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The real blow came on Tuesday, March 24, 2026, when ChemoMetec cut its expectations for 2025/26:
            revenue guidance was lowered from 565-580 to DKK 490-520 million and EBITDA from 320-335 to DKK
            260-285 million. The company pointed to weaker sales in North America within cell and gene
            therapy, longer customer decision-making due to political and macroeconomic uncertainty, slower
            automation projects, and the strong interest in XcytoMatic temporarily curbing sales of the
            established NC instruments. The stock closed at 236.80 DKK, a drop of about 41% and the largest
            single-day fall in the company's history.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            And where were the shorts? Largely absent. Short interest was 0.29% at the half-year report and
            only about 1.4% the day before the downgrade. Of the total drop from 792 to 236.80 DKK, the
            disclosed short positions captured only a fraction. It is an important reminder that high short
            interest is no reliable crystal ball: in ChemoMetec's case it has acted almost as a reverse
            indicator.
          </p>
        </section>

        {/* ── 6. Chart: 2026 zoom ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">6. 2026 in detail</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">February to June 2026. The three yellow markers: H1 report (Feb 4), downgrade (Mar 24) and Q3 statement (May 6).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Short interest and share price for ChemoMetec in 2026 with key events">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={ZOOM_2026} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="chemmZoomGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtDayMonth} interval="preserveStartEnd" />
                <YAxis yAxisId="short" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}%`} domain={[0, 4]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="price" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[200, 650]} tickLine={false} axisLine={false} />
                <Tooltip content={ShortPriceTooltip} cursor={{ stroke: "#007AFF", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <ReferenceLine yAxisId="price" x="2026-02-04" stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine yAxisId="price" x="2026-03-24" stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <ReferenceLine yAxisId="price" x="2026-05-06" stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <Area yAxisId="short" type="stepAfter" dataKey="short" stroke="#007AFF" strokeWidth={2.5} fill="url(#chemmZoomGrad)" activeDot={{ r: 5, fill: "#007AFF", stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="price" type="monotone" dataKey="close" stroke="#a855f7" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#007AFF] inline-block" />Short interest</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#a855f7] inline-block" />Closing price</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Key events</span>
            </div>
          </div>
        </section>

        {/* ── 7. Act 4 ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">7. Act 4: The rebuild after the bottom</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Only after the collapse did the shorts come back. From the bottom of 0.18% in January, short
            interest has risen steadily to a preliminary peak of 3.79% on June 1, most recently 3.54% in
            mid-June. That corresponds to a net build-up of about 585,000 shares over roughly five months in a
            company with only 17.4 million shares outstanding. The current position has a market value of
            about DKK 227 million.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The price flow below is a model calculation of the prices at which the 2026 build-up took place. It
            is based solely on net changes in the disclosed positions, so the individual figures are estimates
            and not observed trading prices. Red = net opened shorts, green = net covered.
          </p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Net price flow per price band for ChemoMetec since February 2026">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={FLOW_2026} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="mid" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${Math.round(Number(v))}`} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} label={{ value: "1,000 shares", angle: -90, position: "insideLeft", fontSize: 10, fill: tickColor }} />
                <Tooltip content={FlowTooltip} cursor={{ fill: isDark ? "#ffffff10" : "#00000008" }} />
                <ReferenceLine y={0} stroke={isDark ? "#555" : "#ccc"} />
                <ReferenceLine x={362.5} stroke="#eab308" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                  {FLOW_2026.map((b) => (
                    <Cell key={b.mid} fill={b.net > 0 ? "#e63946" : "#2a9d8f"} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#e63946] inline-block" />Net opened</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#2a9d8f] inline-block" />Net covered</span>
              <span className="flex items-center gap-1.5"><span className="inline-flex items-center gap-[2px]"><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /><span className="w-[4px] h-[2px] bg-[#eab308] inline-block" /></span>Price today (~369 DKK)</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4 mb-4">
            The build-up has occurred broadly in the range of about 295-435 DKK, with the heaviest bands around
            300-330 and 400 DKK. Our estimate of the weighted average price for all new shorts since February
            is about 363 DKK. At a current price of 368.80 DKK, the entire 2026 vintage is therefore already
            about 2% underwater.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            It looks even more striking for the shorts opened after the downgrade on March 24: here about
            712,000 shares were gross opened at an estimated average price of only around 326 DKK. Those
            positions are about 13% underwater at a price of 369 (model estimate). In other words, the shorts
            have not caught the fall but have instead gone in against the rebound, and so far the stock has
            continued to rise from the bottom.
          </p>
        </section>

        {/* ── 8. Who is shorting ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">8. Who is shorting ChemoMetec now?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            The most striking thing about the 2026 wave is that the disclosed positions are carried by an
            entirely new group. None of the big names from 2023-24 have reappeared above the disclosure
            threshold. Instead, Citadel entered on April 14, 2026 and has built up to 0.92%, while D. E. Shaw
            crossed the threshold on May 7 and has most recently trimmed to 0.48%, just below the disclosure
            limit. The rest of the total short interest, about 2 percentage points, is held by anonymous
            players with positions below 0.50%, so it cannot be ruled out that some of the old names are also
            shorting again below the threshold.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Current short sellers in ChemoMetec</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short seller</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Position</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">Citadel Advisors LLC</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold text-red-500">0.92%</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">May 14</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">Entered April 14, 2026, peaked at 0.96% on May 6.</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">D. E. Shaw & Co.</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold text-red-500">0.48%</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">May 27</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">Entered May 7 at 0.50%, now just below the threshold.</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">Below 0.50% (unknown)</td>
                  <td className="px-4 py-3 text-sm tabular-nums font-semibold text-red-500">~2.14%</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">-</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">The difference up to the total 3.54%.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">The old crowd (2023-25)</h3>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">Funds with disclosed positions above 0.50% in the previous short wave. None of them appear on the disclosure list in the 2026 wave (but could in principle short below the threshold).</p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left">
              <caption className="sr-only">Historical short sellers in ChemoMetec</caption>
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Short seller</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Disclosures</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Period</th>
                </tr>
              </thead>
              <tbody>
                {PAST_SELLERS.map((s, i) => (
                  <tr key={s.name} className={i % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50/50 dark:bg-[#15151a]"}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-300">{s.count}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 whitespace-nowrap">{s.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 9. Timeline ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6">9. Timeline of key events</h2>
          <div className="ml-2">
            <TimelineEvent date="July 10, 2024" title="Short interest peaks: 9.81%" color="#e63946">
              <p>The highest short interest in the dataset, about 1.7 million shares. Qube, Millennium, Brummer, Boone, Marshall Wace and WorldQuant had all held positions above 0.50% during the period.</p>
            </TimelineEvent>
            <TimelineEvent date="September 11, 2025" title="Annual report 2024/25: Growth across the board" color="#2a9d8f">
              <p>Revenue grew 22% to DKK 495.6 million and EBITDA 39% to DKK 258.0 million. The XcytoMatic platform sold for DKK 27.7 million versus DKK 8.3 million the year before. Guidance for 2025/26: revenue of DKK 545-565 million.</p>
            </TimelineEvent>
            <TimelineEvent date="October 28, 2025" title="Upgrade, and the stock peaks at 792 DKK" color="#2a9d8f">
              <p>Guidance raised to DKK 565-580 million in revenue and DKK 320-335 million in EBITDA. The stock closed at 792 DKK on October 30. Short interest was then down to 0.85%.</p>
            </TimelineEvent>
            <TimelineEvent date="February 4, 2026" title="H1 2025/26 disappoints: -24% in two days" color="#e63946">
              <p>Revenue of DKK 249 million (-1%, organic +3%), Q2 alone -8%. The US government shutdown cost about DKK 20 million in November. Guidance maintained, but the stock fell from 613 to 463 DKK over two trading days. Short interest was all the way down at 0.18% in January and only 0.29% at the report.</p>
            </TimelineEvent>
            <TimelineEvent date="March 24, 2026" title="Downgrade: Largest single-day fall ever" color="#e63946">
              <p>Revenue guidance lowered to DKK 490-520 million and EBITDA to DKK 260-285 million. Reasons: weaker sales in North America, longer customer decisions, slower automation projects and XcytoMatic interest temporarily curbing NC sales. The stock closed at 236.80 DKK, down about 41%. Short interest was only about 1.4% the day before.</p>
            </TimelineEvent>
            <TimelineEvent date="May 6, 2026" title="Q3 better than feared, small upgrade and buyback" color="#2a9d8f">
              <p>Q3 revenue of DKK 142.3 million (+15%) and EBITDA of DKK 84.5 million (+33%, including a positive one-off IFRS effect of DKK 15.1 million). Guidance raised to DKK 505-525 million and EBITDA DKK 275-290 million. From May 18 to October 8, 2026, a share buyback of up to 500,000 shares (2.9% of the capital), max DKK 100 million, is running.</p>
            </TimelineEvent>
            <TimelineEvent date="June 2026" title="Rebound to 369 DKK, short interest peaks for now" color="#4361ee">
              <p>The stock has risen about 56% from the bottom. Short interest hit 3.79% on June 1 and is most recently 3.54%. Citadel (0.92%) is the only disclosed position.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* ── 10. The key question ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">10. The key question: Are the shorts too late again?</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The new shorts are betting that the rebound has run ahead of the fundamentals: despite the small
            upgrade in May, guidance is still markedly below the autumn level, and with a market value of about
            DKK 6.4 billion the company is priced at around 22-23 times the midpoint of EBITDA guidance.
            Conversely, the third quarter showed progress, and the company is buying back its own shares
            through October.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">The shorts' arguments</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Weak North American market for cell and gene therapy</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Longer customer decisions and deferred automation projects</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>XcytoMatic temporarily cannibalizes NC sales</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Stock +56% from the bottom, while guidance has been raised only marginally</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>High valuation: about 22-23x EBITDA guidance</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Risks for the shorts</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Q3 showed +15% revenue and upgraded guidance</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Buyback of up to DKK 100 million supports the price until October</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>2026 shorts are already about 2-13% underwater (estimate)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>History: last time it was costly to short the turn</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── 11. Conclusion ── */}
        <section className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">11. Conclusion</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The ChemoMetec story punctures a widespread myth: that short interest shows where the next big
            price drop will come. Here the exact opposite happened. The shorts were heavily positioned in the
            stock in 2023-24, covered at a loss through the rally, were nearly out at the top of 792 DKK, and
            then missed both the disappointment in February and the historic downgrade in March. The total
            short position was at its lowest precisely when it would have earned the most.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Now the roles are reversed. A new group led by Citadel has, over roughly five months, built short
            interest up from 0.18% to about 3.5%, but it has happened after the fall, into a rebound that has
            already pushed the new positions underwater. With an active buyback program and a small upgrade in
            May, it is a short with considerable risk, and the outcome depends on whether the North American
            market for cell and gene therapy actually stabilizes, or whether the March downgrade was only the
            first.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Upcoming catalysts to watch</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; End of the buyback program (October 8, 2026)</li>
              <li>&#x2022; The 2025/26 annual report and the first guidance for 2026/27 (expected September 2026)</li>
              <li>&#x2022; Developments in the North American cell and gene therapy market</li>
              <li>&#x2022; XcytoMatic orders, and whether NC sales normalize</li>
              <li>&#x2022; Whether Citadel and the anonymous positions keep building above 4%</li>
            </ul>
          </div>
        </section>

        <FeedbackWidget pageType="analysis" pageId="chemm/2026-06-17" />
        <RelatedAnalyses currentSlug="chemm/2026-06-17" />

        {/* ── Disclaimer ── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not
            constitute investment advice. Data comes from the Danish FSA's (Finanstilsynet) public registers,
            the company's own announcements and market prices. Estimates of entry prices are based on net
            changes and may differ significantly from actual trading prices. Always do your own analysis and
            seek professional advice before trading.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  June 17, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

export default CHEMMAnalysisPage;
