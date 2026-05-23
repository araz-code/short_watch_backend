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
// Pandora (PNDORA.CO) monthly close prices in DKK + silver price (SI=F) USD/oz.
// Sources: Yahoo Finance, LBMA.
const PRICE_DATA: PricePoint[] = [
  { date: "2024-01-02", pandora: 863, silver: 23.7 },
  { date: "2024-01-03", pandora: 850, silver: 22.9 },
  { date: "2024-01-04", pandora: 857, silver: 23.0 },
  { date: "2024-01-05", pandora: 873, silver: 23.1 },
  { date: "2024-01-08", pandora: 903, silver: 23.1 },
  { date: "2024-01-09", pandora: 900, silver: 22.9 },
  { date: "2024-01-10", pandora: 920, silver: 22.9 },
  { date: "2024-01-11", pandora: 909, silver: 22.5 },
  { date: "2024-01-12", pandora: 902, silver: 23.2 },
  { date: "2024-01-16", pandora: 910, silver: 22.9 },
  { date: "2024-01-17", pandora: 908, silver: 22.5 },
  { date: "2024-01-18", pandora: 894, silver: 22.7 },
  { date: "2024-01-19", pandora: 884, silver: 22.6 },
  { date: "2024-01-22", pandora: 898, silver: 22.2 },
  { date: "2024-01-23", pandora: 897, silver: 22.3 },
  { date: "2024-01-24", pandora: 912, silver: 22.8 },
  { date: "2024-01-25", pandora: 926, silver: 22.8 },
  { date: "2024-01-26", pandora: 915, silver: 22.8 },
  { date: "2024-01-29", pandora: 933, silver: 23.1 },
  { date: "2024-01-30", pandora: 939, silver: 23.1 },
  { date: "2024-01-31", pandora: 930, silver: 23.1 },
  { date: "2024-02-01", pandora: 922, silver: 23.1 },
  { date: "2024-02-02", pandora: 937, silver: 22.7 },
  { date: "2024-02-05", pandora: 937, silver: 22.3 },
  { date: "2024-02-06", pandora: 949, silver: 22.4 },
  { date: "2024-02-07", pandora: 945, silver: 22.3 },
  { date: "2024-02-08", pandora: 994, silver: 22.6 },
  { date: "2024-02-09", pandora: 1004, silver: 22.5 },
  { date: "2024-02-12", pandora: 1012, silver: 22.7 },
  { date: "2024-02-13", pandora: 1003, silver: 22.1 },
  { date: "2024-02-14", pandora: 1018, silver: 22.3 },
  { date: "2024-02-15", pandora: 1022, silver: 22.9 },
  { date: "2024-02-16", pandora: 1046, silver: 23.4 },
  { date: "2024-02-20", pandora: 1052, silver: 23.1 },
  { date: "2024-02-21", pandora: 1045, silver: 22.9 },
  { date: "2024-02-22", pandora: 1053, silver: 22.8 },
  { date: "2024-02-23", pandora: 1062, silver: 23.0 },
  { date: "2024-02-26", pandora: 1063, silver: 22.5 },
  { date: "2024-02-27", pandora: 1063, silver: 22.5 },
  { date: "2024-02-28", pandora: 1060, silver: 22.4 },
  { date: "2024-02-29", pandora: 1026, silver: 22.7 },
  { date: "2024-03-01", pandora: 1058, silver: 23.1 },
  { date: "2024-03-04", pandora: 1049, silver: 23.8 },
  { date: "2024-03-05", pandora: 1038, silver: 23.8 },
  { date: "2024-03-06", pandora: 1027, silver: 24.3 },
  { date: "2024-03-07", pandora: 1047, silver: 24.4 },
  { date: "2024-03-08", pandora: 1067, silver: 24.3 },
  { date: "2024-03-11", pandora: 1052, silver: 24.5 },
  { date: "2024-03-12", pandora: 1071, silver: 24.2 },
  { date: "2024-03-13", pandora: 1072, silver: 25.0 },
  { date: "2024-03-14", pandora: 1087, silver: 24.9 },
  { date: "2024-03-15", pandora: 1073, silver: 25.2 },
  { date: "2024-03-18", pandora: 1069, silver: 25.1 },
  { date: "2024-03-19", pandora: 1076, silver: 25.0 },
  { date: "2024-03-20", pandora: 1070, silver: 24.9 },
  { date: "2024-03-21", pandora: 1089, silver: 24.8 },
  { date: "2024-03-22", pandora: 1050, silver: 24.7 },
  { date: "2024-03-25", pandora: 1052, silver: 24.7 },
  { date: "2024-03-26", pandora: 1068, silver: 24.5 },
  { date: "2024-03-27", pandora: 1043, silver: 24.6 },
  { date: "2024-04-02", pandora: 1028, silver: 25.8 },
  { date: "2024-04-03", pandora: 1039, silver: 26.9 },
  { date: "2024-04-04", pandora: 1028, silver: 27.1 },
  { date: "2024-04-05", pandora: 1026, silver: 27.4 },
  { date: "2024-04-08", pandora: 1020, silver: 27.7 },
  { date: "2024-04-09", pandora: 1006, silver: 27.9 },
  { date: "2024-04-10", pandora: 1023, silver: 28.0 },
  { date: "2024-04-11", pandora: 1027, silver: 28.2 },
  { date: "2024-04-12", pandora: 996, silver: 28.3 },
  { date: "2024-04-15", pandora: 1011, silver: 28.7 },
  { date: "2024-04-16", pandora: 999, silver: 28.3 },
  { date: "2024-04-17", pandora: 1010, silver: 28.3 },
  { date: "2024-04-18", pandora: 1006, silver: 28.3 },
  { date: "2024-04-19", pandora: 1013, silver: 28.8 },
  { date: "2024-04-22", pandora: 1033, silver: 27.2 },
  { date: "2024-04-23", pandora: 1029, silver: 27.3 },
  { date: "2024-04-24", pandora: 1025, silver: 27.3 },
  { date: "2024-04-25", pandora: 1009, silver: 27.3 },
  { date: "2024-04-26", pandora: 1030, silver: 27.2 },
  { date: "2024-04-29", pandora: 1017, silver: 27.4 },
  { date: "2024-04-30", pandora: 1001, silver: 26.4 },
  { date: "2024-05-01", pandora: 1014, silver: 26.5 },
  { date: "2024-05-02", pandora: 1076, silver: 26.6 },
  { date: "2024-05-03", pandora: 1048, silver: 26.4 },
  { date: "2024-05-06", pandora: 1043, silver: 27.4 },
  { date: "2024-05-07", pandora: 1041, silver: 27.3 },
  { date: "2024-05-08", pandora: 1059, silver: 27.4 },
  { date: "2024-05-13", pandora: 1088, silver: 28.2 },
  { date: "2024-05-14", pandora: 1058, silver: 28.5 },
  { date: "2024-05-15", pandora: 1074, silver: 29.5 },
  { date: "2024-05-16", pandora: 1090, silver: 29.7 },
  { date: "2024-05-17", pandora: 1095, silver: 31.0 },
  { date: "2024-05-21", pandora: 1075, silver: 31.9 },
  { date: "2024-05-22", pandora: 1043, silver: 31.3 },
  { date: "2024-05-23", pandora: 1067, silver: 30.3 },
  { date: "2024-05-24", pandora: 1067, silver: 30.3 },
  { date: "2024-05-28", pandora: 1043, silver: 32.0 },
  { date: "2024-05-29", pandora: 1045, silver: 32.2 },
  { date: "2024-05-30", pandora: 1044, silver: 31.4 },
  { date: "2024-05-31", pandora: 1052, silver: 30.3 },
  { date: "2024-06-03", pandora: 1035, silver: 30.6 },
  { date: "2024-06-04", pandora: 1028, silver: 29.5 },
  { date: "2024-06-06", pandora: 1025, silver: 31.2 },
  { date: "2024-06-07", pandora: 1047, silver: 29.3 },
  { date: "2024-06-10", pandora: 1045, silver: 29.8 },
  { date: "2024-06-11", pandora: 1022, silver: 29.1 },
  { date: "2024-06-12", pandora: 1031, silver: 30.2 },
  { date: "2024-06-13", pandora: 1011, silver: 29.0 },
  { date: "2024-06-14", pandora: 985, silver: 29.4 },
  { date: "2024-06-17", pandora: 983, silver: 29.3 },
  { date: "2024-06-18", pandora: 984, silver: 29.5 },
  { date: "2024-06-20", pandora: 1009, silver: 30.8 },
  { date: "2024-06-21", pandora: 997, silver: 29.6 },
  { date: "2024-06-24", pandora: 999, silver: 29.5 },
  { date: "2024-06-25", pandora: 994, silver: 28.8 },
  { date: "2024-06-26", pandora: 999, silver: 28.9 },
  { date: "2024-06-27", pandora: 990, silver: 28.9 },
  { date: "2024-06-28", pandora: 984, silver: 29.2 },
  { date: "2024-07-01", pandora: 945, silver: 29.3 },
  { date: "2024-07-02", pandora: 936, silver: 29.4 },
  { date: "2024-07-03", pandora: 934, silver: 30.5 },
  { date: "2024-07-05", pandora: 932, silver: 31.4 },
  { date: "2024-07-08", pandora: 949, silver: 30.6 },
  { date: "2024-07-09", pandora: 955, silver: 30.8 },
  { date: "2024-07-10", pandora: 954, silver: 30.7 },
  { date: "2024-07-11", pandora: 962, silver: 31.4 },
  { date: "2024-07-12", pandora: 990, silver: 30.9 },
  { date: "2024-07-15", pandora: 987, silver: 30.7 },
  { date: "2024-07-16", pandora: 1005, silver: 31.2 },
  { date: "2024-07-17", pandora: 993, silver: 30.1 },
  { date: "2024-07-18", pandora: 985, silver: 30.0 },
  { date: "2024-07-19", pandora: 986, silver: 29.1 },
  { date: "2024-07-22", pandora: 1008, silver: 29.1 },
  { date: "2024-07-23", pandora: 999, silver: 29.1 },
  { date: "2024-07-24", pandora: 1003, silver: 29.1 },
  { date: "2024-07-25", pandora: 984, silver: 27.8 },
  { date: "2024-07-26", pandora: 991, silver: 27.9 },
  { date: "2024-07-29", pandora: 1007, silver: 27.7 },
  { date: "2024-07-30", pandora: 1019, silver: 28.4 },
  { date: "2024-07-31", pandora: 1012, silver: 28.8 },
  { date: "2024-08-01", pandora: 1008, silver: 28.3 },
  { date: "2024-08-02", pandora: 947, silver: 28.2 },
  { date: "2024-08-05", pandora: 914, silver: 27.1 },
  { date: "2024-08-06", pandora: 933, silver: 27.1 },
  { date: "2024-08-07", pandora: 943, silver: 26.8 },
  { date: "2024-08-08", pandora: 950, silver: 27.5 },
  { date: "2024-08-09", pandora: 960, silver: 27.5 },
  { date: "2024-08-12", pandora: 975, silver: 27.9 },
  { date: "2024-08-13", pandora: 1010, silver: 27.7 },
  { date: "2024-08-14", pandora: 993, silver: 27.3 },
  { date: "2024-08-15", pandora: 994, silver: 28.3 },
  { date: "2024-08-16", pandora: 999, silver: 28.8 },
  { date: "2024-08-19", pandora: 1024, silver: 29.2 },
  { date: "2024-08-20", pandora: 1043, silver: 29.5 },
  { date: "2024-08-21", pandora: 1048, silver: 29.5 },
  { date: "2024-08-22", pandora: 1061, silver: 29.0 },
  { date: "2024-08-23", pandora: 1071, silver: 29.8 },
  { date: "2024-08-26", pandora: 1074, silver: 30.0 },
  { date: "2024-08-27", pandora: 1083, silver: 30.0 },
  { date: "2024-08-28", pandora: 1085, silver: 29.2 },
  { date: "2024-08-29", pandora: 1096, silver: 29.6 },
  { date: "2024-08-30", pandora: 1106, silver: 28.7 },
  { date: "2024-09-03", pandora: 1104, silver: 28.0 },
  { date: "2024-09-04", pandora: 1098, silver: 28.2 },
  { date: "2024-09-05", pandora: 1084, silver: 28.7 },
  { date: "2024-09-06", pandora: 1073, silver: 27.8 },
  { date: "2024-09-09", pandora: 1080, silver: 28.3 },
  { date: "2024-09-10", pandora: 1065, silver: 28.3 },
  { date: "2024-09-11", pandora: 1084, silver: 28.6 },
  { date: "2024-09-12", pandora: 1109, silver: 29.7 },
  { date: "2024-09-13", pandora: 1127, silver: 30.7 },
  { date: "2024-09-16", pandora: 1115, silver: 30.8 },
  { date: "2024-09-17", pandora: 1092, silver: 30.6 },
  { date: "2024-09-18", pandora: 1073, silver: 30.3 },
  { date: "2024-09-19", pandora: 1100, silver: 31.1 },
  { date: "2024-09-20", pandora: 1072, silver: 31.2 },
  { date: "2024-09-23", pandora: 1072, silver: 30.8 },
  { date: "2024-09-24", pandora: 1088, silver: 32.1 },
  { date: "2024-09-25", pandora: 1048, silver: 31.7 },
  { date: "2024-09-26", pandora: 1034, silver: 32.0 },
  { date: "2024-09-27", pandora: 1029, silver: 31.5 },
  { date: "2024-09-30", pandora: 1032, silver: 31.2 },
  { date: "2024-10-01", pandora: 1000, silver: 31.4 },
  { date: "2024-10-02", pandora: 996, silver: 31.6 },
  { date: "2024-10-03", pandora: 984, silver: 32.2 },
  { date: "2024-10-04", pandora: 988, silver: 32.1 },
  { date: "2024-10-07", pandora: 978, silver: 31.7 },
  { date: "2024-10-08", pandora: 999, silver: 30.4 },
  { date: "2024-10-09", pandora: 992, silver: 30.4 },
  { date: "2024-10-10", pandora: 1003, silver: 31.0 },
  { date: "2024-10-11", pandora: 1009, silver: 31.5 },
  { date: "2024-10-14", pandora: 997, silver: 31.1 },
  { date: "2024-10-15", pandora: 995, silver: 31.5 },
  { date: "2024-10-16", pandora: 995, silver: 31.8 },
  { date: "2024-10-17", pandora: 1013, silver: 31.6 },
  { date: "2024-10-18", pandora: 1005, silver: 33.0 },
  { date: "2024-10-21", pandora: 983, silver: 33.9 },
  { date: "2024-10-22", pandora: 965, silver: 34.8 },
  { date: "2024-10-23", pandora: 959, silver: 33.6 },
  { date: "2024-10-24", pandora: 981, silver: 33.6 },
  { date: "2024-10-25", pandora: 974, silver: 33.6 },
  { date: "2024-10-28", pandora: 982, silver: 33.8 },
  { date: "2024-10-29", pandora: 999, silver: 34.3 },
  { date: "2024-10-30", pandora: 988, silver: 33.9 },
  { date: "2024-10-31", pandora: 968, silver: 32.7 },
  { date: "2024-11-01", pandora: 992, silver: 32.5 },
  { date: "2024-11-04", pandora: 993, silver: 32.5 },
  { date: "2024-11-05", pandora: 992, silver: 32.7 },
  { date: "2024-11-06", pandora: 975, silver: 31.2 },
  { date: "2024-11-07", pandora: 987, silver: 31.8 },
  { date: "2024-11-08", pandora: 997, silver: 31.4 },
  { date: "2024-11-11", pandora: 1008, silver: 30.5 },
  { date: "2024-11-12", pandora: 1025, silver: 30.7 },
  { date: "2024-11-13", pandora: 1022, silver: 30.6 },
  { date: "2024-11-14", pandora: 1027, silver: 30.5 },
  { date: "2024-11-15", pandora: 1016, silver: 30.4 },
  { date: "2024-11-18", pandora: 1025, silver: 31.2 },
  { date: "2024-11-19", pandora: 1000, silver: 31.2 },
  { date: "2024-11-20", pandora: 1011, silver: 31.0 },
  { date: "2024-11-21", pandora: 1017, silver: 30.9 },
  { date: "2024-11-22", pandora: 1049, silver: 31.3 },
  { date: "2024-11-25", pandora: 1052, silver: 30.2 },
  { date: "2024-11-26", pandora: 1046, silver: 30.4 },
  { date: "2024-11-27", pandora: 1037, silver: 30.1 },
  { date: "2024-11-29", pandora: 1064, silver: 30.7 },
  { date: "2024-12-02", pandora: 1090, silver: 30.4 },
  { date: "2024-12-03", pandora: 1111, silver: 31.1 },
  { date: "2024-12-04", pandora: 1112, silver: 31.5 },
  { date: "2024-12-05", pandora: 1102, silver: 31.1 },
  { date: "2024-12-06", pandora: 1138, silver: 31.2 },
  { date: "2024-12-09", pandora: 1177, silver: 32.2 },
  { date: "2024-12-10", pandora: 1182, silver: 32.4 },
  { date: "2024-12-11", pandora: 1195, silver: 32.6 },
  { date: "2024-12-12", pandora: 1185, silver: 31.2 },
  { date: "2024-12-13", pandora: 1194, silver: 30.7 },
  { date: "2024-12-16", pandora: 1198, silver: 30.7 },
  { date: "2024-12-17", pandora: 1178, silver: 30.6 },
  { date: "2024-12-18", pandora: 1190, silver: 30.4 },
  { date: "2024-12-19", pandora: 1183, silver: 29.1 },
  { date: "2024-12-20", pandora: 1193, silver: 29.7 },
  { date: "2024-12-23", pandora: 1212, silver: 29.9 },
  { date: "2024-12-27", pandora: 1244, silver: 29.7 },
  { date: "2024-12-30", pandora: 1233, silver: 29.1 },
  { date: "2025-01-02", pandora: 1236, silver: 29.6 },
  { date: "2025-01-03", pandora: 1234, silver: 29.8 },
  { date: "2025-01-06", pandora: 1230, silver: 30.3 },
  { date: "2025-01-07", pandora: 1222, silver: 30.4 },
  { date: "2025-01-08", pandora: 1227, silver: 30.5 },
  { date: "2025-01-09", pandora: 1236, silver: 30.8 },
  { date: "2025-01-10", pandora: 1247, silver: 31.1 },
  { date: "2025-01-13", pandora: 1189, silver: 30.1 },
  { date: "2025-01-14", pandora: 1162, silver: 30.1 },
  { date: "2025-01-15", pandora: 1170, silver: 31.3 },
  { date: "2025-01-16", pandora: 1187, silver: 31.5 },
  { date: "2025-01-17", pandora: 1200, silver: 31.0 },
  { date: "2025-01-21", pandora: 1220, silver: 31.3 },
  { date: "2025-01-22", pandora: 1237, silver: 31.2 },
  { date: "2025-01-23", pandora: 1256, silver: 30.7 },
  { date: "2025-01-24", pandora: 1244, silver: 31.0 },
  { date: "2025-01-27", pandora: 1275, silver: 30.3 },
  { date: "2025-01-28", pandora: 1268, silver: 30.7 },
  { date: "2025-01-29", pandora: 1290, silver: 31.2 },
  { date: "2025-01-30", pandora: 1311, silver: 32.4 },
  { date: "2025-01-31", pandora: 1293, silver: 32.1 },
  { date: "2025-02-03", pandora: 1292, silver: 32.4 },
  { date: "2025-02-04", pandora: 1286, silver: 32.9 },
  { date: "2025-02-05", pandora: 1256, silver: 32.9 },
  { date: "2025-02-06", pandora: 1261, silver: 32.5 },
  { date: "2025-02-07", pandora: 1235, silver: 32.3 },
  { date: "2025-02-10", pandora: 1247, silver: 32.4 },
  { date: "2025-02-11", pandora: 1238, silver: 32.2 },
  { date: "2025-02-12", pandora: 1243, silver: 32.7 },
  { date: "2025-02-13", pandora: 1235, silver: 32.7 },
  { date: "2025-02-14", pandora: 1181, silver: 32.8 },
  { date: "2025-02-18", pandora: 1176, silver: 33.3 },
  { date: "2025-02-19", pandora: 1168, silver: 33.0 },
  { date: "2025-02-20", pandora: 1160, silver: 33.4 },
  { date: "2025-02-21", pandora: 1196, silver: 33.0 },
  { date: "2025-02-24", pandora: 1163, silver: 32.6 },
  { date: "2025-02-25", pandora: 1183, silver: 31.8 },
  { date: "2025-02-26", pandora: 1187, silver: 32.3 },
  { date: "2025-02-27", pandora: 1161, silver: 31.8 },
  { date: "2025-02-28", pandora: 1187, silver: 31.2 },
  { date: "2025-03-03", pandora: 1165, silver: 32.0 },
  { date: "2025-03-04", pandora: 1137, silver: 32.1 },
  { date: "2025-03-05", pandora: 1121, silver: 32.9 },
  { date: "2025-03-06", pandora: 1094, silver: 33.1 },
  { date: "2025-03-07", pandora: 1087, silver: 32.5 },
  { date: "2025-03-10", pandora: 1075, silver: 32.3 },
  { date: "2025-03-11", pandora: 1055, silver: 32.9 },
  { date: "2025-03-12", pandora: 1057, silver: 33.5 },
  { date: "2025-03-13", pandora: 1059, silver: 34.1 },
  { date: "2025-03-14", pandora: 1052, silver: 34.2 },
  { date: "2025-03-17", pandora: 1053, silver: 34.1 },
  { date: "2025-03-18", pandora: 1025, silver: 34.6 },
  { date: "2025-03-19", pandora: 1065, silver: 34.0 },
  { date: "2025-03-20", pandora: 1080, silver: 33.8 },
  { date: "2025-03-21", pandora: 1063, silver: 33.3 },
  { date: "2025-03-24", pandora: 1080, silver: 33.3 },
  { date: "2025-03-25", pandora: 1057, silver: 34.0 },
  { date: "2025-03-26", pandora: 1058, silver: 34.0 },
  { date: "2025-03-27", pandora: 1038, silver: 34.9 },
  { date: "2025-03-28", pandora: 1017, silver: 34.6 },
  { date: "2025-03-31", pandora: 1005, silver: 34.5 },
  { date: "2025-04-01", pandora: 1011, silver: 34.2 },
  { date: "2025-04-02", pandora: 1013, silver: 34.5 },
  { date: "2025-04-03", pandora: 905, silver: 31.8 },
  { date: "2025-04-04", pandora: 832, silver: 29.1 },
  { date: "2025-04-07", pandora: 862, silver: 29.5 },
  { date: "2025-04-08", pandora: 878, silver: 29.6 },
  { date: "2025-04-09", pandora: 842, silver: 30.3 },
  { date: "2025-04-10", pandora: 905, silver: 30.7 },
  { date: "2025-04-11", pandora: 889, silver: 31.8 },
  { date: "2025-04-14", pandora: 905, silver: 32.1 },
  { date: "2025-04-15", pandora: 910, silver: 32.2 },
  { date: "2025-04-16", pandora: 878, silver: 32.9 },
  { date: "2025-04-22", pandora: 894, silver: 32.9 },
  { date: "2025-04-23", pandora: 937, silver: 33.5 },
  { date: "2025-04-24", pandora: 914, silver: 33.5 },
  { date: "2025-04-25", pandora: 919, silver: 33.0 },
  { date: "2025-04-28", pandora: 932, silver: 33.0 },
  { date: "2025-04-29", pandora: 931, silver: 33.3 },
  { date: "2025-04-30", pandora: 927, silver: 32.5 },
  { date: "2025-05-01", pandora: 938, silver: 32.2 },
  { date: "2025-05-02", pandora: 957, silver: 32.0 },
  { date: "2025-05-05", pandora: 957, silver: 32.2 },
  { date: "2025-05-06", pandora: 936, silver: 33.1 },
  { date: "2025-05-07", pandora: 952, silver: 32.5 },
  { date: "2025-05-08", pandora: 959, silver: 32.4 },
  { date: "2025-05-09", pandora: 984, silver: 32.7 },
  { date: "2025-05-12", pandora: 1060, silver: 32.4 },
  { date: "2025-05-13", pandora: 1083, silver: 32.9 },
  { date: "2025-05-14", pandora: 1101, silver: 32.2 },
  { date: "2025-05-15", pandora: 1101, silver: 32.5 },
  { date: "2025-05-16", pandora: 1141, silver: 32.2 },
  { date: "2025-05-19", pandora: 1154, silver: 32.3 },
  { date: "2025-05-20", pandora: 1156, silver: 33.0 },
  { date: "2025-05-21", pandora: 1156, silver: 33.5 },
  { date: "2025-05-22", pandora: 1136, silver: 33.0 },
  { date: "2025-05-23", pandora: 1130, silver: 33.4 },
  { date: "2025-05-27", pandora: 1161, silver: 33.1 },
  { date: "2025-05-28", pandora: 1140, silver: 33.0 },
  { date: "2025-06-02", pandora: 1123, silver: 34.6 },
  { date: "2025-06-03", pandora: 1143, silver: 34.5 },
  { date: "2025-06-04", pandora: 1162, silver: 34.5 },
  { date: "2025-06-06", pandora: 1130, silver: 36.0 },
  { date: "2025-06-10", pandora: 1128, silver: 36.5 },
  { date: "2025-06-11", pandora: 1138, silver: 36.2 },
  { date: "2025-06-12", pandora: 1123, silver: 36.2 },
  { date: "2025-06-13", pandora: 1095, silver: 36.3 },
  { date: "2025-06-16", pandora: 1143, silver: 36.4 },
  { date: "2025-06-17", pandora: 1118, silver: 37.1 },
  { date: "2025-06-18", pandora: 1119, silver: 36.9 },
  { date: "2025-06-20", pandora: 1113, silver: 36.0 },
  { date: "2025-06-23", pandora: 1054, silver: 36.2 },
  { date: "2025-06-24", pandora: 1082, silver: 35.7 },
  { date: "2025-06-25", pandora: 1051, silver: 36.1 },
  { date: "2025-06-26", pandora: 1032, silver: 36.6 },
  { date: "2025-06-27", pandora: 1059, silver: 36.0 },
  { date: "2025-06-30", pandora: 1060, silver: 35.9 },
  { date: "2025-07-01", pandora: 1056, silver: 36.1 },
  { date: "2025-07-02", pandora: 1055, silver: 36.4 },
  { date: "2025-07-03", pandora: 1052, silver: 36.8 },
  { date: "2025-07-04", pandora: 1035, silver: 36.8 },
  { date: "2025-07-07", pandora: 1015, silver: 36.6 },
  { date: "2025-07-08", pandora: 1016, silver: 36.5 },
  { date: "2025-07-09", pandora: 1026, silver: 36.4 },
  { date: "2025-07-10", pandora: 1019, silver: 37.0 },
  { date: "2025-07-11", pandora: 1005, silver: 38.7 },
  { date: "2025-07-14", pandora: 990, silver: 38.5 },
  { date: "2025-07-15", pandora: 972, silver: 37.8 },
  { date: "2025-07-16", pandora: 988, silver: 37.9 },
  { date: "2025-07-17", pandora: 997, silver: 38.1 },
  { date: "2025-07-18", pandora: 1000, silver: 38.2 },
  { date: "2025-07-21", pandora: 988, silver: 39.1 },
  { date: "2025-07-22", pandora: 990, silver: 39.3 },
  { date: "2025-07-23", pandora: 1001, silver: 39.3 },
  { date: "2025-07-24", pandora: 1015, silver: 39.0 },
  { date: "2025-07-25", pandora: 1007, silver: 38.2 },
  { date: "2025-07-28", pandora: 1026, silver: 38.0 },
  { date: "2025-07-29", pandora: 1019, silver: 38.1 },
  { date: "2025-07-30", pandora: 1025, silver: 37.6 },
  { date: "2025-07-31", pandora: 1035, silver: 36.6 },
  { date: "2025-08-01", pandora: 1024, silver: 36.8 },
  { date: "2025-08-04", pandora: 1034, silver: 37.2 },
  { date: "2025-08-05", pandora: 1023, silver: 37.7 },
  { date: "2025-08-06", pandora: 988, silver: 37.8 },
  { date: "2025-08-07", pandora: 989, silver: 38.2 },
  { date: "2025-08-08", pandora: 984, silver: 38.4 },
  { date: "2025-08-11", pandora: 981, silver: 37.7 },
  { date: "2025-08-12", pandora: 966, silver: 37.9 },
  { date: "2025-08-13", pandora: 988, silver: 38.5 },
  { date: "2025-08-14", pandora: 987, silver: 38.0 },
  { date: "2025-08-15", pandora: 805, silver: 37.9 },
  { date: "2025-08-18", pandora: 803, silver: 38.0 },
  { date: "2025-08-19", pandora: 834, silver: 37.3 },
  { date: "2025-08-20", pandora: 854, silver: 37.7 },
  { date: "2025-08-21", pandora: 848, silver: 38.0 },
  { date: "2025-08-22", pandora: 869, silver: 39.0 },
  { date: "2025-08-25", pandora: 845, silver: 38.7 },
  { date: "2025-08-26", pandora: 858, silver: 38.6 },
  { date: "2025-08-27", pandora: 858, silver: 38.7 },
  { date: "2025-08-28", pandora: 857, silver: 39.2 },
  { date: "2025-08-29", pandora: 840, silver: 40.2 },
  { date: "2025-09-02", pandora: 802, silver: 41.1 },
  { date: "2025-09-03", pandora: 805, silver: 41.5 },
  { date: "2025-09-04", pandora: 819, silver: 40.9 },
  { date: "2025-09-05", pandora: 819, silver: 41.1 },
  { date: "2025-09-08", pandora: 820, silver: 41.4 },
  { date: "2025-09-09", pandora: 818, silver: 40.9 },
  { date: "2025-09-10", pandora: 820, silver: 41.1 },
  { date: "2025-09-11", pandora: 826, silver: 41.7 },
  { date: "2025-09-12", pandora: 830, silver: 42.4 },
  { date: "2025-09-15", pandora: 830, silver: 42.5 },
  { date: "2025-09-16", pandora: 825, silver: 42.5 },
  { date: "2025-09-17", pandora: 826, silver: 41.7 },
  { date: "2025-09-18", pandora: 844, silver: 41.7 },
  { date: "2025-09-19", pandora: 834, silver: 42.5 },
  { date: "2025-09-22", pandora: 816, silver: 43.8 },
  { date: "2025-09-23", pandora: 814, silver: 44.2 },
  { date: "2025-09-24", pandora: 795, silver: 43.8 },
  { date: "2025-09-25", pandora: 791, silver: 44.7 },
  { date: "2025-09-26", pandora: 798, silver: 46.2 },
  { date: "2025-09-29", pandora: 811, silver: 46.6 },
  { date: "2025-09-30", pandora: 790, silver: 46.3 },
  { date: "2025-10-01", pandora: 803, silver: 47.3 },
  { date: "2025-10-02", pandora: 792, silver: 46.0 },
  { date: "2025-10-03", pandora: 782, silver: 47.6 },
  { date: "2025-10-06", pandora: 786, silver: 48.1 },
  { date: "2025-10-07", pandora: 787, silver: 47.2 },
  { date: "2025-10-08", pandora: 801, silver: 48.7 },
  { date: "2025-10-09", pandora: 788, silver: 46.8 },
  { date: "2025-10-10", pandora: 773, silver: 46.9 },
  { date: "2025-10-13", pandora: 761, silver: 50.1 },
  { date: "2025-10-14", pandora: 758, silver: 50.3 },
  { date: "2025-10-15", pandora: 775, silver: 51.1 },
  { date: "2025-10-16", pandora: 784, silver: 53.0 },
  { date: "2025-10-17", pandora: 785, silver: 49.9 },
  { date: "2025-10-20", pandora: 794, silver: 51.1 },
  { date: "2025-10-21", pandora: 827, silver: 47.5 },
  { date: "2025-10-22", pandora: 824, silver: 47.5 },
  { date: "2025-10-23", pandora: 842, silver: 48.5 },
  { date: "2025-10-24", pandora: 848, silver: 48.4 },
  { date: "2025-10-27", pandora: 848, silver: 46.6 },
  { date: "2025-10-28", pandora: 840, silver: 47.1 },
  { date: "2025-10-29", pandora: 838, silver: 47.7 },
  { date: "2025-10-30", pandora: 830, silver: 48.4 },
  { date: "2025-10-31", pandora: 827, silver: 48.0 },
  { date: "2025-11-03", pandora: 788, silver: 47.9 },
  { date: "2025-11-04", pandora: 774, silver: 47.1 },
  { date: "2025-11-05", pandora: 732, silver: 47.9 },
  { date: "2025-11-06", pandora: 742, silver: 47.8 },
  { date: "2025-11-07", pandora: 734, silver: 48.0 },
  { date: "2025-11-10", pandora: 760, silver: 50.2 },
  { date: "2025-11-11", pandora: 767, silver: 50.6 },
  { date: "2025-11-12", pandora: 763, silver: 53.3 },
  { date: "2025-11-13", pandora: 745, silver: 53.1 },
  { date: "2025-11-14", pandora: 752, silver: 50.6 },
  { date: "2025-11-17", pandora: 726, silver: 50.6 },
  { date: "2025-11-18", pandora: 705, silver: 50.5 },
  { date: "2025-11-19", pandora: 718, silver: 50.8 },
  { date: "2025-11-20", pandora: 711, silver: 50.2 },
  { date: "2025-11-21", pandora: 726, silver: 49.9 },
  { date: "2025-11-24", pandora: 716, silver: 50.3 },
  { date: "2025-11-25", pandora: 725, silver: 50.9 },
  { date: "2025-11-26", pandora: 730, silver: 52.9 },
  { date: "2025-11-28", pandora: 733, silver: 56.4 },
  { date: "2025-12-01", pandora: 733, silver: 58.4 },
  { date: "2025-12-02", pandora: 708, silver: 58.0 },
  { date: "2025-12-03", pandora: 692, silver: 57.9 },
  { date: "2025-12-04", pandora: 702, silver: 56.8 },
  { date: "2025-12-05", pandora: 705, silver: 58.4 },
  { date: "2025-12-08", pandora: 694, silver: 57.8 },
  { date: "2025-12-09", pandora: 688, silver: 60.2 },
  { date: "2025-12-10", pandora: 674, silver: 60.4 },
  { date: "2025-12-11", pandora: 674, silver: 63.9 },
  { date: "2025-12-12", pandora: 666, silver: 61.4 },
  { date: "2025-12-15", pandora: 660, silver: 62.9 },
  { date: "2025-12-16", pandora: 680, silver: 62.7 },
  { date: "2025-12-17", pandora: 662, silver: 66.2 },
  { date: "2025-12-18", pandora: 667, silver: 64.6 },
  { date: "2025-12-19", pandora: 666, silver: 66.8 },
  { date: "2025-12-22", pandora: 669, silver: 67.9 },
  { date: "2025-12-23", pandora: 670, silver: 70.5 },
  { date: "2025-12-29", pandora: 670, silver: 69.9 },
  { date: "2025-12-30", pandora: 674, silver: 77.4 },
  { date: "2026-01-02", pandora: 663, silver: 70.6 },
  { date: "2026-01-05", pandora: 645, silver: 76.2 },
  { date: "2026-01-06", pandora: 649, silver: 80.5 },
  { date: "2026-01-07", pandora: 631, silver: 77.1 },
  { date: "2026-01-08", pandora: 645, silver: 74.7 },
  { date: "2026-01-09", pandora: 561, silver: 78.9 },
  { date: "2026-01-12", pandora: 544, silver: 84.6 },
  { date: "2026-01-13", pandora: 545, silver: 85.9 },
  { date: "2026-01-14", pandora: 530, silver: 90.9 },
  { date: "2026-01-15", pandora: 520, silver: 91.9 },
  { date: "2026-01-16", pandora: 524, silver: 88.1 },
  { date: "2026-01-20", pandora: 492, silver: 94.2 },
  { date: "2026-01-21", pandora: 493, silver: 92.2 },
  { date: "2026-01-22", pandora: 486, silver: 96.0 },
  { date: "2026-01-23", pandora: 481, silver: 100.9 },
  { date: "2026-01-26", pandora: 464, silver: 115.1 },
  { date: "2026-01-27", pandora: 470, silver: 105.5 },
  { date: "2026-01-28", pandora: 464, silver: 113.1 },
  { date: "2026-01-29", pandora: 462, silver: 114.0 },
  { date: "2026-01-30", pandora: 485, silver: 78.3 },
  { date: "2026-02-02", pandora: 530, silver: 76.8 },
  { date: "2026-02-03", pandora: 481, silver: 83.0 },
  { date: "2026-02-04", pandora: 489, silver: 84.2 },
  { date: "2026-02-05", pandora: 516, silver: 76.5 },
  { date: "2026-02-06", pandora: 543, silver: 76.7 },
  { date: "2026-02-09", pandora: 511, silver: 82.1 },
  { date: "2026-02-10", pandora: 530, silver: 80.2 },
  { date: "2026-02-11", pandora: 509, silver: 83.8 },
  { date: "2026-02-12", pandora: 511, silver: 75.5 },
  { date: "2026-02-13", pandora: 515, silver: 77.9 },
  { date: "2026-02-17", pandora: 510, silver: 73.4 },
  { date: "2026-02-18", pandora: 510, silver: 77.5 },
  { date: "2026-02-19", pandora: 501, silver: 77.6 },
  { date: "2026-02-20", pandora: 522, silver: 82.3 },
  { date: "2026-02-23", pandora: 495, silver: 86.5 },
  { date: "2026-02-24", pandora: 501, silver: 87.5 },
  { date: "2026-02-25", pandora: 477, silver: 90.9 },
  { date: "2026-02-26", pandora: 492, silver: 87.0 },
  { date: "2026-02-27", pandora: 477, silver: 92.7 },
  { date: "2026-03-02", pandora: 463, silver: 88.3 },
  { date: "2026-03-03", pandora: 460, silver: 82.9 },
  { date: "2026-03-04", pandora: 463, silver: 82.6 },
  { date: "2026-03-05", pandora: 475, silver: 81.7 },
  { date: "2026-03-06", pandora: 470, silver: 83.8 },
  { date: "2026-03-09", pandora: 464, silver: 84.0 },
  { date: "2026-03-10", pandora: 457, silver: 89.1 },
  { date: "2026-03-11", pandora: 448, silver: 85.1 },
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

// Pandora stock price + University of Michigan Consumer Sentiment Index
const SENTIMENT_DATA: SentimentPoint[] = [
  { date: "2024-01-02", pandora: 863, sentiment: 79.0 },
  { date: "2024-01-03", pandora: 850, sentiment: 79.0 },
  { date: "2024-01-04", pandora: 857, sentiment: 79.0 },
  { date: "2024-01-05", pandora: 873, sentiment: 79.0 },
  { date: "2024-01-08", pandora: 903, sentiment: 79.0 },
  { date: "2024-01-09", pandora: 900, sentiment: 79.0 },
  { date: "2024-01-10", pandora: 920, sentiment: 79.0 },
  { date: "2024-01-11", pandora: 909, sentiment: 79.0 },
  { date: "2024-01-12", pandora: 902, sentiment: 79.0 },
  { date: "2024-01-15", pandora: 901, sentiment: 79.0 },
  { date: "2024-01-16", pandora: 910, sentiment: 79.0 },
  { date: "2024-01-17", pandora: 908, sentiment: 79.0 },
  { date: "2024-01-18", pandora: 894, sentiment: 79.0 },
  { date: "2024-01-19", pandora: 884, sentiment: 79.0 },
  { date: "2024-01-22", pandora: 898, sentiment: 79.0 },
  { date: "2024-01-23", pandora: 897, sentiment: 79.0 },
  { date: "2024-01-24", pandora: 912, sentiment: 79.0 },
  { date: "2024-01-25", pandora: 926, sentiment: 79.0 },
  { date: "2024-01-26", pandora: 915, sentiment: 79.0 },
  { date: "2024-01-29", pandora: 933, sentiment: 79.0 },
  { date: "2024-01-30", pandora: 939, sentiment: 79.0 },
  { date: "2024-01-31", pandora: 930, sentiment: 79.0 },
  { date: "2024-02-01", pandora: 922, sentiment: 76.9 },
  { date: "2024-02-02", pandora: 937, sentiment: 76.9 },
  { date: "2024-02-05", pandora: 937, sentiment: 76.9 },
  { date: "2024-02-06", pandora: 949, sentiment: 76.9 },
  { date: "2024-02-07", pandora: 945, sentiment: 76.9 },
  { date: "2024-02-08", pandora: 994, sentiment: 76.9 },
  { date: "2024-02-09", pandora: 1004, sentiment: 76.9 },
  { date: "2024-02-12", pandora: 1012, sentiment: 76.9 },
  { date: "2024-02-13", pandora: 1003, sentiment: 76.9 },
  { date: "2024-02-14", pandora: 1018, sentiment: 76.9 },
  { date: "2024-02-15", pandora: 1022, sentiment: 76.9 },
  { date: "2024-02-16", pandora: 1046, sentiment: 76.9 },
  { date: "2024-02-19", pandora: 1055, sentiment: 76.9 },
  { date: "2024-02-20", pandora: 1052, sentiment: 76.9 },
  { date: "2024-02-21", pandora: 1045, sentiment: 76.9 },
  { date: "2024-02-22", pandora: 1053, sentiment: 76.9 },
  { date: "2024-02-23", pandora: 1062, sentiment: 76.9 },
  { date: "2024-02-26", pandora: 1063, sentiment: 76.9 },
  { date: "2024-02-27", pandora: 1063, sentiment: 76.9 },
  { date: "2024-02-28", pandora: 1060, sentiment: 76.9 },
  { date: "2024-02-29", pandora: 1026, sentiment: 76.9 },
  { date: "2024-03-01", pandora: 1058, sentiment: 79.4 },
  { date: "2024-03-04", pandora: 1049, sentiment: 79.4 },
  { date: "2024-03-05", pandora: 1038, sentiment: 79.4 },
  { date: "2024-03-06", pandora: 1027, sentiment: 79.4 },
  { date: "2024-03-07", pandora: 1047, sentiment: 79.4 },
  { date: "2024-03-08", pandora: 1067, sentiment: 79.4 },
  { date: "2024-03-11", pandora: 1052, sentiment: 79.4 },
  { date: "2024-03-12", pandora: 1071, sentiment: 79.4 },
  { date: "2024-03-13", pandora: 1072, sentiment: 79.4 },
  { date: "2024-03-14", pandora: 1087, sentiment: 79.4 },
  { date: "2024-03-15", pandora: 1073, sentiment: 79.4 },
  { date: "2024-03-18", pandora: 1069, sentiment: 79.4 },
  { date: "2024-03-19", pandora: 1076, sentiment: 79.4 },
  { date: "2024-03-20", pandora: 1070, sentiment: 79.4 },
  { date: "2024-03-21", pandora: 1089, sentiment: 79.4 },
  { date: "2024-03-22", pandora: 1050, sentiment: 79.4 },
  { date: "2024-03-25", pandora: 1052, sentiment: 79.4 },
  { date: "2024-03-26", pandora: 1068, sentiment: 79.4 },
  { date: "2024-03-27", pandora: 1043, sentiment: 79.4 },
  { date: "2024-04-02", pandora: 1028, sentiment: 77.2 },
  { date: "2024-04-03", pandora: 1039, sentiment: 77.2 },
  { date: "2024-04-04", pandora: 1028, sentiment: 77.2 },
  { date: "2024-04-05", pandora: 1026, sentiment: 77.2 },
  { date: "2024-04-08", pandora: 1020, sentiment: 77.2 },
  { date: "2024-04-09", pandora: 1006, sentiment: 77.2 },
  { date: "2024-04-10", pandora: 1023, sentiment: 77.2 },
  { date: "2024-04-11", pandora: 1027, sentiment: 77.2 },
  { date: "2024-04-12", pandora: 996, sentiment: 77.2 },
  { date: "2024-04-15", pandora: 1011, sentiment: 77.2 },
  { date: "2024-04-16", pandora: 999, sentiment: 77.2 },
  { date: "2024-04-17", pandora: 1010, sentiment: 77.2 },
  { date: "2024-04-18", pandora: 1006, sentiment: 77.2 },
  { date: "2024-04-19", pandora: 1013, sentiment: 77.2 },
  { date: "2024-04-22", pandora: 1033, sentiment: 77.2 },
  { date: "2024-04-23", pandora: 1029, sentiment: 77.2 },
  { date: "2024-04-24", pandora: 1025, sentiment: 77.2 },
  { date: "2024-04-25", pandora: 1009, sentiment: 77.2 },
  { date: "2024-04-26", pandora: 1030, sentiment: 77.2 },
  { date: "2024-04-29", pandora: 1017, sentiment: 77.2 },
  { date: "2024-04-30", pandora: 1001, sentiment: 77.2 },
  { date: "2024-05-01", pandora: 1014, sentiment: 69.1 },
  { date: "2024-05-02", pandora: 1076, sentiment: 69.1 },
  { date: "2024-05-03", pandora: 1048, sentiment: 69.1 },
  { date: "2024-05-06", pandora: 1043, sentiment: 69.1 },
  { date: "2024-05-07", pandora: 1041, sentiment: 69.1 },
  { date: "2024-05-08", pandora: 1059, sentiment: 69.1 },
  { date: "2024-05-13", pandora: 1088, sentiment: 69.1 },
  { date: "2024-05-14", pandora: 1058, sentiment: 69.1 },
  { date: "2024-05-15", pandora: 1074, sentiment: 69.1 },
  { date: "2024-05-16", pandora: 1090, sentiment: 69.1 },
  { date: "2024-05-17", pandora: 1095, sentiment: 69.1 },
  { date: "2024-05-21", pandora: 1075, sentiment: 69.1 },
  { date: "2024-05-22", pandora: 1043, sentiment: 69.1 },
  { date: "2024-05-23", pandora: 1067, sentiment: 69.1 },
  { date: "2024-05-24", pandora: 1067, sentiment: 69.1 },
  { date: "2024-05-27", pandora: 1066, sentiment: 69.1 },
  { date: "2024-05-28", pandora: 1043, sentiment: 69.1 },
  { date: "2024-05-29", pandora: 1045, sentiment: 69.1 },
  { date: "2024-05-30", pandora: 1044, sentiment: 69.1 },
  { date: "2024-05-31", pandora: 1052, sentiment: 69.1 },
  { date: "2024-06-03", pandora: 1035, sentiment: 68.2 },
  { date: "2024-06-04", pandora: 1028, sentiment: 68.2 },
  { date: "2024-06-06", pandora: 1025, sentiment: 68.2 },
  { date: "2024-06-07", pandora: 1047, sentiment: 68.2 },
  { date: "2024-06-10", pandora: 1045, sentiment: 68.2 },
  { date: "2024-06-11", pandora: 1022, sentiment: 68.2 },
  { date: "2024-06-12", pandora: 1031, sentiment: 68.2 },
  { date: "2024-06-13", pandora: 1011, sentiment: 68.2 },
  { date: "2024-06-14", pandora: 985, sentiment: 68.2 },
  { date: "2024-06-17", pandora: 983, sentiment: 68.2 },
  { date: "2024-06-18", pandora: 984, sentiment: 68.2 },
  { date: "2024-06-19", pandora: 986, sentiment: 68.2 },
  { date: "2024-06-20", pandora: 1009, sentiment: 68.2 },
  { date: "2024-06-21", pandora: 997, sentiment: 68.2 },
  { date: "2024-06-24", pandora: 999, sentiment: 68.2 },
  { date: "2024-06-25", pandora: 994, sentiment: 68.2 },
  { date: "2024-06-26", pandora: 999, sentiment: 68.2 },
  { date: "2024-06-27", pandora: 990, sentiment: 68.2 },
  { date: "2024-06-28", pandora: 984, sentiment: 68.2 },
  { date: "2024-07-01", pandora: 945, sentiment: 66.4 },
  { date: "2024-07-02", pandora: 936, sentiment: 66.4 },
  { date: "2024-07-03", pandora: 934, sentiment: 66.4 },
  { date: "2024-07-04", pandora: 919, sentiment: 66.4 },
  { date: "2024-07-05", pandora: 932, sentiment: 66.4 },
  { date: "2024-07-08", pandora: 949, sentiment: 66.4 },
  { date: "2024-07-09", pandora: 955, sentiment: 66.4 },
  { date: "2024-07-10", pandora: 954, sentiment: 66.4 },
  { date: "2024-07-11", pandora: 962, sentiment: 66.4 },
  { date: "2024-07-12", pandora: 990, sentiment: 66.4 },
  { date: "2024-07-15", pandora: 987, sentiment: 66.4 },
  { date: "2024-07-16", pandora: 1005, sentiment: 66.4 },
  { date: "2024-07-17", pandora: 993, sentiment: 66.4 },
  { date: "2024-07-18", pandora: 985, sentiment: 66.4 },
  { date: "2024-07-19", pandora: 986, sentiment: 66.4 },
  { date: "2024-07-22", pandora: 1008, sentiment: 66.4 },
  { date: "2024-07-23", pandora: 999, sentiment: 66.4 },
  { date: "2024-07-24", pandora: 1003, sentiment: 66.4 },
  { date: "2024-07-25", pandora: 984, sentiment: 66.4 },
  { date: "2024-07-26", pandora: 991, sentiment: 66.4 },
  { date: "2024-07-29", pandora: 1007, sentiment: 66.4 },
  { date: "2024-07-30", pandora: 1019, sentiment: 66.4 },
  { date: "2024-07-31", pandora: 1012, sentiment: 66.4 },
  { date: "2024-08-01", pandora: 1008, sentiment: 67.9 },
  { date: "2024-08-02", pandora: 947, sentiment: 67.9 },
  { date: "2024-08-05", pandora: 914, sentiment: 67.9 },
  { date: "2024-08-06", pandora: 933, sentiment: 67.9 },
  { date: "2024-08-07", pandora: 943, sentiment: 67.9 },
  { date: "2024-08-08", pandora: 950, sentiment: 67.9 },
  { date: "2024-08-09", pandora: 960, sentiment: 67.9 },
  { date: "2024-08-12", pandora: 975, sentiment: 67.9 },
  { date: "2024-08-13", pandora: 1010, sentiment: 67.9 },
  { date: "2024-08-14", pandora: 993, sentiment: 67.9 },
  { date: "2024-08-15", pandora: 994, sentiment: 67.9 },
  { date: "2024-08-16", pandora: 999, sentiment: 67.9 },
  { date: "2024-08-19", pandora: 1024, sentiment: 67.9 },
  { date: "2024-08-20", pandora: 1043, sentiment: 67.9 },
  { date: "2024-08-21", pandora: 1048, sentiment: 67.9 },
  { date: "2024-08-22", pandora: 1061, sentiment: 67.9 },
  { date: "2024-08-23", pandora: 1071, sentiment: 67.9 },
  { date: "2024-08-26", pandora: 1074, sentiment: 67.9 },
  { date: "2024-08-27", pandora: 1083, sentiment: 67.9 },
  { date: "2024-08-28", pandora: 1085, sentiment: 67.9 },
  { date: "2024-08-29", pandora: 1096, sentiment: 67.9 },
  { date: "2024-08-30", pandora: 1106, sentiment: 67.9 },
  { date: "2024-09-02", pandora: 1100, sentiment: 70.1 },
  { date: "2024-09-03", pandora: 1104, sentiment: 70.1 },
  { date: "2024-09-04", pandora: 1098, sentiment: 70.1 },
  { date: "2024-09-05", pandora: 1084, sentiment: 70.1 },
  { date: "2024-09-06", pandora: 1073, sentiment: 70.1 },
  { date: "2024-09-09", pandora: 1080, sentiment: 70.1 },
  { date: "2024-09-10", pandora: 1065, sentiment: 70.1 },
  { date: "2024-09-11", pandora: 1084, sentiment: 70.1 },
  { date: "2024-09-12", pandora: 1109, sentiment: 70.1 },
  { date: "2024-09-13", pandora: 1127, sentiment: 70.1 },
  { date: "2024-09-16", pandora: 1115, sentiment: 70.1 },
  { date: "2024-09-17", pandora: 1092, sentiment: 70.1 },
  { date: "2024-09-18", pandora: 1073, sentiment: 70.1 },
  { date: "2024-09-19", pandora: 1100, sentiment: 70.1 },
  { date: "2024-09-20", pandora: 1072, sentiment: 70.1 },
  { date: "2024-09-23", pandora: 1072, sentiment: 70.1 },
  { date: "2024-09-24", pandora: 1088, sentiment: 70.1 },
  { date: "2024-09-25", pandora: 1048, sentiment: 70.1 },
  { date: "2024-09-26", pandora: 1034, sentiment: 70.1 },
  { date: "2024-09-27", pandora: 1029, sentiment: 70.1 },
  { date: "2024-09-30", pandora: 1032, sentiment: 70.1 },
  { date: "2024-10-01", pandora: 1000, sentiment: 70.5 },
  { date: "2024-10-02", pandora: 996, sentiment: 70.5 },
  { date: "2024-10-03", pandora: 984, sentiment: 70.5 },
  { date: "2024-10-04", pandora: 988, sentiment: 70.5 },
  { date: "2024-10-07", pandora: 978, sentiment: 70.5 },
  { date: "2024-10-08", pandora: 999, sentiment: 70.5 },
  { date: "2024-10-09", pandora: 992, sentiment: 70.5 },
  { date: "2024-10-10", pandora: 1003, sentiment: 70.5 },
  { date: "2024-10-11", pandora: 1009, sentiment: 70.5 },
  { date: "2024-10-14", pandora: 997, sentiment: 70.5 },
  { date: "2024-10-15", pandora: 995, sentiment: 70.5 },
  { date: "2024-10-16", pandora: 995, sentiment: 70.5 },
  { date: "2024-10-17", pandora: 1013, sentiment: 70.5 },
  { date: "2024-10-18", pandora: 1005, sentiment: 70.5 },
  { date: "2024-10-21", pandora: 983, sentiment: 70.5 },
  { date: "2024-10-22", pandora: 965, sentiment: 70.5 },
  { date: "2024-10-23", pandora: 959, sentiment: 70.5 },
  { date: "2024-10-24", pandora: 981, sentiment: 70.5 },
  { date: "2024-10-25", pandora: 974, sentiment: 70.5 },
  { date: "2024-10-28", pandora: 982, sentiment: 70.5 },
  { date: "2024-10-29", pandora: 999, sentiment: 70.5 },
  { date: "2024-10-30", pandora: 988, sentiment: 70.5 },
  { date: "2024-10-31", pandora: 968, sentiment: 70.5 },
  { date: "2024-11-01", pandora: 992, sentiment: 71.8 },
  { date: "2024-11-04", pandora: 993, sentiment: 71.8 },
  { date: "2024-11-05", pandora: 992, sentiment: 71.8 },
  { date: "2024-11-06", pandora: 975, sentiment: 71.8 },
  { date: "2024-11-07", pandora: 987, sentiment: 71.8 },
  { date: "2024-11-08", pandora: 997, sentiment: 71.8 },
  { date: "2024-11-11", pandora: 1008, sentiment: 71.8 },
  { date: "2024-11-12", pandora: 1025, sentiment: 71.8 },
  { date: "2024-11-13", pandora: 1022, sentiment: 71.8 },
  { date: "2024-11-14", pandora: 1027, sentiment: 71.8 },
  { date: "2024-11-15", pandora: 1016, sentiment: 71.8 },
  { date: "2024-11-18", pandora: 1025, sentiment: 71.8 },
  { date: "2024-11-19", pandora: 1000, sentiment: 71.8 },
  { date: "2024-11-20", pandora: 1011, sentiment: 71.8 },
  { date: "2024-11-21", pandora: 1017, sentiment: 71.8 },
  { date: "2024-11-22", pandora: 1049, sentiment: 71.8 },
  { date: "2024-11-25", pandora: 1052, sentiment: 71.8 },
  { date: "2024-11-26", pandora: 1046, sentiment: 71.8 },
  { date: "2024-11-27", pandora: 1037, sentiment: 71.8 },
  { date: "2024-11-28", pandora: 1046, sentiment: 71.8 },
  { date: "2024-11-29", pandora: 1064, sentiment: 71.8 },
  { date: "2024-12-02", pandora: 1090, sentiment: 74.0 },
  { date: "2024-12-03", pandora: 1111, sentiment: 74.0 },
  { date: "2024-12-04", pandora: 1112, sentiment: 74.0 },
  { date: "2024-12-05", pandora: 1102, sentiment: 74.0 },
  { date: "2024-12-06", pandora: 1138, sentiment: 74.0 },
  { date: "2024-12-09", pandora: 1177, sentiment: 74.0 },
  { date: "2024-12-10", pandora: 1182, sentiment: 74.0 },
  { date: "2024-12-11", pandora: 1195, sentiment: 74.0 },
  { date: "2024-12-12", pandora: 1185, sentiment: 74.0 },
  { date: "2024-12-13", pandora: 1194, sentiment: 74.0 },
  { date: "2024-12-16", pandora: 1198, sentiment: 74.0 },
  { date: "2024-12-17", pandora: 1178, sentiment: 74.0 },
  { date: "2024-12-18", pandora: 1190, sentiment: 74.0 },
  { date: "2024-12-19", pandora: 1183, sentiment: 74.0 },
  { date: "2024-12-20", pandora: 1193, sentiment: 74.0 },
  { date: "2024-12-23", pandora: 1212, sentiment: 74.0 },
  { date: "2024-12-27", pandora: 1244, sentiment: 74.0 },
  { date: "2024-12-30", pandora: 1233, sentiment: 74.0 },
  { date: "2025-01-02", pandora: 1236, sentiment: 71.1 },
  { date: "2025-01-03", pandora: 1234, sentiment: 71.1 },
  { date: "2025-01-06", pandora: 1230, sentiment: 71.1 },
  { date: "2025-01-07", pandora: 1222, sentiment: 71.1 },
  { date: "2025-01-08", pandora: 1227, sentiment: 71.1 },
  { date: "2025-01-09", pandora: 1236, sentiment: 71.1 },
  { date: "2025-01-10", pandora: 1247, sentiment: 71.1 },
  { date: "2025-01-13", pandora: 1189, sentiment: 71.1 },
  { date: "2025-01-14", pandora: 1162, sentiment: 71.1 },
  { date: "2025-01-15", pandora: 1170, sentiment: 71.1 },
  { date: "2025-01-16", pandora: 1187, sentiment: 71.1 },
  { date: "2025-01-17", pandora: 1200, sentiment: 71.1 },
  { date: "2025-01-20", pandora: 1199, sentiment: 71.1 },
  { date: "2025-01-21", pandora: 1220, sentiment: 71.1 },
  { date: "2025-01-22", pandora: 1237, sentiment: 71.1 },
  { date: "2025-01-23", pandora: 1256, sentiment: 71.1 },
  { date: "2025-01-24", pandora: 1244, sentiment: 71.1 },
  { date: "2025-01-27", pandora: 1275, sentiment: 71.1 },
  { date: "2025-01-28", pandora: 1268, sentiment: 71.1 },
  { date: "2025-01-29", pandora: 1290, sentiment: 71.1 },
  { date: "2025-01-30", pandora: 1311, sentiment: 71.1 },
  { date: "2025-01-31", pandora: 1293, sentiment: 71.1 },
  { date: "2025-02-03", pandora: 1292, sentiment: 64.7 },
  { date: "2025-02-04", pandora: 1286, sentiment: 64.7 },
  { date: "2025-02-05", pandora: 1256, sentiment: 64.7 },
  { date: "2025-02-06", pandora: 1261, sentiment: 64.7 },
  { date: "2025-02-07", pandora: 1235, sentiment: 64.7 },
  { date: "2025-02-10", pandora: 1247, sentiment: 64.7 },
  { date: "2025-02-11", pandora: 1238, sentiment: 64.7 },
  { date: "2025-02-12", pandora: 1243, sentiment: 64.7 },
  { date: "2025-02-13", pandora: 1235, sentiment: 64.7 },
  { date: "2025-02-14", pandora: 1181, sentiment: 64.7 },
  { date: "2025-02-17", pandora: 1177, sentiment: 64.7 },
  { date: "2025-02-18", pandora: 1176, sentiment: 64.7 },
  { date: "2025-02-19", pandora: 1168, sentiment: 64.7 },
  { date: "2025-02-20", pandora: 1160, sentiment: 64.7 },
  { date: "2025-02-21", pandora: 1196, sentiment: 64.7 },
  { date: "2025-02-24", pandora: 1163, sentiment: 64.7 },
  { date: "2025-02-25", pandora: 1183, sentiment: 64.7 },
  { date: "2025-02-26", pandora: 1187, sentiment: 64.7 },
  { date: "2025-02-27", pandora: 1161, sentiment: 64.7 },
  { date: "2025-02-28", pandora: 1187, sentiment: 64.7 },
  { date: "2025-03-03", pandora: 1165, sentiment: 57.0 },
  { date: "2025-03-04", pandora: 1137, sentiment: 57.0 },
  { date: "2025-03-05", pandora: 1121, sentiment: 57.0 },
  { date: "2025-03-06", pandora: 1094, sentiment: 57.0 },
  { date: "2025-03-07", pandora: 1087, sentiment: 57.0 },
  { date: "2025-03-10", pandora: 1075, sentiment: 57.0 },
  { date: "2025-03-11", pandora: 1055, sentiment: 57.0 },
  { date: "2025-03-12", pandora: 1057, sentiment: 57.0 },
  { date: "2025-03-13", pandora: 1059, sentiment: 57.0 },
  { date: "2025-03-14", pandora: 1052, sentiment: 57.0 },
  { date: "2025-03-17", pandora: 1053, sentiment: 57.0 },
  { date: "2025-03-18", pandora: 1025, sentiment: 57.0 },
  { date: "2025-03-19", pandora: 1065, sentiment: 57.0 },
  { date: "2025-03-20", pandora: 1080, sentiment: 57.0 },
  { date: "2025-03-21", pandora: 1063, sentiment: 57.0 },
  { date: "2025-03-24", pandora: 1080, sentiment: 57.0 },
  { date: "2025-03-25", pandora: 1057, sentiment: 57.0 },
  { date: "2025-03-26", pandora: 1058, sentiment: 57.0 },
  { date: "2025-03-27", pandora: 1038, sentiment: 57.0 },
  { date: "2025-03-28", pandora: 1017, sentiment: 57.0 },
  { date: "2025-03-31", pandora: 1005, sentiment: 57.0 },
  { date: "2025-04-01", pandora: 1011, sentiment: 52.2 },
  { date: "2025-04-02", pandora: 1013, sentiment: 52.2 },
  { date: "2025-04-03", pandora: 905, sentiment: 52.2 },
  { date: "2025-04-04", pandora: 832, sentiment: 52.2 },
  { date: "2025-04-07", pandora: 862, sentiment: 52.2 },
  { date: "2025-04-08", pandora: 878, sentiment: 52.2 },
  { date: "2025-04-09", pandora: 842, sentiment: 52.2 },
  { date: "2025-04-10", pandora: 905, sentiment: 52.2 },
  { date: "2025-04-11", pandora: 889, sentiment: 52.2 },
  { date: "2025-04-14", pandora: 905, sentiment: 52.2 },
  { date: "2025-04-15", pandora: 910, sentiment: 52.2 },
  { date: "2025-04-16", pandora: 878, sentiment: 52.2 },
  { date: "2025-04-22", pandora: 894, sentiment: 52.2 },
  { date: "2025-04-23", pandora: 937, sentiment: 52.2 },
  { date: "2025-04-24", pandora: 914, sentiment: 52.2 },
  { date: "2025-04-25", pandora: 919, sentiment: 52.2 },
  { date: "2025-04-28", pandora: 932, sentiment: 52.2 },
  { date: "2025-04-29", pandora: 931, sentiment: 52.2 },
  { date: "2025-04-30", pandora: 927, sentiment: 52.2 },
  { date: "2025-05-01", pandora: 938, sentiment: 50.8 },
  { date: "2025-05-02", pandora: 957, sentiment: 50.8 },
  { date: "2025-05-05", pandora: 957, sentiment: 50.8 },
  { date: "2025-05-06", pandora: 936, sentiment: 50.8 },
  { date: "2025-05-07", pandora: 952, sentiment: 50.8 },
  { date: "2025-05-08", pandora: 959, sentiment: 50.8 },
  { date: "2025-05-09", pandora: 984, sentiment: 50.8 },
  { date: "2025-05-12", pandora: 1060, sentiment: 50.8 },
  { date: "2025-05-13", pandora: 1083, sentiment: 50.8 },
  { date: "2025-05-14", pandora: 1101, sentiment: 50.8 },
  { date: "2025-05-15", pandora: 1101, sentiment: 50.8 },
  { date: "2025-05-16", pandora: 1141, sentiment: 50.8 },
  { date: "2025-05-19", pandora: 1154, sentiment: 50.8 },
  { date: "2025-05-20", pandora: 1156, sentiment: 50.8 },
  { date: "2025-05-21", pandora: 1156, sentiment: 50.8 },
  { date: "2025-05-22", pandora: 1136, sentiment: 50.8 },
  { date: "2025-05-23", pandora: 1130, sentiment: 50.8 },
  { date: "2025-05-26", pandora: 1146, sentiment: 50.8 },
  { date: "2025-05-27", pandora: 1161, sentiment: 50.8 },
  { date: "2025-05-28", pandora: 1140, sentiment: 50.8 },
  { date: "2025-06-02", pandora: 1123, sentiment: 50.0 },
  { date: "2025-06-03", pandora: 1143, sentiment: 50.0 },
  { date: "2025-06-04", pandora: 1162, sentiment: 50.0 },
  { date: "2025-06-06", pandora: 1130, sentiment: 50.0 },
  { date: "2025-06-10", pandora: 1128, sentiment: 50.0 },
  { date: "2025-06-11", pandora: 1138, sentiment: 50.0 },
  { date: "2025-06-12", pandora: 1123, sentiment: 50.0 },
  { date: "2025-06-13", pandora: 1095, sentiment: 50.0 },
  { date: "2025-06-16", pandora: 1143, sentiment: 50.0 },
  { date: "2025-06-17", pandora: 1118, sentiment: 50.0 },
  { date: "2025-06-18", pandora: 1119, sentiment: 50.0 },
  { date: "2025-06-19", pandora: 1098, sentiment: 50.0 },
  { date: "2025-06-20", pandora: 1113, sentiment: 50.0 },
  { date: "2025-06-23", pandora: 1054, sentiment: 50.0 },
  { date: "2025-06-24", pandora: 1082, sentiment: 50.0 },
  { date: "2025-06-25", pandora: 1051, sentiment: 50.0 },
  { date: "2025-06-26", pandora: 1032, sentiment: 50.0 },
  { date: "2025-06-27", pandora: 1059, sentiment: 50.0 },
  { date: "2025-06-30", pandora: 1060, sentiment: 50.0 },
  { date: "2025-07-01", pandora: 1056, sentiment: 53.5 },
  { date: "2025-07-02", pandora: 1055, sentiment: 53.5 },
  { date: "2025-07-03", pandora: 1052, sentiment: 53.5 },
  { date: "2025-07-04", pandora: 1035, sentiment: 53.5 },
  { date: "2025-07-07", pandora: 1015, sentiment: 53.5 },
  { date: "2025-07-08", pandora: 1016, sentiment: 53.5 },
  { date: "2025-07-09", pandora: 1026, sentiment: 53.5 },
  { date: "2025-07-10", pandora: 1019, sentiment: 53.5 },
  { date: "2025-07-11", pandora: 1005, sentiment: 53.5 },
  { date: "2025-07-14", pandora: 990, sentiment: 53.5 },
  { date: "2025-07-15", pandora: 972, sentiment: 53.5 },
  { date: "2025-07-16", pandora: 988, sentiment: 53.5 },
  { date: "2025-07-17", pandora: 997, sentiment: 53.5 },
  { date: "2025-07-18", pandora: 1000, sentiment: 53.5 },
  { date: "2025-07-21", pandora: 988, sentiment: 53.5 },
  { date: "2025-07-22", pandora: 990, sentiment: 53.5 },
  { date: "2025-07-23", pandora: 1001, sentiment: 53.5 },
  { date: "2025-07-24", pandora: 1015, sentiment: 53.5 },
  { date: "2025-07-25", pandora: 1007, sentiment: 53.5 },
  { date: "2025-07-28", pandora: 1026, sentiment: 53.5 },
  { date: "2025-07-29", pandora: 1019, sentiment: 53.5 },
  { date: "2025-07-30", pandora: 1025, sentiment: 53.5 },
  { date: "2025-07-31", pandora: 1035, sentiment: 53.5 },
  { date: "2025-08-01", pandora: 1024, sentiment: 58.2 },
  { date: "2025-08-04", pandora: 1034, sentiment: 58.2 },
  { date: "2025-08-05", pandora: 1023, sentiment: 58.2 },
  { date: "2025-08-06", pandora: 988, sentiment: 58.2 },
  { date: "2025-08-07", pandora: 989, sentiment: 58.2 },
  { date: "2025-08-08", pandora: 984, sentiment: 58.2 },
  { date: "2025-08-11", pandora: 981, sentiment: 58.2 },
  { date: "2025-08-12", pandora: 966, sentiment: 58.2 },
  { date: "2025-08-13", pandora: 988, sentiment: 58.2 },
  { date: "2025-08-14", pandora: 987, sentiment: 58.2 },
  { date: "2025-08-15", pandora: 805, sentiment: 58.2 },
  { date: "2025-08-18", pandora: 803, sentiment: 58.2 },
  { date: "2025-08-19", pandora: 834, sentiment: 58.2 },
  { date: "2025-08-20", pandora: 854, sentiment: 58.2 },
  { date: "2025-08-21", pandora: 848, sentiment: 58.2 },
  { date: "2025-08-22", pandora: 869, sentiment: 58.2 },
  { date: "2025-08-25", pandora: 845, sentiment: 58.2 },
  { date: "2025-08-26", pandora: 858, sentiment: 58.2 },
  { date: "2025-08-27", pandora: 858, sentiment: 58.2 },
  { date: "2025-08-28", pandora: 857, sentiment: 58.2 },
  { date: "2025-08-29", pandora: 840, sentiment: 58.2 },
  { date: "2025-09-01", pandora: 822, sentiment: 55.1 },
  { date: "2025-09-02", pandora: 802, sentiment: 55.1 },
  { date: "2025-09-03", pandora: 805, sentiment: 55.1 },
  { date: "2025-09-04", pandora: 819, sentiment: 55.1 },
  { date: "2025-09-05", pandora: 819, sentiment: 55.1 },
  { date: "2025-09-08", pandora: 820, sentiment: 55.1 },
  { date: "2025-09-09", pandora: 818, sentiment: 55.1 },
  { date: "2025-09-10", pandora: 820, sentiment: 55.1 },
  { date: "2025-09-11", pandora: 826, sentiment: 55.1 },
  { date: "2025-09-12", pandora: 830, sentiment: 55.1 },
  { date: "2025-09-15", pandora: 830, sentiment: 55.1 },
  { date: "2025-09-16", pandora: 825, sentiment: 55.1 },
  { date: "2025-09-17", pandora: 826, sentiment: 55.1 },
  { date: "2025-09-18", pandora: 844, sentiment: 55.1 },
  { date: "2025-09-19", pandora: 834, sentiment: 55.1 },
  { date: "2025-09-22", pandora: 816, sentiment: 55.1 },
  { date: "2025-09-23", pandora: 814, sentiment: 55.1 },
  { date: "2025-09-24", pandora: 795, sentiment: 55.1 },
  { date: "2025-09-25", pandora: 791, sentiment: 55.1 },
  { date: "2025-09-26", pandora: 798, sentiment: 55.1 },
  { date: "2025-09-29", pandora: 811, sentiment: 55.1 },
  { date: "2025-09-30", pandora: 790, sentiment: 55.1 },
  { date: "2025-10-01", pandora: 803, sentiment: 53.6 },
  { date: "2025-10-02", pandora: 792, sentiment: 53.6 },
  { date: "2025-10-03", pandora: 782, sentiment: 53.6 },
  { date: "2025-10-06", pandora: 786, sentiment: 53.6 },
  { date: "2025-10-07", pandora: 787, sentiment: 53.6 },
  { date: "2025-10-08", pandora: 801, sentiment: 53.6 },
  { date: "2025-10-09", pandora: 788, sentiment: 53.6 },
  { date: "2025-10-10", pandora: 773, sentiment: 53.6 },
  { date: "2025-10-13", pandora: 761, sentiment: 53.6 },
  { date: "2025-10-14", pandora: 758, sentiment: 53.6 },
  { date: "2025-10-15", pandora: 775, sentiment: 53.6 },
  { date: "2025-10-16", pandora: 784, sentiment: 53.6 },
  { date: "2025-10-17", pandora: 785, sentiment: 53.6 },
  { date: "2025-10-20", pandora: 794, sentiment: 53.6 },
  { date: "2025-10-21", pandora: 827, sentiment: 53.6 },
  { date: "2025-10-22", pandora: 824, sentiment: 53.6 },
  { date: "2025-10-23", pandora: 842, sentiment: 53.6 },
  { date: "2025-10-24", pandora: 848, sentiment: 53.6 },
  { date: "2025-10-27", pandora: 848, sentiment: 53.6 },
  { date: "2025-10-28", pandora: 840, sentiment: 53.6 },
  { date: "2025-10-29", pandora: 838, sentiment: 53.6 },
  { date: "2025-10-30", pandora: 830, sentiment: 53.6 },
  { date: "2025-10-31", pandora: 827, sentiment: 53.6 },
  { date: "2025-11-03", pandora: 788, sentiment: 51.0 },
  { date: "2025-11-04", pandora: 774, sentiment: 51.0 },
  { date: "2025-11-05", pandora: 732, sentiment: 51.0 },
  { date: "2025-11-06", pandora: 742, sentiment: 51.0 },
  { date: "2025-11-07", pandora: 734, sentiment: 51.0 },
  { date: "2025-11-10", pandora: 760, sentiment: 51.0 },
  { date: "2025-11-11", pandora: 767, sentiment: 51.0 },
  { date: "2025-11-12", pandora: 763, sentiment: 51.0 },
  { date: "2025-11-13", pandora: 745, sentiment: 51.0 },
  { date: "2025-11-14", pandora: 752, sentiment: 51.0 },
  { date: "2025-11-17", pandora: 726, sentiment: 51.0 },
  { date: "2025-11-18", pandora: 705, sentiment: 51.0 },
  { date: "2025-11-19", pandora: 718, sentiment: 51.0 },
  { date: "2025-11-20", pandora: 711, sentiment: 51.0 },
  { date: "2025-11-21", pandora: 726, sentiment: 51.0 },
  { date: "2025-11-24", pandora: 716, sentiment: 51.0 },
  { date: "2025-11-25", pandora: 725, sentiment: 51.0 },
  { date: "2025-11-26", pandora: 730, sentiment: 51.0 },
  { date: "2025-11-27", pandora: 734, sentiment: 51.0 },
  { date: "2025-11-28", pandora: 733, sentiment: 51.0 },
  { date: "2025-12-01", pandora: 733, sentiment: 52.9 },
  { date: "2025-12-02", pandora: 708, sentiment: 52.9 },
  { date: "2025-12-03", pandora: 692, sentiment: 52.9 },
  { date: "2025-12-04", pandora: 702, sentiment: 52.9 },
  { date: "2025-12-05", pandora: 705, sentiment: 52.9 },
  { date: "2025-12-08", pandora: 694, sentiment: 52.9 },
  { date: "2025-12-09", pandora: 688, sentiment: 52.9 },
  { date: "2025-12-10", pandora: 674, sentiment: 52.9 },
  { date: "2025-12-11", pandora: 674, sentiment: 52.9 },
  { date: "2025-12-12", pandora: 666, sentiment: 52.9 },
  { date: "2025-12-15", pandora: 660, sentiment: 52.9 },
  { date: "2025-12-16", pandora: 680, sentiment: 52.9 },
  { date: "2025-12-17", pandora: 662, sentiment: 52.9 },
  { date: "2025-12-18", pandora: 667, sentiment: 52.9 },
  { date: "2025-12-19", pandora: 666, sentiment: 52.9 },
  { date: "2025-12-22", pandora: 669, sentiment: 52.9 },
  { date: "2025-12-23", pandora: 670, sentiment: 52.9 },
  { date: "2025-12-29", pandora: 670, sentiment: 52.9 },
  { date: "2025-12-30", pandora: 674, sentiment: 52.9 },
  { date: "2026-01-02", pandora: 663, sentiment: 53.1 },
  { date: "2026-01-05", pandora: 645, sentiment: 53.1 },
  { date: "2026-01-06", pandora: 649, sentiment: 53.1 },
  { date: "2026-01-07", pandora: 631, sentiment: 53.1 },
  { date: "2026-01-08", pandora: 645, sentiment: 53.1 },
  { date: "2026-01-09", pandora: 561, sentiment: 53.1 },
  { date: "2026-01-12", pandora: 544, sentiment: 53.1 },
  { date: "2026-01-13", pandora: 545, sentiment: 53.1 },
  { date: "2026-01-14", pandora: 530, sentiment: 53.1 },
  { date: "2026-01-15", pandora: 520, sentiment: 53.1 },
  { date: "2026-01-16", pandora: 524, sentiment: 53.1 },
  { date: "2026-01-19", pandora: 495, sentiment: 53.1 },
  { date: "2026-01-20", pandora: 492, sentiment: 53.1 },
  { date: "2026-01-21", pandora: 493, sentiment: 53.1 },
  { date: "2026-01-22", pandora: 486, sentiment: 53.1 },
  { date: "2026-01-23", pandora: 481, sentiment: 53.1 },
  { date: "2026-01-26", pandora: 464, sentiment: 53.1 },
  { date: "2026-01-27", pandora: 470, sentiment: 53.1 },
  { date: "2026-01-28", pandora: 464, sentiment: 53.1 },
  { date: "2026-01-29", pandora: 462, sentiment: 53.1 },
  { date: "2026-01-30", pandora: 485, sentiment: 53.1 },
  { date: "2026-02-02", pandora: 530, sentiment: 55.0 },
  { date: "2026-02-03", pandora: 481, sentiment: 55.0 },
  { date: "2026-02-04", pandora: 489, sentiment: 55.0 },
  { date: "2026-02-05", pandora: 516, sentiment: 55.0 },
  { date: "2026-02-06", pandora: 543, sentiment: 55.0 },
  { date: "2026-02-09", pandora: 511, sentiment: 55.0 },
  { date: "2026-02-10", pandora: 530, sentiment: 55.0 },
  { date: "2026-02-11", pandora: 509, sentiment: 55.0 },
  { date: "2026-02-12", pandora: 511, sentiment: 55.0 },
  { date: "2026-02-13", pandora: 515, sentiment: 55.0 },
  { date: "2026-02-16", pandora: 514, sentiment: 55.0 },
  { date: "2026-02-17", pandora: 510, sentiment: 55.0 },
  { date: "2026-02-18", pandora: 510, sentiment: 55.0 },
  { date: "2026-02-19", pandora: 501, sentiment: 55.0 },
  { date: "2026-02-20", pandora: 522, sentiment: 55.0 },
  { date: "2026-02-23", pandora: 495, sentiment: 55.0 },
  { date: "2026-02-24", pandora: 501, sentiment: 55.0 },
  { date: "2026-02-25", pandora: 477, sentiment: 55.0 },
  { date: "2026-02-26", pandora: 492, sentiment: 55.0 },
  { date: "2026-02-27", pandora: 477, sentiment: 55.0 },
  { date: "2026-03-02", pandora: 463, sentiment: 53.3 },
  { date: "2026-03-03", pandora: 460, sentiment: 53.3 },
  { date: "2026-03-04", pandora: 463, sentiment: 53.3 },
  { date: "2026-03-05", pandora: 475, sentiment: 53.3 },
  { date: "2026-03-06", pandora: 470, sentiment: 53.3 },
  { date: "2026-03-09", pandora: 464, sentiment: 53.3 },
  { date: "2026-03-10", pandora: 457, sentiment: 53.3 },
  { date: "2026-03-11", pandora: 448, sentiment: 53.3 },
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

// Scatter data: Silver price vs. Pandora stock price (all months)
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
const PandoraSilverAnalysisPageEn: React.FC = () => {
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
  const pandoraATH = 1415; // Intraday ATH January 31, 2025

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
  const MODEL_SHARES = 75.0;
  const MODEL_TAX = 0.245;
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
      <title>Zirium | Pandora A/S (PNDORA) - Silver price impact</title>
      <meta name="description" content="Analysis of the relationship between silver prices, US consumer sentiment and the Pandora stock price. From 930 DKK in January 2024 to 556 DKK in May 2026, while silver more than tripled." />
      <meta property="og:title" content="Pandora and the silver price: How commodities and consumer sentiment affect the stock" />
      <meta property="og:description" content="Analysis of the relationship between silver prices, US consumer sentiment and the Pandora stock price." />
      <meta property="og:type" content="article" />
      <meta property="og:url" content="https://www.zirium.dk/analyse/pandora/soelv/2026-05-23" />
      <meta property="og:site_name" content="Zirium" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content="Pandora and the silver price: How commodities and consumer sentiment affect the stock" />
      <meta name="twitter:description" content="Analysis of the relationship between silver prices, US consumer sentiment and the Pandora stock price." />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Pandora and the silver price: How commodities and consumer sentiment affect the stock",
        "description": "Analysis of the relationship between silver prices, US consumer sentiment and the Pandora stock price.",
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
          <p className="text-base text-gray-600 dark:text-gray-300 mb-4">Analysis by Araz Bayat Makoo (Zirium) - May 23, 2026</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3 leading-tight">
            Pandora and the silver price: How commodities and consumer sentiment affect the stock
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Pandora A/S (PNDORA)
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-3 leading-relaxed">
            This analysis examines the relationship between the silver price, US
            consumer sentiment (University of Michigan Consumer Sentiment Index) and
            the Pandora stock price over the past two years. Silver is Pandora's
            primary raw material, and the US is the company's largest single market.
            Both factors are considered to have been significant drivers of the stock's performance during this period.
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
          <KPI value={`${pandoraChange}%`} label="Pandora stock (Jan '24 - May '26)" highlight />
          <KPI value={`+${silverChange}%`} label="Silver price (Jan '24 - May '26)" />
          <KPI value={correlation.toFixed(2)} label="Correlation (silver vs. stock)" />
          <KPI value={`${pandoraATH.toLocaleString("en-US")} DKK`} label="ATH intraday (Jan 31, 2025)" />
        </div>

        {/* 1. Overview */}
        <section className="mb-12">
          <SectionHeader n={1} title="Overview" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Pandora A/S is one of the world's largest jewelry brands by number of
            pieces sold. The company uses silver as its primary raw material in the
            majority of its products. Silver constitutes the bulk of Pandora's
            metal-based material consumption, and although Pandora hedges its silver
            exposure 9-12 months ahead, rising silver prices ultimately impact the
            EBIT margin with a delay.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            From January 2024 to May 2026, the silver price has risen from
            approximately $23/oz to approximately $76/oz, more than tripling in
            value. During the same period, the Pandora stock has fallen from
            approximately 930 DKK to approximately 556 DKK, a decline of roughly
            40%. A strong negative relationship is observed between the two
            (correlation: {correlation.toFixed(2)} based on daily closing prices),
            although correlation does not prove causation.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            But the silver price is not the only factor. The US is Pandora's largest
            single market with approximately 28% of revenue, and US consumer
            sentiment has fallen from 79 in January 2024 to 44.8 in May 2026, a
            very low level by historical standards. For a company selling jewelry
            to consumers, both factors are highly relevant.
          </p>
        </section>

        {/* 2. Why silver surged */}
        <section className="mb-12">
          <SectionHeader n={2} title="Why has silver surged so much?" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The silver price rose from approximately $23/oz in January 2024 to over $120/oz intraday in January 2026,
            before falling back to around $76/oz. The surge was driven by several simultaneous factors:
          </p>
          <ul className="space-y-3 text-gray-600 dark:text-gray-300 text-[15px] leading-relaxed mb-4">
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">1.</span>
              <span><strong>Structural deficit:</strong> The global silver market has been in deficit for five consecutive years (2021-2025). In 2021-2024 alone, the cumulative deficit reached 678 million ounces, equivalent to 10 months of global mine production.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">2.</span>
              <span><strong>Record industrial demand:</strong> In 2024, industrial silver demand reached a record 680.5 million ounces. Solar panels alone accounted for approximately 29% of industrial demand, up from 11% in 2014. Electric vehicles and AI data centers also contribute.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">3.</span>
              <span><strong>Supply cannot keep up:</strong> Approximately 70% of all silver is produced as a byproduct from copper, lead and zinc mines. Producers therefore cannot quickly ramp up production, even when prices rise.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-pink-500 mt-0.5 font-bold">4.</span>
              <span><strong>Investment demand:</strong> Silver ETFs saw net inflows of 61.6 million ounces in 2024, a sharp reversal from prior years' outflows. Rate cuts and geopolitical uncertainty have increased interest in precious metals as a safe haven.</span>
            </li>
          </ul>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            The combination of record demand, constrained supply and strong investor interest created the rally that has significantly pushed up Pandora's material costs.
          </p>
        </section>

        {/* 3. Chart: Pandora vs Silver */}
        <section className="mb-12">
          <SectionHeader n={3} title="Pandora stock vs. silver price" />
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">Daily closing prices. Pink = Pandora (DKK, left axis), grey = silver price (USD/oz, right axis).</p>
          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Pandora stock price vs. silver price from January 2024 to May 2026">
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#9ca3af] inline-block" />Silver (USD/oz)</span>
            </div>
          </div>
        </section>

        {/* 3. Correlation */}
        <section className="mb-12">
          <SectionHeader n={4} title="Correlation: Silver up, Pandora down" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The Pearson correlation coefficient between the two time series is <strong>{correlation.toFixed(2)}</strong> (calculated
            on daily closing prices in levels across 579 data points, which may amplify the observed relationship). This is a strong
            negative correlation, but it is important to emphasize that correlation does not
            prove causation, and the result may vary with time resolution and methodology.
            Several factors are at play: Tariffs, currency fluctuations (DKK/USD), weaker
            US and European markets and general risk appetite all contribute to the price development.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            However, there is a plausible economic mechanism behind the relationship. Silver constitutes a large
            portion of Pandora's material costs. Although the company hedges a
            significant share of its silver consumption 9-12 months ahead, a sustained
            rise in the silver price means rising costs gradually affect the unhedged
            portion, while future hedge levels are reset higher. In Q1 2026, commodities, FX and tariffs
            combined for a total headwind of 440 basis points on the EBIT margin.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Scatter plot: Silver price vs. Pandora stock price">
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-3">Each dot is one trading day. X-axis = silver price (USD/oz), Y-axis = Pandora (DKK).</p>
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
            Pandora hedges a significant portion of its expected silver and gold
            consumption typically 9-12 months ahead. This creates a delay before a
            change in the spot price flows through to the income statement. In practice:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 mb-6">
            <table className="w-full text-left">
              <caption className="sr-only">Pandora silver hedging over time</caption>
              <thead>
                <tr className="bg-pink-500 text-white">
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">P&L year</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Hedged share</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Hedged silver price</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">EBIT margin headwind (Y/Y)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">2025</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">91%</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~$29/oz</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-210 bp (commodities + FX)</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">2026</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">95-100%</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~$32/oz</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-150-200 bp (commodities)</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Q1 2026 (actual)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">-</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-red-500">-440 bp (commodities + FX + tariffs)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The EBIT margin has fallen from approximately 25.2% in 2024 to a guidance
            of 21-22% for 2026. Product price increases have partially offset the
            pressure from rising commodity prices, but the combined effect of the
            silver price surge, tariffs and currency changes is significant.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong>Strategic response:</strong> Pandora has begun introducing
            platinum-plated jewelry to reduce its dependence on silver. This is a
            long-term strategy that has not yet materially changed the overall
            material mix.
          </p>
        </section>

        {/* 5. Interactive model */}
        <section className="mb-12">
          <SectionHeader n={6} title="Interactive model: Silver price and margin" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            This model estimates how different silver prices affect Pandora's EBIT
            margin and earnings per share (EPS). Adjust the silver spot price to see
            the effect. The model is a simplification and does not account for other
            factors such as exchange rates, tariffs and volume growth.
          </p>
          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-6">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">How the model is calculated</p>
            <ol className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-1 list-decimal list-inside">
              <li><strong>Blended silver price</strong> = (hedged share × hedged price) + (unhedged share × spot price)</li>
              <li><strong>Margin change</strong> = (blended price - reference price $33/oz) × -0.50 percentage points per $1/oz</li>
              <li><strong>Estimated EBIT margin</strong> = 21.5% (2026 guidance) + margin change</li>
              <li><strong>EBIT</strong> = revenue DKK 32.5 billion × EBIT margin</li>
              <li><strong>Net income</strong> = EBIT × (1 - 24.5% tax rate)</li>
              <li><strong>EPS</strong> = net income / 75 million shares</li>
              <li><strong>Implied P/E</strong> = stock price 556 DKK / EPS</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {([
              { label: "Silver drops ($40)", spot: 40 },
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
              onChange={setHedgedShare} hint="Pandora hedges a significant portion of consumption 9-12 months ahead" />
            <AssumptionSlider label="Hedged silver price" value={hedgedPrice} min={20} max={80} step={1}
              onChange={setHedgedPrice} hint="2026 P&L hedged at ~$32/oz" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KPI value={`$${blendedPrice.toFixed(1)}/oz`} label="Blended silver price" />
            <KPI value={`${estEbitMargin.toFixed(1)}%`} label="Estimated EBIT margin"
              highlight={estEbitMargin < MODEL_REF_MARGIN} />
            <KPI value={`${Math.round(estEps)} DKK`} label="Estimated EPS"
              highlight={estEps < 70} />
            <KPI value={impliedPE > 0 && impliedPE < 100 ? `${impliedPE.toFixed(1)}x` : "-"}
              label={`P/E at ${CURRENT_PRICE} DKK`} />
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
              <strong>Model assumptions:</strong> Revenue: DKK 32.5 billion (2025 level).
              Tax rate: 24.5%. Shares: 75 million. Reference: 21.5% EBIT margin at $33/oz blended (2026 guidance).
              Sensitivity: ~50 bp per $1/oz change in blended silver price (based on Pandora's disclosed commodity headwinds).
              The model does not account for exchange rates, tariffs, volume growth or other factors.
            </p>
          </div>
        </section>

        {/* 6. Sentiment */}
        <section className="mb-12">
          <SectionHeader n={7} title="US consumer sentiment and Pandora" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The US is Pandora's largest single market with approximately 28% of total
            revenue in 2025. In Q1 2025, the US market grew +11% like-for-like,
            but by Q1 2026 North America had declined to -2% like-for-like, while
            global LFL growth landed at 0%. The US slowdown appears to be a key driver behind the
            flat overall growth. This coincides with a significant decline in US
            consumer sentiment.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The University of Michigan Consumer Sentiment Index fell from 79.0 in
            January 2024 to 44.8 in May 2026, a very low level by historical standards. The
            decline accelerated from March 2025, in an environment marked by, among other things, inflation concerns,
            higher energy prices and geopolitical uncertainty.
          </p>

          <div className="bg-white dark:bg-[#19191f] rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-5" role="img" aria-label="Chart: Pandora stock price vs. US Consumer Sentiment Index">
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] rounded-full bg-[#f59e0b] inline-block" />Consumer Sentiment</span>
            </div>
          </div>
        </section>

        {/* 7. Double pressure */}
        <section className="mb-12">
          <SectionHeader n={8} title="Double squeeze: Costs and demand" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            What makes Pandora's situation particularly challenging is that the company
            is being squeezed from both sides simultaneously:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Cost side (silver)</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Silver price has more than tripled over 29 months</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Hedging delays but does not eliminate the effect</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>EBIT margin guidance cut from "at least 24%" to 21-22%</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Higher US tariffs on Thai imports add further pressure</li>
              </ul>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 p-5">
              <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3 text-sm uppercase tracking-wide">Demand side (sentiment)</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Consumer Sentiment at a very low level historically (44.8)</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>US like-for-like growth declined from +11% to -2%</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Europe weak: UK -8%, France -7% LFL in Q3 2025</li>
                <li className="flex gap-2"><span className="text-amber-500 mt-0.5">&#x25BC;</span>Organic growth slowed to -1% to 2% (guidance) from prior levels of 8-13%</li>
              </ul>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Jewelry is a discretionary consumer category. When consumer confidence
            falls, jewelry is among the first categories to be deprioritized. Pandora
            is therefore caught in a situation where costs rise (silver) while demand
            weakens (sentiment). The combination of rising input costs and weaker demand
            may be a key explanation for the negative share price development.
          </p>
        </section>

        {/* 8. Timeline */}
        <section className="mb-12">
          <SectionHeader n={9} title="Timeline: Key events" />
          <div className="ml-2">
            <TimelineEvent date="January 2024" title="Pandora starts the year at 930 DKK" color="#ec4899">
              <p>Silver price is $23/oz. Pandora has just delivered strong Q4 2023 results with 12% organic growth. Consumer Sentiment at 79.</p>
            </TimelineEvent>
            <TimelineEvent date="August 2024" title="Pandora reaches 1,106 DKK" color="#2a9d8f">
              <p>Strong US growth (+5% LFL) and solid Q2 report drive the stock higher. Silver price still relatively stable around $29/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="December 2024" title="Pandora rises to 1,233 DKK" color="#2a9d8f">
              <p>Q4 organic growth of 11%. The stock approaches its all-time high. Market is optimistic despite emerging tariff concerns.</p>
            </TimelineEvent>
            <TimelineEvent date="January 2025" title="All-time high: 1,415 DKK intraday" color="#ec4899">
              <p>Pandora reaches its highest-ever price on January 31, 2025. Silver price at $32/oz, and Consumer Sentiment has started declining (71.1).</p>
            </TimelineEvent>
            <TimelineEvent date="March-April 2025" title="Decline begins: Tariffs, silver and sentiment" color="#e63946">
              <p>The stock falls from 1,187 DKK to 927 DKK. Consumer Sentiment drops significantly to 52-57. US tariffs on imports from Thailand and China announced. Silver price rises to $34/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="August-September 2025" title="Silver explodes above $40/oz" color="#e63946">
              <p>Silver price breaks higher from $36 to $46/oz. Pandora falls to 790 DKK. Q3 report shows 380 bp total margin headwind from commodities, FX and tariffs. On September 30, CEO Alexander Lacik announces his retirement, and the board appoints CMO Berta de Pablos-Barbier as successor from the AGM in March 2026.</p>
            </TimelineEvent>
            <TimelineEvent date="November-December 2025" title="Silver above $56-70/oz, Pandora below 700 DKK" color="#e63946">
              <p>Silver price accelerates toward $70/oz. Pandora stock falls to 675 DKK. Consumer Sentiment declines to 51-53. 2026 EBIT margin target lowered to 21-22%.</p>
            </TimelineEvent>
            <TimelineEvent date="January 2026" title="Silver reaches all-time high: ~$122/oz intraday" color="#e63946">
              <p>Pandora stock falls to 485 DKK, its lowest level since 2022. Silver price hits its historical peak of approximately $122/oz intraday on January 29 (daily close around $114/oz), before falling sharply back to $76-78/oz.</p>
            </TimelineEvent>
            <TimelineEvent date="January 1, 2026" title="Berta de Pablos-Barbier takes over as CEO" color="#4361ee">
              <p>The former CMO officially takes over as CEO on January 1, 2026, two months ahead of schedule. Alexander Lacik continues as Special Advisor until the AGM on March 11. She brings over 30 years of experience from LVMH, Mars Wrigley and Lacoste.</p>
            </TimelineEvent>
            <TimelineEvent date="May 2026" title="Bottom or bounce?" color="#f59e0b">
              <p>Pandora delivers Q1 2026 with 2% organic growth (0% LFL globally) and 20.9% EBIT margin. Stock jumps 11% on the day. Consumer Sentiment falls to 44.8, a very low level historically. Silver price has stabilized around $76/oz. Stock trades at 556 DKK with P/E of 8.3.</p>
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
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Key figure</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Revenue (2025)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 32.5 billion</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">EBIT margin (Q1 2026)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">20.9%</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Stock price (May 22, 2026)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">556 DKK</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">P/E (trailing)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">8.3</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Market cap</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">DKK 39.3 billion</td>
                </tr>
                <tr className="bg-gray-50/50 dark:bg-[#15151a]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Dividend</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">22 DKK/share (3.96%)</td>
                </tr>
                <tr className="bg-white dark:bg-[#19191f]">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">North America revenue (share)</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-white">~34%</td>
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
          <SectionHeader n={11} title="Arguments for and against" />
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-500/20 p-5">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 text-sm uppercase tracking-wide">Risk factors</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Silver price may remain elevated or rise further</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>US consumer sentiment at a very low level historically</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Higher tariffs on imports from Thailand, China and others</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>CEO transition on January 1, 2026 (Berta de Pablos-Barbier) creates uncertainty</li>
                <li className="flex gap-2"><span className="text-red-400 mt-0.5">&#x25BC;</span>Europe weak with negative LFL in several key markets</li>
              </ul>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 p-5">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-3 text-sm uppercase tracking-wide">Positive factors</h4>
              <ul className="space-y-2 text-[15px] text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>P/E of 8.3 is historically low for Pandora</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>3.96% dividend yield provides return while waiting</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>DKK 1.5 billion in share buybacks in Q3 2025 alone</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Asia-Pacific growing +12% LFL in Q1 2026</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Gross margin at 79.5% remains very high</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Platinum-plating strategy could reduce silver dependency</li>
                <li className="flex gap-2"><span className="text-blue-400 mt-0.5">&#x25B2;</span>Smaller competitors lack capital for large hedging programs and are hit harder by silver prices, potentially allowing Pandora to gain market share over time</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 11. Conclusion */}
        <section className="mb-12">
          <SectionHeader n={12} title="Conclusion" />
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The Pandora stock has fallen 40% from January 2024 to May 2026, while the
            silver price has more than tripled over the same period. The correlation
            of {correlation.toFixed(2)} shows a strong negative relationship, but it
            doesn't tell the whole story.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The silver price is the most direct factor. It affects Pandora's material
            costs and thereby the EBIT margin. Although hedging delays the effect,
            the sustained rally in silver from $23 to $76/oz has forced Pandora to
            lower its margin targets from "at least 24%" to 21-22%.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            US consumer sentiment is the secondary but important factor. With 28% of
            revenue in the US and a Consumer Sentiment Index at a very low 44.8,
            the demand side is under pressure. Jewelry is a discretionary category,
            and Pandora has already seen US growth decline from +11% to -2% LFL.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The central question for investors is whether the current price (556 DKK,
            P/E 8.3) already reflects these challenges, or whether there is further
            downside. The answer depends primarily on two things: Where the silver
            price stabilizes, and when US consumer sentiment begins to turn.
          </p>

          <div className="bg-gray-50 dark:bg-[#15151a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">What to watch</h4>
            <ul className="space-y-1.5 text-[15px] text-gray-600 dark:text-gray-300">
              <li>&#x2022; Silver price: A sustained drop below $60/oz would significantly ease margin pressure</li>
              <li>&#x2022; Consumer Sentiment: A turning point in consumer confidence would signal improved demand</li>
              <li>&#x2022; US tariffs: Potential easing of tariff regime for Thai imports</li>
              <li>&#x2022; Pandora's hedging strategy: 2027 hedging levels will indicate expected silver exposure</li>
              <li>&#x2022; New CEO Berta de Pablos-Barbier: Strategic direction from January 2026</li>
              <li>&#x2022; Platinum-plating strategy: Could change material exposure over time</li>
            </ul>
          </div>
        </section>

        <RelatedAnalyses currentSlug="pandora/soelv/2026-05-23" />

        {/* Disclaimer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 pt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
            <strong>Disclaimer:</strong> This analysis is for informational purposes only and does not
            constitute investment advice. Data sourced from Yahoo Finance, University of Michigan Surveys of Consumers, Pandora Annual Report 2025 and Q1 2026 Report. Past performance is not a guarantee of future
            returns. Always do your own research and seek professional advice before making investment
            decisions.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            Generated by Zirium  |  May 23, 2026
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

export default PandoraSilverAnalysisPageEn;
