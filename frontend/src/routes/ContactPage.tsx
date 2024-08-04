import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import image from "../static/mail-bird.png";
import { clicked } from "../apis/ShortPositionAPI";

const Contact: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageTemplate>
      <div className="px-10 dark:text-white">
        <div className="m-auto mb-12 mt-4">
          <h1 className="text-4xl font-bold text-center">{t("Contact us")}</h1>
        </div>

        <section className="lg:w-[900px] pb-3 mx-auto flex flex-col lg:flex-row items-center lg:items-start gap-6">
          <div className="flex-1">
            <p className="pb-3">
              {t(
                "Do you have any questions, feedback, or need assistance? We are always ready to help you. Please feel free to contact us via email, and we will do our best to respond to your inquiry as quickly as possible."
              )}
            </p>
            <p className="pb-3">
              {t("Please send your inquiries to the following email address:")}{" "}
              <a
                href="mailto:zirium.consultancy@gmail.com"
                className="underline text-blue-500 hover:text-blue-700"
                onClick={() => clicked("contact")}
              >
                zirium.consultancy@gmail.com
              </a>
              .
            </p>
          </div>
          <div className="flex-1 flex justify-center">
            <img
              src={image}
              alt="Mail Bird"
              className="w-full max-w-xs lg:max-w-md"
            />
          </div>
        </section>
      </div>
    </PageTemplate>
  );
};

export default Contact;
