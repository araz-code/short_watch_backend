import ChartPricePoint from "../models/ChartPricePoint";
import { PriceFlowBucket } from "../components/PriceFlowList";

const BUCKET_WIDTH = 0.02;

function typicalPrice(pt: ChartPricePoint): number {
  if (pt.high != null && pt.low != null) return (pt.high + pt.low + pt.close) / 3;
  return pt.close;
}

function ageBand(isoDate: string): "recent" | "mid" | "old" {
  const days = (Date.now() - new Date(isoDate + "T00:00:00").getTime()) / 86400000;
  if (days < 90) return "recent";
  if (days < 365) return "mid";
  return "old";
}

export function computePriceFlow(
  chartValues: ChartPricePoint[],
  sharesOutstanding: number | null
): PriceFlowBucket[] {
  if (!sharesOutstanding) return [];

  const rows = chartValues
    .filter((cv) => cv.value != null && cv.close != null && cv.close > 0)
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (rows.length < 2) return [];

  const logStep = Math.log(1 + BUCKET_WIDTH);
  const minPrice = Math.min(...rows.map(typicalPrice));

  type Bucket = {
    shorted: number; covered: number;
    shortedRecent: number; shortedMid: number; shortedOld: number;
    coveredRecent: number; coveredMid: number; coveredOld: number;
    lastShortedDate: string | null; lastCoveredDate: string | null;
  };
  const buckets = new Map<number, Bucket>();

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const cur = rows[i];
    const deltaPct = cur.value - prev.value;
    const deltaShares = (deltaPct / 100) * sharesOutstanding;
    const price = typicalPrice(prev);
    const idx = Math.floor(Math.log(price / minPrice) / logStep);

    if (!buckets.has(idx)) {
      buckets.set(idx, {
        shorted: 0, covered: 0,
        shortedRecent: 0, shortedMid: 0, shortedOld: 0,
        coveredRecent: 0, coveredMid: 0, coveredOld: 0,
        lastShortedDate: null, lastCoveredDate: null,
      });
    }
    const b = buckets.get(idx)!;
    const curDate = cur.timestamp.slice(0, 10);
    const band = ageBand(curDate);

    if (deltaShares > 0) {
      b.shorted += deltaShares;
      if (band === "recent") b.shortedRecent += deltaShares;
      else if (band === "mid") b.shortedMid += deltaShares;
      else b.shortedOld += deltaShares;
      if (!b.lastShortedDate || curDate > b.lastShortedDate) b.lastShortedDate = curDate;
    } else if (deltaShares < 0) {
      b.covered += -deltaShares;
      if (band === "recent") b.coveredRecent += -deltaShares;
      else if (band === "mid") b.coveredMid += -deltaShares;
      else b.coveredOld += -deltaShares;
      if (!b.lastCoveredDate || curDate > b.lastCoveredDate) b.lastCoveredDate = curDate;
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([idx, b]) => {
      const low = minPrice * Math.pow(1 + BUCKET_WIDTH, idx);
      const high = low * (1 + BUCKET_WIDTH);
      return {
        priceLow: Math.round(low * 100) / 100,
        priceHigh: Math.round(high * 100) / 100,
        sharesShorted: Math.round(b.shorted),
        sharesCovered: Math.round(b.covered),
        shortedByAge: {
          recent: Math.round(b.shortedRecent),
          mid: Math.round(b.shortedMid),
          old: Math.round(b.shortedOld),
        },
        coveredByAge: {
          recent: Math.round(b.coveredRecent),
          mid: Math.round(b.coveredMid),
          old: Math.round(b.coveredOld),
        },
        lastShortedDate: b.lastShortedDate,
        lastCoveredDate: b.lastCoveredDate,
      };
    });
}
