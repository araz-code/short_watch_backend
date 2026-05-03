import i18n from "./i18n";

export function formatNum(n: number, decimals: number): string {
  return n.toLocaleString(i18n.language, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
