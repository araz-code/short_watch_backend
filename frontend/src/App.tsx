// Must run before i18n so ?lang= / ?embed= query params are applied on init.
import "./utils/embed.ts";
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
// Insider trading routes temporarily disabled (Finanstilsynet data is not
// reliable across all stocks). To re-enable: restore the two lazy imports
// above and the route entries in the router below.
const ZealAnalysisPageDa = lazy(() => import("./routes/ZealAnalysisPage.tsx"));
const ZealAnalysisPageEn = lazy(() => import("./routes/ZealAnalysisPage.en.tsx"));
const GNAnalysisPageDa = lazy(() => import("./routes/GNAnalysisPage.tsx"));
const GNAnalysisPageEn = lazy(() => import("./routes/GNAnalysisPage.en.tsx"));
const ZealCostAnalysisPageDa = lazy(() => import("./routes/ZealCostAnalysisPage.tsx"));
const ZealCostAnalysisPageEn = lazy(() => import("./routes/ZealCostAnalysisPage.en.tsx"));
const BAVAAnalysisPageDa = lazy(() => import("./routes/BAVAAnalysisPage.tsx"));
const BAVAAnalysisPageEn = lazy(() => import("./routes/BAVAAnalysisPage.en.tsx"));
const NovoDCFPageDa = lazy(() => import("./routes/NovoDCFPage.tsx"));
const NovoDCFPageEn = lazy(() => import("./routes/NovoDCFPage.en.tsx"));
const PandoraSilverPageDa = lazy(() => import("./routes/PandoraSilverAnalysisPage.tsx"));
const PandoraSilverPageEn = lazy(() => import("./routes/PandoraSilverAnalysisPage.en.tsx"));
const AnalysisPage = lazy(() => import("./routes/AnalysisPage.tsx"));
const C25AnalysisPageDa = lazy(() => import("./routes/C25AnalysisPage.tsx"));
const C25AnalysisPageEn = lazy(() => import("./routes/C25AnalysisPage.en.tsx"));
const ObesityMarketAnalysisPageDa = lazy(() => import("./routes/ObesityMarketAnalysisPage.tsx"));
const ObesityMarketAnalysisPageEn = lazy(() => import("./routes/ObesityMarketAnalysisPage.en.tsx"));
const AmbuAnalysisPageDa = lazy(() => import("./routes/AmbuAnalysisPage.tsx"));
const AmbuAnalysisPageEn = lazy(() => import("./routes/AmbuAnalysisPage.en.tsx"));
const NetcompanyAnalysisPageDa = lazy(() => import("./routes/NetcompanyAnalysisPage.tsx"));
const NetcompanyAnalysisPageEn = lazy(() => import("./routes/NetcompanyAnalysisPage.en.tsx"));
const CHEMMAnalysisPageDa = lazy(() => import("./routes/CHEMMAnalysisPage.tsx"));
const CHEMMAnalysisPageEn = lazy(() => import("./routes/CHEMMAnalysisPage.en.tsx"));
const GNPriceFlowAnalysisPageDa = lazy(() => import("./routes/GNPriceFlowAnalysisPage.tsx"));

function ZealAnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <ZealAnalysisPageDa /> : <ZealAnalysisPageEn />;
}
function GNAnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <GNAnalysisPageDa /> : <GNAnalysisPageEn />;
}
function BAVAAnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <BAVAAnalysisPageDa /> : <BAVAAnalysisPageEn />;
}
function ZealCostAnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <ZealCostAnalysisPageDa /> : <ZealCostAnalysisPageEn />;
}
function NovoDCFPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <NovoDCFPageDa /> : <NovoDCFPageEn />;
}
function PandoraSilverPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <PandoraSilverPageDa /> : <PandoraSilverPageEn />;
}
function C25AnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <C25AnalysisPageDa /> : <C25AnalysisPageEn />;
}
function AmbuAnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <AmbuAnalysisPageDa /> : <AmbuAnalysisPageEn />;
}
function ObesityMarketAnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <ObesityMarketAnalysisPageDa /> : <ObesityMarketAnalysisPageEn />;
}
function NetcompanyAnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <NetcompanyAnalysisPageDa /> : <NetcompanyAnalysisPageEn />;
}
function CHEMMAnalysisPage() {
  const lng = localStorage.getItem("i18nextLng") || navigator.language;
  return lng.startsWith("da") ? <CHEMMAnalysisPageDa /> : <CHEMMAnalysisPageEn />;
}
function GNPriceFlowAnalysisPage() {
  // English version pending; Danish is shown for all languages until it exists
  return <GNPriceFlowAnalysisPageDa />;
}

type ConsentButtonProps = {
  onClick: () => void;
};

// ConsentButton component
function ConsentButton({ onClick }: ConsentButtonProps) {
  return (
    <>
      <button
        aria-label="Open cookie consent options"
        className="fixed bottom-3 left-2 sm:left-3 z-40 bg-transparent text-green-500 p-0 rounded-full shadow-lg focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
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
    path: "analyse",
    element: <ErrorBoundary><AnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/novo/2026-06-04",
    element: <ErrorBoundary><ObesityMarketAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/novo",
    element: <ErrorBoundary><ObesityMarketAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/zeal/2026-05-13",
    element: <ErrorBoundary><ZealAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/zeal",
    element: <ErrorBoundary><ZealAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/chemm/2026-06-17",
    element: <ErrorBoundary><CHEMMAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/chemm",
    element: <ErrorBoundary><CHEMMAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/gn/flow/2026-06-28",
    element: <ErrorBoundary><GNPriceFlowAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/gn/flow",
    element: <ErrorBoundary><GNPriceFlowAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/gn/2026-05-14",
    element: <ErrorBoundary><GNAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/gn",
    element: <ErrorBoundary><GNAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/netcompany/2026-06-10",
    element: <ErrorBoundary><NetcompanyAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/netcompany",
    element: <ErrorBoundary><NetcompanyAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/zeal/gennemsnitspris/2026-05-14",
    element: <ErrorBoundary><ZealCostAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/zeal/gennemsnitspris",
    element: <ErrorBoundary><ZealCostAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/bava/2026-05-17",
    element: <ErrorBoundary><BAVAAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/bava",
    element: <ErrorBoundary><BAVAAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/c25/2026-05-28",
    element: <ErrorBoundary><C25AnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/c25",
    element: <ErrorBoundary><C25AnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/ambu/2026-06-01",
    element: <ErrorBoundary><AmbuAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/ambu",
    element: <ErrorBoundary><AmbuAnalysisPage /></ErrorBoundary>,
  },
  {
    path: "analyse/pandora/2026-05-23",
    element: <ErrorBoundary><PandoraSilverPage /></ErrorBoundary>,
  },
  {
    path: "analyse/pandora",
    element: <ErrorBoundary><PandoraSilverPage /></ErrorBoundary>,
  },
  {
    path: "analyse/novo/dcf/2026-05-19",
    element: <ErrorBoundary><NovoDCFPage /></ErrorBoundary>,
  },
  {
    path: "analyse/novo/dcf",
    element: <ErrorBoundary><NovoDCFPage /></ErrorBoundary>,
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
