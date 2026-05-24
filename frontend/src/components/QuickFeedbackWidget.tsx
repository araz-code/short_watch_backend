import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentDots, faXmark, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { HOST } from "../apis/ShortPositionAPI";
import { trackEvent } from "../analytics";

type State = "idle" | "submitting" | "success" | "error";

export default function QuickFeedbackWidget() {
  const { i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const messageLength = message.trim().length;
  const canSubmit = state !== "submitting" && messageLength >= 10 && messageLength <= 2000;

  // Auto-close after success
  useEffect(() => {
    if (state !== "success") return;
    const t = setTimeout(() => {
      setOpen(false);
      setMessage("");
      setEmail("");
      setCategory("feedback");
      setState("idle");
    }, 3500);
    return () => clearTimeout(t);
  }, [state]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setState("submitting");
    setErrorMsg("");
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
        try { data = await res.json(); } catch { /* ignore */ }
        setErrorMsg(
          data.error === "invalid_message_length"
            ? (isDa ? "Beskeden skal være mellem 10 og 2.000 tegn." : "Message must be 10-2000 characters.")
            : data.error === "invalid_email"
              ? (isDa ? "Indtast en gyldig email." : "Please enter a valid email.")
              : (isDa ? "Kunne ikke sende. Prøv igen." : "Could not send. Please try again.")
        );
        setState("error");
        trackEvent("quick_feedback_error", { reason: data.error || "submit_failed" });
        return;
      }
      setState("success");
      trackEvent("quick_feedback_submit", {
        category,
        has_email: email.trim().length > 0,
      });
    } catch {
      setErrorMsg(isDa ? "Netværksfejl. Prøv igen." : "Network error. Please try again.");
      setState("error");
      trackEvent("quick_feedback_error", { reason: "network_error" });
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        aria-label={isDa ? "Send feedback" : "Send feedback"}
        onClick={() => {
          setOpen(true);
          trackEvent("quick_feedback_open");
        }}
        className="hidden xl:flex fixed bottom-4 right-4 z-40 items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-full shadow-lg hover:shadow-xl transition-all focus:ring-2 focus:ring-blue-300 focus:outline-none"
      >
        <FontAwesomeIcon icon={faCommentDots} />
        <span>{isDa ? "Feedback" : "Feedback"}</span>
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="quick-feedback-title"
      className="hidden xl:block fixed bottom-4 right-4 z-40 w-[340px] bg-white dark:bg-[#19191f] rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <p id="quick-feedback-title" className="font-semibold text-sm text-gray-900 dark:text-white">
          {isDa ? "Send mig en besked" : "Send me a message"}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={isDa ? "Luk" : "Close"}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 focus:ring-2 focus:ring-blue-300 rounded-sm focus:outline-none"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {state === "success" ? (
        <div className="p-6 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {isDa ? "Tak for din besked!" : "Thanks for your message!"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {email.trim()
              ? (isDa ? "Jeg svarer dig så snart jeg kan." : "I'll reply when I can.")
              : (isDa ? "Jeg læser hver eneste besked." : "I read every message.")}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <label htmlFor="qf-category" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
              {isDa ? "Kategori" : "Category"}
            </label>
            <select
              id="qf-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-[#0f0f12] border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="feedback">{isDa ? "Feedback" : "Feedback"}</option>
              <option value="bug">{isDa ? "Fejl" : "Bug"}</option>
              <option value="idea">{isDa ? "Idé" : "Idea"}</option>
              <option value="other">{isDa ? "Andet" : "Other"}</option>
            </select>
          </div>

          <div>
            <label htmlFor="qf-message" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
              {isDa ? "Din besked" : "Your message"}
            </label>
            <textarea
              id="qf-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={isDa ? "Skriv din besked her..." : "Write your message here..."}
              className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-[#0f0f12] border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none"
            />
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
              <span>{messageLength > 0 && messageLength < 10 ? (isDa ? "Mindst 10 tegn" : "At least 10 chars") : ""}</span>
              <span>{messageLength}/2000</span>
            </div>
          </div>

          <div>
            <label htmlFor="qf-email" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">
              {isDa ? "Email (valgfri)" : "Email (optional)"}
            </label>
            <input
              id="qf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isDa ? "din@email.dk" : "you@email.com"}
              className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-[#0f0f12] border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* Honeypot - hidden from users, visible to bots */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] w-px h-px opacity-0"
          />

          {state === "error" && errorMsg && (
            <p className="text-xs text-red-500 dark:text-red-400" role="alert">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium text-sm rounded-md transition-colors focus:ring-2 focus:ring-blue-300 focus:outline-none"
          >
            {state === "submitting" ? (
              <span>{isDa ? "Sender..." : "Sending..."}</span>
            ) : (
              <>
                <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                <span>{isDa ? "Send" : "Send"}</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
