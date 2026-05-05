export default interface ChartPricePoint {
  value: number;
  timestamp: string;
  close: number;
  high: number | null;
  low: number | null;
  volume: number | null;
}
