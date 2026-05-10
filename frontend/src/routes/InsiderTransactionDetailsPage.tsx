import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchInsiderIssuerDetail, InsiderTransaction, InsiderSignal, HOST, VERSION } from "../apis/ShortPositionAPI";
import { trackEvent } from "../analytics";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import PageTemplate from "../components/PageTemplate";
import ToggleSwitch from "../components/UI/RadioButtonToggle";
import InsiderHelpDialog from "../components/InsiderHelpDialog";

function typeBadgeCls(category: string): string {
  if (category === "buy") return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
  if (category === "sell") return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  if (category === "grant") return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
}

function SignalBadge({ signal, locale, t }: { signal: InsiderSignal; locale: string; t: (key: string) => string }) {
  const cfg = {
    bullish: {
      label: t("Bullish"),
      bg: "bg-green-100 dark:bg-green-500/15",
      text: "text-green-700 dark:text-green-400",
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>,
    },
    bearish: {
      label: t("Bearish"),
      bg: "bg-red-100 dark:bg-red-500/15",
      text: "text-red-700 dark:text-red-400",
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
    },
    neutral: {
      label: t("Neutral"),
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-700 dark:text-gray-300",
      icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>,
    },
  } as const;

  const { label, bg, text, icon } = cfg[signal.signal];
  const fmt = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 0 });

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap mt-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${bg} ${text}`}>
        {icon}{label}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-400">{t("Insider sentiment (90d)")}</span>
      {(signal.buy_amount_90d > 0 || signal.sell_amount_90d > 0) && (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          · {t("Buys")}: {fmt(signal.buy_amount_90d)} / {t("Sells")}: {fmt(signal.sell_amount_90d)}
        </span>
      )}
    </div>
  );
}

function PdfModal({ url, onClose, label }: { url: string; onClose: () => void; label: string }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-white dark:bg-[#19191f] rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <span className="text-sm font-medium dark:text-white">{label}</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <iframe src={url} className="flex-1 w-full border-0" title="Source document" />
      </div>
    </div>
  );
}

function formatDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

function formatNum(value: number | string | null | undefined, locale: string, decimals = 2): string {
  if (value == null || value === "") return "-";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return "-";
  return n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

function formatVolume(value: number | string | null | undefined, locale: string): string {
  if (value == null || value === "") return "-";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return "-";
  return n.toLocaleString(locale, { maximumFractionDigits: 0 });
}

type GroupedTransactions = Record<string, InsiderTransaction[]>;

const PERIOD_OPTIONS = ["1W", "1M", "3M", "6M", "YTD", "Max"] as const;
type Period = typeof PERIOD_OPTIONS[number];

function periodCutoff(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case "1W": { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); }
    case "1M": { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); }
    case "3M": { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); }
    case "6M": { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); }
    case "YTD": { return `${now.getFullYear()}-01-01`; }
    default: return null;
  }
}

const InsiderTransactionDetailsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("da") ? "da-DK" : "en-GB";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cvr = searchParams.get("cvr") ?? "";
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [personFilter, setPersonFilter] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("Max");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["insiderIssuer", cvr],
    staleTime: 5 * 60 * 1000,
    queryFn: ({ signal }) => fetchInsiderIssuerDetail({ signal, cvr }),
    enabled: !!cvr,
  });

  useEffect(() => {
    if (data) {
      document.title = `Zirium | ${data.name} ${t("Insider Transactions")}`;
      trackEvent("insider_detail_view", { cvr: cvr ?? "" });
      fetch(`${HOST}/stats/visit/insider-detail/${cvr}/`).catch(() => {});
    }
  }, [data, t, cvr]);

  const allPersons = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.transactions.map(tx => tx.person_name))].filter(Boolean).sort();
  }, [data]);

  const getRole = (tx: { person_role: string; person_role_da: string }) =>
    locale === "da-DK" ? (tx.person_role_da || tx.person_role) : tx.person_role;

  const personTotals = useMemo(() => {
    const totals: Record<string, { role_en: string; role_da: string; buyAmount: number; sellAmount: number; buyVolume: number; sellVolume: number; grantVolume: number }> = {};
    for (const tx of data?.transactions ?? []) {
      if (!tx.person_name) continue;
      if (!totals[tx.person_name]) {
        totals[tx.person_name] = { role_en: tx.person_role || "", role_da: tx.person_role_da || "", buyAmount: 0, sellAmount: 0, buyVolume: 0, sellVolume: 0, grantVolume: 0 };
      }
      const amount = parseFloat(String(tx.total_amount ?? 0)) || 0;
      const volume = parseFloat(String(tx.volume ?? 0)) || 0;
      const cat = tx.transaction_category;
      if (cat === "grant") { totals[tx.person_name].grantVolume += volume; }
      else if (cat === "buy") { totals[tx.person_name].buyAmount += amount; totals[tx.person_name].buyVolume += volume; }
      else if (cat === "sell") { totals[tx.person_name].sellAmount += amount; totals[tx.person_name].sellVolume += volume; }
    }
    return totals;
  }, [data]);

  const filteredTxs = useMemo(() => {
    const cutoff = periodCutoff(selectedPeriod);
    return (data?.transactions ?? []).filter(tx => {
      if (personFilter && tx.person_name !== personFilter) return false;
      if (cutoff && tx.transaction_date && tx.transaction_date < cutoff) return false;
      return true;
    });
  }, [data, personFilter, selectedPeriod]);

  const grouped: GroupedTransactions = {};
  for (const tx of filteredTxs) {
    const key = tx.source_url || tx.announcement_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tx);
  }

  const fmt0 = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 0 });
  const hasActiveFilter = !!personFilter;

  const sortedGroups = Object.entries(grouped)
    .filter(([, txs]) => txs.some(tx => tx.transaction_type || tx.volume != null || tx.total_amount != null))
    .sort(([, a], [, b]) => {
      const dateA = a[0]?.transaction_date ?? a[0]?.published_date ?? "";
      const dateB = b[0]?.transaction_date ?? b[0]?.published_date ?? "";
      return dateB.localeCompare(dateA);
    });

  return (
    <div className="h-dvh min-h-[620px] flex flex-col overflow-hidden [@media(max-height:900px)_and_(orientation:landscape)]:overflow-auto [@media(max-height:900px)_and_(orientation:landscape)]:h-auto [@media(max-height:900px)_and_(orientation:landscape)]:min-h-dvh">
      <PageTemplate>
        <div className="w-screen lg:justify-center m-auto flex flex-col flex-1 min-h-0">
          <div className="lg:max-w-[900px] lg:mx-auto w-full flex flex-col flex-1 min-h-0">

            {/* Back button */}
            <div className="flex items-center justify-between shrink-0">
              <button
                className="text-blue-500 hover:text-blue-700 bg-transparent border-none text-base p-4 inline-flex items-center gap-1.5 focus:ring-2 focus:ring-blue-300 rounded-sm min-h-[44px] min-w-[44px]"
                onClick={() => {
                  if (window.history.length > 1 && window.history.state.idx > 0) navigate(-1);
                  else navigate("/insider-transactions");
                }}
              >
                <span aria-hidden="true">←</span>
                {t("Back")}
              </button>
              <button
                onClick={() => {
                  trackEvent("help_dialog_open", { page: "insider_detail" });
                  fetch(`${HOST}/stats/visit/help-insider-detail/`).catch(() => {});
                  setShowHelp(true);
                }}
                aria-label={t("Help")}
                className="text-sm font-medium text-blue-500 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-1.5 mr-4 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:ring-2 focus:ring-blue-300 transition-colors"
              >
                {t("Help")}
              </button>
            </div>

            {isLoading && <div className="grid place-items-center h-64"><LoadingIndicator /></div>}
            {isError && <ErrorBlock title={t("An error occurred")} message={t("Failed to fetch insider transaction details.")} />}

            {data && (
              <>
                {/* Company name */}
                <div className="text-center pb-1 sm:pb-2 dark:text-white shrink-0">
                  <h1 className="text-base sm:text-xl">
                    {data.name}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t("AI extracted data. Verify with source link if uncertain.")}
                  </p>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-8 [@media(max-height:900px)_and_(orientation:landscape)]:flex-none [@media(max-height:900px)_and_(orientation:landscape)]:overflow-visible">

                  {/* ── Insiders summary ── */}
                  {allPersons.length > 0 && (
                    <div className="mt-3 mb-4">
                      <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-2 px-1">{t("Insiders")}</p>
                      {/* Mobile: card per person */}
                      <div className="sm:hidden flex flex-col gap-2">
                        {allPersons.map((name, idx) => {
                          const p = personTotals[name];
                          if (!p) return null;
                          const net = p.buyVolume + p.grantVolume - p.sellVolume;
                          const isSelected = personFilter === name;
                          const zebraBg = idx % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]";
                          return (
                            <div
                              key={name}
                              onClick={() => setPersonFilter(isSelected ? "" : name)}
                              className={`rounded-xl border shadow-xs cursor-pointer transition-colors px-4 py-3 ${
                                isSelected
                                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                                  : `border-gray-100 dark:border-gray-800 ${zebraBg}`
                              }`}
                            >
                              <div className={`font-medium text-sm ${isSelected ? "text-blue-700 dark:text-blue-300" : "dark:text-white"}`}>{name}</div>
                              {(locale === "da-DK" ? (p.role_da || p.role_en) : p.role_en) && <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">{locale === "da-DK" ? p.role_da || p.role_en : p.role_en}</div>}
                              <div className="grid grid-cols-4 gap-1 mt-2">
                                <div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">{t("Bought")}</div>
                                  <div className="text-sm font-medium tabular-nums text-green-700 dark:text-green-400">{p.buyVolume > 0 ? fmt0(p.buyVolume) : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">{t("Granted")}</div>
                                  <div className="text-sm font-medium tabular-nums text-blue-700 dark:text-blue-400">{p.grantVolume > 0 ? fmt0(p.grantVolume) : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">{t("Sold")}</div>
                                  <div className="text-sm font-medium tabular-nums text-red-700 dark:text-red-400">{p.sellVolume > 0 ? fmt0(p.sellVolume) : "-"}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">{t("Net")}</div>
                                  <div className={`text-sm font-medium tabular-nums ${net > 0 ? "text-green-700 dark:text-green-400" : net < 0 ? "text-red-700 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>{net !== 0 ? fmt0(net) : "-"}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop: table */}
                      <div className="hidden sm:block rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#19191f] shadow-xs overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-50 dark:border-gray-800/50">
                              <th className="px-4 py-2 font-medium">{t("Person")}</th>
                              <th className="px-4 py-2 font-medium text-right">{t("Bought")}</th>
                              <th className="px-4 py-2 font-medium text-right">{t("Granted")}</th>
                              <th className="px-4 py-2 font-medium text-right">{t("Sold")}</th>
                              <th className="px-4 py-2 font-medium text-right">{t("Net")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allPersons.map((name, idx) => {
                              const p = personTotals[name];
                              if (!p) return null;
                              const net = p.buyVolume + p.grantVolume - p.sellVolume;
                              const isSelected = personFilter === name;
                              const zebraBg = idx % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]";
                              return (
                                <tr
                                  key={name}
                                  onClick={() => setPersonFilter(isSelected ? "" : name)}
                                  className={`border-b border-gray-50 dark:border-gray-800/30 last:border-0 cursor-pointer transition-colors ${
                                    isSelected ? "bg-blue-50 dark:bg-blue-900/20" : `${zebraBg} hover:bg-gray-100 dark:hover:bg-[#1d1d25]`
                                  }`}
                                >
                                  <td className="px-4 py-2.5">
                                    <div className={`font-medium ${isSelected ? "text-blue-700 dark:text-blue-300" : "dark:text-white"}`}>{name}</div>
                                    {(locale === "da-DK" ? p.role_da || p.role_en : p.role_en) && <div className="text-xs text-gray-600 dark:text-gray-400">{locale === "da-DK" ? p.role_da || p.role_en : p.role_en}</div>}
                                  </td>
                                  <td className="px-4 py-2.5 tabular-nums text-right text-green-700 dark:text-green-400 whitespace-nowrap">{p.buyVolume > 0 ? fmt0(p.buyVolume) : "-"}</td>
                                  <td className="px-4 py-2.5 tabular-nums text-right text-blue-700 dark:text-blue-400 whitespace-nowrap">{p.grantVolume > 0 ? fmt0(p.grantVolume) : "-"}</td>
                                  <td className="px-4 py-2.5 tabular-nums text-right text-red-700 dark:text-red-400 whitespace-nowrap">{p.sellVolume > 0 ? fmt0(p.sellVolume) : "-"}</td>
                                  <td className={`px-4 py-2.5 tabular-nums text-right font-medium whitespace-nowrap ${net > 0 ? "text-green-700 dark:text-green-400" : net < 0 ? "text-red-700 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>{net !== 0 ? fmt0(net) : "-"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {allPersons.length > 1 && (
                          <div className="px-4 py-2 border-t border-gray-50 dark:border-gray-800/30">
                            <p className="text-xs text-gray-600 dark:text-gray-400">{t("Click a person to filter transactions below")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Transactions ── */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 px-1">{t("Transactions")}</p>
                    {/* Period toggle + person chip */}
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {hasActiveFilter && (
                        <button
                          onClick={() => setPersonFilter("")}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-500/25 transition-colors"
                        >
                          {personFilter}
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </button>
                      )}
                      <ToggleSwitch
                        options={[...PERIOD_OPTIONS]}
                        selectedOption={selectedPeriod}
                        onSelectChange={(v) => setSelectedPeriod(v as Period)}
                      />
                    </div>
                    </div>

                    {filteredTxs.length === 0 && (
                      <p className="text-center text-sm text-gray-600 dark:text-gray-400 my-10">
                        {t("No transactions match the selected filters.")}
                      </p>
                    )}

                      {sortedGroups.map(([groupKey, txs], groupIdx) => {
                        const first = txs[0];
                        const personCount = new Set(txs.map(tx => tx.person_name)).size;
                        const multiPerson = personCount > 1;
                        const zebraGroup = groupIdx % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]";
                        return (
                          <div key={groupKey} className={`mb-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden ${zebraGroup}`}>
                            {/* Group header */}
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold dark:text-white truncate">
                                  {multiPerson ? t("persons_other", { count: personCount }) : first.person_name}
                                </div>
                                {!multiPerson && getRole(first) && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">{getRole(first)}</div>
                                )}
                                {!multiPerson && first.closely_associated_to && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400">(close to {first.closely_associated_to})</div>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 text-right shrink-0">
                                <div>{formatDate(first.published_date, locale)}</div>
                                {first.source_url && (
                                  <button onClick={() => setPdfUrl(`${HOST}/${VERSION}/insider/pdf/${first.id}`)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                                    {t("View source")}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Transaction rows — card layout on mobile, table on sm+ */}
                            <div className="divide-y divide-gray-50 dark:divide-gray-800/30 sm:hidden">
                              {txs.map((tx, idx) => (
                                <div key={tx.id} className={`px-4 py-3 ${idx % 2 !== 0 ? "bg-black/[0.03] dark:bg-white/[0.03]" : ""}`}>
                                  {multiPerson && (
                                    <div className="text-xs font-medium dark:text-white mb-1">{tx.person_name}</div>
                                  )}
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeBadgeCls(tx.transaction_category)}`}>
                                      {tx.transaction_type || "-"}
                                    </span>
                                    <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                                      {formatDate(tx.transaction_date, locale)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5 tabular-nums">
                                    <div>
                                      <div className="text-sm font-medium dark:text-white">{formatVolume(tx.volume, locale)} stk.</div>
                                      {tx.unit_price != null && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400">{formatNum(tx.unit_price, locale)} {tx.currency}/stk.</div>
                                      )}
                                    </div>
                                    {tx.total_amount != null && (
                                      <div className="text-sm font-medium dark:text-white text-right">{formatNum(tx.total_amount, locale, 0)} {tx.currency}</div>
                                    )}
                                  </div>
                                  {tx.venue && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{tx.venue}</div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Table layout on sm+ */}
                            <div className="hidden sm:block overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs text-gray-600 dark:text-gray-400 border-b border-gray-50 dark:border-gray-800/50">
                                    {multiPerson && <th className="px-4 py-2 font-medium">{t("Person")}</th>}
                                    <th className="px-4 py-2 font-medium">{t("Date")}</th>
                                    <th className="px-4 py-2 font-medium">{t("Type")}</th>
                                    <th className="px-4 py-2 font-medium text-right">{t("Volume")}</th>
                                    <th className="px-4 py-2 font-medium text-right">{t("Price")}</th>
                                    <th className="px-4 py-2 font-medium text-right">{t("Total")}</th>
                                    <th className="px-4 py-2 font-medium">{t("Venue")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {txs.map((tx, idx) => (
                                    <tr key={tx.id} className={`border-b border-gray-50 dark:border-gray-800/30 last:border-0 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors ${idx % 2 !== 0 ? "bg-black/[0.03] dark:bg-white/[0.03]" : ""}`}>
                                      {multiPerson && (
                                        <td className="px-4 py-2.5 dark:text-white">
                                          <div className="font-medium">{tx.person_name}</div>
                                          {getRole(tx) && <div className="text-xs text-gray-600 dark:text-gray-400">{getRole(tx)}</div>}
                                        </td>
                                      )}
                                      <td className="px-4 py-2.5 dark:text-white tabular-nums whitespace-nowrap">{formatDate(tx.transaction_date, locale)}</td>
                                      <td className="px-4 py-2.5 whitespace-nowrap">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeBadgeCls(tx.transaction_category)}`}>
                                          {tx.transaction_type || "-"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 dark:text-white tabular-nums text-right">{formatVolume(tx.volume, locale)}</td>
                                      <td className="px-4 py-2.5 dark:text-white tabular-nums text-right whitespace-nowrap">
                                        {tx.unit_price != null ? `${formatNum(tx.unit_price, locale)} ${tx.currency}` : "-"}
                                      </td>
                                      <td className="px-4 py-2.5 dark:text-white tabular-nums text-right whitespace-nowrap">
                                        {tx.total_amount != null ? `${formatNum(tx.total_amount, locale, 0)} ${tx.currency}` : "-"}
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">{tx.venue || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {(() => {
                              const note = locale === "da-DK"
                                ? (first.extraction_notes_da || first.extraction_notes)
                                : first.extraction_notes;
                              return note ? (
                                <div className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 italic border-t border-gray-50 dark:border-gray-800/30 flex items-start gap-1.5">
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 dark:text-amber-400 shrink-0 mt-px" aria-hidden="true">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                  </svg>
                                  <span>{note}</span>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </PageTemplate>
      {pdfUrl && <PdfModal url={pdfUrl} onClose={() => setPdfUrl(null)} label={t("Source document")} />}
      {showHelp && <InsiderHelpDialog page="detail" onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default InsiderTransactionDetailsPage;
