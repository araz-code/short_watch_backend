import { useTranslation } from "react-i18next";
import PageTemplate from "../components/PageTemplate";
import image from "../static/mail-bird-2.webp";
import { useEffect, useState } from "react";
import { trackEvent, trackPageView } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";

type FormState = "idle" | "submitting" | "success" | "error";

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const [category, setCategory] = useState("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorKey, setErrorKey] = useState<string>("");

  useEffect(() => {
    trackPageView("/contact", "contact");
    trackEvent("contact_form_view");
  }, []);

  const messageLength = message.trim().length;
  const canSubmit = state !== "submitting" && messageLength >= 10 && messageLength <= 2000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setState("submitting");
    setErrorKey("");

    try {
      const res = await fetch(`${HOST}/stats/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim(),
          website,
        }),
      });

      if (!res.ok) {
        let data: { error?: string } = {};
        try {
          data = await res.json();
        } catch {
          // ignore json parse error
        }
        setErrorKey(data.error || "submit_failed");
        setState("error");
        trackEvent("contact_form_error", { reason: data.error || "submit_failed" });
        return;
      }

      setState("success");
      trackEvent("contact_form_submit", { category, has_email: email.trim().length > 0 });
    } catch {
      setErrorKey("network_error");
      setState("error");
      trackEvent("contact_form_error", { reason: "network_error" });
    }
  }

  const errorText = (() => {
    switch (errorKey) {
      case "rate_limited":
        return t("Too many requests. Please try again later.");
      case "invalid_message_length":
        return t("Message must be between 10 and 2000 characters.");
      case "invalid_email":
        return t("Please enter a valid email address.");
      default:
        return t("Something went wrong. Please try again.");
    }
  })();

  return (
    <PageTemplate>
      <title>Zirium | Contact Us</title>
      <meta name="description" content="Get in touch with the Danish Short Watch team. Questions, feedback, or assistance." />
      <div className="w-full max-w-[900px] mx-auto px-6 py-12 dark:text-white">
        <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-16">
          {/* Left: form */}
          <div className="flex-1 w-full">
            <p className="text-sm uppercase tracking-widest text-blue-500 dark:text-blue-400 font-medium mb-3">
              {t("Contact us")}
            </p>
            <h1 className="text-3xl lg:text-4xl mb-3 text-gray-900 dark:text-white">
              {t("We'd love to hear from you")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              {t("Send a quick message. I usually reply within 24 hours.")}
            </p>

            {state === "success" ? (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-5">
                <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                  {t("Thanks! I'll get back to you soon.")}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                  {email.trim()
                    ? t("I'll reply to your email when I can.")
                    : t("You didn't leave an email, so I can't reply directly. But I read every message.")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="contact-category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                    {t("What is it about?")}
                  </label>
                  <select
                    id="contact-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={state === "submitting"}
                    className="w-full bg-white dark:bg-[#19191f] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-base text-gray-900 dark:text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 focus:outline-none transition-colors"
                  >
                    <option value="feedback">{t("Feedback")}</option>
                    <option value="bug">{t("Bug")}</option>
                    <option value="idea">{t("Idea")}</option>
                    <option value="other">{t("Other")}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                    {t("Your message")}
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={state === "submitting"}
                    rows={5}
                    maxLength={2000}
                    placeholder={t("What would you like to share?")}
                    className="w-full bg-white dark:bg-[#19191f] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-base text-gray-900 dark:text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 focus:outline-none transition-colors resize-y"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{messageLength < 10 ? t("At least 10 characters") : ""}</span>
                    <span className="tabular-nums">{messageLength}/2000</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">
                    {t("Email (optional, if you want a reply)")}
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={state === "submitting"}
                    placeholder="you@example.com"
                    className="w-full bg-white dark:bg-[#19191f] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-base text-gray-900 dark:text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 focus:outline-none transition-colors"
                  />
                </div>

                {/* Honeypot: hidden from real users, bots tend to fill it */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    id="contact-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {state === "error" && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {errorText}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 text-white bg-blue-500 hover:bg-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-full px-6 py-3 font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
                >
                  {state === "submitting" ? t("Sending...") : t("Send message")}
                </button>

                <p className="text-xs text-gray-500 dark:text-gray-400 pt-3">
                  {t("Prefer email?")}{" "}
                  <a
                    href="mailto:zirium.consultancy@gmail.com"
                    onClick={() => trackEvent("email_click")}
                    className="text-blue-500 dark:text-blue-400 hover:underline"
                  >
                    zirium.consultancy@gmail.com
                  </a>
                </p>
              </form>
            )}
          </div>

          {/* Right: image */}
          <div className="hidden lg:flex flex-1 justify-center">
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
