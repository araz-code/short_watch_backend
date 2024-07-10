export default interface PricePoint {
  code: string;
  name: string;
  symbol: string;
  value: number;
  timestamp: string;
}

export default interface ChartPricePoint {
  value: number;
  timestamp: string;
  close: number;
  volume: number;
}
