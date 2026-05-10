import { useTranslation } from "react-i18next";
import Modal from "./UI/Modal";

const InsiderHelpDialog: React.FC<{ page: "list" | "detail"; onClose: () => void }> = ({ page, onClose }) => {
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
        {page === "list" && (
          <>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                {t("insider_help_what_title")}
              </h2>
              <p>{t("insider_help_what_body")}</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                {t("insider_help_count_title")}
              </h2>
              <p>{t("insider_help_count_body")}</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                {t("insider_help_search_title")}
              </h2>
              <p>{t("insider_help_search_body")}</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                {t("insider_help_tap_title")}
              </h2>
              <p>{t("insider_help_tap_body")}</p>
            </section>
          </>
        )}

        {page === "detail" && (
          <>
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                {t("insider_help_insiders_title")}
              </h2>
              <p>{t("insider_help_insiders_body")}</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                {t("insider_help_types_title")}
              </h2>
              <p>{t("insider_help_types_body")}</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                {t("insider_help_period_title")}
              </h2>
              <p>{t("insider_help_period_body")}</p>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
                {t("insider_help_warning_title")}
              </h2>
              <p>{t("insider_help_warning_body")}</p>
            </section>
          </>
        )}
      </div>
    </Modal>
  );
};

export default InsiderHelpDialog;
