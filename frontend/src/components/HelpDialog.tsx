import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Modal from "./UI/Modal";

const HelpDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={t("How to use Short Watch")}
      closeButtonTitle="Close"
      onClose={onClose}
      enableXClose={true}
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Find a stock")}
          </h2>
          <p>
            {t(
              "Use the search field to find a stock by ticker symbol or company name. Use the sort menu to order the list by symbol, name, last update, or short percentage."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("See the details")}
          </h2>
          <p>
            {t(
              "Click any row to open the details page for that stock. There you can see the full history of the short position as a chart, along with the named short sellers currently holding 0.5% or more."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Build your own watchlist")}
          </h2>
          <p className="mb-3">
            {t(
              "On any stock's details page, click the yellow star in the top-right corner to add it to your personal list."
            )}
          </p>
          <p>
            {t(
              'Back on this page, click "My list" to filter down to only the stocks you have starred. A small checkmark next to a stock in the main list means it is already on your list.'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("How fresh is the data?")}
          </h2>
          <p>
            {t(
              "Short Watch checks Finanstilsynet's public register every 15 minutes and pulls in any new or changed positions. Keep in mind that short sellers themselves have up to one trading day to report a new position, so what you see always reflects the most recent publicly reported state."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Want to understand the rules?")}
          </h2>
          <p>
            {t(
              "For questions about the EU short selling rules, reporting thresholds, and what the numbers mean, see our"
            )}{" "}
            <Link
              to="/faq"
              onClick={onClose}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-500/30 underline-offset-2 transition-colors"
            >
              {t("FAQ page")}
            </Link>
            .
          </p>
        </section>
      </div>
    </Modal>
  );
};

export default HelpDialog;
