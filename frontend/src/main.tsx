import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "react-query";

import "./index.css";
import HomePage from "./routes/HomePage.tsx";
import ErrorPage from "./routes/ErrorPage.tsx";
import PrivacyPolicy from "./routes/PrivacyPolicyPage.tsx";
import TermsOfAgreement from "./routes/TermsOfAgreementPage.tsx";
import ShortWatchPage from "./routes/ShortWatchPage.tsx";
import { queryClient } from "./apis/ShortPositionAPI.tsx";
import ShortPositionDetailsPage from "./routes/ShortPositionDetailsPage.tsx";
import "./utils/i18n.ts";

//import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
//import { faCookieBite } from "@fortawesome/free-solid-svg-icons";
import ContactPage from "./routes/ContactPage.tsx";

/*function StickyButton() {
  return (
    <button className="fixed bottom-10 left-2 bg-white text-green-500 p-1 rounded-full shadow-lg hover:bg-blue-600 focus:outline-none">
      <FontAwesomeIcon icon={faCookieBite} size="lg" />
    </button>
  );
}*/

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </>
);
