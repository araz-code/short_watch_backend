import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { trackEvent } from "../analytics";
import { HOST } from "../apis/ShortPositionAPI";

type Sentiment = "positive" | "negative";
type Stage = "idle" | "rated" | "submitting" | "submitted" | "error";

interface Props {
  pageType: string;
  pageId: string;
  compact?: boolean;
}

export default function FeedbackWidget({ pageType, pageId, compact = false }: Props) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("idle");
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");

  async function postFeedback(s: Sentiment, c: string) {
    return fetch(`${HOST}/stats/feedback/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sentiment: s,
        page_type: pageType,
        page_id: pageId,
        comment: c,
        website,
      }),
    });
  }

  async function handleVote(s: Sentiment) {
    setSentiment(s);
    setStage("rated");
    trackEvent("feedback_thumbs_click", { sentiment: s, page_type: pageType, page_id: pageId });
    try {
      await postFeedback(s, "");
    } catch {
      // Silent: the comment submit will retry. Vote can still be re-attempted.
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!sentiment) return;
    const trimmed = comment.trim();
    if (trimmed.length === 0) {
      setStage("submitted");
      return;
    }
    setStage("submitting");
    try {
      const res = await postFeedback(sentiment, trimmed);
      if (!res.ok) {
        setStage("error");
        trackEvent("feedback_comment_submit", { sentiment, page_type: pageType, page_id: pageId, ok: false });
        return;
      }
      setStage("submitted");
      trackEvent("feedback_comment_submit", { sentiment, page_type: pageType, page_id: pageId, ok: true });
    } catch {
      setStage("error");
    }
  }

  const commentPlaceholder =
    sentiment === "negative"
      ? t("What could be better? (optional)")
      : t("Anything you'd like to add? (optional)");

  const sectionClass = compact
    ? "mt-3"
    : "mt-12 pt-6 border-t border-gray-100 dark:border-gray-800";
  const promptClass = compact
    ? "text-xs text-gray-500 dark:text-gray-400"
    : "text-sm font-medium text-gray-700 dark:text-gray-300";
  const buttonClass = compact
    ? "inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#19191f] text-sm transition-colors"
    : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#19191f] text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors";
  const positiveHover = "hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-300";
  const negativeHover = "hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-700 hover:text-red-700 dark:hover:text-red-300";

  return (
    <section className={sectionClass}>
      {stage === "idle" && (
        <div className="space-y-3">
          {!compact && (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {t("feedback_intro")}
            </p>
          )}
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={promptClass}>
                {t("Was this helpful?")}
              </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleVote("positive")}
                aria-label={t("Yes, helpful")}
                className={`${buttonClass} ${positiveHover}`}
              >
                <span aria-hidden="true">👍</span>{!compact && <> {t("Yes")}</>}
              </button>
              <button
                type="button"
                onClick={() => handleVote("negative")}
                aria-label={t("No, not helpful")}
                className={`${buttonClass} ${negativeHover}`}
              >
                <span aria-hidden="true">👎</span>{!compact && <> {t("No")}</>}
              </button>
            </div>
          </div>
            {!compact && (
              <Link
                to={`/contact?category=${pageType === "analysis" ? "analysis" : "feedback"}`}
                onClick={() =>
                  trackEvent("feedback_contact_click", { page_type: pageType, page_id: pageId })
                }
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline underline-offset-2 transition-colors"
              >
                {t("Want to say more? Contact us")} →
              </Link>
            )}
          </div>
        </div>
      )}

      {stage === "rated" && (
        <form onSubmit={handleSubmitComment} className="space-y-3" noValidate>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {sentiment === "positive"
              ? t("Thanks for the thumbs up!")
              : t("Thanks for the feedback.")}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={commentPlaceholder}
            className="w-full bg-white dark:bg-[#19191f] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 focus:outline-none transition-colors resize-y"
          />
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-colors"
            >
              {comment.trim().length > 0 ? t("Send") : t("Skip")}
            </button>
            {comment.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setStage("submitted")}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {t("No thanks")}
              </button>
            )}
          </div>
        </form>
      )}

      {stage === "submitting" && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t("Sending...")}
        </p>
      )}

      {stage === "submitted" && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
          {t("Thanks for your feedback!")}
        </p>
      )}

      {stage === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t("Something went wrong. Please try again.")}
        </p>
      )}
    </section>
  );
}
