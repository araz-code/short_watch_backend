import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import { sendCustomPageView } from "../analytics";

const TermsOfAgreementPage: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    sendCustomPageView("/privacy-policy", "privacy policy");
  }, []);

  return (
    <PageTemplate>
      <div className="px-10 dark:text-white">
        <div className="m-auto mb-12 mt-4">
          <h1 className="text-4xl font-bold text-center">
            {t("Terms of agreement")}
          </h1>
        </div>

        <section className="lg:w-[900px] pb-3">
          <p className="pb-5 font-bold">{t("Last Updated:")} 05-08-2024</p>
          <p className="pb-3">
            {t(
              "We cannot guarantee the accuracy of data within the Danish Short Watch app (the app). This data is collected from Danish FSA’s web portal which is a database for company announcements filed by companies which under section 25 of the Danish Capital Markets Act are obliged to file information with the Danish FSA."
            )}
          </p>

          <p className="pb-3">
            {t(
              "We are not responsible for how users utilize the app or the information and materials published therein."
            )}
          </p>

          <p className="pb-3">
            {t(
              "Users are solely responsible for downloading or using information and other resources publicly available in the app, including those accessed through external links."
            )}
          </p>

          <p className="pb-3">
            {t("We cannot be held liable for delays or errors in data.")}
          </p>

          <p className="pb-3">
            {t(
              "We are not responsible for loss on the user or any indirect losses incurred."
            )}
          </p>
        </section>
      </div>
    </PageTemplate>
  );
};

export default TermsOfAgreementPage;
