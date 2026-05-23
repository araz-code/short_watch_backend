import { trackEvent } from "../analytics";
import FeedbackWidget from "./FeedbackWidget";

interface FAQItemProps {
  id: string;
  question: string;
  answer: React.ReactNode;
  open: boolean;
  onToggle: (id: string, nextOpen: boolean) => void;
}

const FAQItem: React.FC<FAQItemProps> = ({
  id,
  question,
  answer,
  open,
  onToggle,
}) => {
  const toggle = () => {
    const nextOpen = !open;
    if (nextOpen) {
      trackEvent("faq_question_open", { question_id: id, question });
    }
    onToggle(id, nextOpen);
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-4 py-4 text-left bg-transparent border-none cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-blue-300 rounded-md"
      >
        <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white leading-snug">
          {question}
        </span>
        <span
          className={`shrink-0 w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-transform duration-200 mt-0.5 ${
            open ? "rotate-45" : ""
          }`}
          aria-hidden="true"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 1v10M1 6h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {open && (
        <div className="pb-4 pr-10 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {answer}
          <FeedbackWidget compact pageType="faq" pageId={id} />
        </div>
      )}
    </div>
  );
};

export default FAQItem;
