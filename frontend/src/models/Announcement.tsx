export default interface Announcement {
  publishedDate: string;
  headline: string;
  headlineDanish: string;
  type: string;
  dfsaId: string;
  value: number;
  stockCode: string;
  stockSymbol: string;
  isHistoric: boolean | null;
  shortSellerName: string | undefined;
}
