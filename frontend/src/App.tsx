import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";

import HomePage from "./routes/HomePage.tsx";
import ErrorPage from "./routes/ErrorPage.tsx";
import { queryClient, statusCheck } from "./apis/ShortPositionAPI.tsx";
import "./utils/i18n.ts";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCookieBite } from "@fortawesome/free-solid-svg-icons";
import ConsentDialog, { CURRENT_CONSENT_VERSION } from "./components/ConsentDialog.tsx";
import { trackEvent, initializeAnalytics } from "./analytics.tsx";
import { useCookies } from "react-cookie";
import LoadingIndicator from "./components/UI/LoadingIndicator.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { useTranslation } from "react-i18next";

const ANNOUNCEMENT_KEY = "announcement_dismissed_v3";

function AnnouncementModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-[#19191f] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>

        <div className="text-center mb-5">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-400/15 px-3 py-1 rounded-full mb-3">
            {t("New")}
          </span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {t("announcement_title")}
          </h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center mb-6">
          {t("announcement_body")}
        </p>

        <div className="flex flex-col gap-2">
          <a
            href="/insider-transactions"
            onClick={() => { trackEvent("banner_click", { destination: "insider_transactions" }); onClose(); }}
            className="w-full text-center px-4 py-2.5 rounded-full text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
          >
            {t("Insider Trades")} →
          </a>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-full text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t("Maybe later")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Lazy loaded routes
const ShortWatchPage = lazy(() => import("./routes/ShortWatchPage.tsx"));
const ShortPositionDetailsPage = lazy(() => import("./routes/ShortPositionDetailsPage.tsx"));
const LargestSellersPage = lazy(() => import("./routes/ShortSellersPage.tsx"));
const ShortSellerDetailsPage = lazy(() => import("./routes/ShortSellerDetailsPage.tsx"));
const TopListsPage = lazy(() => import("./routes/TopListsPage.tsx"));
const ContactPage = lazy(() => import("./routes/ContactPage.tsx"));
const PrivacyPolicyPage = lazy(() => import("./routes/PrivacyPolicyPage.tsx"));
const TermsOfAgreementPage = lazy(() => import("./routes/TermsOfAgreementPage.tsx"));
const CookiePolicyPage = lazy(() => import("./routes/CookiePolicyPage.tsx"));
const FAQPage = lazy(() => import("./routes/FAQPage.tsx"));
const InsiderTransactionsPage = lazy(() => import("./routes/InsiderTransactionsPage.tsx"));
const InsiderTransactionDetailsPage = lazy(() => import("./routes/InsiderTransactionDetailsPage.tsx"));

type ConsentButtonProps = {
  onClick: () => void;
};

// ConsentButton component
function ConsentButton({ onClick }: ConsentButtonProps) {
  return (
    <>
      <button
        aria-label="Open cookie consent options"
        className="fixed bottom-3 left-2 sm:left-3 bg-transparent text-green-500 p-0 rounded-full shadow-lg focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
        onClick={() => {
          trackEvent("cookie_consent_open");
          onClick();
        }}
      >
        <FontAwesomeIcon icon={faCookieBite} size="xl" />
      </button>
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <ErrorBoundary><HomePage /></ErrorBoundary>,
    errorElement: <ErrorPage />,
  },
  {
    path: "short-watch",
    element: <ErrorBoundary><ShortWatchPage /></ErrorBoundary>,
  },
  {
    path: "short-watch-details",
    element: <ErrorBoundary><ShortPositionDetailsPage /></ErrorBoundary>,
  },
  {
    path: "short-sellers",
    element: <ErrorBoundary><LargestSellersPage /></ErrorBoundary>,
  },
  {
    path: "short-seller-details",
    element: <ErrorBoundary><ShortSellerDetailsPage /></ErrorBoundary>,
  },
  {
    path: "top-lists",
    element: <ErrorBoundary><TopListsPage /></ErrorBoundary>,
  },
  {
    path: "privacy-policy",
    element: <ErrorBoundary><PrivacyPolicyPage /></ErrorBoundary>,
  },
  {
    path: "privatlivspolitik",
    element: <ErrorBoundary><PrivacyPolicyPage /></ErrorBoundary>,
  },
  {
    path: "cookie-policy",
    element: <ErrorBoundary><CookiePolicyPage /></ErrorBoundary>,
  },
  {
    path: "terms-of-agreement",
    element: <ErrorBoundary><TermsOfAgreementPage /></ErrorBoundary>,
  },
  {
    path: "aftalevilkaar",
    element: <ErrorBoundary><TermsOfAgreementPage /></ErrorBoundary>,
  },
  {
    path: "contact",
    element: <ErrorBoundary><ContactPage /></ErrorBoundary>,
  },
  {
    path: "faq",
    element: <ErrorBoundary><FAQPage /></ErrorBoundary>,
  },
  {
    path: "insider-transactions",
    element: <ErrorBoundary><InsiderTransactionsPage /></ErrorBoundary>,
  },
  {
    path: "insider-details",
    element: <ErrorBoundary><InsiderTransactionDetailsPage /></ErrorBoundary>,
  },
]);

function App() {
  const [cookies, , removeCookie] = useCookies();
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(
    () => localStorage.getItem(ANNOUNCEMENT_KEY) !== "true"
  );

  const dismissAnnouncement = () => {
    setShowAnnouncement(false);
    localStorage.setItem(ANNOUNCEMENT_KEY, "true");
  };

  const [showConsentDialog, setShowConsentDialog] = useState<boolean>(() => {
    const consentID = localStorage.getItem("consentId");
    const acceptedVersion = Number(localStorage.getItem("consentVersion") ?? 0);
    return consentID === null || acceptedVersion < CURRENT_CONSENT_VERSION;
  });
  const [consentAccepted, setConsentAccepted] = useState<boolean>(() => {
    const accepted = localStorage.getItem("consentAccepted");
    const acceptedVersion = Number(localStorage.getItem("consentVersion") ?? 0);
    if (acceptedVersion < CURRENT_CONSENT_VERSION) return false;
    return accepted ? JSON.parse(accepted) : false;
  });

  useEffect(() => {
    if (consentAccepted) {
      initializeAnalytics();
    } else {
      Object.keys(cookies).forEach((cookieName) => {
        removeCookie(cookieName, { domain: ".zirium.dk", path: "/" });
      });
    }
  }, [consentAccepted, cookies, removeCookie]);

  useEffect(() => {
    const consentID = localStorage.getItem("consentId");
    const alreadyChecked = sessionStorage.getItem("statusChecked");
    if (consentID && !alreadyChecked) {
      sessionStorage.setItem("statusChecked", "true");
      statusCheck(consentID);
    }
  }, []);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div className="grid place-items-center h-screen dark:bg-[#0d0d12]"><LoadingIndicator /></div>}>
          <RouterProvider router={router} />
        </Suspense>
        {showConsentDialog && (
          <ConsentDialog
            onClose={() => setShowConsentDialog(false)}
            onConsentAccepted={setConsentAccepted}
          />
        )}
        {!showConsentDialog && showAnnouncement && (
          <AnnouncementModal onClose={dismissAnnouncement} />
        )}
        <ConsentButton onClick={() => setShowConsentDialog(true)} />
      </QueryClientProvider>
    </>
  );
}

export default App;
