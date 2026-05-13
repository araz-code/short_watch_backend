import { useTranslation } from "react-i18next";
import Modal from "./UI/Modal";

const ShortSellersHelpDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={t("How to use Short Sellers")}
      closeButtonTitle="Close"
      onClose={onClose}
      enableXClose={true}
      centerOnMobile={true}
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("What you see here")}
          </h2>
          <p>
            {t(
              "This list shows every named short seller that has disclosed a position of 0.5% or more in a Danish stock. The Danish FSA only publishes names above this threshold, so smaller positions are not shown."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Search and sort")}
          </h2>
          <p>
            {t(
              "Use the search field to find a specific fund or institution by name. Use the sort menu to order the list by name or by the date of the most recent position change."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Current filter")}
          </h2>
          <p>
            {t(
              'Tap "Current" to show only sellers that hold at least one active position right now. Tap "All" to include sellers whose last known position has since been closed or fallen below the reporting threshold.'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("See the details")}
          </h2>
          <p>
            {t(
              "Click any row to open the detail page for that seller. There you can see every position they have ever disclosed, grouped by stock, along with the date and size of each announcement."
            )}
          </p>
        </section>
      </div>
    </Modal>
  );
};

export default ShortSellersHelpDialog;
