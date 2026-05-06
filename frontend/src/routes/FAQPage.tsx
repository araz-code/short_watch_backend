import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import FAQItem from "../components/FAQItem";
import { trackEvent, trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";

const linkClass =
  "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-500/30 underline-offset-2 transition-colors";

const SourceLink: React.FC<{ href: string; label: string }> = ({
  href,
  label,
}) => (
  <>
    {" "}
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {label}
    </a>
  </>
);

const FAQPage: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/faq", "faq");
    fetch(`${HOST}/stats/visit/faq/`).catch(() => {});
  }, []);

  const items: { id: string; q: string; a: React.ReactNode }[] = [
    {
      id: "what_is_short_selling",
      q: t("What is short selling?"),
      a: t(
        "Short selling means selling a stock you don't own (usually borrowed) in the hope of buying it back later at a lower price. The difference is the profit. If the price rises instead, the short seller loses money."
      ),
    },
    {
      id: "who_regulates",
      q: t("Who regulates short selling in the EU?"),
      a: (
        <>
          {t(
            "The Short Selling Regulation (EU) 236/2012 sets the rules across all EU member states. Each country's financial supervisor enforces it. In Denmark that is Finanstilsynet."
          )}
          <SourceLink
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32012R0236"
            label={t("Read the regulation →")}
          />
        </>
      ),
    },
    {
      id: "when_to_report",
      q: t("When must a short position be reported to the regulator?"),
      a: (
        <>
          {t(
            "A net short position of 0.1% or more of a company's issued share capital must be reported to the relevant national regulator. Each further change of 0.1% also triggers a new report. In Denmark reports are submitted to Finanstilsynet."
          )}
          <SourceLink
            href="https://www.dfsa.dk/financial-themes/capital-market/short-selling/notification-of-net-short-positions"
            label={t("Finanstilsynet on notifications →")}
          />
        </>
      ),
    },
    {
      id: "what_is_public",
      q: t("What information is made public?"),
      a: t(
        "Finanstilsynet publishes two separate lists. For positions of 0.1% or more, it publishes the aggregated total net short interest per stock, without naming the holders. For positions of 0.5% or more, it additionally publishes the name of each individual position holder."
      ),
    },
    {
      id: "named_sellers_threshold",
      q: t("Why does Short Watch show named sellers only from 0.5%?"),
      a: t(
        "Because 0.5% is the threshold at which Finanstilsynet discloses the identity of the position holder. Positions between 0.1% and 0.5% are included in the aggregated per-stock totals but are not attributed to a specific holder, so individual names simply are not public below 0.5%."
      ),
    },
    {
      id: "who_reports",
      q: t("Who has to report?"),
      a: t(
        "Any person or entity holding a net short position, regardless of where they are located, if the position is in shares admitted to trading on an EU trading venue."
      ),
    },
    {
      id: "what_is_net_short",
      q: t("What counts as a net short position?"),
      a: (
        <>
          {t(
            "It is the overall bet that a stock will fall, after subtracting any shares or positions the investor also owns that would gain if the stock rises. The calculation includes not only borrowed shares that have been sold, but also other financial contracts (such as options or CFDs) that pay off when the price drops. In short, it is how much the investor stands to gain if the stock goes down."
          )}
          <SourceLink
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32012R0236"
            label={t("Article 3 of the regulation →")}
          />
        </>
      ),
    },
    {
      id: "percent_basis",
      q: t("What is the short percentage measured against?"),
      a: t(
        "The percentage is calculated against the company's total issued shares, not the smaller free float that actually trades on the exchange. Issued shares means every share the company has put out, including those locked up by founders, the state, or other long-term holders who never sell. Because the float is usually much smaller than the total share count, the share of the freely traded stock that is short can be a lot higher than the headline percentage suggests. For example, a 5% short position against issued shares might represent 10% or more of the float."
      ),
    },
    {
      id: "data_delay",
      q: t("Is the data live, or is there a delay?"),
      a: (
        <>
          {t(
            "There is always a delay. Under Article 9 of the Short Selling Regulation, a short seller has until 15:30 on the trading day AFTER they crossed a threshold to file the report. So a position you see published today was actually taken the previous trading day, or even earlier. Over a weekend or holiday, the delay is longer. This means the figures on Short Watch reflect yesterday's market, not today's. The actual current short interest is always unknown until the next round of reports is published."
          )}
          <SourceLink
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32012R0236"
            label={t("Article 9 →")}
          />
        </>
      ),
    },
    {
      id: "naked_short",
      q: t("What is naked short selling, and is it allowed?"),
      a: (
        <>
          {t(
            "To short sell normally, the seller first borrows the shares from someone who owns them, then sells those borrowed shares on the market. Later they must buy shares back and return them to the lender. Naked short selling skips the borrowing step: the seller sells shares they neither own nor have actually borrowed, hoping to find shares to deliver before the trade has to settle. Under Article 12 of the EU Short Selling Regulation this is not allowed. A short seller must have already borrowed the shares, have a firm agreement to borrow them, or have solid grounds to expect they can get the shares in time."
          )}
          <SourceLink
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32012R0236"
            label={t("Article 12 →")}
          />
        </>
      ),
    },
    {
      id: "can_ban",
      q: t("Can regulators ban short selling?"),
      a: (
        <>
          {t(
            "Yes. In exceptional circumstances, national regulators and ESMA can impose temporary bans or restrictions on short selling, for example during periods of severe market stress."
          )}
          <SourceLink
            href="https://www.esma.europa.eu/esmas-activities/markets-and-infrastructure/short-selling"
            label={t("ESMA on short selling →")}
          />
        </>
      ),
    },
    {
      id: "data_source",
      q: t("Where does Short Watch get its data?"),
      a: (
        <>
          {t(
            "All data comes from official public disclosures published by Finanstilsynet, the Danish Financial Supervisory Authority."
          )}
          <SourceLink
            href="https://www.finanstilsynet.dk/finansielle-temaer/kapitalmarked/selskabsmeddelelser/aggregerede-korte-nettopositioner"
            label={t("Finanstilsynet's public data →")}
          />
        </>
      ),
    },
    {
      id: "update_frequency",
      q: t("How often is the data updated?"),
      a: t(
        "Short Watch checks Finanstilsynet's public register every 15 minutes and pulls in any new or changed positions."
      ),
    },
  ];

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const allOpen = openIds.size === items.length;

  const handleToggle = (id: string, nextOpen: boolean) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (nextOpen) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleExpandCollapseAll = () => {
    if (allOpen) {
      trackEvent("faq_collapse_all");
      setOpenIds(new Set());
    } else {
      trackEvent("faq_expand_all");
      setOpenIds(new Set(items.map((item) => item.id)));
    }
  };

  return (
    <PageTemplate>
      <title>Zirium | FAQ</title>
      <meta name="description" content="Frequently asked questions about EU short selling rules: reporting thresholds, public disclosure, and who has to report." />
      <div className="w-full max-w-[760px] mx-auto px-5 sm:px-8 py-10 sm:py-16 dark:text-white">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
          {t("Frequently asked questions")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {t("Short selling rules in the EU: The essentials.")}
        </p>

        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={handleExpandCollapseAll}
            aria-pressed={allOpen}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2.5 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-blue-300 outline-hidden"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className={`transition-transform duration-200 ${
                allOpen ? "rotate-180" : ""
              }`}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {allOpen ? t("Collapse all") : t("Expand all")}
          </button>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#19191f] border border-gray-100 dark:border-gray-800 px-5 sm:px-6">
          {items.map((item) => (
            <FAQItem
              key={item.id}
              id={item.id}
              question={item.q}
              answer={item.a}
              open={openIds.has(item.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-8 leading-relaxed">
          {t(
            "This page provides general information only and does not constitute legal advice."
          )}
        </p>
      </div>
    </PageTemplate>
  );
};

export default FAQPage;
