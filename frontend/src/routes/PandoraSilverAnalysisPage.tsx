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
// Pandora (PNDORA.CO) daglige nominelle lukkekurser i DKK (Yahoo Close, ikke udbyttejusteret)
// + sølvpris (SI=F) USD/oz. Kilder: Yahoo Finance, LBMA.
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

// Pandora aktiekurs + amerikansk forbrugertillid (University of Michigan Consumer Sentiment Index)
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

// Scatter-data: Sølvpris vs. Pandora aktiekurs (alle måneder)
const CORRELATION_DATA: CorrelationPoint[] = PRICE_DATA.map((d) => ({
  silver: d.silver,
  pandora: d.pandora,
  label: d.date,
}));

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtShortDate(d: string) {
  const [year, month] = d.split("-");
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
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
      {pandoraVal && <p className="text-center font-bold text-lg tabular-nums text-[#ec4899]">{Number(pandoraVal.value).toLocaleString("da-DK")} DKK</p>}
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
      {pandoraVal && <p className="text-center font-bold text-lg tabular-nums text-[#ec4899]">{Number(pandoraVal.value).toLocaleString("da-DK")} DKK</p>}
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
      <p className="text-center tabular-nums text-[#ec4899]">Pandora: {data.pandora.toLocaleString("da-DK")} DKK</p>
      <p className="text-center tabular-nums text-gray-500 dark:text-gray-400">Sølv: ${data.silver.toFixed(1)}/oz</p>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────
const PandoraSilverAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/analyse/pandora/soelv", "pandora_silver_analysis");
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
  const pandoraATH = 1415; // Intradag ATH 31. januar 2025

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
      <title>Zirium | Pandora A/S (PNDORA) - Sølvprisens indflydelse</title>
      <meta name="description" content="Analyse af sammenhængen mellem sølvprisen, amerikansk forbrugertillid og Pandora-aktiens kursudvikling. Fra ca. 940 DKK i januar 2024 til 556 DKK i maj 2026, mens sølvprisen mere end tredobledes." />
      <meta property="og:title" content="Pandora og sølvprisen: Hvordan råvarer og forbrugertillid påvirker aktien" />
      <meta property="og:description" content="Analyse af sammenhængen mellem sølvprisen, amerikansk forbrugertillid og Pandora-aktiens kursudvikling. Fra ca. 940 DKK i januar 2024 til 556 DKK i maj 2026, mens sølvprisen mere end tredobledes." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/pandora/soelv/2026-05-23" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Pandora og sølvprisen: Hvordan råvarer og forbrugertillid påvirker aktien" />
      <meta name="twitter:description" content="Analyse af sammenhængen mellem sølvprisen, amerikansk forbrugertillid og Pandora-aktiens kursudvikling." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Pandora og sølvprisen: Hvordan råvarer og forbrugertillid påvirker aktien",
        "description": "Analyse af sammenhængen mellem sølvprisen, amerikansk forbrugertillid og Pandora-aktiens kursudvikling.",
        "author": { "@type": "Person", "name": "Araz Bayat Makoo" },
        "publisher": { "@type": "Organization", "name": "Zirium", "url": "https://www.zirium.dk" },
        "datePublished": "2026-05-23",
        "mainEntityOfPage": "https://www.zirium.dk/analyse/pandora/soelv/2026-05-23",
        "inLanguage": "da",
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
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">Analyse lavet af Araz Bayat Makoo (Zirium) - 23. maj 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Pandora og sølvprisen: Hvordan råvarer og forbrugertillid påvirker aktien
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Pandora A/S (PNDORA)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            Denne analyse undersøger sammenhængen mellem sølvprisen, den amerikanske
            forbrugertillid (University of Michigan Consumer Sentiment Index) og
            Pandora-aktiens kursudvikling fra januar 2024 til maj 2026 (ca. 2,5 år). Sølv
            indgår som hovedmetal i størstedelen af Pandoras smykker, og USA er selskabets største
            enkeltmarked. Analysen ser på, hvordan disse to faktorer har spillet sammen med
            kursudviklingen i perioden.
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value={`${pandoraChange}%`} label="Pandora-aktien (jan '24 - maj '26)" highlight />
          <KPI value={`+${silverChange}%`} label="Sølvpris (jan '24 - maj '26)" />
          <KPI value={correlation.toFixed(2).replace(".", ",")} label="Korrelation (sølv vs. aktie)" />
          <KPI value={`${pandoraATH.toLocaleString("da-DK")} DKK`} label="ATH intradag (31. jan 2025)" />
        </div>

        {/* 1. Introduktion */}
        <section className="mb-12">
          <SectionHeader n={1} title="Overordnet billede" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Pandora A/S er et af verdens største smykkebrands målt på antal solgte
            smykker. Selskabet bruger sølv som primær råvare i størstedelen af sine
            produkter. Sølv udgør hovedparten af Pandoras metalbaserede
            materialeforbrug, og selvom Pandora løbende
            hedger op til ca. 12 måneder frem (med 5-10 måneders forsinkelse
            før det rammer regnskabet), siver stigende sølvpriser i sidste ende
            ind i EBIT-marginen.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            I perioden januar 2024 til maj 2026 er sølvprisen steget fra ca. $23/oz
            til ca. $76/oz, en stigning på over 200%. I samme periode er
            Pandora-aktien faldet fra ca. 940 DKK til ca. 556 DKK, et fald på ca.
            41%. Der observeres en stærk negativ sammenhæng mellem de to
            (korrelation: {correlation.toFixed(2).replace(".", ",")} baseret på daglige lukkekurser),
            om end korrelation ikke beviser kausalitet.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Men sølvprisen er ikke den eneste faktor. USA er Pandoras
            største enkeltmarked med ca. 32% af omsætningen, og hele
            Nordamerika-regionen tegnede sig for 36% i 2025. Den amerikanske
            forbrugertillid er faldet fra 79 i januar 2024 til 44,8 i maj
            2026, et meget lavt niveau historisk set. For en virksomhed der
            sælger smykker til forbrugere, er begge faktorer relevante.
          </p>
        </section>

        {/* 2. Why silver surged */}
        <section className="mb-12">
          <SectionHeader n={2} title="Hvorfor er sølvprisen steget så meget?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Sølvprisen er steget fra ca. $23/oz i januar 2024 til over $120/oz intradag i januar 2026,
            før den er faldet tilbage og i dag handles omkring $76/oz. Stigningen skyldes flere samtidige faktorer:
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed mb-4">
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">1.</span>
              <span><strong>Strukturelt underskud:</strong> Det globale sølvmarked har haft underskud fem år i træk (2021-2025). Alene i 2021-2024 var det samlede underskud 678 mio. ounces, svarende til 10 måneders global mineproduktion.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">2.</span>
              <span><strong>Industriel efterspørgsel på rekordniveau:</strong> I 2024 nåede industriel sølvefterspørgsel et rekordniveau på 680,5 mio. ounces. Solceller alene stod for ca. 29% af den industrielle efterspørgsel (197,6 mio. ounces), op fra ca. 13% i 2015. Elbiler og datacentre til AI bidrager også.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">3.</span>
              <span><strong>Udbuddet kan ikke følge med:</strong> Ca. 72% af alt sølv produceres som biprodukt fra bly-, zink-, kobber- og guldminer (kun ca. 28% kommer fra rene sølvminer). Mineproducenterne kan derfor ikke hurtigt øge produktionen, selv når sølvprisen stiger.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">4.</span>
              <span><strong>Investorefterspørgsel:</strong> Sølv-ETF'er havde nettotilstrømning på 61,6 mio. ounces i 2024, en vending fra tidligere års udstrømning (2022: -117,4 mio oz; 2023: -37,6 mio oz). Rentenedsættelser og geopolitisk usikkerhed har øget interessen for ædelmetaller som sikker havn.</span>
            </li>
          </ul>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Kombinationen af rekordefterspørgsel, begrænset udbud og stærk investorinteresse skabte det rally, der har presset Pandoras materialeomkostninger markant i vejret.
          </p>
        </section>

        {/* 3. Chart: Pandora vs Silver */}
        <section className="mb-12">
          <SectionHeader n={3} title="Pandora-aktien vs. sølvprisen" />
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Daglige lukkekurser. Pink = Pandora (DKK, venstre akse), grå = sølvpris (USD/oz, højre akse).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Pandora aktiekurs vs. sølvpris fra januar 2024 til maj 2026">
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#9ca3af] inline-block" />Sølvpris (USD/oz)</span>
            </div>
          </div>
        </section>

        {/* 3. Correlation */}
        <section className="mb-12">
          <SectionHeader n={4} title="Korrelation: Sølv op, Pandora ned" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Når man måler hvor tæt sølvprisen og Pandora-aktien har fulgt hinanden
            dagligt over de sidste ca. 2,5 år, får man en korrelation på{' '}
            {correlation.toFixed(2).replace(".", ",")}. På en skala fra -1 til +1, hvor
            0 betyder "ingen sammenhæng" og ±1 betyder "perfekt sammenhæng",
            er det meget tæt. Det negative fortegn betyder at
            de to bevæger sig modsat: Når sølvprisen stiger, falder
            Pandora-aktien, og omvendt.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det er en stærk sammenhæng, men man skal være forsigtig med at
            konkludere at det ene <em>forårsager</em> det andet. To kurser kan
            bevæge sig parallelt af andre grunde. Flere ting påvirker også
            Pandora-kursen samtidig: Amerikanske toldsatser på import fra
            Thailand, valutakurssvingninger (især USD, GBP og TRY mod kronen),
            svagere efterspørgsel i USA og Europa, og generel risikovillighed
            på markederne.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Der er dog en oplagt økonomisk forklaring på sammenhængen. Sølv er
            hovedråvaren i størstedelen af Pandoras smykker, så stigende
            sølvpriser betyder stigende omkostninger. Pandora prøver at dæmpe
            effekten ved at <em>hedge</em>, altså låse købsprisen fast i
            forvejen, som en aftale med leverandøren om en garanteret pris.
            Konkret hedger Pandora løbende ud fra deres produktionsplan for de
            næste 12 måneder, og der går typisk 5-10 måneder fra et hedge-køb
            til omkostningen rammer regnskabet (smykkerne skal først
            produceres og sælges).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det betyder at hedging udskyder effekten af en
            sølvprisstigning, men ikke fjerner den. Når de næste års
            prislåse skal sættes, sker det til de højere markedspriser, og
            stigningen siver gradvist ind i regnskabet. I første kvartal 2026
            kostede den samlede effekt af højere råvarepriser, valutakursudsving
            og told Pandora hvad der svarer til 4,4 procentpoint på
            driftsmarginen (i fagsprog: "440 basispunkter").
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Scatterplot: Sølvpris vs. Pandora aktiekurs">
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">Hver prik er en handelsdag. X-aksen = sølvpris (USD/oz), Y-aksen = Pandora (DKK).</p>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid stroke={gridColor} strokeWidth={1} />
                <XAxis type="number" dataKey="silver" name="Sølv" tick={{ fontSize: 10, fill: tickColor }} tickFormatter={(v) => `$${v}`} domain={[20, 120]} label={{ value: "Sølvpris (USD/oz)", position: "insideBottom", offset: -5, fontSize: 11, fill: tickColor }} />
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
          <SectionHeader n={5} title="Pandoras sølvhedging og margintryk" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Pandoras officielle politik er at hedge mindst 70% af det forventede
            sølv- og guldforbrug ud fra en rullende 12-måneders produktionsplan.
            Der går herefter typisk 5-10 måneder fra et hedge-køb til omkostningen
            rammer regnskabet (smykkerne skal først produceres og sælges).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Når Pandora i tabellen nedenfor oplyser at fx 95-100% af 2026-resultatet
            er afdækket, lyder det inkonsistent med 70%-politikken. Det er
            det ikke: 70% gælder de næste 12 måneders <em>fremtidige køb</em>,
            mens tallene i tabellen er <em>resultatets</em> dækning. Fordi der
            er 5-10 måneders forsinkelse fra køb til regnskab, er størstedelen
            af det aktuelle års køb allerede foretaget og hedget på et givent
            tidspunkt. Derfor kan andelen af årets resultatpåvirkning være højere end den
            løbende 70%-andel af fremtidige køb.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Pandoras sølvhedging over tid</caption>
              <thead>
                <tr className="bg-pink-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">År</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Andel af årets resultat afdækket</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Hedget sølvpris</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Ekstern modvind på EBIT (Y/Y)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">2025 (realiseret)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~100%</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~$28/oz</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-300 bp (råvarer + FX + told)</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">2026 (forventet)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">95-100%</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~$32/oz</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-150-200 bp (kun råvarer)</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Q1 2026 (realiseret)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-440 bp (råvarer + FX + told)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            EBIT-marginen er faldet fra ca. 25,2% i 2024 til en guidance på 21-22% i
            2026. Prisforhøjelser på produkterne har delvist modvirket presset fra
            stigende råvarepriser, men den samlede effekt af sølvprisstigningen,
            toldsatser og valutakursændringer er betydelig.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Strategisk respons:</strong> Pandora har annonceret en strategi
            om at omlægge størstedelen af sølvsortimentet til platinbelagte
            smykker (under navnet EVERSHINE) for at reducere sølvafhængigheden.
            De første "Design Variations" er ifølge Pandora planlagt til
            lancering senere i 2026, med mål om at have omlagt mindst 50% af
            det relevante sølvsortiment ved udgangen af 2027 og ca. 80% ved
            udgangen af 2028. Per Q1 2026 har omlægningen endnu ikke ændret den overordnede
            materialefordeling væsentligt.
          </p>
        </section>

        {/* 5. Interactive model */}
        <section className="mb-12">
          <SectionHeader n={6} title="Interaktiv model: Sølvpris og margin" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Denne model estimerer, hvordan forskellige sølvpriser påvirker Pandoras
            EBIT-margin og indtjening per aktie (EPS). Juster sølvens spotpris for at
            se effekten. Modellen er en forenkling og medtager ikke andre faktorer som
            valutakurser, told og volumenvækst.
          </p>
          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-6">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Sådan beregnes modellen</p>
            <ol className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-decimal list-inside">
              <li><strong>Blended sølvpris</strong> = (hedget andel × hedget pris) + (uhedget andel × spotpris)</li>
              <li><strong>Marginændring</strong> = (blended pris - referencepris $33/oz) × -0,50 procentpoint per $1/oz</li>
              <li><strong>Estimeret EBIT-margin</strong> = 21,5% (2026-guidance) + marginændring</li>
              <li><strong>EBIT</strong> = omsætning 32,5 mia. DKK × EBIT-margin</li>
              <li><strong>Nettoindkomst</strong> = EBIT × (1 - 25% skattesats)</li>
              <li><strong>EPS</strong> = nettoindkomst / 74,8 mio. aktier</li>
              <li><strong>Implied P/E</strong> = aktiekurs 556 DKK / EPS</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {([
              { label: "Sølv falder ($40)", spot: 40 },
              { label: "Status quo ($76)", spot: 76 },
              { label: "Sølv stiger ($120)", spot: 120 },
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
            <AssumptionSlider label="Sølv spotpris" value={silverSpot} min={20} max={150} step={1}
              onChange={setSilverSpot} hint="Nuværende spotpris: ~$76/oz (maj 2026)" />
            <AssumptionSlider label="Hedget andel" value={hedgedShare} min={50} max={100} step={5} unit="%"
              onChange={setHedgedShare} hint="Andel af årets resultat der er afdækket (typisk 95-100% iht. Pandoras rapporter)" />
            <AssumptionSlider label="Hedget sølvpris" value={hedgedPrice} min={20} max={80} step={1}
              onChange={setHedgedPrice} hint="2026-resultatet er hedget til ~$32/oz" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KPI value={`$${blendedPrice.toFixed(1)}/oz`} label="Blended sølvpris" />
            <KPI value={`${estEbitMargin.toFixed(1).replace(".", ",")}%`} label="Estimeret EBIT-margin"
              highlight={estEbitMargin < MODEL_REF_MARGIN} />
            <KPI value={`${Math.round(estEps)} DKK`} label="Estimeret EPS"
              highlight={estEps < 70} />
            <KPI value={impliedPE > 0 && impliedPE < 100 ? `${impliedPE.toFixed(1).replace(".", ",")}x` : "-"}
              label={`P/E ved ${CURRENT_PRICE} DKK`} />
          </div>

          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Følsomhedsanalyse</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
            EPS ved forskellige sølvpriser, givet den valgte hedgede andel ({hedgedShare}%) og hedget pris (${hedgedPrice}/oz).
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
                  <td className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">EBIT-margin</td>
                  {sensitivityRows.map((r) => (
                    <td key={r.spot} className={`px-3 py-2.5 text-xs tabular-nums ${r.spot === silverSpot ? "font-bold text-pink-600 dark:text-pink-400" : r.margin >= MODEL_REF_MARGIN ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {r.margin.toFixed(1).replace(".", ",")}%
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
              <strong>Modelantagelser:</strong> Omsætning: 32,5 mia. DKK (2025-niveau).
              Skattesats: ca. 25% (Pandoras 2026-forventning, op fra 24,2% i 2025). Aktier: 74,8 mio. udestående (efter kapitalnedsættelse 10. april 2026). Reference: 21,5% EBIT-margin ved $33/oz blended (2026 guidance).
              Følsomhed: ~50 bp per $1/oz ændring i blended sølvpris (baseret på Pandoras oplyste råvaremodvind).
              Modellen medtager ikke valutakurser, told, volumenvækst eller andre faktorer.
            </p>
          </div>
        </section>

        {/* 6. Sentiment */}
        <section className="mb-12">
          <SectionHeader n={7} title="Amerikansk forbrugertillid og Pandora" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            USA er Pandoras største enkeltmarked og udgjorde ca. 32% af
            omsætningen i de første ni måneder af 2025 (Pandora rapporterer
            ikke længere USA-specifik omsætning fra Q4 2025). Nordamerika som
            region udgjorde 36% af hele 2025, mens EMEA er Pandoras største
            region med ca. 50%. I Q1 2025 voksede USA med +11% like-for-like,
            men i Q1 2026 var Nordamerika som helhed faldet til -2%
            like-for-like, mens den globale LFL-vækst landede på 0%. Opbremsningen i Nordamerika ser ud til at være en væsentlig
            forklaring på den flade samlede vækst, og det falder sammen med et
            markant fald i den amerikanske forbrugertillid.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Den amerikanske forbrugertillid (University of Michigan Consumer Sentiment Index) faldt fra 79,0 i januar 2024 til 44,8 i maj 2026. Det er det laveste niveau, indekset har
            registreret siden målingerne begyndte i 1952, lavere end både
            finanskrisens bund i 2008-2009 og det tidligere lavpunkt på 50,0 i
            juni 2022. Faldet accelererede fra februar 2025 og fortsatte
            gennem 2025-2026, drevet af bekymringer om leveomkostninger, høje
            forbrugerpriser og toldsatser.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Smykker tilhører den diskretionære forbrugerkategori, altså køb
            man typisk kan udskyde eller skære væk, når økonomien strammer
            til. Et markant fald i forbrugertilliden plejer derfor at slå
            igennem på efterspørgslen efter den slags ikke-essentielle køb.
            Det kan være med til at forklare, hvorfor Pandoras Nordamerika-LFL
            er gået fra +6% i FY 2025 (heraf +2% i Q4 2025 alene) til -2% i Q1 2026, selv om vi ikke kan
            tilskrive hele faldet til forbrugertilliden alene.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Graf: Pandora aktiekurs vs. amerikansk forbrugertillid">
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#f59e0b] inline-block" />Amerikansk forbrugertillid</span>
            </div>
          </div>
        </section>

        {/* 7. Double pressure */}
        <section className="mb-12">
          <SectionHeader n={8} title="Dobbelt pres: Omkostninger og efterspørgsel" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det interessante ved Pandoras situation er, at selskabet er ramt fra to
            sider samtidig:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Omkostningssiden (sølv)</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Sølvprisen er mere end tredoblet på 29 måneder</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Hedging forsinker, men eliminerer ikke effekten</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>EBIT-margin guidance sænket fra ca. 24% (2025) til 21-22% (2026)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Højere amerikanske toldsatser på import fra Thailand øger presset</li>
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 p-5">
              <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 text-sm uppercase tracking-wide">Efterspørgselssiden (sentiment)</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Amerikansk forbrugertillid på 44,8 (laveste niveau siden 1952)</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Nordamerika-LFL gået fra +6% i FY 2025 til -2% i Q1 2026</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Europa svagt: UK -8%, Frankrig -7% LFL i Q3 2025</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Organisk vækst guidet til -1% til 2% i 2026 (2025 endte på 6%, 2024 var 13%)</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Pandora er fanget i et dobbelt pres: Omkostningerne stiger (sølv,
            valuta, told) samtidig med at efterspørgslen svækkes (svag amerikansk
            og europæisk forbruger). Kombinationen af stigende inputomkostninger
            og svagere efterspørgsel kan være en væsentlig forklaring på den
            negative kursudvikling.
          </p>
        </section>

        {/* 8. Timeline */}
        <section className="mb-12">
          <SectionHeader n={9} title="Tidslinje: Nøglebegivenheder" />
          <div className="ml-2">
            <TimelineEvent date="Januar 2024" title="Pandora starter året i 936 DKK" color="#ec4899">
              <p>Sølvprisen er $23/oz. Pandora er på vej til at lukke et stærkt 2023 (Q4 2023-resultaterne, der annonceres 7. februar, viser 12% organisk vækst). Den amerikanske forbrugertillid ligger på 79.</p>
            </TimelineEvent>
            <TimelineEvent date="August 2024" title="Pandora når 1.181 DKK" color="#2a9d8f">
              <p>Stærk vækst i USA (+5% LFL) og god Q2-rapport driver aktien op. Sølvprisen er stadig relativt stabil omkring $29/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="December 2024" title="Pandora stiger til 1.317 DKK" color="#2a9d8f">
              <p>Q3 2024-rapporten viste 11% organisk vækst og er Pandoras femte kvartal i træk med tocifret organisk vækst. Aktien nærmer sig all-time high. Sølvprisen er stadig stabil omkring $29-31/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="Januar 2025" title="All-time high: 1.415 DKK intradag" color="#ec4899">
              <p>Pandora rammer sit højeste kursniveau nogensinde den 31. januar 2025. Sølvprisen er $32/oz, og den amerikanske forbrugertillid er begyndt at falde (71,7).</p>
            </TimelineEvent>
            <TimelineEvent date="Februar-april 2025" title="Fald begynder: Told, sølv og sentiment" color="#e63946">
              <p>Aktien falder fra 1.268 DKK (slut februar) til 972 DKK (slut april). Den amerikanske forbrugertillid falder markant til 52-57. US-told på import fra Thailand og Kina annonceres. Sølvprisen stiger til $34/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="August-september 2025" title="Sølv eksploderer over $40/oz" color="#e63946">
              <p>Sølvprisen bryder op fra $36 til $46/oz. Pandora falder til 828 DKK. Den 30. september meddeler CEO Alexander Lacik, at han går på pension, og bestyrelsen udpeger CMO Berta de Pablos-Barbier som efterfølger fra generalforsamlingen i marts 2026.</p>
            </TimelineEvent>
            <TimelineEvent date="November-december 2025" title="Sølv stiger til $77/oz, Pandora under 700 DKK" color="#e63946">
              <p>Sølvprisen accelererer fra ca. $48 i starten af november til peak omkring $77/oz den 30. december. Pandora-aktien falder til ca. 700 DKK. Den amerikanske forbrugertillid falder til 51-53. I Q3 2025-rapporten (5. november) viser Pandora 380 bp samlet margintryk fra råvarer, valuta og told i Q3, og selskabet sænker 2026 EBIT-margin target fra "mindst 24%" til "omkring 23%" som følge af nye eksterne modvinde.</p>
            </TimelineEvent>
            <TimelineEvent date="Januar 2026" title="Sølv rammer all-time high: ~$122/oz intradag" color="#e63946">
              <p>Pandora-aktien falder til 485 DKK (intraday low 469 DKK den 29. januar), det laveste niveau siden 2022. Sølvprisen rammer sit historiske højdepunkt på ca. $122/oz intradag den 29. januar (daglig lukkekurs ca. $114/oz), før den crasher med over 30% til ca. $78/oz close dagen efter (30. januar) og siden stabiliserer sig omkring $76/oz i februar.</p>
            </TimelineEvent>
            <TimelineEvent date="1. januar 2026" title="Berta de Pablos-Barbier overtager som CEO" color="#4361ee">
              <p>Den tidligere CMO overtager officielt som CEO den 1. januar 2026, ca. to en halv måned før planlagt. Alexander Lacik fortsætter som Special Advisor indtil generalforsamlingen den 11. marts. Hun medbringer ca. 30 års erfaring fra bl.a. LVMH (Moët &amp; Chandon), Mars Wrigley, Lacoste og Kering-ejede Boucheron.</p>
            </TimelineEvent>
            <TimelineEvent date="Februar-marts 2026" title="Årsrapport 2025, ny guidance og lokalt bundpunkt" color="#e63946">
              <p>Den 4. februar publicerer Pandora Q4 2025 / årsrapport 2025. FY 2025 organisk vækst endte på 6% (under guidance på 7-8%) og EBIT-margin på 23,9% (under guidance på "omkring 24%"). 2026-guidance sættes til -1% til +2% organisk vækst og 21-22% EBIT-margin, yderligere sænket fra "omkring 23%" som Pandora annoncerede i Q3 2025. Samtidig annonceres EVERSHINE platinbelægnings-strategien med mål om at omlægge mindst 50% af sølvsortimentet ved udgangen af 2027 og ca. 80% ved udgangen af 2028 for at reducere sølvafhængigheden. Aktien rammer et lokalt bundpunkt på 435 DKK den 17. marts (kort efter udbytte-ex-dato 12. marts, hvor 22 DKK/aktie blev udbetalt).</p>
            </TimelineEvent>
            <TimelineEvent date="Maj 2026" title="Bund eller bounce?" color="#f59e0b">
              <p>Pandora leverer Q1 2026 med 2% organisk vækst (0% LFL globalt) og 20,9% EBIT-margin. Aktien stiger 14% på dagen (fra 498 DKK til 569 DKK). Den amerikanske forbrugertillid falder til 44,8, det laveste niveau siden 1952. Sølvprisen har stabiliseret sig omkring $76/oz. Aktien handles til 556 DKK med P/E på 8,3.</p>
            </TimelineEvent>
          </div>
        </section>

        {/* 9. Key numbers */}
        <section className="mb-12">
          <SectionHeader n={10} title="Pandora i tal" />
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Nøgletal for Pandora A/S</caption>
              <thead>
                <tr className="bg-pink-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Nøgletal</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Værdi</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Omsætning (2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">32,5 mia. DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">EBIT-margin (Q1 2026)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">20,9%</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Aktiekurs (22. maj 2026)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">556 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">P/E (trailing)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">8,3</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Markedsværdi</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~41,6 mia. DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Udbytte</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">22 DKK/aktie (3,96%)</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">USA-omsætning (9M 2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">6,6 mia. DKK (~32%)</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Nordamerika-omsætning (FY 2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">11,8 mia. DKK (36%)</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">EMEA-omsætning (FY 2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">16,1 mia. DKK (50%)</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Primært metal i produkter</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">Sterling sølv (hovedparten)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. Bull/Bear */}
        <section className="mb-12">
          <SectionHeader n={11} title="Argumenter for og imod" />
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Risikofaktorer</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Sølvprisen er steget over 200% siden januar 2024 (fra $23 til $76/oz) og forbliver volatil</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Amerikansk forbrugertillid på 44,8 (laveste niveau siden 1952)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>19% amerikansk told på import fra Thailand (Pandora-produkter sendes til USA fra Thailand)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>CEO-skifte den 1. januar 2026: Berta de Pablos-Barbier overtager fra Alexander Lacik (knap 7 års anciennitet)</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Europa svagt: UK -8% og Frankrig -7% LFL i Q3 2025, EMEA -2% i Q1 2026</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Positive faktorer</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>P/E (trailing 12 måneder) på 8,3 ved kurs 556 DKK (TTM EPS ca. 67 DKK pr. Q1 2026)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Udbytte på 22 DKK/aktie (3,96% yield ved kurs 556 DKK)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Aktietilbagekøb for 4,4 mia. DKK i 2025; intet nyt 2026-program annonceret, men Pandora signalerer at de vil genoptage tilbagekøb når platinbelægnings-transitionen er længere fremme</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Asien-Pacific vokser +12% LFL i Q1 2026</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Bruttomargin på 79,5% i Q1 2026 (kun 90 bp under Q1 2025 trods 370 bp ekstern modvind)</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Platinbelægningstrategi kan reducere sølvafhængighed over tid</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>ROIC på 41% i 2025 (Pandoras egen karakteristik: "structurally strong")</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 11. Conclusion */}
        <section className="mb-12">
          <SectionHeader n={12} title="Konklusion" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Pandora-aktien er faldet ca. 41% fra januar 2024 til maj 2026, mens sølvprisen
            er mere end tredoblet i samme periode. Korrelationen på {correlation.toFixed(2).replace(".", ",")} viser
            en stærk negativ sammenhæng, men den fortæller ikke hele historien.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Sølvprisen påvirker Pandoras materialeomkostninger og dermed
            EBIT-marginen. Selvom hedging forsinker effekten, har rallyet fra
            $23 til $76/oz været en væsentlig del af den eksterne modvind
            (samlet 300 bp i 2025, 440 bp i Q1 2026, jf. Pandoras egne
            opgørelser fra Q4 2025 og Q1 2026), der har fået Pandora til at
            sænke EBIT-margin guidance fra "ca. 24%" (2025) til 21-22% (2026).
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            På efterspørgselssiden er den amerikanske forbrugertillid faldet
            til 44,8 i maj 2026, det laveste niveau siden indeksets start i
            1952. USA er Pandoras største enkeltmarked (ca. 32% af omsætningen
            i 9M 2025), og smykker er en diskretionær forbrugerkategori. Pandora
            har allerede set Nordamerika-LFL falde fra +6% i FY 2025 (heraf
            +2% i Q4 2025 alene) til -2% i Q1 2026.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Det centrale spørgsmål for investorer er, om den nuværende kurs
            (556 DKK, P/E 8,3) allerede afspejler disse udfordringer, eller om
            der er mere nedside. To variabler er centrale at følge: Hvor
            sølvprisen stabiliserer sig, og hvornår den amerikanske
            forbrugertillid begynder at vende.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Hvad skal man holde øje med</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; <strong>Sølvprisens spot-niveau:</strong> Pandoras 2026 er låst ved ~$32/oz hedget; men spot-niveauet i 2026 bestemmer hvor 2027-hedges sættes (offentliggøres i kommende kvartalsrapporter). Pandora oplyser i Q1 2026 at 1100 bp ekstern modvind forventes i 2027 hvis sølv-spot holder $82/oz</li>
              <li>&#x2022; <strong>Amerikansk forbrugertillid:</strong> Pandora citerer selv "weak consumer sentiment" som driver bag Nordamerika-svaghed (Q4 2025-rapport); et vendepunkt i UMich-indekset ville fjerne denne specifikke modvind</li>
              <li>&#x2022; <strong>US-toldsatser:</strong> 19% Thailand-told bidrog med 210 bp af Q1 2026's samlede 440 bp eksterne modvind (Pandora Q1 2026); eventuelle lempelser ville fjerne en betydelig del</li>
              <li>&#x2022; <strong>2027-hedge niveau:</strong> Pandora offentliggør hedge-priser for kommende kvartaler i hver rapport; Q1 2026-tabellen viser fx Q1 2027 estimeret cost-of-sales pris ved ~$46/oz (inkl. nye hedges fra april 2026 hvor sølv-spot var historisk høj)</li>
              <li>&#x2022; <strong>Ny CEO Berta de Pablos-Barbier (siden 1. januar 2026):</strong> Implementering af EVERSHINE og næste strategiske cyklus annonceres 4. november 2026 (afløser nuværende strategi 2024-2026)</li>
              <li>&#x2022; <strong>EVERSHINE platinbelægning:</strong> Pandoras egne mål er mindst 50% af sølvsortimentet omlagt ved udgangen af 2027 og ca. 80% i 2028 (Q1 2026-rapport)</li>
            </ul>
          </div>
        </section>

        <RelatedAnalyses currentSlug="pandora/soelv/2026-05-23" />

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Ansvarsfraskrivelse:</strong> Denne analyse er alene til informationsformål og udgør ikke
            investeringsrådgivning. Data stammer fra Yahoo Finance, University
            of Michigan Surveys of Consumers, Pandora Q4 2025-interimrapport (4. februar 2026) for FY 2025-tal og regional fordeling, Pandora Q3 2025-interimrapport (5. november 2025) for USA-specifik omsætning (9M 2025), Pandora Q1 2026-interimrapport, Pandoras pressemeddelelse om CEO-skifte (30. september 2025), University of Michigan Surveys of Consumers samt Silver Institute (World Silver Survey 2025). Historisk afkast er ikke en garanti for fremtidigt afkast.
            Foretag altid din egen analyse, og søg professionel rådgivning før du handler.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Genereret af Zirium  |  23. maj 2026
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
