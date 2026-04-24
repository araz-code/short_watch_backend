import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import { trackPageView } from "../analytics";

const TermsOfAgreementPage: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/terms-of-agreement", "terms of agreement");
  }, []);

  return (
    <PageTemplate>
      <div className="max-w-[760px] mx-auto px-5 sm:px-8 py-10 sm:py-16 dark:text-white">
        <header className="mb-10 sm:mb-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {t("Terms of agreement")}
          </h1>
          <span className="inline-block mt-4 px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            {t("Last Updated:")} 05-08-2024
          </span>
        </header>

        <article className="space-y-5 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
          <p>
            {t(
              "We cannot guarantee the accuracy of data within the Danish Short Watch app (the app). This data is collected from Danish FSA’s web portal which is a database for company announcements filed by companies which under section 25 of the Danish Capital Markets Act are obliged to file information with the Danish FSA."
            )}
          </p>
          <p>
            {t(
              "We are not responsible for how users utilize the app or the information and materials published therein."
            )}
          </p>
          <p>
            {t(
              "Users are solely responsible for downloading or using information and other resources publicly available in the app, including those accessed through external links."
            )}
          </p>
          <p>{t("We cannot be held liable for delays or errors in data.")}</p>
          <p>
            {t(
              "We are not responsible for loss on the user or any indirect losses incurred."
            )}
          </p>
        </article>
      </div>
    </PageTemplate>
  );
};

export default TermsOfAgreementPage;
