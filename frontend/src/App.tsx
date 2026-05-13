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
const ZealAnalysisPage = lazy(() => import("./routes/ZealAnalysisPage.tsx"));

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
  {
    path: "analyse/zeal",
    element: <ErrorBoundary><ZealAnalysisPage /></ErrorBoundary>,
  },
]);

function App() {
  const [cookies, , removeCookie] = useCookies();
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
        <ConsentButton onClick={() => setShowConsentDialog(true)} />
      </QueryClientProvider>
    </>
  );
}

export default App;
