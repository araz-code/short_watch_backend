import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "react-query";
import { lazy, Suspense, useEffect, useState } from "react";

import HomePage from "./routes/HomePage.tsx";
import ErrorPage from "./routes/ErrorPage.tsx";
import { queryClient, statusCheck } from "./apis/ShortPositionAPI.tsx";
import "./utils/i18n.ts";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCookieBite } from "@fortawesome/free-solid-svg-icons";
import ConsentDialog from "./components/ConsentDialog.tsx";
import { handleClick, initializeAnalytics } from "./analytics.tsx";
import { useCookies } from "react-cookie";
import LoadingIndicator from "./components/UI/LoadingIndicator.tsx";

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
          handleClick("cookie consent clicked");
          onClick();
        }}
      >
        <FontAwesomeIcon icon={faCookieBite} size="xl" />
      </button>
    </>
  );
}

const vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty("--vh", `${vh}px`);

window.addEventListener("resize", () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "short-watch",
    element: <ShortWatchPage />,
  },
  {
    path: "short-watch-details",
    element: <ShortPositionDetailsPage />,
  },
  {
    path: "short-sellers",
    element: <LargestSellersPage />,
  },
  {
    path: "short-seller-details",
    element: <ShortSellerDetailsPage />,
  },
  {
    path: "top-lists",
    element: <TopListsPage />,
  },
  {
    path: "privacy-policy",
    element: <PrivacyPolicyPage />,
  },
  {
    path: "privatlivspolitik",
    element: <PrivacyPolicyPage />,
  },
  {
    path: "cookie-policy",
    element: <CookiePolicyPage />,
  },
  {
    path: "terms-of-agreement",
    element: <TermsOfAgreementPage />,
  },
  {
    path: "aftalevilkaar",
    element: <TermsOfAgreementPage />,
  },
  {
    path: "contact",
    element: <ContactPage />,
  },
]);

function App() {
  const [cookies, , removeCookie] = useCookies();
  const [showConsentDialog, setShowConsentDialog] = useState<boolean>(() => {
    const consentID = localStorage.getItem("consentId");
    return consentID === null;
  });
  const [consentAccepted, setConsentAccepted] = useState<boolean>(() => {
    const consentID = localStorage.getItem("consentAccepted");
    return consentID ? JSON.parse(consentID) : false;
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
        <Suspense fallback={<div className="grid place-items-center h-screen dark:bg-[#121212]"><LoadingIndicator /></div>}>
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
