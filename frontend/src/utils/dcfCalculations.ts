// Pure DCF calculation functions. No React dependencies.

/**
 * Projects revenue for N years given a base revenue and per-year growth rates.
 * Returns array of length growthRates.length (one value per projected year).
 */
export function projectRevenue(baseRevenue: number, growthRates: number[]): number[] {
  const revenues: number[] = [];
  let current = baseRevenue;
  for (const rate of growthRates) {
    current = current * (1 + rate / 100);
    revenues.push(current);
  }
  return revenues;
}

/**
 * Net Operating Profit After Tax for a single year.
 */
export function computeNOPAT(revenue: number, operatingMarginPct: number, taxRatePct: number): number {
  const ebit = revenue * (operatingMarginPct / 100);
  return ebit * (1 - taxRatePct / 100);
}

/**
 * Free Cash Flow for a single year.
 * capexPct: CapEx as % of revenue
 * nwcChangePct: increase in net working capital as % of revenue
 */
export function computeFCF(nopat: number, revenue: number, capexPct: number, nwcChangePct: number): number {
  const capex = revenue * (capexPct / 100);
  const nwcChange = revenue * (nwcChangePct / 100);
  return nopat - capex - nwcChange;
}

/**
 * Terminal value using the Gordon Growth Model (perpetuity growth).
 * lastFCF: FCF in the final projected year
 * terminalGrowthPct: long-term growth rate (%)
 * waccPct: discount rate (%)
 */
export function computeTerminalValue(lastFCF: number, terminalGrowthPct: number, waccPct: number): number {
  const wacc = waccPct / 100;
  const g = terminalGrowthPct / 100;
  if (wacc <= g) return 0;
  return (lastFCF * (1 + g)) / (wacc - g);
}

/**
 * Discounts all projected FCFs plus terminal value back to present value.
 * Returns Enterprise Value.
 */
export function computeDCF(fcfs: number[], terminalValue: number, waccPct: number): number {
  const wacc = waccPct / 100;
  let pv = 0;
  fcfs.forEach((fcf, i) => {
    pv += fcf / Math.pow(1 + wacc, i + 1);
  });
  const n = fcfs.length;
  pv += terminalValue / Math.pow(1 + wacc, n);
  return pv;
}

/**
 * Equity value per share.
 * enterpriseValue: EV in same currency as netDebt
 * netDebt: net debt (positive = debt, negative = net cash)
 * sharesOutstanding: total shares
 */
export function computePerShare(enterpriseValue: number, netDebt: number, sharesOutstanding: number): number {
  if (sharesOutstanding <= 0) return 0;
  return (enterpriseValue - netDebt) / sharesOutstanding;
}

export interface SensitivityCell {
  wacc: number;
  terminalGrowth: number;
  perShare: number;
}

/**
 * Builds a sensitivity matrix varying WACC and terminal growth rate.
 * Returns a 2D array [waccIndex][tgIndex].
 */
export function sensitivityMatrix(
  fcfs: number[],
  waccValues: number[],
  terminalGrowthValues: number[],
  netDebt: number,
  sharesOutstanding: number,
): SensitivityCell[][] {
  return waccValues.map((wacc) =>
    terminalGrowthValues.map((tg) => {
      const tv = computeTerminalValue(fcfs[fcfs.length - 1], tg, wacc);
      const ev = computeDCF(fcfs, tv, wacc);
      const ps = computePerShare(ev, netDebt, sharesOutstanding);
      return { wacc, terminalGrowth: tg, perShare: ps };
    }),
  );
}
