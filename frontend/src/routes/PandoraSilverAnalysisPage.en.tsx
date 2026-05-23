import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import RelatedAnalyses from "../components/RelatedAnalyses";
import { trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { TooltipContentProps } from "recharts/types/component/Tooltip";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

// ─── types ───────────────────────────────────────────────────────────────────
interface PricePoint {
  date: string;
  pandora: number;
  silver: number;
}

interface SentimentPoint {
  date: string;
  pandora: number;
  sentiment: number;
}

interface CorrelationPoint {
  silver: number;
  pandora: number;
  label: string;
}

// ─── static data ────────────────────────────────────────────────────────────
// Pandora (PNDORA.CO) daily nominal close prices in DKK (Yahoo Close, not dividend-adjusted)
// + silver price (SI=F) USD/oz. Sources: Yahoo Finance, LBMA.
const PRICE_DATA: PricePoint[] = [
  { date: "2024-01-02", pandora: 936, silver: 23.7 },
  { date: "2024-01-03", pandora: 922, silver: 22.9 },
  { date: "2024-01-04", pandora: 930, silver: 23.0 },
  { date: "2024-01-05", pandora: 947, silver: 23.1 },
  { date: "2024-01-08", pandora: 980, silver: 23.1 },
  { date: "2024-01-09", pandora: 977, silver: 22.9 },
  { date: "2024-01-10", pandora: 998, silver: 22.9 },
  { date: "2024-01-11", pandora: 986, silver: 22.5 },
  { date: "2024-01-12", pandora: 978, silver: 23.2 },
  { date: "2024-01-16", pandora: 987, silver: 22.9 },
  { date: "2024-01-17", pandora: 985, silver: 22.5 },
  { date: "2024-01-18", pandora: 969, silver: 22.7 },
  { date: "2024-01-19", pandora: 959, silver: 22.6 },
  { date: "2024-01-22", pandora: 974, silver: 22.2 },
  { date: "2024-01-23", pandora: 973, silver: 22.3 },
  { date: "2024-01-24", pandora: 989, silver: 22.8 },
  { date: "2024-01-25", pandora: 1004, silver: 22.8 },
  { date: "2024-01-26", pandora: 992, silver: 22.8 },
  { date: "2024-01-29", pandora: 1012, silver: 23.1 },
  { date: "2024-01-30", pandora: 1018, silver: 23.1 },
  { date: "2024-01-31", pandora: 1009, silver: 23.1 },
  { date: "2024-02-01", pandora: 1000, silver: 23.1 },
  { date: "2024-02-02", pandora: 1016, silver: 22.7 },
  { date: "2024-02-05", pandora: 1016, silver: 22.3 },
  { date: "2024-02-06", pandora: 1030, silver: 22.4 },
  { date: "2024-02-07", pandora: 1026, silver: 22.3 },
  { date: "2024-02-08", pandora: 1078, silver: 22.6 },
  { date: "2024-02-09", pandora: 1090, silver: 22.5 },
  { date: "2024-02-12", pandora: 1098, silver: 22.7 },
  { date: "2024-02-13", pandora: 1088, silver: 22.1 },
  { date: "2024-02-14", pandora: 1104, silver: 22.3 },
  { date: "2024-02-15", pandora: 1108, silver: 22.9 },
  { date: "2024-02-16", pandora: 1134, silver: 23.4 },
  { date: "2024-02-20", pandora: 1142, silver: 23.1 },
  { date: "2024-02-21", pandora: 1133, silver: 22.9 },
  { date: "2024-02-22", pandora: 1142, silver: 22.8 },
  { date: "2024-02-23", pandora: 1152, silver: 23.0 },
  { date: "2024-02-26", pandora: 1152, silver: 22.5 },
  { date: "2024-02-27", pandora: 1154, silver: 22.5 },
  { date: "2024-02-28", pandora: 1150, silver: 22.4 },
  { date: "2024-02-29", pandora: 1113, silver: 22.7 },
  { date: "2024-03-01", pandora: 1147, silver: 23.1 },
  { date: "2024-03-04", pandora: 1138, silver: 23.8 },
  { date: "2024-03-05", pandora: 1126, silver: 23.8 },
  { date: "2024-03-06", pandora: 1114, silver: 24.3 },
  { date: "2024-03-07", pandora: 1136, silver: 24.4 },
  { date: "2024-03-08", pandora: 1158, silver: 24.3 },
  { date: "2024-03-11", pandora: 1141, silver: 24.5 },
  { date: "2024-03-12", pandora: 1162, silver: 24.2 },
  { date: "2024-03-13", pandora: 1163, silver: 25.0 },
  { date: "2024-03-14", pandora: 1180, silver: 24.9 },
  { date: "2024-03-15", pandora: 1146, silver: 25.2 },
  { date: "2024-03-18", pandora: 1142, silver: 25.1 },
  { date: "2024-03-19", pandora: 1149, silver: 25.0 },
  { date: "2024-03-20", pandora: 1143, silver: 24.9 },
  { date: "2024-03-21", pandora: 1164, silver: 24.8 },
  { date: "2024-03-22", pandora: 1122, silver: 24.7 },
  { date: "2024-03-25", pandora: 1124, silver: 24.7 },
  { date: "2024-03-26", pandora: 1140, silver: 24.5 },
  { date: "2024-03-27", pandora: 1114, silver: 24.6 },
  { date: "2024-04-02", pandora: 1098, silver: 25.8 },
  { date: "2024-04-03", pandora: 1110, silver: 26.9 },
  { date: "2024-04-04", pandora: 1098, silver: 27.1 },
  { date: "2024-04-05", pandora: 1096, silver: 27.4 },
  { date: "2024-04-08", pandora: 1090, silver: 27.7 },
  { date: "2024-04-09", pandora: 1074, silver: 27.9 },
  { date: "2024-04-10", pandora: 1093, silver: 28.0 },
  { date: "2024-04-11", pandora: 1097, silver: 28.2 },
  { date: "2024-04-12", pandora: 1064, silver: 28.3 },
  { date: "2024-04-15", pandora: 1080, silver: 28.7 },
  { date: "2024-04-16", pandora: 1067, silver: 28.3 },
  { date: "2024-04-17", pandora: 1078, silver: 28.3 },
  { date: "2024-04-18", pandora: 1074, silver: 28.3 },
  { date: "2024-04-19", pandora: 1082, silver: 28.8 },
  { date: "2024-04-22", pandora: 1103, silver: 27.2 },
  { date: "2024-04-23", pandora: 1099, silver: 27.3 },
  { date: "2024-04-24", pandora: 1095, silver: 27.3 },
  { date: "2024-04-25", pandora: 1078, silver: 27.3 },
  { date: "2024-04-26", pandora: 1100, silver: 27.2 },
  { date: "2024-04-29", pandora: 1086, silver: 27.4 },
  { date: "2024-04-30", pandora: 1070, silver: 26.4 },
  { date: "2024-05-01", pandora: 1082, silver: 26.5 },
  { date: "2024-05-02", pandora: 1150, silver: 26.6 },
  { date: "2024-05-03", pandora: 1120, silver: 26.4 },
  { date: "2024-05-06", pandora: 1114, silver: 27.4 },
  { date: "2024-05-07", pandora: 1112, silver: 27.3 },
  { date: "2024-05-08", pandora: 1132, silver: 27.4 },
  { date: "2024-05-13", pandora: 1162, silver: 28.2 },
  { date: "2024-05-14", pandora: 1130, silver: 28.5 },
  { date: "2024-05-15", pandora: 1148, silver: 29.5 },
  { date: "2024-05-16", pandora: 1164, silver: 29.7 },
  { date: "2024-05-17", pandora: 1170, silver: 31.0 },
  { date: "2024-05-21", pandora: 1148, silver: 31.9 },
  { date: "2024-05-22", pandora: 1114, silver: 31.3 },
  { date: "2024-05-23", pandora: 1140, silver: 30.3 },
  { date: "2024-05-24", pandora: 1140, silver: 30.3 },
  { date: "2024-05-28", pandora: 1114, silver: 32.0 },
  { date: "2024-05-29", pandora: 1116, silver: 32.2 },
  { date: "2024-05-30", pandora: 1115, silver: 31.4 },
  { date: "2024-05-31", pandora: 1124, silver: 30.3 },
  { date: "2024-06-03", pandora: 1105, silver: 30.6 },
  { date: "2024-06-04", pandora: 1098, silver: 29.5 },
  { date: "2024-06-06", pandora: 1094, silver: 31.2 },
  { date: "2024-06-07", pandora: 1118, silver: 29.3 },
  { date: "2024-06-10", pandora: 1116, silver: 29.8 },
  { date: "2024-06-11", pandora: 1092, silver: 29.1 },
  { date: "2024-06-12", pandora: 1102, silver: 30.2 },
  { date: "2024-06-13", pandora: 1080, silver: 29.0 },
  { date: "2024-06-14", pandora: 1052, silver: 29.4 },
  { date: "2024-06-17", pandora: 1050, silver: 29.3 },
  { date: "2024-06-18", pandora: 1050, silver: 29.5 },
  { date: "2024-06-20", pandora: 1078, silver: 30.8 },
  { date: "2024-06-21", pandora: 1064, silver: 29.6 },
  { date: "2024-06-24", pandora: 1067, silver: 29.5 },
  { date: "2024-06-25", pandora: 1062, silver: 28.8 },
  { date: "2024-06-26", pandora: 1068, silver: 28.9 },
  { date: "2024-06-27", pandora: 1057, silver: 28.9 },
  { date: "2024-06-28", pandora: 1051, silver: 29.2 },
  { date: "2024-07-01", pandora: 1009, silver: 29.3 },
  { date: "2024-07-02", pandora: 999, silver: 29.4 },
  { date: "2024-07-03", pandora: 997, silver: 30.5 },
  { date: "2024-07-05", pandora: 995, silver: 31.4 },
  { date: "2024-07-08", pandora: 1014, silver: 30.6 },
  { date: "2024-07-09", pandora: 1020, silver: 30.8 },
  { date: "2024-07-10", pandora: 1019, silver: 30.7 },
  { date: "2024-07-11", pandora: 1028, silver: 31.4 },
  { date: "2024-07-12", pandora: 1058, silver: 30.9 },
  { date: "2024-07-15", pandora: 1054, silver: 30.7 },
  { date: "2024-07-16", pandora: 1073, silver: 31.2 },
  { date: "2024-07-17", pandora: 1060, silver: 30.1 },
  { date: "2024-07-18", pandora: 1052, silver: 30.0 },
  { date: "2024-07-19", pandora: 1054, silver: 29.1 },
  { date: "2024-07-22", pandora: 1076, silver: 29.1 },
  { date: "2024-07-23", pandora: 1066, silver: 29.1 },
  { date: "2024-07-24", pandora: 1071, silver: 29.1 },
  { date: "2024-07-25", pandora: 1051, silver: 27.8 },
  { date: "2024-07-26", pandora: 1059, silver: 27.9 },
  { date: "2024-07-29", pandora: 1076, silver: 27.7 },
  { date: "2024-07-30", pandora: 1088, silver: 28.4 },
  { date: "2024-07-31", pandora: 1081, silver: 28.8 },
  { date: "2024-08-01", pandora: 1076, silver: 28.3 },
  { date: "2024-08-02", pandora: 1011, silver: 28.2 },
  { date: "2024-08-05", pandora: 976, silver: 27.1 },
  { date: "2024-08-06", pandora: 997, silver: 27.1 },
  { date: "2024-08-07", pandora: 1008, silver: 26.8 },
  { date: "2024-08-08", pandora: 1014, silver: 27.5 },
  { date: "2024-08-09", pandora: 1025, silver: 27.5 },
  { date: "2024-08-12", pandora: 1041, silver: 27.9 },
  { date: "2024-08-13", pandora: 1079, silver: 27.7 },
  { date: "2024-08-14", pandora: 1060, silver: 27.3 },
  { date: "2024-08-15", pandora: 1062, silver: 28.3 },
  { date: "2024-08-16", pandora: 1068, silver: 28.8 },
  { date: "2024-08-19", pandora: 1094, silver: 29.2 },
  { date: "2024-08-20", pandora: 1114, silver: 29.5 },
  { date: "2024-08-21", pandora: 1119, silver: 29.5 },
  { date: "2024-08-22", pandora: 1134, silver: 29.0 },
  { date: "2024-08-23", pandora: 1144, silver: 29.8 },
  { date: "2024-08-26", pandora: 1148, silver: 30.0 },
  { date: "2024-08-27", pandora: 1156, silver: 30.0 },
  { date: "2024-08-28", pandora: 1159, silver: 29.2 },
  { date: "2024-08-29", pandora: 1171, silver: 29.6 },
  { date: "2024-08-30", pandora: 1181, silver: 28.7 },
  { date: "2024-09-03", pandora: 1179, silver: 28.0 },
  { date: "2024-09-04", pandora: 1173, silver: 28.2 },
  { date: "2024-09-05", pandora: 1158, silver: 28.7 },
  { date: "2024-09-06", pandora: 1146, silver: 27.8 },
  { date: "2024-09-09", pandora: 1153, silver: 28.3 },
  { date: "2024-09-10", pandora: 1138, silver: 28.3 },
  { date: "2024-09-11", pandora: 1158, silver: 28.6 },
  { date: "2024-09-12", pandora: 1184, silver: 29.7 },
  { date: "2024-09-13", pandora: 1204, silver: 30.7 },
  { date: "2024-09-16", pandora: 1190, silver: 30.8 },
  { date: "2024-09-17", pandora: 1166, silver: 30.6 },
  { date: "2024-09-18", pandora: 1146, silver: 30.3 },
  { date: "2024-09-19", pandora: 1174, silver: 31.1 },
  { date: "2024-09-20", pandora: 1146, silver: 31.2 },
  { date: "2024-09-23", pandora: 1144, silver: 30.8 },
  { date: "2024-09-24", pandora: 1162, silver: 32.1 },
  { date: "2024-09-25", pandora: 1119, silver: 31.7 },
  { date: "2024-09-26", pandora: 1104, silver: 32.0 },
  { date: "2024-09-27", pandora: 1100, silver: 31.5 },
  { date: "2024-09-30", pandora: 1102, silver: 31.2 },
  { date: "2024-10-01", pandora: 1068, silver: 31.4 },
  { date: "2024-10-02", pandora: 1064, silver: 31.6 },
  { date: "2024-10-03", pandora: 1050, silver: 32.2 },
  { date: "2024-10-04", pandora: 1055, silver: 32.1 },
  { date: "2024-10-07", pandora: 1044, silver: 31.7 },
  { date: "2024-10-08", pandora: 1067, silver: 30.4 },
  { date: "2024-10-09", pandora: 1060, silver: 30.4 },
  { date: "2024-10-10", pandora: 1071, silver: 31.0 },
  { date: "2024-10-11", pandora: 1078, silver: 31.5 },
  { date: "2024-10-14", pandora: 1064, silver: 31.1 },
  { date: "2024-10-15", pandora: 1063, silver: 31.5 },
  { date: "2024-10-16", pandora: 1063, silver: 31.8 },
  { date: "2024-10-17", pandora: 1082, silver: 31.6 },
  { date: "2024-10-18", pandora: 1074, silver: 33.0 },
  { date: "2024-10-21", pandora: 1050, silver: 33.9 },
  { date: "2024-10-22", pandora: 1030, silver: 34.8 },
  { date: "2024-10-23", pandora: 1024, silver: 33.6 },
  { date: "2024-10-24", pandora: 1048, silver: 33.6 },
  { date: "2024-10-25", pandora: 1040, silver: 33.6 },
  { date: "2024-10-28", pandora: 1048, silver: 33.8 },
  { date: "2024-10-29", pandora: 1067, silver: 34.3 },
  { date: "2024-10-30", pandora: 1056, silver: 33.9 },
  { date: "2024-10-31", pandora: 1034, silver: 32.7 },
  { date: "2024-11-01", pandora: 1060, silver: 32.5 },
  { date: "2024-11-04", pandora: 1061, silver: 32.5 },
  { date: "2024-11-05", pandora: 1060, silver: 32.7 },
  { date: "2024-11-06", pandora: 1042, silver: 31.2 },
  { date: "2024-11-07", pandora: 1054, silver: 31.8 },
  { date: "2024-11-08", pandora: 1064, silver: 31.4 },
  { date: "2024-11-11", pandora: 1076, silver: 30.5 },
  { date: "2024-11-12", pandora: 1094, silver: 30.7 },
  { date: "2024-11-13", pandora: 1092, silver: 30.6 },
  { date: "2024-11-14", pandora: 1097, silver: 30.5 },
  { date: "2024-11-15", pandora: 1085, silver: 30.4 },
  { date: "2024-11-18", pandora: 1095, silver: 31.2 },
  { date: "2024-11-19", pandora: 1068, silver: 31.2 },
  { date: "2024-11-20", pandora: 1080, silver: 31.0 },
  { date: "2024-11-21", pandora: 1086, silver: 30.9 },
  { date: "2024-11-22", pandora: 1120, silver: 31.3 },
  { date: "2024-11-25", pandora: 1124, silver: 30.2 },
  { date: "2024-11-26", pandora: 1117, silver: 30.4 },
  { date: "2024-11-27", pandora: 1108, silver: 30.1 },
  { date: "2024-11-29", pandora: 1136, silver: 30.7 },
  { date: "2024-12-02", pandora: 1164, silver: 30.4 },
  { date: "2024-12-03", pandora: 1186, silver: 31.1 },
  { date: "2024-12-04", pandora: 1188, silver: 31.5 },
  { date: "2024-12-05", pandora: 1178, silver: 31.1 },
  { date: "2024-12-06", pandora: 1215, silver: 31.2 },
  { date: "2024-12-09", pandora: 1257, silver: 32.2 },
  { date: "2024-12-10", pandora: 1262, silver: 32.4 },
  { date: "2024-12-11", pandora: 1276, silver: 32.6 },
  { date: "2024-12-12", pandora: 1266, silver: 31.2 },
  { date: "2024-12-13", pandora: 1275, silver: 30.7 },
  { date: "2024-12-16", pandora: 1280, silver: 30.7 },
  { date: "2024-12-17", pandora: 1258, silver: 30.6 },
  { date: "2024-12-18", pandora: 1271, silver: 30.4 },
  { date: "2024-12-19", pandora: 1264, silver: 29.1 },
  { date: "2024-12-20", pandora: 1274, silver: 29.7 },
  { date: "2024-12-23", pandora: 1294, silver: 29.9 },
  { date: "2024-12-27", pandora: 1328, silver: 29.7 },
  { date: "2024-12-30", pandora: 1317, silver: 29.1 },
  { date: "2025-01-02", pandora: 1320, silver: 29.6 },
  { date: "2025-01-03", pandora: 1318, silver: 29.8 },
  { date: "2025-01-06", pandora: 1314, silver: 30.3 },
  { date: "2025-01-07", pandora: 1305, silver: 30.4 },
  { date: "2025-01-08", pandora: 1311, silver: 30.5 },
  { date: "2025-01-09", pandora: 1320, silver: 30.8 },
  { date: "2025-01-10", pandora: 1332, silver: 31.1 },
  { date: "2025-01-13", pandora: 1270, silver: 30.1 },
  { date: "2025-01-14", pandora: 1241, silver: 30.1 },
  { date: "2025-01-15", pandora: 1250, silver: 31.3 },
  { date: "2025-01-16", pandora: 1268, silver: 31.5 },
  { date: "2025-01-17", pandora: 1282, silver: 31.0 },
  { date: "2025-01-21", pandora: 1304, silver: 31.3 },
  { date: "2025-01-22", pandora: 1321, silver: 31.2 },
  { date: "2025-01-23", pandora: 1342, silver: 30.7 },
  { date: "2025-01-24", pandora: 1329, silver: 31.0 },
  { date: "2025-01-27", pandora: 1362, silver: 30.3 },
  { date: "2025-01-28", pandora: 1354, silver: 30.7 },
  { date: "2025-01-29", pandora: 1378, silver: 31.2 },
  { date: "2025-01-30", pandora: 1400, silver: 32.4 },
  { date: "2025-01-31", pandora: 1380, silver: 32.1 },
  { date: "2025-02-03", pandora: 1380, silver: 32.4 },
  { date: "2025-02-04", pandora: 1374, silver: 32.9 },
  { date: "2025-02-05", pandora: 1342, silver: 32.9 },
  { date: "2025-02-06", pandora: 1347, silver: 32.5 },
  { date: "2025-02-07", pandora: 1320, silver: 32.3 },
  { date: "2025-02-10", pandora: 1332, silver: 32.4 },
  { date: "2025-02-11", pandora: 1322, silver: 32.2 },
  { date: "2025-02-12", pandora: 1328, silver: 32.7 },
  { date: "2025-02-13", pandora: 1320, silver: 32.7 },
  { date: "2025-02-14", pandora: 1261, silver: 32.8 },
  { date: "2025-02-18", pandora: 1256, silver: 33.3 },
  { date: "2025-02-19", pandora: 1247, silver: 33.0 },
  { date: "2025-02-20", pandora: 1240, silver: 33.4 },
  { date: "2025-02-21", pandora: 1278, silver: 33.0 },
  { date: "2025-02-24", pandora: 1242, silver: 32.6 },
  { date: "2025-02-25", pandora: 1264, silver: 31.8 },
  { date: "2025-02-26", pandora: 1268, silver: 32.3 },
  { date: "2025-02-27", pandora: 1240, silver: 31.8 },
  { date: "2025-02-28", pandora: 1268, silver: 31.2 },
  { date: "2025-03-03", pandora: 1244, silver: 32.0 },
  { date: "2025-03-04", pandora: 1214, silver: 32.1 },
  { date: "2025-03-05", pandora: 1198, silver: 32.9 },
  { date: "2025-03-06", pandora: 1168, silver: 33.1 },
  { date: "2025-03-07", pandora: 1162, silver: 32.5 },
  { date: "2025-03-10", pandora: 1148, silver: 32.3 },
  { date: "2025-03-11", pandora: 1126, silver: 32.9 },
  { date: "2025-03-12", pandora: 1128, silver: 33.5 },
  { date: "2025-03-13", pandora: 1111, silver: 34.1 },
  { date: "2025-03-14", pandora: 1104, silver: 34.2 },
  { date: "2025-03-17", pandora: 1104, silver: 34.1 },
  { date: "2025-03-18", pandora: 1075, silver: 34.6 },
  { date: "2025-03-19", pandora: 1118, silver: 34.0 },
  { date: "2025-03-20", pandora: 1133, silver: 33.8 },
  { date: "2025-03-21", pandora: 1116, silver: 33.3 },
  { date: "2025-03-24", pandora: 1133, silver: 33.3 },
  { date: "2025-03-25", pandora: 1108, silver: 34.0 },
  { date: "2025-03-26", pandora: 1110, silver: 34.0 },
  { date: "2025-03-27", pandora: 1089, silver: 34.9 },
  { date: "2025-03-28", pandora: 1068, silver: 34.6 },
  { date: "2025-03-31", pandora: 1054, silver: 34.5 },
  { date: "2025-04-01", pandora: 1061, silver: 34.2 },
  { date: "2025-04-02", pandora: 1062, silver: 34.5 },
  { date: "2025-04-03", pandora: 949, silver: 31.8 },
  { date: "2025-04-04", pandora: 873, silver: 29.1 },
  { date: "2025-04-07", pandora: 904, silver: 29.5 },
  { date: "2025-04-08", pandora: 921, silver: 29.6 },
  { date: "2025-04-09", pandora: 884, silver: 30.3 },
  { date: "2025-04-10", pandora: 950, silver: 30.7 },
  { date: "2025-04-11", pandora: 932, silver: 31.8 },
  { date: "2025-04-14", pandora: 949, silver: 32.1 },
  { date: "2025-04-15", pandora: 955, silver: 32.2 },
  { date: "2025-04-16", pandora: 921, silver: 32.9 },
  { date: "2025-04-22", pandora: 938, silver: 32.9 },
  { date: "2025-04-23", pandora: 983, silver: 33.5 },
  { date: "2025-04-24", pandora: 959, silver: 33.5 },
  { date: "2025-04-25", pandora: 964, silver: 33.0 },
  { date: "2025-04-28", pandora: 977, silver: 33.0 },
  { date: "2025-04-29", pandora: 977, silver: 33.3 },
  { date: "2025-04-30", pandora: 972, silver: 32.5 },
  { date: "2025-05-01", pandora: 984, silver: 32.2 },
  { date: "2025-05-02", pandora: 1004, silver: 32.0 },
  { date: "2025-05-05", pandora: 1004, silver: 32.2 },
  { date: "2025-05-06", pandora: 982, silver: 33.1 },
  { date: "2025-05-07", pandora: 999, silver: 32.5 },
  { date: "2025-05-08", pandora: 1006, silver: 32.4 },
  { date: "2025-05-09", pandora: 1032, silver: 32.7 },
  { date: "2025-05-12", pandora: 1112, silver: 32.4 },
  { date: "2025-05-13", pandora: 1136, silver: 32.9 },
  { date: "2025-05-14", pandora: 1155, silver: 32.2 },
  { date: "2025-05-15", pandora: 1156, silver: 32.5 },
  { date: "2025-05-16", pandora: 1197, silver: 32.2 },
  { date: "2025-05-19", pandora: 1211, silver: 32.3 },
  { date: "2025-05-20", pandora: 1212, silver: 33.0 },
  { date: "2025-05-21", pandora: 1212, silver: 33.5 },
  { date: "2025-05-22", pandora: 1192, silver: 33.0 },
  { date: "2025-05-23", pandora: 1186, silver: 33.4 },
  { date: "2025-05-27", pandora: 1218, silver: 33.1 },
  { date: "2025-05-28", pandora: 1196, silver: 33.0 },
  { date: "2025-06-02", pandora: 1178, silver: 34.6 },
  { date: "2025-06-03", pandora: 1200, silver: 34.5 },
  { date: "2025-06-04", pandora: 1220, silver: 34.5 },
  { date: "2025-06-06", pandora: 1186, silver: 36.0 },
  { date: "2025-06-10", pandora: 1184, silver: 36.5 },
  { date: "2025-06-11", pandora: 1194, silver: 36.2 },
  { date: "2025-06-12", pandora: 1178, silver: 36.2 },
  { date: "2025-06-13", pandora: 1149, silver: 36.3 },
  { date: "2025-06-16", pandora: 1200, silver: 36.4 },
  { date: "2025-06-17", pandora: 1172, silver: 37.1 },
  { date: "2025-06-18", pandora: 1174, silver: 36.9 },
  { date: "2025-06-20", pandora: 1168, silver: 36.0 },
  { date: "2025-06-23", pandora: 1106, silver: 36.2 },
  { date: "2025-06-24", pandora: 1135, silver: 35.7 },
  { date: "2025-06-25", pandora: 1103, silver: 36.1 },
  { date: "2025-06-26", pandora: 1082, silver: 36.6 },
  { date: "2025-06-27", pandora: 1111, silver: 36.0 },
  { date: "2025-06-30", pandora: 1112, silver: 35.9 },
  { date: "2025-07-01", pandora: 1108, silver: 36.1 },
  { date: "2025-07-02", pandora: 1106, silver: 36.4 },
  { date: "2025-07-03", pandora: 1104, silver: 36.8 },
  { date: "2025-07-04", pandora: 1086, silver: 36.8 },
  { date: "2025-07-07", pandora: 1064, silver: 36.6 },
  { date: "2025-07-08", pandora: 1066, silver: 36.5 },
  { date: "2025-07-09", pandora: 1076, silver: 36.4 },
  { date: "2025-07-10", pandora: 1070, silver: 37.0 },
  { date: "2025-07-11", pandora: 1054, silver: 38.7 },
  { date: "2025-07-14", pandora: 1039, silver: 38.5 },
  { date: "2025-07-15", pandora: 1020, silver: 37.8 },
  { date: "2025-07-16", pandora: 1037, silver: 37.9 },
  { date: "2025-07-17", pandora: 1046, silver: 38.1 },
  { date: "2025-07-18", pandora: 1050, silver: 38.2 },
  { date: "2025-07-21", pandora: 1037, silver: 39.1 },
  { date: "2025-07-22", pandora: 1039, silver: 39.3 },
  { date: "2025-07-23", pandora: 1050, silver: 39.3 },
  { date: "2025-07-24", pandora: 1064, silver: 39.0 },
  { date: "2025-07-25", pandora: 1057, silver: 38.2 },
  { date: "2025-07-28", pandora: 1076, silver: 38.0 },
  { date: "2025-07-29", pandora: 1069, silver: 38.1 },
  { date: "2025-07-30", pandora: 1075, silver: 37.6 },
  { date: "2025-07-31", pandora: 1086, silver: 36.6 },
  { date: "2025-08-01", pandora: 1074, silver: 36.8 },
  { date: "2025-08-04", pandora: 1084, silver: 37.2 },
  { date: "2025-08-05", pandora: 1073, silver: 37.7 },
  { date: "2025-08-06", pandora: 1036, silver: 37.8 },
  { date: "2025-08-07", pandora: 1038, silver: 38.2 },
  { date: "2025-08-08", pandora: 1032, silver: 38.4 },
  { date: "2025-08-11", pandora: 1029, silver: 37.7 },
  { date: "2025-08-12", pandora: 1014, silver: 37.9 },
  { date: "2025-08-13", pandora: 1037, silver: 38.5 },
  { date: "2025-08-14", pandora: 1035, silver: 38.0 },
  { date: "2025-08-15", pandora: 845, silver: 37.9 },
  { date: "2025-08-18", pandora: 843, silver: 38.0 },
  { date: "2025-08-19", pandora: 875, silver: 37.3 },
  { date: "2025-08-20", pandora: 896, silver: 37.7 },
  { date: "2025-08-21", pandora: 889, silver: 38.0 },
  { date: "2025-08-22", pandora: 912, silver: 39.0 },
  { date: "2025-08-25", pandora: 887, silver: 38.7 },
  { date: "2025-08-26", pandora: 900, silver: 38.6 },
  { date: "2025-08-27", pandora: 900, silver: 38.7 },
  { date: "2025-08-28", pandora: 899, silver: 39.2 },
  { date: "2025-08-29", pandora: 881, silver: 40.2 },
  { date: "2025-09-02", pandora: 841, silver: 41.1 },
  { date: "2025-09-03", pandora: 845, silver: 41.5 },
  { date: "2025-09-04", pandora: 859, silver: 40.9 },
  { date: "2025-09-05", pandora: 860, silver: 41.1 },
  { date: "2025-09-08", pandora: 861, silver: 41.4 },
  { date: "2025-09-09", pandora: 859, silver: 40.9 },
  { date: "2025-09-10", pandora: 860, silver: 41.1 },
  { date: "2025-09-11", pandora: 866, silver: 41.7 },
  { date: "2025-09-12", pandora: 871, silver: 42.4 },
  { date: "2025-09-15", pandora: 871, silver: 42.5 },
  { date: "2025-09-16", pandora: 866, silver: 42.5 },
  { date: "2025-09-17", pandora: 866, silver: 41.7 },
  { date: "2025-09-18", pandora: 885, silver: 41.7 },
  { date: "2025-09-19", pandora: 875, silver: 42.5 },
  { date: "2025-09-22", pandora: 856, silver: 43.8 },
  { date: "2025-09-23", pandora: 854, silver: 44.2 },
  { date: "2025-09-24", pandora: 834, silver: 43.8 },
  { date: "2025-09-25", pandora: 830, silver: 44.7 },
  { date: "2025-09-26", pandora: 837, silver: 46.2 },
  { date: "2025-09-29", pandora: 851, silver: 46.6 },
  { date: "2025-09-30", pandora: 828, silver: 46.3 },
  { date: "2025-10-01", pandora: 842, silver: 47.3 },
  { date: "2025-10-02", pandora: 831, silver: 46.0 },
  { date: "2025-10-03", pandora: 820, silver: 47.6 },
  { date: "2025-10-06", pandora: 825, silver: 48.1 },
  { date: "2025-10-07", pandora: 826, silver: 47.2 },
  { date: "2025-10-08", pandora: 840, silver: 48.7 },
  { date: "2025-10-09", pandora: 826, silver: 46.8 },
  { date: "2025-10-10", pandora: 811, silver: 46.9 },
  { date: "2025-10-13", pandora: 798, silver: 50.1 },
  { date: "2025-10-14", pandora: 796, silver: 50.3 },
  { date: "2025-10-15", pandora: 813, silver: 51.1 },
  { date: "2025-10-16", pandora: 822, silver: 53.0 },
  { date: "2025-10-17", pandora: 824, silver: 49.9 },
  { date: "2025-10-20", pandora: 833, silver: 51.1 },
  { date: "2025-10-21", pandora: 867, silver: 47.5 },
  { date: "2025-10-22", pandora: 865, silver: 47.5 },
  { date: "2025-10-23", pandora: 883, silver: 48.5 },
  { date: "2025-10-24", pandora: 889, silver: 48.4 },
  { date: "2025-10-27", pandora: 890, silver: 46.6 },
  { date: "2025-10-28", pandora: 882, silver: 47.1 },
  { date: "2025-10-29", pandora: 879, silver: 47.7 },
  { date: "2025-10-30", pandora: 871, silver: 48.4 },
  { date: "2025-10-31", pandora: 868, silver: 48.0 },
  { date: "2025-11-03", pandora: 826, silver: 47.9 },
  { date: "2025-11-04", pandora: 812, silver: 47.1 },
  { date: "2025-11-05", pandora: 768, silver: 47.9 },
  { date: "2025-11-06", pandora: 778, silver: 47.8 },
  { date: "2025-11-07", pandora: 770, silver: 48.0 },
  { date: "2025-11-10", pandora: 797, silver: 50.2 },
  { date: "2025-11-11", pandora: 805, silver: 50.6 },
  { date: "2025-11-12", pandora: 800, silver: 53.3 },
  { date: "2025-11-13", pandora: 781, silver: 53.1 },
  { date: "2025-11-14", pandora: 789, silver: 50.6 },
  { date: "2025-11-17", pandora: 762, silver: 50.6 },
  { date: "2025-11-18", pandora: 739, silver: 50.5 },
  { date: "2025-11-19", pandora: 754, silver: 50.8 },
  { date: "2025-11-20", pandora: 746, silver: 50.2 },
  { date: "2025-11-21", pandora: 762, silver: 49.9 },
  { date: "2025-11-24", pandora: 751, silver: 50.3 },
  { date: "2025-11-25", pandora: 761, silver: 50.9 },
  { date: "2025-11-26", pandora: 766, silver: 52.9 },
  { date: "2025-11-28", pandora: 769, silver: 56.4 },
  { date: "2025-12-01", pandora: 769, silver: 58.4 },
  { date: "2025-12-02", pandora: 743, silver: 58.0 },
  { date: "2025-12-03", pandora: 726, silver: 57.9 },
  { date: "2025-12-04", pandora: 736, silver: 56.8 },
  { date: "2025-12-05", pandora: 740, silver: 58.4 },
  { date: "2025-12-08", pandora: 728, silver: 57.8 },
  { date: "2025-12-09", pandora: 722, silver: 60.2 },
  { date: "2025-12-10", pandora: 707, silver: 60.4 },
  { date: "2025-12-11", pandora: 707, silver: 63.9 },
  { date: "2025-12-12", pandora: 699, silver: 61.4 },
  { date: "2025-12-15", pandora: 692, silver: 62.9 },
  { date: "2025-12-16", pandora: 714, silver: 62.7 },
  { date: "2025-12-17", pandora: 694, silver: 66.2 },
  { date: "2025-12-18", pandora: 700, silver: 64.6 },
  { date: "2025-12-19", pandora: 699, silver: 66.8 },
  { date: "2025-12-22", pandora: 702, silver: 67.9 },
  { date: "2025-12-23", pandora: 703, silver: 70.5 },
  { date: "2025-12-29", pandora: 703, silver: 69.9 },
  { date: "2025-12-30", pandora: 708, silver: 77.4 },
  { date: "2026-01-02", pandora: 696, silver: 70.6 },
  { date: "2026-01-05", pandora: 677, silver: 76.2 },
  { date: "2026-01-06", pandora: 681, silver: 80.5 },
  { date: "2026-01-07", pandora: 662, silver: 77.1 },
  { date: "2026-01-08", pandora: 676, silver: 74.7 },
  { date: "2026-01-09", pandora: 588, silver: 78.9 },
  { date: "2026-01-12", pandora: 571, silver: 84.6 },
  { date: "2026-01-13", pandora: 572, silver: 85.9 },
  { date: "2026-01-14", pandora: 556, silver: 90.9 },
  { date: "2026-01-15", pandora: 546, silver: 91.9 },
  { date: "2026-01-16", pandora: 550, silver: 88.1 },
  { date: "2026-01-20", pandora: 516, silver: 94.2 },
  { date: "2026-01-21", pandora: 517, silver: 92.2 },
  { date: "2026-01-22", pandora: 510, silver: 96.0 },
  { date: "2026-01-23", pandora: 505, silver: 100.9 },
  { date: "2026-01-26", pandora: 487, silver: 115.1 },
  { date: "2026-01-27", pandora: 494, silver: 105.5 },
  { date: "2026-01-28", pandora: 487, silver: 113.1 },
  { date: "2026-01-29", pandora: 485, silver: 114.0 },
  { date: "2026-01-30", pandora: 509, silver: 78.3 },
  { date: "2026-02-02", pandora: 556, silver: 76.8 },
  { date: "2026-02-03", pandora: 504, silver: 83.0 },
  { date: "2026-02-04", pandora: 513, silver: 84.2 },
  { date: "2026-02-05", pandora: 541, silver: 76.5 },
  { date: "2026-02-06", pandora: 570, silver: 76.7 },
  { date: "2026-02-09", pandora: 537, silver: 82.1 },
  { date: "2026-02-10", pandora: 556, silver: 80.2 },
  { date: "2026-02-11", pandora: 534, silver: 83.8 },
  { date: "2026-02-12", pandora: 537, silver: 75.5 },
  { date: "2026-02-13", pandora: 540, silver: 77.9 },
  { date: "2026-02-17", pandora: 535, silver: 73.4 },
  { date: "2026-02-18", pandora: 535, silver: 77.5 },
  { date: "2026-02-19", pandora: 526, silver: 77.6 },
  { date: "2026-02-20", pandora: 547, silver: 82.3 },
  { date: "2026-02-23", pandora: 520, silver: 86.5 },
  { date: "2026-02-24", pandora: 526, silver: 87.5 },
  { date: "2026-02-25", pandora: 500, silver: 90.9 },
  { date: "2026-02-26", pandora: 516, silver: 87.0 },
  { date: "2026-02-27", pandora: 500, silver: 92.7 },
  { date: "2026-03-02", pandora: 486, silver: 88.3 },
  { date: "2026-03-03", pandora: 483, silver: 82.9 },
  { date: "2026-03-04", pandora: 486, silver: 82.6 },
  { date: "2026-03-05", pandora: 498, silver: 81.7 },
  { date: "2026-03-06", pandora: 494, silver: 83.8 },
  { date: "2026-03-09", pandora: 486, silver: 84.0 },
  { date: "2026-03-10", pandora: 480, silver: 89.1 },
  { date: "2026-03-11", pandora: 470, silver: 85.1 },
  { date: "2026-03-12", pandora: 445, silver: 84.7 },
  { date: "2026-03-13", pandora: 443, silver: 80.9 },
  { date: "2026-03-16", pandora: 444, silver: 80.3 },
  { date: "2026-03-17", pandora: 435, silver: 79.5 },
  { date: "2026-03-18", pandora: 436, silver: 77.2 },
  { date: "2026-03-19", pandora: 440, silver: 70.9 },
  { date: "2026-03-20", pandora: 441, silver: 69.4 },
  { date: "2026-03-24", pandora: 481, silver: 69.3 },
  { date: "2026-03-25", pandora: 460, silver: 72.4 },
  { date: "2026-03-26", pandora: 467, silver: 67.7 },
  { date: "2026-03-27", pandora: 460, silver: 69.5 },
  { date: "2026-03-30", pandora: 461, silver: 70.3 },
  { date: "2026-03-31", pandora: 454, silver: 74.7 },
  { date: "2026-04-01", pandora: 481, silver: 75.9 },
  { date: "2026-04-07", pandora: 470, silver: 71.8 },
  { date: "2026-04-08", pandora: 471, silver: 75.2 },
  { date: "2026-04-09", pandora: 473, silver: 76.3 },
  { date: "2026-04-10", pandora: 485, silver: 76.3 },
  { date: "2026-04-13", pandora: 480, silver: 75.5 },
  { date: "2026-04-14", pandora: 496, silver: 79.4 },
  { date: "2026-04-15", pandora: 497, silver: 79.5 },
  { date: "2026-04-16", pandora: 514, silver: 78.6 },
  { date: "2026-04-17", pandora: 527, silver: 81.7 },
  { date: "2026-04-20", pandora: 522, silver: 80.0 },
  { date: "2026-04-21", pandora: 524, silver: 76.4 },
  { date: "2026-04-22", pandora: 500, silver: 77.9 },
  { date: "2026-04-23", pandora: 490, silver: 75.5 },
  { date: "2026-04-24", pandora: 487, silver: 76.4 },
  { date: "2026-04-27", pandora: 486, silver: 75.0 },
  { date: "2026-04-28", pandora: 487, silver: 73.2 },
  { date: "2026-04-29", pandora: 489, silver: 71.6 },
  { date: "2026-04-30", pandora: 484, silver: 73.5 },
  { date: "2026-05-01", pandora: 497, silver: 76.0 },
  { date: "2026-05-04", pandora: 500, silver: 73.1 },
  { date: "2026-05-05", pandora: 498, silver: 73.1 },
  { date: "2026-05-06", pandora: 569, silver: 76.8 },
  { date: "2026-05-07", pandora: 541, silver: 79.7 },
  { date: "2026-05-08", pandora: 538, silver: 80.4 },
  { date: "2026-05-11", pandora: 518, silver: 85.5 },
  { date: "2026-05-12", pandora: 511, silver: 85.1 },
  { date: "2026-05-13", pandora: 516, silver: 88.9 },
  { date: "2026-05-18", pandora: 530, silver: 77.1 },
  { date: "2026-05-19", pandora: 540, silver: 74.8 },
  { date: "2026-05-20", pandora: 547, silver: 75.9 },
  { date: "2026-05-21", pandora: 554, silver: 76.4 },
  { date: "2026-05-22", pandora: 556, silver: 75.9 },
];

// Pandora share price + US consumer sentiment (University of Michigan Consumer Sentiment Index)
const SENTIMENT_DATA: SentimentPoint[] = [
  { date: "2024-01-02", pandora: 936, sentiment: 79.0 },
  { date: "2024-01-03", pandora: 922, sentiment: 79.0 },
  { date: "2024-01-04", pandora: 930, sentiment: 79.0 },
  { date: "2024-01-05", pandora: 947, sentiment: 79.0 },
  { date: "2024-01-08", pandora: 980, sentiment: 79.0 },
  { date: "2024-01-09", pandora: 977, sentiment: 79.0 },
  { date: "2024-01-10", pandora: 998, sentiment: 79.0 },
  { date: "2024-01-11", pandora: 986, sentiment: 79.0 },
  { date: "2024-01-12", pandora: 978, sentiment: 79.0 },
  { date: "2024-01-15", pandora: 977, sentiment: 79.0 },
  { date: "2024-01-16", pandora: 987, sentiment: 79.0 },
  { date: "2024-01-17", pandora: 985, sentiment: 79.0 },
  { date: "2024-01-18", pandora: 969, sentiment: 79.0 },
  { date: "2024-01-19", pandora: 959, sentiment: 79.0 },
  { date: "2024-01-22", pandora: 974, sentiment: 79.0 },
  { date: "2024-01-23", pandora: 973, sentiment: 79.0 },
  { date: "2024-01-24", pandora: 989, sentiment: 79.0 },
  { date: "2024-01-25", pandora: 1004, sentiment: 79.0 },
  { date: "2024-01-26", pandora: 992, sentiment: 79.0 },
  { date: "2024-01-29", pandora: 1012, sentiment: 79.0 },
  { date: "2024-01-30", pandora: 1018, sentiment: 79.0 },
  { date: "2024-01-31", pandora: 1009, sentiment: 79.0 },
  { date: "2024-02-01", pandora: 1000, sentiment: 76.9 },
  { date: "2024-02-02", pandora: 1016, sentiment: 76.9 },
  { date: "2024-02-05", pandora: 1016, sentiment: 76.9 },
  { date: "2024-02-06", pandora: 1030, sentiment: 76.9 },
  { date: "2024-02-07", pandora: 1026, sentiment: 76.9 },
  { date: "2024-02-08", pandora: 1078, sentiment: 76.9 },
  { date: "2024-02-09", pandora: 1090, sentiment: 76.9 },
  { date: "2024-02-12", pandora: 1098, sentiment: 76.9 },
  { date: "2024-02-13", pandora: 1088, sentiment: 76.9 },
  { date: "2024-02-14", pandora: 1104, sentiment: 76.9 },
  { date: "2024-02-15", pandora: 1108, sentiment: 76.9 },
  { date: "2024-02-16", pandora: 1134, sentiment: 76.9 },
  { date: "2024-02-19", pandora: 1144, sentiment: 76.9 },
  { date: "2024-02-20", pandora: 1142, sentiment: 76.9 },
  { date: "2024-02-21", pandora: 1133, sentiment: 76.9 },
  { date: "2024-02-22", pandora: 1142, sentiment: 76.9 },
  { date: "2024-02-23", pandora: 1152, sentiment: 76.9 },
  { date: "2024-02-26", pandora: 1152, sentiment: 76.9 },
  { date: "2024-02-27", pandora: 1154, sentiment: 76.9 },
  { date: "2024-02-28", pandora: 1150, sentiment: 76.9 },
  { date: "2024-02-29", pandora: 1113, sentiment: 76.9 },
  { date: "2024-03-01", pandora: 1147, sentiment: 79.4 },
  { date: "2024-03-04", pandora: 1138, sentiment: 79.4 },
  { date: "2024-03-05", pandora: 1126, sentiment: 79.4 },
  { date: "2024-03-06", pandora: 1114, sentiment: 79.4 },
  { date: "2024-03-07", pandora: 1136, sentiment: 79.4 },
  { date: "2024-03-08", pandora: 1158, sentiment: 79.4 },
  { date: "2024-03-11", pandora: 1141, sentiment: 79.4 },
  { date: "2024-03-12", pandora: 1162, sentiment: 79.4 },
  { date: "2024-03-13", pandora: 1163, sentiment: 79.4 },
  { date: "2024-03-14", pandora: 1180, sentiment: 79.4 },
  { date: "2024-03-15", pandora: 1146, sentiment: 79.4 },
  { date: "2024-03-18", pandora: 1142, sentiment: 79.4 },
  { date: "2024-03-19", pandora: 1149, sentiment: 79.4 },
  { date: "2024-03-20", pandora: 1143, sentiment: 79.4 },
  { date: "2024-03-21", pandora: 1164, sentiment: 79.4 },
  { date: "2024-03-22", pandora: 1122, sentiment: 79.4 },
  { date: "2024-03-25", pandora: 1124, sentiment: 79.4 },
  { date: "2024-03-26", pandora: 1140, sentiment: 79.4 },
  { date: "2024-03-27", pandora: 1114, sentiment: 79.4 },
  { date: "2024-04-02", pandora: 1098, sentiment: 77.2 },
  { date: "2024-04-03", pandora: 1110, sentiment: 77.2 },
  { date: "2024-04-04", pandora: 1098, sentiment: 77.2 },
  { date: "2024-04-05", pandora: 1096, sentiment: 77.2 },
  { date: "2024-04-08", pandora: 1090, sentiment: 77.2 },
  { date: "2024-04-09", pandora: 1074, sentiment: 77.2 },
  { date: "2024-04-10", pandora: 1093, sentiment: 77.2 },
  { date: "2024-04-11", pandora: 1097, sentiment: 77.2 },
  { date: "2024-04-12", pandora: 1064, sentiment: 77.2 },
  { date: "2024-04-15", pandora: 1080, sentiment: 77.2 },
  { date: "2024-04-16", pandora: 1067, sentiment: 77.2 },
  { date: "2024-04-17", pandora: 1078, sentiment: 77.2 },
  { date: "2024-04-18", pandora: 1074, sentiment: 77.2 },
  { date: "2024-04-19", pandora: 1082, sentiment: 77.2 },
  { date: "2024-04-22", pandora: 1103, sentiment: 77.2 },
  { date: "2024-04-23", pandora: 1099, sentiment: 77.2 },
  { date: "2024-04-24", pandora: 1095, sentiment: 77.2 },
  { date: "2024-04-25", pandora: 1078, sentiment: 77.2 },
  { date: "2024-04-26", pandora: 1100, sentiment: 77.2 },
  { date: "2024-04-29", pandora: 1086, sentiment: 77.2 },
  { date: "2024-04-30", pandora: 1070, sentiment: 77.2 },
  { date: "2024-05-01", pandora: 1082, sentiment: 69.1 },
  { date: "2024-05-02", pandora: 1150, sentiment: 69.1 },
  { date: "2024-05-03", pandora: 1120, sentiment: 69.1 },
  { date: "2024-05-06", pandora: 1114, sentiment: 69.1 },
  { date: "2024-05-07", pandora: 1112, sentiment: 69.1 },
  { date: "2024-05-08", pandora: 1132, sentiment: 69.1 },
  { date: "2024-05-13", pandora: 1162, sentiment: 69.1 },
  { date: "2024-05-14", pandora: 1130, sentiment: 69.1 },
  { date: "2024-05-15", pandora: 1148, sentiment: 69.1 },
  { date: "2024-05-16", pandora: 1164, sentiment: 69.1 },
  { date: "2024-05-17", pandora: 1170, sentiment: 69.1 },
  { date: "2024-05-21", pandora: 1148, sentiment: 69.1 },
  { date: "2024-05-22", pandora: 1114, sentiment: 69.1 },
  { date: "2024-05-23", pandora: 1140, sentiment: 69.1 },
  { date: "2024-05-24", pandora: 1140, sentiment: 69.1 },
  { date: "2024-05-27", pandora: 1138, sentiment: 69.1 },
  { date: "2024-05-28", pandora: 1114, sentiment: 69.1 },
  { date: "2024-05-29", pandora: 1116, sentiment: 69.1 },
  { date: "2024-05-30", pandora: 1115, sentiment: 69.1 },
  { date: "2024-05-31", pandora: 1124, sentiment: 69.1 },
  { date: "2024-06-03", pandora: 1105, sentiment: 68.2 },
  { date: "2024-06-04", pandora: 1098, sentiment: 68.2 },
  { date: "2024-06-06", pandora: 1094, sentiment: 68.2 },
  { date: "2024-06-07", pandora: 1118, sentiment: 68.2 },
  { date: "2024-06-10", pandora: 1116, sentiment: 68.2 },
  { date: "2024-06-11", pandora: 1092, sentiment: 68.2 },
  { date: "2024-06-12", pandora: 1102, sentiment: 68.2 },
  { date: "2024-06-13", pandora: 1080, sentiment: 68.2 },
  { date: "2024-06-14", pandora: 1052, sentiment: 68.2 },
  { date: "2024-06-17", pandora: 1050, sentiment: 68.2 },
  { date: "2024-06-18", pandora: 1050, sentiment: 68.2 },
  { date: "2024-06-19", pandora: 1053, sentiment: 68.2 },
  { date: "2024-06-20", pandora: 1078, sentiment: 68.2 },
  { date: "2024-06-21", pandora: 1064, sentiment: 68.2 },
  { date: "2024-06-24", pandora: 1067, sentiment: 68.2 },
  { date: "2024-06-25", pandora: 1062, sentiment: 68.2 },
  { date: "2024-06-26", pandora: 1068, sentiment: 68.2 },
  { date: "2024-06-27", pandora: 1057, sentiment: 68.2 },
  { date: "2024-06-28", pandora: 1051, sentiment: 68.2 },
  { date: "2024-07-01", pandora: 1009, sentiment: 66.4 },
  { date: "2024-07-02", pandora: 999, sentiment: 66.4 },
  { date: "2024-07-03", pandora: 997, sentiment: 66.4 },
  { date: "2024-07-04", pandora: 982, sentiment: 66.4 },
  { date: "2024-07-05", pandora: 995, sentiment: 66.4 },
  { date: "2024-07-08", pandora: 1014, sentiment: 66.4 },
  { date: "2024-07-09", pandora: 1020, sentiment: 66.4 },
  { date: "2024-07-10", pandora: 1019, sentiment: 66.4 },
  { date: "2024-07-11", pandora: 1028, sentiment: 66.4 },
  { date: "2024-07-12", pandora: 1058, sentiment: 66.4 },
  { date: "2024-07-15", pandora: 1054, sentiment: 66.4 },
  { date: "2024-07-16", pandora: 1073, sentiment: 66.4 },
  { date: "2024-07-17", pandora: 1060, sentiment: 66.4 },
  { date: "2024-07-18", pandora: 1052, sentiment: 66.4 },
  { date: "2024-07-19", pandora: 1054, sentiment: 66.4 },
  { date: "2024-07-22", pandora: 1076, sentiment: 66.4 },
  { date: "2024-07-23", pandora: 1066, sentiment: 66.4 },
  { date: "2024-07-24", pandora: 1071, sentiment: 66.4 },
  { date: "2024-07-25", pandora: 1051, sentiment: 66.4 },
  { date: "2024-07-26", pandora: 1059, sentiment: 66.4 },
  { date: "2024-07-29", pandora: 1076, sentiment: 66.4 },
  { date: "2024-07-30", pandora: 1088, sentiment: 66.4 },
  { date: "2024-07-31", pandora: 1081, sentiment: 66.4 },
  { date: "2024-08-01", pandora: 1076, sentiment: 67.9 },
  { date: "2024-08-02", pandora: 1011, sentiment: 67.9 },
  { date: "2024-08-05", pandora: 976, sentiment: 67.9 },
  { date: "2024-08-06", pandora: 997, sentiment: 67.9 },
  { date: "2024-08-07", pandora: 1008, sentiment: 67.9 },
  { date: "2024-08-08", pandora: 1014, sentiment: 67.9 },
  { date: "2024-08-09", pandora: 1025, sentiment: 67.9 },
  { date: "2024-08-12", pandora: 1041, sentiment: 67.9 },
  { date: "2024-08-13", pandora: 1079, sentiment: 67.9 },
  { date: "2024-08-14", pandora: 1060, sentiment: 67.9 },
  { date: "2024-08-15", pandora: 1062, sentiment: 67.9 },
  { date: "2024-08-16", pandora: 1068, sentiment: 67.9 },
  { date: "2024-08-19", pandora: 1094, sentiment: 67.9 },
  { date: "2024-08-20", pandora: 1114, sentiment: 67.9 },
  { date: "2024-08-21", pandora: 1119, sentiment: 67.9 },
  { date: "2024-08-22", pandora: 1134, sentiment: 67.9 },
  { date: "2024-08-23", pandora: 1144, sentiment: 67.9 },
  { date: "2024-08-26", pandora: 1148, sentiment: 67.9 },
  { date: "2024-08-27", pandora: 1156, sentiment: 67.9 },
  { date: "2024-08-28", pandora: 1159, sentiment: 67.9 },
  { date: "2024-08-29", pandora: 1171, sentiment: 67.9 },
  { date: "2024-08-30", pandora: 1181, sentiment: 67.9 },
  { date: "2024-09-02", pandora: 1174, sentiment: 70.1 },
  { date: "2024-09-03", pandora: 1179, sentiment: 70.1 },
  { date: "2024-09-04", pandora: 1173, sentiment: 70.1 },
  { date: "2024-09-05", pandora: 1158, sentiment: 70.1 },
  { date: "2024-09-06", pandora: 1146, sentiment: 70.1 },
  { date: "2024-09-09", pandora: 1153, sentiment: 70.1 },
  { date: "2024-09-10", pandora: 1138, sentiment: 70.1 },
  { date: "2024-09-11", pandora: 1158, sentiment: 70.1 },
  { date: "2024-09-12", pandora: 1184, sentiment: 70.1 },
  { date: "2024-09-13", pandora: 1204, sentiment: 70.1 },
  { date: "2024-09-16", pandora: 1190, sentiment: 70.1 },
  { date: "2024-09-17", pandora: 1166, sentiment: 70.1 },
  { date: "2024-09-18", pandora: 1146, sentiment: 70.1 },
  { date: "2024-09-19", pandora: 1174, sentiment: 70.1 },
  { date: "2024-09-20", pandora: 1146, sentiment: 70.1 },
  { date: "2024-09-23", pandora: 1144, sentiment: 70.1 },
  { date: "2024-09-24", pandora: 1162, sentiment: 70.1 },
  { date: "2024-09-25", pandora: 1119, sentiment: 70.1 },
  { date: "2024-09-26", pandora: 1104, sentiment: 70.1 },
  { date: "2024-09-27", pandora: 1100, sentiment: 70.1 },
  { date: "2024-09-30", pandora: 1102, sentiment: 70.1 },
  { date: "2024-10-01", pandora: 1068, sentiment: 70.5 },
  { date: "2024-10-02", pandora: 1064, sentiment: 70.5 },
  { date: "2024-10-03", pandora: 1050, sentiment: 70.5 },
  { date: "2024-10-04", pandora: 1055, sentiment: 70.5 },
  { date: "2024-10-07", pandora: 1044, sentiment: 70.5 },
  { date: "2024-10-08", pandora: 1067, sentiment: 70.5 },
  { date: "2024-10-09", pandora: 1060, sentiment: 70.5 },
  { date: "2024-10-10", pandora: 1071, sentiment: 70.5 },
  { date: "2024-10-11", pandora: 1078, sentiment: 70.5 },
  { date: "2024-10-14", pandora: 1064, sentiment: 70.5 },
  { date: "2024-10-15", pandora: 1063, sentiment: 70.5 },
  { date: "2024-10-16", pandora: 1063, sentiment: 70.5 },
  { date: "2024-10-17", pandora: 1082, sentiment: 70.5 },
  { date: "2024-10-18", pandora: 1074, sentiment: 70.5 },
  { date: "2024-10-21", pandora: 1050, sentiment: 70.5 },
  { date: "2024-10-22", pandora: 1030, sentiment: 70.5 },
  { date: "2024-10-23", pandora: 1024, sentiment: 70.5 },
  { date: "2024-10-24", pandora: 1048, sentiment: 70.5 },
  { date: "2024-10-25", pandora: 1040, sentiment: 70.5 },
  { date: "2024-10-28", pandora: 1048, sentiment: 70.5 },
  { date: "2024-10-29", pandora: 1067, sentiment: 70.5 },
  { date: "2024-10-30", pandora: 1056, sentiment: 70.5 },
  { date: "2024-10-31", pandora: 1034, sentiment: 70.5 },
  { date: "2024-11-01", pandora: 1060, sentiment: 71.8 },
  { date: "2024-11-04", pandora: 1061, sentiment: 71.8 },
  { date: "2024-11-05", pandora: 1060, sentiment: 71.8 },
  { date: "2024-11-06", pandora: 1042, sentiment: 71.8 },
  { date: "2024-11-07", pandora: 1054, sentiment: 71.8 },
  { date: "2024-11-08", pandora: 1064, sentiment: 71.8 },
  { date: "2024-11-11", pandora: 1076, sentiment: 71.8 },
  { date: "2024-11-12", pandora: 1094, sentiment: 71.8 },
  { date: "2024-11-13", pandora: 1092, sentiment: 71.8 },
  { date: "2024-11-14", pandora: 1097, sentiment: 71.8 },
  { date: "2024-11-15", pandora: 1085, sentiment: 71.8 },
  { date: "2024-11-18", pandora: 1095, sentiment: 71.8 },
  { date: "2024-11-19", pandora: 1068, sentiment: 71.8 },
  { date: "2024-11-20", pandora: 1080, sentiment: 71.8 },
  { date: "2024-11-21", pandora: 1086, sentiment: 71.8 },
  { date: "2024-11-22", pandora: 1120, sentiment: 71.8 },
  { date: "2024-11-25", pandora: 1124, sentiment: 71.8 },
  { date: "2024-11-26", pandora: 1117, sentiment: 71.8 },
  { date: "2024-11-27", pandora: 1108, sentiment: 71.8 },
  { date: "2024-11-28", pandora: 1118, sentiment: 71.8 },
  { date: "2024-11-29", pandora: 1136, sentiment: 71.8 },
  { date: "2024-12-02", pandora: 1164, sentiment: 74.0 },
  { date: "2024-12-03", pandora: 1186, sentiment: 74.0 },
  { date: "2024-12-04", pandora: 1188, sentiment: 74.0 },
  { date: "2024-12-05", pandora: 1178, sentiment: 74.0 },
  { date: "2024-12-06", pandora: 1215, sentiment: 74.0 },
  { date: "2024-12-09", pandora: 1257, sentiment: 74.0 },
  { date: "2024-12-10", pandora: 1262, sentiment: 74.0 },
  { date: "2024-12-11", pandora: 1276, sentiment: 74.0 },
  { date: "2024-12-12", pandora: 1266, sentiment: 74.0 },
  { date: "2024-12-13", pandora: 1275, sentiment: 74.0 },
  { date: "2024-12-16", pandora: 1280, sentiment: 74.0 },
  { date: "2024-12-17", pandora: 1258, sentiment: 74.0 },
  { date: "2024-12-18", pandora: 1271, sentiment: 74.0 },
  { date: "2024-12-19", pandora: 1264, sentiment: 74.0 },
  { date: "2024-12-20", pandora: 1274, sentiment: 74.0 },
  { date: "2024-12-23", pandora: 1294, sentiment: 74.0 },
  { date: "2024-12-27", pandora: 1328, sentiment: 74.0 },
  { date: "2024-12-30", pandora: 1317, sentiment: 74.0 },
  { date: "2025-01-02", pandora: 1320, sentiment: 71.7 },
  { date: "2025-01-03", pandora: 1318, sentiment: 71.7 },
  { date: "2025-01-06", pandora: 1314, sentiment: 71.7 },
  { date: "2025-01-07", pandora: 1305, sentiment: 71.7 },
  { date: "2025-01-08", pandora: 1311, sentiment: 71.7 },
  { date: "2025-01-09", pandora: 1320, sentiment: 71.7 },
  { date: "2025-01-10", pandora: 1332, sentiment: 71.7 },
  { date: "2025-01-13", pandora: 1270, sentiment: 71.7 },
  { date: "2025-01-14", pandora: 1241, sentiment: 71.7 },
  { date: "2025-01-15", pandora: 1250, sentiment: 71.7 },
  { date: "2025-01-16", pandora: 1268, sentiment: 71.7 },
  { date: "2025-01-17", pandora: 1282, sentiment: 71.7 },
  { date: "2025-01-20", pandora: 1280, sentiment: 71.7 },
  { date: "2025-01-21", pandora: 1304, sentiment: 71.7 },
  { date: "2025-01-22", pandora: 1321, sentiment: 71.7 },
  { date: "2025-01-23", pandora: 1342, sentiment: 71.7 },
  { date: "2025-01-24", pandora: 1329, sentiment: 71.7 },
  { date: "2025-01-27", pandora: 1362, sentiment: 71.7 },
  { date: "2025-01-28", pandora: 1354, sentiment: 71.7 },
  { date: "2025-01-29", pandora: 1378, sentiment: 71.7 },
  { date: "2025-01-30", pandora: 1400, sentiment: 71.7 },
  { date: "2025-01-31", pandora: 1380, sentiment: 71.7 },
  { date: "2025-02-03", pandora: 1380, sentiment: 64.7 },
  { date: "2025-02-04", pandora: 1374, sentiment: 64.7 },
  { date: "2025-02-05", pandora: 1342, sentiment: 64.7 },
  { date: "2025-02-06", pandora: 1347, sentiment: 64.7 },
  { date: "2025-02-07", pandora: 1320, sentiment: 64.7 },
  { date: "2025-02-10", pandora: 1332, sentiment: 64.7 },
  { date: "2025-02-11", pandora: 1322, sentiment: 64.7 },
  { date: "2025-02-12", pandora: 1328, sentiment: 64.7 },
  { date: "2025-02-13", pandora: 1320, sentiment: 64.7 },
  { date: "2025-02-14", pandora: 1261, sentiment: 64.7 },
  { date: "2025-02-17", pandora: 1258, sentiment: 64.7 },
  { date: "2025-02-18", pandora: 1256, sentiment: 64.7 },
  { date: "2025-02-19", pandora: 1247, sentiment: 64.7 },
  { date: "2025-02-20", pandora: 1240, sentiment: 64.7 },
  { date: "2025-02-21", pandora: 1278, sentiment: 64.7 },
  { date: "2025-02-24", pandora: 1242, sentiment: 64.7 },
  { date: "2025-02-25", pandora: 1264, sentiment: 64.7 },
  { date: "2025-02-26", pandora: 1268, sentiment: 64.7 },
  { date: "2025-02-27", pandora: 1240, sentiment: 64.7 },
  { date: "2025-02-28", pandora: 1268, sentiment: 64.7 },
  { date: "2025-03-03", pandora: 1244, sentiment: 57.0 },
  { date: "2025-03-04", pandora: 1214, sentiment: 57.0 },
  { date: "2025-03-05", pandora: 1198, sentiment: 57.0 },
  { date: "2025-03-06", pandora: 1168, sentiment: 57.0 },
  { date: "2025-03-07", pandora: 1162, sentiment: 57.0 },
  { date: "2025-03-10", pandora: 1148, sentiment: 57.0 },
  { date: "2025-03-11", pandora: 1126, sentiment: 57.0 },
  { date: "2025-03-12", pandora: 1128, sentiment: 57.0 },
  { date: "2025-03-13", pandora: 1111, sentiment: 57.0 },
  { date: "2025-03-14", pandora: 1104, sentiment: 57.0 },
  { date: "2025-03-17", pandora: 1104, sentiment: 57.0 },
  { date: "2025-03-18", pandora: 1075, sentiment: 57.0 },
  { date: "2025-03-19", pandora: 1118, sentiment: 57.0 },
  { date: "2025-03-20", pandora: 1133, sentiment: 57.0 },
  { date: "2025-03-21", pandora: 1116, sentiment: 57.0 },
  { date: "2025-03-24", pandora: 1133, sentiment: 57.0 },
  { date: "2025-03-25", pandora: 1108, sentiment: 57.0 },
  { date: "2025-03-26", pandora: 1110, sentiment: 57.0 },
  { date: "2025-03-27", pandora: 1089, sentiment: 57.0 },
  { date: "2025-03-28", pandora: 1068, sentiment: 57.0 },
  { date: "2025-03-31", pandora: 1054, sentiment: 57.0 },
  { date: "2025-04-01", pandora: 1061, sentiment: 52.2 },
  { date: "2025-04-02", pandora: 1062, sentiment: 52.2 },
  { date: "2025-04-03", pandora: 949, sentiment: 52.2 },
  { date: "2025-04-04", pandora: 873, sentiment: 52.2 },
  { date: "2025-04-07", pandora: 904, sentiment: 52.2 },
  { date: "2025-04-08", pandora: 921, sentiment: 52.2 },
  { date: "2025-04-09", pandora: 884, sentiment: 52.2 },
  { date: "2025-04-10", pandora: 950, sentiment: 52.2 },
  { date: "2025-04-11", pandora: 932, sentiment: 52.2 },
  { date: "2025-04-14", pandora: 949, sentiment: 52.2 },
  { date: "2025-04-15", pandora: 955, sentiment: 52.2 },
  { date: "2025-04-16", pandora: 921, sentiment: 52.2 },
  { date: "2025-04-22", pandora: 938, sentiment: 52.2 },
  { date: "2025-04-23", pandora: 983, sentiment: 52.2 },
  { date: "2025-04-24", pandora: 959, sentiment: 52.2 },
  { date: "2025-04-25", pandora: 964, sentiment: 52.2 },
  { date: "2025-04-28", pandora: 977, sentiment: 52.2 },
  { date: "2025-04-29", pandora: 977, sentiment: 52.2 },
  { date: "2025-04-30", pandora: 972, sentiment: 52.2 },
  { date: "2025-05-01", pandora: 984, sentiment: 52.2 },
  { date: "2025-05-02", pandora: 1004, sentiment: 52.2 },
  { date: "2025-05-05", pandora: 1004, sentiment: 52.2 },
  { date: "2025-05-06", pandora: 982, sentiment: 52.2 },
  { date: "2025-05-07", pandora: 999, sentiment: 52.2 },
  { date: "2025-05-08", pandora: 1006, sentiment: 52.2 },
  { date: "2025-05-09", pandora: 1032, sentiment: 52.2 },
  { date: "2025-05-12", pandora: 1112, sentiment: 52.2 },
  { date: "2025-05-13", pandora: 1136, sentiment: 52.2 },
  { date: "2025-05-14", pandora: 1155, sentiment: 52.2 },
  { date: "2025-05-15", pandora: 1156, sentiment: 52.2 },
  { date: "2025-05-16", pandora: 1197, sentiment: 52.2 },
  { date: "2025-05-19", pandora: 1211, sentiment: 52.2 },
  { date: "2025-05-20", pandora: 1212, sentiment: 52.2 },
  { date: "2025-05-21", pandora: 1212, sentiment: 52.2 },
  { date: "2025-05-22", pandora: 1192, sentiment: 52.2 },
  { date: "2025-05-23", pandora: 1186, sentiment: 52.2 },
  { date: "2025-05-26", pandora: 1202, sentiment: 52.2 },
  { date: "2025-05-27", pandora: 1218, sentiment: 52.2 },
  { date: "2025-05-28", pandora: 1196, sentiment: 52.2 },
  { date: "2025-06-02", pandora: 1178, sentiment: 60.7 },
  { date: "2025-06-03", pandora: 1200, sentiment: 60.7 },
  { date: "2025-06-04", pandora: 1220, sentiment: 60.7 },
  { date: "2025-06-06", pandora: 1186, sentiment: 60.7 },
  { date: "2025-06-10", pandora: 1184, sentiment: 60.7 },
  { date: "2025-06-11", pandora: 1194, sentiment: 60.7 },
  { date: "2025-06-12", pandora: 1178, sentiment: 60.7 },
  { date: "2025-06-13", pandora: 1149, sentiment: 60.7 },
  { date: "2025-06-16", pandora: 1200, sentiment: 60.7 },
  { date: "2025-06-17", pandora: 1172, sentiment: 60.7 },
  { date: "2025-06-18", pandora: 1174, sentiment: 60.7 },
  { date: "2025-06-19", pandora: 1152, sentiment: 60.7 },
  { date: "2025-06-20", pandora: 1168, sentiment: 60.7 },
  { date: "2025-06-23", pandora: 1106, sentiment: 60.7 },
  { date: "2025-06-24", pandora: 1135, sentiment: 60.7 },
  { date: "2025-06-25", pandora: 1103, sentiment: 60.7 },
  { date: "2025-06-26", pandora: 1082, sentiment: 60.7 },
  { date: "2025-06-27", pandora: 1111, sentiment: 60.7 },
  { date: "2025-06-30", pandora: 1112, sentiment: 60.7 },
  { date: "2025-07-01", pandora: 1108, sentiment: 61.7 },
  { date: "2025-07-02", pandora: 1106, sentiment: 61.7 },
  { date: "2025-07-03", pandora: 1104, sentiment: 61.7 },
  { date: "2025-07-04", pandora: 1086, sentiment: 61.7 },
  { date: "2025-07-07", pandora: 1064, sentiment: 61.7 },
  { date: "2025-07-08", pandora: 1066, sentiment: 61.7 },
  { date: "2025-07-09", pandora: 1076, sentiment: 61.7 },
  { date: "2025-07-10", pandora: 1070, sentiment: 61.7 },
  { date: "2025-07-11", pandora: 1054, sentiment: 61.7 },
  { date: "2025-07-14", pandora: 1039, sentiment: 61.7 },
  { date: "2025-07-15", pandora: 1020, sentiment: 61.7 },
  { date: "2025-07-16", pandora: 1037, sentiment: 61.7 },
  { date: "2025-07-17", pandora: 1046, sentiment: 61.7 },
  { date: "2025-07-18", pandora: 1050, sentiment: 61.7 },
  { date: "2025-07-21", pandora: 1037, sentiment: 61.7 },
  { date: "2025-07-22", pandora: 1039, sentiment: 61.7 },
  { date: "2025-07-23", pandora: 1050, sentiment: 61.7 },
  { date: "2025-07-24", pandora: 1064, sentiment: 61.7 },
  { date: "2025-07-25", pandora: 1057, sentiment: 61.7 },
  { date: "2025-07-28", pandora: 1076, sentiment: 61.7 },
  { date: "2025-07-29", pandora: 1069, sentiment: 61.7 },
  { date: "2025-07-30", pandora: 1075, sentiment: 61.7 },
  { date: "2025-07-31", pandora: 1086, sentiment: 61.7 },
  { date: "2025-08-01", pandora: 1074, sentiment: 58.2 },
  { date: "2025-08-04", pandora: 1084, sentiment: 58.2 },
  { date: "2025-08-05", pandora: 1073, sentiment: 58.2 },
  { date: "2025-08-06", pandora: 1036, sentiment: 58.2 },
  { date: "2025-08-07", pandora: 1038, sentiment: 58.2 },
  { date: "2025-08-08", pandora: 1032, sentiment: 58.2 },
  { date: "2025-08-11", pandora: 1029, sentiment: 58.2 },
  { date: "2025-08-12", pandora: 1014, sentiment: 58.2 },
  { date: "2025-08-13", pandora: 1037, sentiment: 58.2 },
  { date: "2025-08-14", pandora: 1035, sentiment: 58.2 },
  { date: "2025-08-15", pandora: 845, sentiment: 58.2 },
  { date: "2025-08-18", pandora: 843, sentiment: 58.2 },
  { date: "2025-08-19", pandora: 875, sentiment: 58.2 },
  { date: "2025-08-20", pandora: 896, sentiment: 58.2 },
  { date: "2025-08-21", pandora: 889, sentiment: 58.2 },
  { date: "2025-08-22", pandora: 912, sentiment: 58.2 },
  { date: "2025-08-25", pandora: 887, sentiment: 58.2 },
  { date: "2025-08-26", pandora: 900, sentiment: 58.2 },
  { date: "2025-08-27", pandora: 900, sentiment: 58.2 },
  { date: "2025-08-28", pandora: 899, sentiment: 58.2 },
  { date: "2025-08-29", pandora: 881, sentiment: 58.2 },
  { date: "2025-09-01", pandora: 862, sentiment: 55.1 },
  { date: "2025-09-02", pandora: 841, sentiment: 55.1 },
  { date: "2025-09-03", pandora: 845, sentiment: 55.1 },
  { date: "2025-09-04", pandora: 859, sentiment: 55.1 },
  { date: "2025-09-05", pandora: 860, sentiment: 55.1 },
  { date: "2025-09-08", pandora: 861, sentiment: 55.1 },
  { date: "2025-09-09", pandora: 859, sentiment: 55.1 },
  { date: "2025-09-10", pandora: 860, sentiment: 55.1 },
  { date: "2025-09-11", pandora: 866, sentiment: 55.1 },
  { date: "2025-09-12", pandora: 871, sentiment: 55.1 },
  { date: "2025-09-15", pandora: 871, sentiment: 55.1 },
  { date: "2025-09-16", pandora: 866, sentiment: 55.1 },
  { date: "2025-09-17", pandora: 866, sentiment: 55.1 },
  { date: "2025-09-18", pandora: 885, sentiment: 55.1 },
  { date: "2025-09-19", pandora: 875, sentiment: 55.1 },
  { date: "2025-09-22", pandora: 856, sentiment: 55.1 },
  { date: "2025-09-23", pandora: 854, sentiment: 55.1 },
  { date: "2025-09-24", pandora: 834, sentiment: 55.1 },
  { date: "2025-09-25", pandora: 830, sentiment: 55.1 },
  { date: "2025-09-26", pandora: 837, sentiment: 55.1 },
  { date: "2025-09-29", pandora: 851, sentiment: 55.1 },
  { date: "2025-09-30", pandora: 828, sentiment: 55.1 },
  { date: "2025-10-01", pandora: 842, sentiment: 53.6 },
  { date: "2025-10-02", pandora: 831, sentiment: 53.6 },
  { date: "2025-10-03", pandora: 820, sentiment: 53.6 },
  { date: "2025-10-06", pandora: 825, sentiment: 53.6 },
  { date: "2025-10-07", pandora: 826, sentiment: 53.6 },
  { date: "2025-10-08", pandora: 840, sentiment: 53.6 },
  { date: "2025-10-09", pandora: 826, sentiment: 53.6 },
  { date: "2025-10-10", pandora: 811, sentiment: 53.6 },
  { date: "2025-10-13", pandora: 798, sentiment: 53.6 },
  { date: "2025-10-14", pandora: 796, sentiment: 53.6 },
  { date: "2025-10-15", pandora: 813, sentiment: 53.6 },
  { date: "2025-10-16", pandora: 822, sentiment: 53.6 },
  { date: "2025-10-17", pandora: 824, sentiment: 53.6 },
  { date: "2025-10-20", pandora: 833, sentiment: 53.6 },
  { date: "2025-10-21", pandora: 867, sentiment: 53.6 },
  { date: "2025-10-22", pandora: 865, sentiment: 53.6 },
  { date: "2025-10-23", pandora: 883, sentiment: 53.6 },
  { date: "2025-10-24", pandora: 889, sentiment: 53.6 },
  { date: "2025-10-27", pandora: 890, sentiment: 53.6 },
  { date: "2025-10-28", pandora: 882, sentiment: 53.6 },
  { date: "2025-10-29", pandora: 879, sentiment: 53.6 },
  { date: "2025-10-30", pandora: 871, sentiment: 53.6 },
  { date: "2025-10-31", pandora: 868, sentiment: 53.6 },
  { date: "2025-11-03", pandora: 826, sentiment: 51.0 },
  { date: "2025-11-04", pandora: 812, sentiment: 51.0 },
  { date: "2025-11-05", pandora: 768, sentiment: 51.0 },
  { date: "2025-11-06", pandora: 778, sentiment: 51.0 },
  { date: "2025-11-07", pandora: 770, sentiment: 51.0 },
  { date: "2025-11-10", pandora: 797, sentiment: 51.0 },
  { date: "2025-11-11", pandora: 805, sentiment: 51.0 },
  { date: "2025-11-12", pandora: 800, sentiment: 51.0 },
  { date: "2025-11-13", pandora: 781, sentiment: 51.0 },
  { date: "2025-11-14", pandora: 789, sentiment: 51.0 },
  { date: "2025-11-17", pandora: 762, sentiment: 51.0 },
  { date: "2025-11-18", pandora: 739, sentiment: 51.0 },
  { date: "2025-11-19", pandora: 754, sentiment: 51.0 },
  { date: "2025-11-20", pandora: 746, sentiment: 51.0 },
  { date: "2025-11-21", pandora: 762, sentiment: 51.0 },
  { date: "2025-11-24", pandora: 751, sentiment: 51.0 },
  { date: "2025-11-25", pandora: 761, sentiment: 51.0 },
  { date: "2025-11-26", pandora: 766, sentiment: 51.0 },
  { date: "2025-11-27", pandora: 770, sentiment: 51.0 },
  { date: "2025-11-28", pandora: 769, sentiment: 51.0 },
  { date: "2025-12-01", pandora: 769, sentiment: 52.9 },
  { date: "2025-12-02", pandora: 743, sentiment: 52.9 },
  { date: "2025-12-03", pandora: 726, sentiment: 52.9 },
  { date: "2025-12-04", pandora: 736, sentiment: 52.9 },
  { date: "2025-12-05", pandora: 740, sentiment: 52.9 },
  { date: "2025-12-08", pandora: 728, sentiment: 52.9 },
  { date: "2025-12-09", pandora: 722, sentiment: 52.9 },
  { date: "2025-12-10", pandora: 707, sentiment: 52.9 },
  { date: "2025-12-11", pandora: 707, sentiment: 52.9 },
  { date: "2025-12-12", pandora: 699, sentiment: 52.9 },
  { date: "2025-12-15", pandora: 692, sentiment: 52.9 },
  { date: "2025-12-16", pandora: 714, sentiment: 52.9 },
  { date: "2025-12-17", pandora: 694, sentiment: 52.9 },
  { date: "2025-12-18", pandora: 700, sentiment: 52.9 },
  { date: "2025-12-19", pandora: 699, sentiment: 52.9 },
  { date: "2025-12-22", pandora: 702, sentiment: 52.9 },
  { date: "2025-12-23", pandora: 703, sentiment: 52.9 },
  { date: "2025-12-29", pandora: 703, sentiment: 52.9 },
  { date: "2025-12-30", pandora: 708, sentiment: 52.9 },
  { date: "2026-01-02", pandora: 696, sentiment: 56.4 },
  { date: "2026-01-05", pandora: 677, sentiment: 56.4 },
  { date: "2026-01-06", pandora: 681, sentiment: 56.4 },
  { date: "2026-01-07", pandora: 662, sentiment: 56.4 },
  { date: "2026-01-08", pandora: 676, sentiment: 56.4 },
  { date: "2026-01-09", pandora: 588, sentiment: 56.4 },
  { date: "2026-01-12", pandora: 571, sentiment: 56.4 },
  { date: "2026-01-13", pandora: 572, sentiment: 56.4 },
  { date: "2026-01-14", pandora: 556, sentiment: 56.4 },
  { date: "2026-01-15", pandora: 546, sentiment: 56.4 },
  { date: "2026-01-16", pandora: 550, sentiment: 56.4 },
  { date: "2026-01-19", pandora: 520, sentiment: 56.4 },
  { date: "2026-01-20", pandora: 516, sentiment: 56.4 },
  { date: "2026-01-21", pandora: 517, sentiment: 56.4 },
  { date: "2026-01-22", pandora: 510, sentiment: 56.4 },
  { date: "2026-01-23", pandora: 505, sentiment: 56.4 },
  { date: "2026-01-26", pandora: 487, sentiment: 56.4 },
  { date: "2026-01-27", pandora: 494, sentiment: 56.4 },
  { date: "2026-01-28", pandora: 487, sentiment: 56.4 },
  { date: "2026-01-29", pandora: 485, sentiment: 56.4 },
  { date: "2026-01-30", pandora: 509, sentiment: 56.4 },
  { date: "2026-02-02", pandora: 556, sentiment: 56.6 },
  { date: "2026-02-03", pandora: 504, sentiment: 56.6 },
  { date: "2026-02-04", pandora: 513, sentiment: 56.6 },
  { date: "2026-02-05", pandora: 541, sentiment: 56.6 },
  { date: "2026-02-06", pandora: 570, sentiment: 56.6 },
  { date: "2026-02-09", pandora: 537, sentiment: 56.6 },
  { date: "2026-02-10", pandora: 556, sentiment: 56.6 },
  { date: "2026-02-11", pandora: 534, sentiment: 56.6 },
  { date: "2026-02-12", pandora: 537, sentiment: 56.6 },
  { date: "2026-02-13", pandora: 540, sentiment: 56.6 },
  { date: "2026-02-16", pandora: 539, sentiment: 56.6 },
  { date: "2026-02-17", pandora: 535, sentiment: 56.6 },
  { date: "2026-02-18", pandora: 535, sentiment: 56.6 },
  { date: "2026-02-19", pandora: 526, sentiment: 56.6 },
  { date: "2026-02-20", pandora: 547, sentiment: 56.6 },
  { date: "2026-02-23", pandora: 520, sentiment: 56.6 },
  { date: "2026-02-24", pandora: 526, sentiment: 56.6 },
  { date: "2026-02-25", pandora: 500, sentiment: 56.6 },
  { date: "2026-02-26", pandora: 516, sentiment: 56.6 },
  { date: "2026-02-27", pandora: 500, sentiment: 56.6 },
  { date: "2026-03-02", pandora: 486, sentiment: 53.3 },
  { date: "2026-03-03", pandora: 483, sentiment: 53.3 },
  { date: "2026-03-04", pandora: 486, sentiment: 53.3 },
  { date: "2026-03-05", pandora: 498, sentiment: 53.3 },
  { date: "2026-03-06", pandora: 494, sentiment: 53.3 },
  { date: "2026-03-09", pandora: 486, sentiment: 53.3 },
  { date: "2026-03-10", pandora: 480, sentiment: 53.3 },
  { date: "2026-03-11", pandora: 470, sentiment: 53.3 },
  { date: "2026-03-12", pandora: 445, sentiment: 53.3 },
  { date: "2026-03-13", pandora: 443, sentiment: 53.3 },
  { date: "2026-03-16", pandora: 444, sentiment: 53.3 },
  { date: "2026-03-17", pandora: 435, sentiment: 53.3 },
  { date: "2026-03-18", pandora: 436, sentiment: 53.3 },
  { date: "2026-03-19", pandora: 440, sentiment: 53.3 },
  { date: "2026-03-20", pandora: 441, sentiment: 53.3 },
  { date: "2026-03-24", pandora: 481, sentiment: 53.3 },
  { date: "2026-03-25", pandora: 460, sentiment: 53.3 },
  { date: "2026-03-26", pandora: 467, sentiment: 53.3 },
  { date: "2026-03-27", pandora: 460, sentiment: 53.3 },
  { date: "2026-03-30", pandora: 461, sentiment: 53.3 },
  { date: "2026-03-31", pandora: 454, sentiment: 53.3 },
  { date: "2026-04-01", pandora: 481, sentiment: 49.8 },
  { date: "2026-04-07", pandora: 470, sentiment: 49.8 },
  { date: "2026-04-08", pandora: 471, sentiment: 49.8 },
  { date: "2026-04-09", pandora: 473, sentiment: 49.8 },
  { date: "2026-04-10", pandora: 485, sentiment: 49.8 },
  { date: "2026-04-13", pandora: 480, sentiment: 49.8 },
  { date: "2026-04-14", pandora: 496, sentiment: 49.8 },
  { date: "2026-04-15", pandora: 497, sentiment: 49.8 },
  { date: "2026-04-16", pandora: 514, sentiment: 49.8 },
  { date: "2026-04-17", pandora: 527, sentiment: 49.8 },
  { date: "2026-04-20", pandora: 522, sentiment: 49.8 },
  { date: "2026-04-21", pandora: 524, sentiment: 49.8 },
  { date: "2026-04-22", pandora: 500, sentiment: 49.8 },
  { date: "2026-04-23", pandora: 490, sentiment: 49.8 },
  { date: "2026-04-24", pandora: 487, sentiment: 49.8 },
  { date: "2026-04-27", pandora: 486, sentiment: 49.8 },
  { date: "2026-04-28", pandora: 487, sentiment: 49.8 },
  { date: "2026-04-29", pandora: 489, sentiment: 49.8 },
  { date: "2026-04-30", pandora: 484, sentiment: 49.8 },
  { date: "2026-05-01", pandora: 497, sentiment: 44.8 },
  { date: "2026-05-04", pandora: 500, sentiment: 44.8 },
  { date: "2026-05-05", pandora: 498, sentiment: 44.8 },
  { date: "2026-05-06", pandora: 569, sentiment: 44.8 },
  { date: "2026-05-07", pandora: 541, sentiment: 44.8 },
  { date: "2026-05-08", pandora: 538, sentiment: 44.8 },
  { date: "2026-05-11", pandora: 518, sentiment: 44.8 },
  { date: "2026-05-12", pandora: 511, sentiment: 44.8 },
  { date: "2026-05-13", pandora: 516, sentiment: 44.8 },
  { date: "2026-05-18", pandora: 530, sentiment: 44.8 },
  { date: "2026-05-19", pandora: 540, sentiment: 44.8 },
  { date: "2026-05-20", pandora: 547, sentiment: 44.8 },
  { date: "2026-05-21", pandora: 554, sentiment: 44.8 },
  { date: "2026-05-22", pandora: 556, sentiment: 44.8 },
];

// Scatter data: Silver price vs. Pandora share price (all months)
const CORRELATION_DATA: CorrelationPoint[] = PRICE_DATA.map((d) => ({
  silver: d.silver,
  pandora: d.pandora,
  label: d.date,
}));

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtShortDate(d: string) {
  const [year, month] = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month) - 1]} '${year.slice(2)}`;
}

function KPI({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 text-center ${highlight ? "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800" : "bg-white dark:bg-[#19191f] border-gray-100 dark:border-gray-800"}`}>
      <p className={`text-lg sm:text-xl font-bold tabular-nums ${highlight ? "text-pink-600 dark:text-pink-400" : "text-gray-900 dark:text-white"}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
      {n}. {title}
    </h2>
  );
}

function AssumptionSlider({ label, value, min, max, step, unit = "$", onChange, hint }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void; hint?: string;
}) {
  const display = unit === "%" ? `${value}%` : `$${value}/oz`;
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
        <span className="text-sm font-bold tabular-nums text-pink-600 dark:text-pink-400">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-pink-500 bg-gray-200 dark:bg-gray-700" />
      <div className="flex justify-between text-[11px] text-gray-400 mt-0.5">
        <span>{unit === "%" ? `${min}%` : `$${min}`}</span>
        <span>{unit === "%" ? `${max}%` : `$${max}`}</span>
      </div>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

// ─── tooltips ───────────────────────────────────────────────────────────────
function PriceSilverTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const pandoraVal = payload.find((p) => p.dataKey === "pandora");
  const silverVal = payload.find((p) => p.dataKey === "silver");
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">{String(label)}</p>
      {pandoraVal && <p className="text-center font-bold text-lg tabular-nums text-[#ec4899]">{Number(pandoraVal.value).toLocaleString("en-US")} DKK</p>}
      {silverVal && <p className="text-center text-gray-500 dark:text-gray-400 tabular-nums">${Number(silverVal.value).toFixed(1)}/oz</p>}
    </div>
  );
}

function SentimentTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const pandoraVal = payload.find((p) => p.dataKey === "pandora");
  const sentVal = payload.find((p) => p.dataKey === "sentiment");
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">{String(label)}</p>
      {pandoraVal && <p className="text-center font-bold text-lg tabular-nums text-[#ec4899]">{Number(pandoraVal.value).toLocaleString("en-US")} DKK</p>}
      {sentVal && <p className="text-center text-[#f59e0b] tabular-nums">Sentiment: {Number(sentVal.value).toFixed(1)}</p>}
    </div>
  );
}

function ScatterTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as CorrelationPoint | undefined;
  if (!data) return null;
  return (
    <div className="rounded-xl shadow-lg px-4 py-3 bg-white/95 dark:bg-[#19191f]/95 backdrop-blur-xs border border-gray-100 dark:border-gray-700 text-sm">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center mb-1">{data.label}</p>
      <p className="text-center tabular-nums text-[#ec4899]">Pandora: {data.pandora.toLocaleString("en-US")} DKK</p>
      <p className="text-center tabular-nums text-gray-500 dark:text-gray-400">Silver: ${data.silver.toFixed(1)}/oz</p>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────
const PandoraSilverAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/pandora/soelv", "pandora_silver_analysis_en");
    fetch(`${HOST}/stats/visit/pandora-silver-analysis/`).catch(() => {});
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

  // Compute simple stats
  const pandoraStart = PRICE_DATA[0].pandora;
  const pandoraEnd = PRICE_DATA[PRICE_DATA.length - 1].pandora;
  const pandoraChange = ((pandoraEnd - pandoraStart) / pandoraStart * 100).toFixed(0);
  const silverStart = PRICE_DATA[0].silver;
  const silverEnd = PRICE_DATA[PRICE_DATA.length - 1].silver;
  const silverChange = ((silverEnd - silverStart) / silverStart * 100).toFixed(0);
  const pandoraATH = 1415; // Intraday ATH 31 January 2025

  // Correlation coefficient
  const n = CORRELATION_DATA.length;
  const sumX = CORRELATION_DATA.reduce((s, d) => s + d.silver, 0);
  const sumY = CORRELATION_DATA.reduce((s, d) => s + d.pandora, 0);
  const sumXY = CORRELATION_DATA.reduce((s, d) => s + d.silver * d.pandora, 0);
  const sumX2 = CORRELATION_DATA.reduce((s, d) => s + d.silver * d.silver, 0);
  const sumY2 = CORRELATION_DATA.reduce((s, d) => s + d.pandora * d.pandora, 0);
  const correlation = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  // ─── interactive model state ────────────────────────────────────────────
  const [silverSpot, setSilverSpot] = useState(76);
  const [hedgedShare, setHedgedShare] = useState(95);
  const [hedgedPrice, setHedgedPrice] = useState(32);

  const MODEL_REVENUE = 32.5;
  const MODEL_SHARES = 74.8;
  const MODEL_TAX = 0.25;
  const MODEL_REF_BLENDED = 33;
  const MODEL_REF_MARGIN = 21.5;
  const MODEL_SENSITIVITY = 0.50;
  const CURRENT_PRICE = 556;

  const blendedPrice = (hedgedShare / 100) * hedgedPrice + (1 - hedgedShare / 100) * silverSpot;
  const marginDeltaPp = (blendedPrice - MODEL_REF_BLENDED) * -MODEL_SENSITIVITY;
  const estEbitMargin = Math.max(5, Math.min(30, MODEL_REF_MARGIN + marginDeltaPp));
  const estEbit = MODEL_REVENUE * (estEbitMargin / 100);
  const estNetIncome = estEbit * (1 - MODEL_TAX);
  const estEps = (estNetIncome * 1000) / MODEL_SHARES;
  const impliedPE = estEps > 0 ? CURRENT_PRICE / estEps : 0;

  const SPOT_SCENARIOS = [30, 40, 50, 60, 76, 90, 100, 120];
  const sensitivityRows = SPOT_SCENARIOS.map((spot) => {
    const bl = (hedgedShare / 100) * hedgedPrice + (1 - hedgedShare / 100) * spot;
    const delta = (bl - MODEL_REF_BLENDED) * -MODEL_SENSITIVITY;
    const margin = Math.max(5, Math.min(30, MODEL_REF_MARGIN + delta));
    const ebit = MODEL_REVENUE * (margin / 100);
    const ni = ebit * (1 - MODEL_TAX);
    const eps = (ni * 1000) / MODEL_SHARES;
    return { spot, blended: bl, margin, eps };
  });

  return (
    <PageTemplate>
      <title>Zirium | Pandora A/S (PNDORA) - The Silver Price Impact</title>
      <meta name="description" content="An analysis of the relationship between the silver price, US consumer sentiment, and Pandora's share price performance. From around DKK 940 in January 2024 to DKK 556 in May 2026, while the silver price more than tripled." />
      <meta property="og:title" content="Pandora and the silver price: How commodities and consumer sentiment are driving the stock" />
      <meta property="og:description" content="An analysis of the relationship between the silver price, US consumer sentiment, and Pandora's share price performance. From around DKK 940 in January 2024 to DKK 556 in May 2026, while the silver price more than tripled." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/pandora/soelv/2026-05-23" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Pandora and the silver price: How commodities and consumer sentiment are driving the stock" />
      <meta name="twitter:description" content="An analysis of the relationship between the silver price, US consumer sentiment, and Pandora's share price performance." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Pandora and the silver price: How commodities and consumer sentiment are driving the stock",
        "description": "An analysis of the relationship between the silver price, US consumer sentiment, and Pandora's share price performance.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-23",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/pandora/soelv/2026-05-23",
        "inLanguage": "en",
        "about": {
          "@type": "Corporation",
          "name": "Pandora A/S",
          "tickerSymbol": "PNDORA",
          "exchange": "Nasdaq Copenhagen",
        },
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
          <span aria-hidden="true">&larr;</span>
          {t("Back")}
        </button>

        {/* Header */}
        <header className="mb-10 mt-4">
          <p className="text-lg text-gray-700 dark:text-gray-200 font-medium mb-4">Analysis by Araz Bayat Makoo (Zirium) - May 23, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Pandora and the silver price: How commodities and consumer sentiment are driving the stock
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Pandora A/S (PNDORA)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            This analysis examines the relationship between the silver price, US consumer
            sentiment (University of Michigan Consumer Sentiment Index), and Pandora's share
            price performance from January 2024 to May 2026 (about 2.5 years). Silver is the
            primary metal in most of Pandora's jewellery, and the US is the company's largest
            single market. The analysis explores how these two factors have shaped the share
            price during this period.
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value={`${pandoraChange}%`} label="Pandora share (Jan '24 - May '26)" highlight />
          <KPI value={`+${silverChange}%`} label="Silver price (Jan '24 - May '26)" />
          <KPI value={correlation.toFixed(2)} label="Correlation (silver vs. share)" />
          <KPI value={`${pandoraATH.toLocaleString("en-US")} DKK`} label="ATH intraday (Jan 31, 2025)" />
        </div>

        {/* 1. Introduction */}
        <section className="mb-12">
          <SectionHeader n={1} title="The big picture" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Pandora A/S is one of the world's largest jewellery brands by units sold. Silver
            is the primary raw material in most of its products and accounts for the bulk of
            the metals Pandora uses. Even though Pandora hedges on a rolling 12-month basis
            (with a 5-10 month lag before purchases hit the income statement), a sustained
            rise in the silver price eventually feeds through to the EBIT margin.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            From January 2024 to May 2026, the silver price has risen from around $23/oz
            to around $76/oz, a gain of more than 200%. Over the same period, the Pandora
            share has fallen from around DKK 940 to around DKK 556, a decline of about 41%.
            There is a strong negative relationship between the two (correlation:
            {correlation.toFixed(2)} based on daily close prices), though correlation does
            not prove causation.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            But silver is not the only factor. The US is Pandora's largest single market with
            about 32% of revenue, and the broader North America region accounted for 36% in
            2025. US consumer sentiment has fallen from 79 in January 2024 to 44.8 in May
            2026, a historically low reading. For a consumer-facing jewellery brand, both
            factors matter.
          </p>
        </section>

        {/* 2. Why silver surged */}
        <section className="mb-12">
          <SectionHeader n={2} title="Why has the silver price risen so much?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The silver price has risen from around $23/oz in January 2024 to over $120/oz intraday in January 2026,
            before falling back and today trading around $76/oz. The rally has been driven by several simultaneous factors:
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed mb-4">
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">1.</span>
              <span><strong>Structural deficit:</strong> The global silver market has run a deficit for five years in a row (2021-2025). For 2021-2024 alone, the cumulative deficit was 678 million ounces, equivalent to about 10 months of global mine production.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">2.</span>
              <span><strong>Industrial demand at record levels:</strong> In 2024, industrial silver demand reached a record 680.5 million ounces. Solar panels alone accounted for about 29% of industrial demand (197.6 million ounces), up from around 13% in 2015. Electric vehicles and AI data centres are also contributing.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">3.</span>
              <span><strong>Supply cannot keep up:</strong> About 72% of all silver is produced as a by-product from lead, zinc, copper, and gold mines (only around 28% comes from primary silver mines). Miners therefore cannot quickly ramp up output, even when the silver price rises.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">4.</span>
              <span><strong>Investor demand:</strong> Silver ETFs saw net inflows of 61.6 million ounces in 2024, a reversal from prior years' outflows (2022: -117.4M oz; 2023: -37.6M oz). Interest rate cuts and geopolitical uncertainty have boosted appetite for precious metals as a safe haven.</span>
            </li>
          </ul>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The combination of record demand, constrained supply, and strong investor interest has fuelled the rally that pushed Pandora's material costs sharply higher.
          </p>
        </section>

        {/* 3. Chart: Pandora vs Silver */}
        <section className="mb-12">
          <SectionHeader n={3} title="Pandora share vs. silver price" />
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Daily close prices. Pink = Pandora (DKK, left axis), grey = silver price (USD/oz, right axis).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Pandora share price vs. silver price from January 2024 to May 2026">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={PRICE_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="pandoraGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="silverGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9ca3af" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="pandora" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[300, 1450]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="silver" orientation="right" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `$${v}`} domain={[15, 120]} tickLine={false} axisLine={false} />
                <Tooltip content={PriceSilverTooltip} cursor={{ stroke: "#ec4899", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="pandora" type="monotone" dataKey="pandora" stroke="#ec4899" strokeWidth={2.5} fill="url(#pandoraGrad)" activeDot={{ r: 5, fill: "#ec4899", stroke: "#fff", strokeWidth: 2 }} />
                <Area yAxisId="silver" type="monotone" dataKey="silver" stroke="#9ca3af" strokeWidth={2} fill="url(#silverGrad)" activeDot={{ r: 4, fill: "#9ca3af", stroke: "#fff", strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#ec4899] inline-block" />Pandora (DKK)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#9ca3af] inline-block" />Silver price (USD/oz)</span>
            </div>
          </div>
        </section>

        {/* 3. Correlation */}
        <section className="mb-12">
          <SectionHeader n={4} title="Correlation: Silver up, Pandora down" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Measured on a daily basis over the past 2.5 years, the silver price and the Pandora
            share show a correlation of {correlation.toFixed(2)}. On a scale from -1 to +1,
            where 0 means "no relationship" and ±1 means "perfect relationship", that is a
            very strong link. The negative sign means the two move in opposite directions:
            When the silver price rises, the Pandora share falls, and vice versa.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            That is a strong relationship, but it would be premature to conclude that one
            <em>causes</em> the other. Two prices can move in parallel for many reasons.
            Several other factors are simultaneously influencing the Pandora share: US
            tariffs on imports from Thailand, currency movements (particularly USD, GBP, and
            TRY against the Danish krone), weaker demand in the US and Europe, and broader
            market risk appetite.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            There is, however, a clear economic explanation. Silver is the main raw material
            in the majority of Pandora's jewellery, so rising silver prices mean rising
            costs. Pandora tries to dampen the impact by <em>hedging</em>, essentially
            locking in the purchase price in advance through agreements with its suppliers
            at a guaranteed price. Specifically, Pandora hedges continuously against its
            production plan for the next 12 months, and there is typically a 5-10 month lag
            from a hedge purchase to when the cost flows through the income statement
            (the jewellery first has to be produced and sold).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Hedging therefore defers the impact of a silver price rise but does not eliminate
            it. When the next year's hedges are set, they lock in the higher market prices,
            and the increase gradually filters through to the income statement. In the first
            quarter of 2026, the combined effect of higher commodity prices, currency
            movements, and tariffs cost Pandora the equivalent of 4.4 percentage points on
            its operating margin (or, in industry parlance, "440 basis points").
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Scatter plot: Silver price vs. Pandora share price">
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">Each dot is a trading day. X-axis = silver price (USD/oz), Y-axis = Pandora (DKK).</p>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid stroke={gridColor} strokeWidth={1} />
                <XAxis type="number" dataKey="silver" name="Silver" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `$${v}`} domain={[20, 120]} label={{ value: "Silver price (USD/oz)", position: "insideBottom", offset: -5, fontSize: 11, fill: tickColor }} />
                <YAxis type="number" dataKey="pandora" name="Pandora" tick={{ fontSize: 10, fill: tickColor }} domain={[300, 1450]} label={{ value: "Pandora (DKK)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: tickColor }} />
                <ZAxis range={[50, 50]} />
                <Tooltip content={ScatterTooltip} />
                <Scatter data={CORRELATION_DATA} fill="#ec4899" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 4. Hedging */}
        <section className="mb-12">
          <SectionHeader n={5} title="Pandora's silver hedging and margin pressure" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Pandora's official policy is to hedge at least 70% of expected silver and gold
            consumption based on a rolling 12-month production plan. From hedge to income
            statement there is typically a 5-10 month lag, because the jewellery first has
            to be produced and sold.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            When the table below shows that, for example, 95-100% of the 2026 income statement
            is hedged, that may look inconsistent with the 70% policy. It is not: the 70%
            target applies to the next 12 months of <em>future purchases</em>, whereas the
            table reflects coverage of the <em>income statement</em>. Because of the 5-10
            month lag between purchase and recognition, most of the current year's purchases
            have already been made and hedged at any given point. As a result, the share of
            the year's income statement that is hedged can exceed the rolling 70% target
            applied to future purchases.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Pandora's silver hedging over time</caption>
              <thead>
                <tr className="bg-pink-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Year</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">% of year's P&amp;L hedged</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Hedged silver price</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">External headwind on EBIT (Y/Y)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">2025 (realised)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~100%</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~$28/oz</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-300 bp (commodities + FX + tariffs)</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">2026 (expected)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">95-100%</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~$32/oz</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-150-200 bp (commodities only)</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Q1 2026 (realised)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-440 bp (commodities + FX + tariffs)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The EBIT margin has fallen from around 25.2% in 2024 to a guidance of 21-22% for
            2026. Price increases have partially offset the pressure from rising commodity
            prices, but the combined effect of silver, tariffs, and currency movements is
            substantial.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Strategic response:</strong> Pandora has announced a strategy to transition
            most of its silver assortment to platinum-plated jewellery (branded EVERSHINE)
            to reduce silver dependency. The first "Design Variations" are planned for
            launch later in 2026, with the goal of transitioning at least 50% of the
            relevant silver assortment by end-2027 and around 80% by end-2028. As of Q1
            2026, the transition has not yet materially changed Pandora's overall material
            mix.
          </p>
        </section>

        {/* 5. Interactive model */}
        <section className="mb-12">
          <SectionHeader n={6} title="Interactive model: Silver price and margin" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            This model estimates how different silver prices affect Pandora's EBIT margin
            and earnings per share (EPS). Adjust the silver spot price to see the effect.
            The model is a simplification and does not account for other factors such as
            currency movements, tariffs, and volume growth.
          </p>
          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-6">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">How the model is calculated</p>
            <ol className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-decimal list-inside">
              <li><strong>Blended silver price</strong> = (hedged share × hedged price) + (unhedged share × spot price)</li>
              <li><strong>Margin change</strong> = (blended price - reference price $33/oz) × -0.50 percentage points per $1/oz</li>
              <li><strong>Estimated EBIT margin</strong> = 21.5% (2026 guidance) + margin change</li>
              <li><strong>EBIT</strong> = revenue DKK 32.5bn × EBIT margin</li>
              <li><strong>Net income</strong> = EBIT × (1 - 25% tax rate)</li>
              <li><strong>EPS</strong> = net income / 74.8 million shares</li>
              <li><strong>Implied P/E</strong> = share price DKK 556 / EPS</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {([
              { label: "Silver falls ($40)", spot: 40 },
              { label: "Status quo ($76)", spot: 76 },
              { label: "Silver rises ($120)", spot: 120 },
            ] as const).map((preset) => (
              <button key={preset.spot} onClick={() => setSilverSpot(preset.spot)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  silverSpot === preset.spot
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white dark:bg-[#19191f] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-pink-300 dark:hover:border-pink-700"
                }`}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-6">
            <AssumptionSlider label="Silver spot price" value={silverSpot} min={20} max={150} step={1}
              onChange={setSilverSpot} hint="Current spot price: ~$76/oz (May 2026)" />
            <AssumptionSlider label="Hedged share" value={hedgedShare} min={50} max={100} step={5} unit="%"
              onChange={setHedgedShare} hint="Share of the year's P&amp;L that is hedged (typically 95-100% per Pandora's reports)" />
            <AssumptionSlider label="Hedged silver price" value={hedgedPrice} min={20} max={80} step={1}
              onChange={setHedgedPrice} hint="2026 P&amp;L is hedged at ~$32/oz" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KPI value={`$${blendedPrice.toFixed(1)}/oz`} label="Blended silver price" />
            <KPI value={`${estEbitMargin.toFixed(1)}%`} label="Estimated EBIT margin"
              highlight={estEbitMargin < MODEL_REF_MARGIN} />
            <KPI value={`${Math.round(estEps)} DKK`} label="Estimated EPS"
              highlight={estEps < 70} />
            <KPI value={impliedPE > 0 && impliedPE < 100 ? `${impliedPE.toFixed(1)}x` : "-"}
              label={`P/E at DKK ${CURRENT_PRICE}`} />
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Sensitivity analysis</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            EPS at different silver prices, given the selected hedged share ({hedgedShare}%) and hedged price (${hedgedPrice}/oz).
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-center">
              <thead>
                <tr className="bg-pink-500 text-white">
                  <th className="px-3 py-2.5 text-xs font-semibold">Spot ($/oz)</th>
                  {sensitivityRows.map((r) => (
                    <th key={r.spot} className={`px-3 py-2.5 text-xs font-semibold ${r.spot === silverSpot ? "bg-pink-600" : ""}`}>${r.spot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">Blended</td>
                  {sensitivityRows.map((r) => (
                    <td key={r.spot} className={`px-3 py-2.5 text-xs tabular-nums ${r.spot === silverSpot ? "font-bold text-pink-600 dark:text-pink-400" : "text-gray-700 dark:text-gray-300"}`}>${r.blended.toFixed(0)}</td>
                  ))}
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">EBIT margin</td>
                  {sensitivityRows.map((r) => (
                    <td key={r.spot} className={`px-3 py-2.5 text-xs tabular-nums ${r.spot === silverSpot ? "font-bold text-pink-600 dark:text-pink-400" : r.margin >= MODEL_REF_MARGIN ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {r.margin.toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">EPS (DKK)</td>
                  {sensitivityRows.map((r) => (
                    <td key={r.spot} className={`px-3 py-2.5 text-xs tabular-nums font-semibold ${r.spot === silverSpot ? "text-pink-600 dark:text-pink-400" : r.eps >= 70 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {Math.round(r.eps)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <strong>Model assumptions:</strong> Revenue: DKK 32.5bn (2025 level).
              Tax rate: ~25% (Pandora's 2026 expectation, up from 24.2% in 2025). Shares: 74.8 million outstanding (after share capital reduction on April 10, 2026). Reference: 21.5% EBIT margin at $33/oz blended (2026 guidance).
              Sensitivity: ~50 bp per $1/oz change in blended silver price (based on Pandora's disclosed commodity headwind).
              The model does not include currency movements, tariffs, volume growth, or other factors.
            </p>
          </div>
        </section>

        {/* 6. Sentiment */}
        <section className="mb-12">
          <SectionHeader n={7} title="US consumer sentiment and Pandora" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The US is Pandora's largest single market and accounted for about 32% of revenue
            in the first nine months of 2025 (Pandora has stopped reporting US-specific
            revenue from Q4 2025 onwards). North America accounted for 36% of full-year
            2025, while EMEA is Pandora's largest region at around 50%. In Q1 2025, the US
            grew +11% like-for-like, but by Q1 2026 North America as a whole had slowed to
            -2% LFL, with global LFL at 0%. The North America slowdown looks like the main
            reason for the flat overall growth, and it coincides with a sharp drop in US
            consumer sentiment.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            US consumer sentiment (University of Michigan Consumer Sentiment Index) fell from
            79.0 in January 2024 to 44.8 in May 2026. It is the lowest reading the index
            has recorded since records began in 1952, below both the 2008-2009 financial
            crisis trough and the previous low of 50.0 in June 2022. The decline accelerated
            from February 2025 and continued through 2025-2026, driven by concerns about
            cost of living, persistently high prices, and tariffs.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Jewellery is a discretionary purchase, the kind consumers typically defer or
            cut back on when the economy tightens. A sharp drop in consumer sentiment
            therefore tends to weigh on demand for non-essential spending. This may help
            explain why Pandora's North America LFL has gone from +6% in FY 2025 (slowing
            to +2% by Q4 2025) to -2% in Q1 2026, though consumer sentiment is unlikely
            to be the only driver.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Pandora share price vs. US consumer sentiment">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={SENTIMENT_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="pandoraGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal vertical={false} stroke={gridColor} strokeWidth={1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={fmtShortDate} interval="preserveStartEnd" />
                <YAxis yAxisId="pandora" orientation="left" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `${v}`} domain={[300, 1450]} tickLine={false} axisLine={false} />
                <YAxis yAxisId="sentiment" orientation="right" tick={{ fontSize: 10, fill: tickColor }} domain={[40, 85]} tickLine={false} axisLine={false} />
                <Tooltip content={SentimentTooltip} cursor={{ stroke: "#ec4899", strokeWidth: 1, strokeOpacity: 0.3 }} />
                <Area yAxisId="pandora" type="monotone" dataKey="pandora" stroke="#ec4899" strokeWidth={2.5} fill="url(#pandoraGrad2)" activeDot={{ r: 5, fill: "#ec4899", stroke: "#fff", strokeWidth: 2 }} />
                <Line yAxisId="sentiment" type="monotone" dataKey="sentiment" stroke="#f59e0b" strokeWidth={2} strokeOpacity={0.8} dot={false} activeDot={{ r: 4, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }} />
                <ReferenceLine yAxisId="sentiment" y={50} stroke={isDark ? "#555" : "#ddd"} strokeDasharray="4 4" label={{ value: "50", fontSize: 9, fill: tickColor, position: "insideTopRight" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 mt-2 px-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#ec4899] inline-block" />Pandora (DKK)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#f59e0b] inline-block" />US consumer sentiment</span>
            </div>
          </div>
        </section>

        {/* 7. Double pressure */}
        <section className="mb-12">
          <SectionHeader n={8} title="Double pressure: Costs and demand" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            What makes Pandora's situation unusual is that the company is being hit from two
            sides at once:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Cost side (silver)</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>The silver price has more than tripled in 29 months</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Hedging defers but does not eliminate the impact</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>EBIT margin guidance lowered from around 24% (2025) to 21-22% (2026)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Higher US tariffs on imports from Thailand are adding to the pressure</li>
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 p-5">
              <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 text-sm uppercase tracking-wide">Demand side (sentiment)</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>US consumer sentiment at 44.8 (lowest reading since 1952)</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>North America LFL has slowed from +6% in FY 2025 to -2% in Q1 2026</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Europe weak: UK -8%, France -7% LFL in Q3 2025</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Organic growth guided at -1% to +2% in 2026 (2025 ended at 6%, 2024 was 13%)</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Pandora is caught between rising costs (silver, currency, tariffs) and weakening
            demand (softer US and European consumer spending). The combination of higher
            input costs and weaker demand may be a key driver behind the share price
            decline.
          </p>
        </section>

        {/* 8. Timeline */}
        <section className="mb-12">
          <SectionHeader n={9} title="Timeline: Key events" />
          <div className="ml-2">
            <TimelineEvent date="January 2024" title="Pandora starts the year at DKK 936" color="#ec4899">
              <p>Silver trades at $23/oz. Pandora is on track to close a strong 2023 (Q4 2023 results, released on February 7, will show 12% organic growth). US consumer sentiment stands at 79.</p>
            </TimelineEvent>
            <TimelineEvent date="August 2024" title="Pandora reaches DKK 1,181" color="#2a9d8f">
              <p>Strong growth in the US (+5% LFL) and a solid Q2 report drive the share up. The silver price remains relatively stable around $29/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="December 2024" title="Pandora rises to DKK 1,317" color="#2a9d8f">
              <p>The Q3 2024 report shows 11% organic growth, marking Pandora's fifth straight quarter of double-digit growth. The share is approaching its all-time high. Silver remains stable around $29-31/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="January 2025" title="All-time high: DKK 1,415 intraday" color="#ec4899">
              <p>Pandora hits its highest share price ever on January 31, 2025. The silver price is $32/oz, and US consumer sentiment has started to decline (71.7).</p>
            </TimelineEvent>
            <TimelineEvent date="February-April 2025" title="Decline begins: Tariffs, silver, and sentiment" color="#e63946">
              <p>The share falls from DKK 1,268 (end of February) to DKK 972 (end of April). US consumer sentiment falls sharply to 52-57. US tariffs on imports from Thailand and China are announced. The silver price rises to $34/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="August-September 2025" title="Silver explodes above $40/oz" color="#e63946">
              <p>Silver surges from $36 to $46/oz. Pandora falls to DKK 828. On September 30, CEO Alexander Lacik announces his retirement, and the board appoints CMO Berta de Pablos-Barbier as his successor, effective from the AGM in March 2026.</p>
            </TimelineEvent>
            <TimelineEvent date="November-December 2025" title="Silver rises to $77/oz, Pandora below DKK 700" color="#e63946">
              <p>Silver accelerates from around $48 in early November to a peak of around $77/oz on December 30. The Pandora share falls to around DKK 700. US consumer sentiment falls to 51-53. In its Q3 2025 report (November 5), Pandora reports 380 bp of margin pressure from commodities, currency, and tariffs in Q3, and lowers its 2026 EBIT margin target from "at least 24%" to "around 23%" on the back of new external headwinds.</p>
            </TimelineEvent>
            <TimelineEvent date="January 2026" title="Silver hits all-time high: ~$122/oz intraday" color="#e63946">
              <p>The Pandora share falls to DKK 485 (intraday low DKK 469 on January 29), its lowest level since 2022. Silver hits an all-time high of around $122/oz intraday on January 29 (daily close around $114/oz), before crashing more than 30% the next day (January 30) to close around $78/oz, and then stabilising around $76/oz through February.</p>
            </TimelineEvent>
            <TimelineEvent date="January 1, 2026" title="Berta de Pablos-Barbier takes over as CEO" color="#4361ee">
              <p>The former CMO officially takes over as CEO on January 1, 2026, about two and a half months earlier than planned. Alexander Lacik continues as Special Advisor until the AGM on March 11. She brings around 30 years of senior experience across LVMH (Moët &amp; Chandon), Mars Wrigley, Lacoste, and Kering-owned Boucheron.</p>
            </TimelineEvent>
            <TimelineEvent date="February-March 2026" title="Annual Report 2025, new guidance, and local low" color="#e63946">
              <p>On February 4, Pandora publishes its Q4 2025 / FY 2025 Annual Report. FY 2025 organic growth ended at 6% (below guidance of 7-8%) and the EBIT margin at 23.9% (below guidance of "around 24%"). 2026 guidance is set at -1% to +2% organic growth and 21-22% EBIT margin, further lowered from the "around 23%" Pandora had signalled in Q3 2025. Pandora also unveils its EVERSHINE platinum-plating strategy, aiming to transition at least 50% of the silver assortment by end-2027 and around 80% by end-2028, in order to reduce silver dependency. The share hits a local low of DKK 435 on March 17, shortly after the dividend ex-date on March 12, when the DKK 22/share dividend was paid.</p>
            </TimelineEvent>
            <TimelineEvent date="May 2026" title="Bottom or bounce?" color="#f59e0b">
              <p>Pandora delivers Q1 2026 with 2% organic growth (0% LFL globally) and 20.9% EBIT margin. The share rises 14% on the day (from DKK 498 to DKK 569). US consumer sentiment falls to 44.8, the lowest level since 1952. The silver price has stabilised around $76/oz. The share trades at DKK 556 with a P/E of 8.3.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* 9. Key numbers */}
        <section className="mb-12">
          <SectionHeader n={10} title="Pandora in numbers" />
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Key figures for Pandora A/S</caption>
              <thead>
                <tr className="bg-pink-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Metric</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Revenue (2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 32.5bn</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">EBIT margin (Q1 2026)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">20.9%</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Share price (May 22, 2026)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 556</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">P/E (trailing)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">8.3</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Market cap</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~DKK 41.6bn</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Dividend</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 22/share (3.96%)</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">US revenue (9M 2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 6.6bn (~32%)</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">North America revenue (FY 2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 11.8bn (36%)</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">EMEA revenue (FY 2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 16.1bn (50%)</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Primary metal in products</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">Sterling silver (majority)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. Bull/Bear */}
        <section className="mb-12">
          <SectionHeader n={11} title="Bull and bear case" />
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Bear case</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Silver up more than 200% since January 2024 (from $23 to $76/oz) and still volatile</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>US consumer sentiment at 44.8 (lowest reading since 1952)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>19% US tariff on Thailand-made imports (Pandora ships its US products from Thailand)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>CEO transition on January 1, 2026: Berta de Pablos-Barbier replaces Alexander Lacik (after nearly 7 years in the role)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Europe weak: UK -8% and France -7% LFL in Q3 2025, EMEA -2% in Q1 2026</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Bull case</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>P/E (trailing 12 months) at 8.3 with share price DKK 556 (TTM EPS around DKK 67 as of Q1 2026)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Dividend of DKK 22/share (3.96% yield at share price DKK 556)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>DKK 4.4bn in share buybacks in 2025; no new 2026 programme announced yet, but Pandora has signalled it will resume buybacks once the platinum-plating transition is further along</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Asia-Pacific grew +12% LFL in Q1 2026</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Q1 2026 gross margin of 79.5%, only 90 bp below Q1 2025 despite 370 bp of external headwinds</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>EVERSHINE platinum-plating strategy could reduce silver dependency over time</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>ROIC of 41% in 2025 (Pandora's own characterisation: "structurally strong")</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 11. Conclusion */}
        <section className="mb-12">
          <SectionHeader n={12} title="Conclusion" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The Pandora share has fallen about 41% from January 2024 to May 2026, while silver
            has more than tripled in the same period. The correlation of
            {correlation.toFixed(2)} signals a strong inverse relationship, but it does not
            tell the whole story.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The silver price drives Pandora's material costs and therefore the EBIT margin.
            Although hedging defers the impact, the rally from $23 to $76/oz has been a
            significant part of the external headwind (totalling 300 bp for full-year 2025
            and 440 bp in Q1 2026, per Pandora's own disclosures) that has pushed Pandora
            to cut its EBIT margin guidance from "around 24%" (2025) to 21-22% (2026).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            On the demand side, US consumer sentiment has fallen to 44.8 in May 2026, the
            lowest reading since the survey began in 1952. The US is Pandora's largest
            single market (about 32% of revenue in 9M 2025), and jewellery is a discretionary
            purchase. Pandora has already seen North America LFL fall from +6% in FY 2025
            (slowing to +2% by Q4 2025) to -2% in Q1 2026.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The central question for investors is whether the current price (DKK 556, P/E 8.3)
            already reflects these challenges, or whether there is more downside. Two
            variables are key to watch: where the silver price stabilises, and when US
            consumer sentiment begins to turn.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">What to watch</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; <strong>Silver spot price:</strong> Pandora's 2026 silver exposure is hedged at ~$32/oz, but the spot level through 2026 will determine where the 2027 hedges are struck (disclosed in upcoming quarterly reports). Pandora states in Q1 2026 that 1,100 bp of external headwind is expected in 2027 if silver spot holds at $82/oz</li>
              <li>&#x2022; <strong>US consumer sentiment:</strong> Pandora itself cites "weak consumer sentiment" as the driver behind North America's weakness (Q4 2025 report); a turning point in the UMich index would remove this specific headwind</li>
              <li>&#x2022; <strong>US tariffs:</strong> The 19% Thailand tariff contributed 210 bp of Q1 2026's total 440 bp external headwind (Pandora Q1 2026); any easing would remove a meaningful chunk</li>
              <li>&#x2022; <strong>2027 hedge level:</strong> Pandora publishes forward hedge prices in each report; the Q1 2026 table shows, for example, Q1 2027 estimated cost-of-sales price of ~$46/oz (which includes new hedges added in April 2026, when silver spot was historically elevated)</li>
              <li>&#x2022; <strong>New CEO Berta de Pablos-Barbier (since January 1, 2026):</strong> Implementation of EVERSHINE and the next strategic cycle to be announced on November 4, 2026 (replacing the current 2024-2026 strategy)</li>
              <li>&#x2022; <strong>EVERSHINE platinum-plating:</strong> Pandora targets transitioning at least 50% of its silver assortment by end-2027 and around 80% by end-2028 (Q1 2026 report)</li>
            </ul>
          </div>
        </section>

        <RelatedAnalyses currentSlug="pandora/soelv/2026-05-23" />

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not constitute
            investment advice. Data is sourced from Yahoo Finance, the University of
            Michigan Surveys of Consumers, Pandora's Q4 2025 Interim Report (February 4, 2026) for FY 2025 figures and the regional breakdown, Pandora's Q3 2025 Interim Report (November 5, 2025) for US-specific revenue (9M 2025), Pandora's Q1 2026 Interim Report, Pandora's CEO succession press release (September 30, 2025), and the Silver Institute (World Silver Survey 2025). Past performance is no guarantee of future returns.
            Always do your own research and seek professional advice before investing.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Copyright Zirium  |  May 23, 2026
          </p>
        </footer>
      </article>
    </PageTemplate>
  );
};

// ─── sub-component ──────────────────────────────────────────────────────────
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

export default PandoraSilverAnalysisPage;
