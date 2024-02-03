import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import HomePage from "./routes/HomePage.tsx";
import ErrorPage from "./routes/ErrorPage.tsx";
import PrivacyPolicy from "./routes/PrivacyPolicyPage.tsx";
import TermsOfAgreement from "./routes/TermsOfAgreementPage.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <ErrorPage />,
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
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
