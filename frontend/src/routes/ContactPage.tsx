import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import image from "../static/mail-bird.webp";
import { useEffect } from "react";
import { sendCustomPageView } from "../analytics";
import { useSEO } from "../utils/useSEO";

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  useSEO("Contact Us", "Get in touch with the Danish Short Watch team. Questions, feedback, or assistance.");

  useEffect(() => {
    sendCustomPageView("/contact", "contact");
  }, []);

  return (
    <PageTemplate>
      <div className="w-full max-w-[900px] mx-auto px-6 py-12 dark:text-white">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Left side: text content */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-sm uppercase tracking-widest text-blue-500 dark:text-blue-400 font-medium mb-3">
              {t("Contact us")}
            </p>
            <h1 className="text-3xl lg:text-4xl mb-6 text-gray-900 dark:text-white">
              {t("We'd love to hear from you")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              {t(
                "Do you have any questions, feedback, or need assistance? We are always ready to help you. Please feel free to contact us via email, and we will do our best to respond to your inquiry as quickly as possible."
              )}
            </p>
            <a
              href="mailto:zirium.consultancy@gmail.com"
              className="inline-flex items-center gap-2 text-white bg-blue-500 hover:bg-blue-400 rounded-full px-6 py-3 font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.093L2.25 6.75"
                />
              </svg>
              zirium.consultancy@gmail.com
            </a>
          </div>

          {/* Right side: image */}
          <div className="flex-1 flex justify-center">
            <img
              src={image}
              alt="Mail Bird"
              className="w-full max-w-[280px] lg:max-w-[320px] drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </PageTemplate>
  );
};

export default ContactPage;
