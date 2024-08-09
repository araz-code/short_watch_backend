import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import { sendCustomPageView } from "../analytics";

const CookiePolicyPage: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    sendCustomPageView("/cookie-policy", "contact");
  }, []);

  return (
    <PageTemplate>
      <div className="px-10 dark:text-white">
        <>
          <div className="m-auto mb-12 mt-4">
            <h1 className="text-4xl font-bold text-center">
              {t("Cookie policy")}
            </h1>
          </div>

          <section className="lg:w-[900px] pb-10">
            <p className="pb-5 font-bold">{t("Last Updated:")} 08-08-2024</p>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("Functional Cookies")}
            </h2>
            <p className="pb-5">
              {t(
                "We use functional cookies that are necessary to ensure our website functions properly. These cookies enable us to provide essential features, such as saving your settings and ensuring you can navigate our site without issues. Without these cookies, certain features and services on our website would not be available."
              )}
            </p>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("Statistical Cookies")}
            </h2>
            <p className="pb-5">
              {t(
                'We use statistical cookies to understand how our visitors use the website and to improve the user experience. We use Google Analytics to collect and analyze data on how you interact with our site. These cookies have a validity of up to 2 years. The data we collect is used solely for our own purposes and helps us improve the website for you and other visitors. This data cannot be linked to you. Please note that we only collect statistics if you have given your consent. You can withdraw your consent at any time by clicking on the green "cookie" button in the lower left corner of the screen.'
              )}
            </p>
          </section>
        </>{" "}
      </div>
    </PageTemplate>
  );
};

export default CookiePolicyPage;
