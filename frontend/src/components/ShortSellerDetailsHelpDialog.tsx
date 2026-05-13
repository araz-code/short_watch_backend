import { useTranslation } from "react-i18next";
import Modal from "./UI/Modal";

const ShortSellerDetailsHelpDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={t("How to read this page")}
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
              "This page shows every short position announcement filed by this seller, grouped by stock. Each entry comes directly from the Danish FSA's public register."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Reading the rows")}
          </h2>
          <p className="mb-2">
            {t(
              "Each row shows the publication date and the disclosed short position as a percentage of the company's issued capital."
            )}
          </p>
          <p>
            {t(
              'A green "Current" badge means this is the most recently reported position for that stock and it is still above the 0.5% threshold. A red badge means this was the last known announcement and the position has since fallen below the reporting level or been closed entirely.'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Navigate to the stock")}
          </h2>
          <p>
            {t(
              "Tap the ticker symbol link above each group to go to the full details page for that stock, where you can see the aggregate short interest chart, all other short sellers, and historic data."
            )}
          </p>
        </section>
      </div>
    </Modal>
  );
};

export default ShortSellerDetailsHelpDialog;
