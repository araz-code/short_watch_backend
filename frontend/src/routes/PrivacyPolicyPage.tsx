import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import { sendCustomPageView } from "../analytics";

const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    sendCustomPageView("/privacy-policy", "privacy policy");
  }, []);

  return (
    <PageTemplate>
      <div className="px-10 dark:text-white">
        <>
          <div className="m-auto mb-12 mt-4">
            <h1 className="text-4xl font-bold text-center">
              {t("Privacy policy")}
            </h1>
          </div>

          <section className="lg:w-[900px] pb-10">
            <p className="pb-5 font-bold">{t("Last Updated:")} 05-08-2024</p>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("1. Introduction")}
            </h2>
            <p className="pb-3">
              {t(
                "This privacy policy is about how we protect your privacy and ensuring the security of your personal information. This privacy policy explains how we collect, use, and share your information when you use our website or app."
              )}
            </p>
            <p className="pb-5">
              {t(
                "We have made every effort to store as few personal data as possible and only collect statistics for our own use if you consent to our cookie policy."
              )}
            </p>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("2. What are personal data?")}
            </h2>
            <p className="pb-5">
              {t(
                "Personal data is any form of information about an identified or identifiable physical person. In other words, it includes all types of information that can be directly or indirectly linked to an individual. This can, for example, be a first and last name, a home address, an email address, or an IP-address."
              )}
            </p>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("3. We are the data controller - how do you contact us?")}
            </h2>
            <p className="pb-3">
              {t(
                "Zirium is the data controller for the processing of the personal data that we have received about you. You will find our contact information below."
              )}
            </p>
            <div className=" pb-5">
              <p className="pb-1">Zirium</p>
              <p className="pb-1">Nordre Fasanvej 64, 4. 44</p>
              <p className="pb-1">2000 Frederiksberg</p>
              <p className="pb-1">zirium.consultancy@gmail.com</p>
            </div>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("4. Information we collect")}
            </h2>
            <p className="pb-3">
              {t(
                "We may collect the following types of information when you use our app:"
              )}
            </p>
            <ul className="list-disc pl-4 pb-5">
              <li className="pb-3">
                <strong>{t("Usage information:")}</strong>{" "}
                {t(
                  "We collect information about how you use our website and app, if you consent to our cookie policy."
                )}
              </li>
              <li className="pb-3">
                <strong>{t("Device information:")}</strong>{" "}
                {t(
                  "We may collect information about the device you use to access our app, including device type and operating system"
                )}
              </li>
              <li className="pb-3">
                <strong>{t("Personal information:")}</strong>{" "}
                {t(
                  "We collect and log your IP address, and in case of email communication, we will store your email address, which will be used exclusively for communication with you."
                )}
              </li>
            </ul>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("5. How we use your information")}
            </h2>
            <p className="pb-3">
              {t("We may use your information for the following purposes:")}
            </p>
            <ul className="list-disc pl-4 pb-5">
              <li className="pb-3">
                {t("To provide and maintain our app's functionality.")}
              </li>
              <li className="pb-3">
                {t(
                  "To communicate with you, respond to your requests, and provide customer support."
                )}
              </li>
              <li className="pb-3">
                {t("To improve our app and analyze usage patterns.")}
              </li>
              <li className="pb-3">
                {t("To comply with legal and regulatory requirements.")}
              </li>
            </ul>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("6. Information sharing")}
            </h2>
            <p className="pb-3">
              {t("We do not sell your personal information to third parties.")}
            </p>
            <p className="pb-3">
              {t("We use Google's Gmail as our email service provider.")}
            </p>

            <p className="pb-5">
              {t(
                "We use Google Analytics to collect statistics on usage data for our own purposes, if you have consented to our cookie policy. These cookies have a validity of up to 2 years."
              )}
            </p>

            <h2 className="pb-5 text-2xl font-semibold">
              {t("7. Where your personal information originates from")}
            </h2>
            <p className="pb-3">
              {t(
                "We log your IP address when the website or app requests data from our service. Your email is only obtained if you communicate with us via email."
              )}
            </p>
            <p className="pb-5">
              {t(
                "We use Google Analytics to collect statistics on how you use our website. Google Analytics gathers information about your device, browser, and how you interact with our service. This information is used to improve user experience and for analytical purposes. Google Analytics uses cookies to collect this data."
              )}
            </p>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("8. Storage of your personal information")}
            </h2>
            <p className="pb-5">
              {t(
                "We retain personal information at most 2 year after your most recent email contact or your last use of the website or app."
              )}
            </p>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("9. Right to withdraw consent")}
            </h2>
            <p className="pb-3">
              {t(
                "You have the right to withdraw your consent at any time. You can do this by contacting us using the contact information provided in point 3 above."
              )}
            </p>
            <p className="pb-3">
              {t(
                "If you choose to withdraw your consent, it does not affect the legality of our processing of your personal information based on your previously given consent, up to the time of withdrawal. Therefore, if you withdraw your consent, it will only take effect from that point onward."
              )}
            </p>
            <h4 className="pb-3 text-xl font-medium">{t("Your rights")}</h4>
            <p className="pb-3">
              {t(
                "Under data protection regulations, you have several rights concerning our processing of information about you."
              )}
            </p>
            <p className="pb-3">
              {t("If you wish to exercise your rights, please contact us.")}
            </p>
            <h4 className="pb-3 text-xl font-medium">
              {t("Right to access information (right to access)")}
            </h4>
            <p className="pb-3">
              {t(
                "You have the right to access the information that we process about you, as well as additional information."
              )}
            </p>
            <h4 className="pb-3 text-xl font-medium">
              {t("Right to rectification (correction)")}
            </h4>
            <p className="pb-3">
              {t(
                "You have the right to have incorrect information about yourself corrected."
              )}
            </p>
            <h4 className="pb-3 text-xl font-medium">
              {t("Right to erasure")}
            </h4>
            <p className="pb-3">
              {t(
                "In certain cases, you have the right to have information about you deleted before our regular general deletion occurs."
              )}
            </p>
            <h4 className="pb-3 text-xl font-medium">
              {t("Right to restrict processing")}
            </h4>
            <p className="pb-3">
              {t(
                "In certain cases, you have the right to restrict the processing of your personal information. If you have the right to restrict processing, we may only process the information, excluding storage, with your consent or for the establishment, exercise, or defense of legal claims, or to protect a person or significant societal interests."
              )}
            </p>
            <h4 className="pb-3 text-xl font-medium">{t("Right to object")}</h4>
            <p className="pb-3">
              {t(
                "In certain cases, you have the right to object to our lawful processing of your personal information. You can also object to the processing of your information for direct marketing purposes."
              )}
            </p>
            <h4 className="pb-3 text-lg font-medium">
              {t("Right to data portability")}
            </h4>
            <p className="pb-3">
              {t(
                "In certain cases, you have the right to receive your personal information in a structured, commonly used, and machine-readable format and have this personal information transferred from one data controller to another without hindrance."
              )}
            </p>
            <p className="pb-5">
              {t(
                "You can read more about your rights in the Data Protection Agency's guidance on the rights of data subjects, which can be found at"
              )}{" "}
              <a
                className="text-blue-500 underline"
                href="https://www.datatilsynet.dk"
              >
                www.datatilsynet.dk
              </a>
              .
            </p>
            <h2 className="pb-5 text-2xl font-semibold">
              {t("10. Complaint to the Data Protection Agency")}
            </h2>
            <p>
              {t(
                "You have the right to file a complaint with the Data Protection Agency if you are dissatisfied with the way we process your personal information. You can find the contact information for the Data Protection Agency at"
              )}{" "}
              <a
                className="text-blue-500 underline"
                href="https://www.datatilsynet.dk"
              >
                www.datatilsynet.dk
              </a>
              .
            </p>
          </section>
        </>
      </div>
    </PageTemplate>
  );
};

export default PrivacyPolicyPage;
