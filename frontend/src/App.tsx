import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "react-query";

import HomePage from "./routes/HomePage.tsx";
import ErrorPage from "./routes/ErrorPage.tsx";
import PrivacyPolicy from "./routes/PrivacyPolicyPage.tsx";
import TermsOfAgreement from "./routes/TermsOfAgreementPage.tsx";
import ShortWatchPage from "./routes/ShortWatchPage.tsx";
import { queryClient } from "./apis/ShortPositionAPI.tsx";
import ShortPositionDetailsPage from "./routes/ShortPositionDetailsPage.tsx";
import "./utils/i18n.ts";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCookieBite } from "@fortawesome/free-solid-svg-icons";
import ContactPage from "./routes/ContactPage.tsx";
import { useEffect, useState } from "react";
import ConsentDialog from "./components/ConsentDialog.tsx";
import { initializeAnalytics } from "./analytics.tsx";
import { useCookies } from "react-cookie";

type ConsentButtonProps = {
  onClick: () => void;
};

// ConsentButton component
function ConsentButton({ onClick }: ConsentButtonProps) {
  return (
    <button
      className="fixed bottom-2 left-2 bg-transparent text-green-500 p-0 rounded-full shadow-lg hover:bg-blue-600 focus:outline-none"
      onClick={onClick}
    >
      <FontAwesomeIcon icon={faCookieBite} size="xl" />
    </button>
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
    path: "privacy-policy",
    element: <PrivacyPolicy language="english" />,
  },
  {
    path: "privatlivspolitik",
    element: <PrivacyPolicy language="danish" />,
  },
  {
    path: "terms-of-agreement",
    element: <TermsOfAgreement language="english" />,
  },
  {
    path: "aftalevilkaar",
    element: <TermsOfAgreement language="danish" />,
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
        removeCookie(cookieName, { path: "/" });
      });
    }
  }, [consentAccepted, cookies, removeCookie]);

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
