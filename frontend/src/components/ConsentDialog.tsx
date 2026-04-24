import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { createPortal } from "react-dom";
import { updateConsent } from "../apis/ShortPositionAPI";

const localStorageConsentIdKey = "consentId";
const localStorageConsentAccepted = "consentAccepted";
const localStorageConsentVersion = "consentVersion";

// Bump this whenever the cookie/privacy policy materially changes
// (new tracking categories, new processors, etc.) — every existing user
// will be re-prompted on their next visit.
export const CURRENT_CONSENT_VERSION = 2;

const getOrGenerateConsentId = (): string => {
  const existingConsentId = localStorage.getItem(localStorageConsentIdKey);

  if (existingConsentId) {
    return existingConsentId;
  } else {
    const newConsentId = uuidv4();
    localStorage.setItem(localStorageConsentIdKey, newConsentId);
    return newConsentId;
  }
};

const ConsentDialog: React.FC<{
  onClose: () => void;
  onConsentAccepted: (value: boolean) => void;
}> = ({ onClose, onConsentAccepted }) => {
  const { t } = useTranslation();

  const consentAccepted = () => {
    localStorage.setItem(localStorageConsentAccepted, JSON.stringify(true));
    localStorage.setItem(localStorageConsentVersion, String(CURRENT_CONSENT_VERSION));
    const consentId = getOrGenerateConsentId();
    updateConsent(consentId, true);
    onConsentAccepted(true);
    onClose();
  };

  const consentDeclined = () => {
    // If GA was initialized earlier this session, scripts are already running
    // and just clearing cookies won't stop tracking — reload to fully unload them.
    const wasAccepted =
      localStorage.getItem(localStorageConsentAccepted) === "true";

    localStorage.setItem(localStorageConsentAccepted, JSON.stringify(false));
    localStorage.setItem(localStorageConsentVersion, String(CURRENT_CONSENT_VERSION));

    const consentId = getOrGenerateConsentId();
    updateConsent(consentId, false);
    onConsentAccepted(false);
    onClose();

    if (wasAccepted) {
      window.location.reload();
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] pointer-events-none" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Cookie policy")}
        className="fixed z-50 inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-[420px]"
      >
        <div className="mx-3 mb-3 sm:mx-0 sm:mb-0 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-lg" aria-hidden="true">
                🍪
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                  {t("We use cookies to collect statistics on the usage of the website")}
                </h2>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
              {t(
                "If you click the 'Accept' button, you consent to our use of cookies for statistical purposes. We use this data to improve the user experience for you and other visitors. This data CANNOT be linked to you."
              )}
            </p>
            <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 mt-2">
              {t(
                'You can change or withdraw your consent at any time by clicking the green "cookie" button in the bottom left corner.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 px-5 pb-5">
            <button
              type="button"
              onClick={consentDeclined}
              className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:ring-2 focus:ring-gray-300"
            >
              {t("Decline")}
            </button>
            <button
              type="button"
              onClick={consentAccepted}
              className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25 focus:ring-2 focus:ring-blue-300"
            >
              {t("Accept")}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.getElementById("modal")!
  );
};

export default ConsentDialog;
