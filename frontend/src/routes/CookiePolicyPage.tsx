import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import { trackPageView } from "../analytics";

const CookiePolicyPage: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    trackPageView("/cookie-policy", "cookie policy");
  }, []);

  return (
    <PageTemplate>
      <div className="max-w-[760px] mx-auto px-5 sm:px-8 py-10 sm:py-16 dark:text-white">
        <header className="mb-10 sm:mb-14 text-center">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {t("Cookie policy")}
          </h1>
          <span className="inline-block mt-4 px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            {t("Last Updated:")} 08-08-2024
          </span>
        </header>

        <article className="space-y-10">
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {t("Functional Cookies")}
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
              {t(
                "We use functional cookies that are necessary to ensure our website functions properly. These cookies enable us to provide essential features, such as saving your settings and ensuring you can navigate our site without issues. Without these cookies, certain features and services on our website would not be available."
              )}
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {t("Statistical Cookies")}
            </h2>
            <p className="text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
              {t(
                'We use statistical cookies to understand how our visitors use the website and to improve the user experience. We use Google Analytics to collect and analyze data on how you interact with our site. These cookies have a validity of up to 2 years. The data we collect is used solely for our own purposes and helps us improve the website for you and other visitors. This data cannot be linked to you. Please note that we only collect statistics if you have given your consent. You can withdraw your consent at any time by clicking on the green "cookie" button in the lower left corner of the screen.'
              )}
            </p>
          </section>
        </article>
      </div>
    </PageTemplate>
  );
};

export default CookiePolicyPage;
