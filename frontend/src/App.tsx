import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "react-query";

import HomePage from "./routes/HomePage.tsx";
import ErrorPage from "./routes/ErrorPage.tsx";
import PrivacyPolicyPage from "./routes/PrivacyPolicyPage.tsx";
import TermsOfAgreementPage from "./routes/TermsOfAgreementPage.tsx";
import ShortWatchPage from "./routes/ShortWatchPage.tsx";
import { queryClient } from "./apis/ShortPositionAPI.tsx";
import ShortPositionDetailsPage from "./routes/ShortPositionDetailsPage.tsx";
import "./utils/i18n.ts";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCookieBite } from "@fortawesome/free-solid-svg-icons";
import ContactPage from "./routes/ContactPage.tsx";
import { useEffect, useState } from "react";
import ConsentDialog from "./components/ConsentDialog.tsx";
import { handleClick, initializeAnalytics } from "./analytics.tsx";
import { useCookies } from "react-cookie";
import CookiePolicyPage from "./routes/CookiePolicyPage.tsx";
import LargestSellersPage from "./routes/ShortSellersPage.tsx";
import ShortSellerDetailsPage from "./routes/ShortSellerDetailsPage.tsx";

type ConsentButtonProps = {
  onClick: () => void;
};

// ConsentButton component
function ConsentButton({ onClick }: ConsentButtonProps) {
  return (
    <>
      <button
        className="fixed bottom-3 left-2 sm:left-3 bg-transparent text-green-500 p-0 rounded-full shadow-lg focus:outline-none"
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

  /*
  useEffect(() => {
    const consentID = localStorage.getItem("consentId");
    if (consentID) {
      statusCheck(consentID);
    }
  }, []);
*/

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
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
