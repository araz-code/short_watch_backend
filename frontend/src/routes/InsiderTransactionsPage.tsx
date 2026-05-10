import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchInsiderIssuers, InsiderIssuer, HOST } from "../apis/ShortPositionAPI";
import { trackEvent } from "../analytics";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import PageTemplate from "../components/PageTemplate";
import DropDownMenu from "../components/UI/DropDownMenu";
import InsiderHelpDialog from "../components/InsiderHelpDialog";

function formatDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

const SORT_OPTIONS = ["Name", "Symbol", "Last updated"] as const;
type SortOption = typeof SORT_OPTIONS[number];

function sortIssuers(list: InsiderIssuer[], by: SortOption): InsiderIssuer[] {
  return [...list].sort((a, b) => {
    switch (by) {
      case "Symbol":
        return (a.symbol || "").localeCompare(b.symbol || "");
      case "Last updated":
        return (b.latest_date ?? "").localeCompare(a.latest_date ?? "");
      case "Name":
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

const InsiderTransactionsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("da") ? "da-DK" : "en-GB";
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [selectedSorting, setSelectedSorting] = useState<SortOption>(() => {
    const saved = localStorage.getItem("insiderSorting");
    return (SORT_OPTIONS as readonly string[]).includes(saved ?? "") ? (saved as SortOption) : "Last updated";
  });

  useEffect(() => {
    localStorage.setItem("insiderSorting", selectedSorting);
  }, [selectedSorting]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["insiderIssuers"],
    staleTime: 5 * 60 * 1000,
    queryFn: ({ signal }) => fetchInsiderIssuers({ signal }),
  });

  useEffect(() => {
    document.title = `Zirium | ${t("Insider Transactions")}`;
    trackEvent("insider_list_view");
    fetch(`${HOST}/stats/visit/insider-list/`).catch(() => {});
  }, [t]);

  const globalEarliestDate = data
    ? data.reduce((min: string | null, item: InsiderIssuer) => {
        if (!item.earliest_date) return min;
        if (!min) return item.earliest_date;
        return item.earliest_date < min ? item.earliest_date : min;
      }, null)
    : null;

  const filtered = data
    ? data.filter((item: InsiderIssuer) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const sorted = sortIssuers(filtered, selectedSorting);

  let content;
  if (isLoading) {
    content = (
      <div className="grid place-items-center h-64">
        <LoadingIndicator />
      </div>
    );
  } else if (isError) {
    content = <ErrorBlock title={t("An error occurred")} message={t("Failed to fetch insider transactions.")} />;
  } else {
    content = (
      <ul>
        {sorted.length === 0 && (
          <p className="text-center font-medium m-10 dark:text-white">{t("No results found")}</p>
        )}
        {sorted.map((issuer: InsiderIssuer, index: number) => (
          <li key={issuer.cvr}>
            <Link to={`/insider-details?cvr=${issuer.cvr}`}>
              <div
                className={`mx-2 my-1 px-4 py-3 rounded-lg flex items-center justify-between shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 dark:text-white border border-gray-100 dark:border-gray-800 ${
                  index % 2 === 0 ? "bg-white dark:bg-[#19191f]" : "bg-gray-50 dark:bg-[#131318]"
                }`}
              >
                <div className="min-w-0">
                  {issuer.symbol && (
                    <div className="font-semibold">{issuer.symbol}</div>
                  )}
                  <div className={`truncate ${issuer.symbol ? "text-sm text-gray-600 dark:text-gray-400" : "font-semibold"}`}>
                    {issuer.name}
                  </div>
                </div>
                <div className="shrink-0 ml-4 text-right">
                  <div className="text-sm font-medium dark:text-white tabular-nums">
                    {t("transaction", { count: issuer.transaction_count })}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {formatDate(issuer.latest_date, locale)}
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="h-dvh min-h-[620px] flex flex-col overflow-hidden [@media(max-height:900px)_and_(orientation:landscape)]:overflow-auto [@media(max-height:900px)_and_(orientation:landscape)]:h-auto [@media(max-height:900px)_and_(orientation:landscape)]:min-h-dvh">
      <PageTemplate>
        <div className="w-screen lg:justify-center lg:gap-4 m-auto flex flex-col flex-1 min-h-0 lg:flex-row">
          <div className="lg:w-[900px] flex flex-col flex-1 min-h-0 lg:flex-initial">
            <div className="pt-6 pb-4 px-2 shrink-0">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl lg:text-3xl dark:text-white">
                  {t("Insider Transactions")}
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400 leading-none self-center">
                  Beta
                </span>
              </div>
              {globalEarliestDate && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                  {t("Data from {{date}}", { date: new Date(globalEarliestDate).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) })}
                </p>
              )}
            </div>

            <section className="w-full flex flex-col flex-1 min-h-0">
              <div className="relative mx-2 flex items-center shrink-0">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg
                    className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 20"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  aria-label="Search"
                  placeholder={t("Search company...")}
                  ref={searchRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-transparent focus:border-blue-400 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-[#19191f] pl-11 pr-10 py-2.5 rounded-xl text-base sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-400/30 transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                )}
              </div>

              <div className="px-2 pt-2 pb-1 shrink-0 flex items-center justify-between">
                <DropDownMenu
                  options={[...SORT_OPTIONS]}
                  selectedMenuItem={selectedSorting}
                  onSelectMenuItemChange={(v) => setSelectedSorting(v as SortOption)}
                />
                <button
                  onClick={() => {
                    trackEvent("help_dialog_open", { page: "insider_list" });
                    fetch(`${HOST}/stats/visit/help-insider-list/`).catch(() => {});
                    setShowHelp(true);
                  }}
                  aria-label={t("Help")}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-500 dark:border-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors focus:ring-2 focus:ring-blue-300"
                >
                  {t("Help")}
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto mt-1 [@media(max-height:900px)_and_(orientation:landscape)]:flex-none [@media(max-height:900px)_and_(orientation:landscape)]:overflow-visible">
                <p className="text-xs pl-2 italic text-gray-600 dark:text-gray-300">
                  {t("Click a company to see its transactions")}
                </p>
                {content}
                <div className="h-6"></div>
              </div>
            </section>
          </div>
        </div>
      </PageTemplate>
      {showHelp && <InsiderHelpDialog page="list" onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default InsiderTransactionsPage;
