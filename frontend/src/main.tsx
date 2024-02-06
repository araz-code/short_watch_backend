import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "react-query";

import "./index.css";
import HomePage from "./routes/HomePage.tsx";
import ErrorPage from "./routes/ErrorPage.tsx";
import PrivacyPolicy from "./routes/PrivacyPolicyPage.tsx";
import TermsOfAgreement from "./routes/TermsOfAgreementPage.tsx";
import ShortWatchPage from "./routes/ShortWatchPage.tsx";
import { queryClient } from "./apis/ShortPositionAPI.tsx";
import ShortPositionDetailsPage from "./routes/ShortPositionDetailsPage.tsx";

const router = createHashRouter([
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
    path: "short-watch/:code",
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
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
