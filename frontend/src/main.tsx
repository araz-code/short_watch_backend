import ReactDOM from "react-dom/client";
import { CookiesProvider } from "react-cookie";
import "./index.css";
import App from "./App";

// Rendering the root component
ReactDOM.createRoot(document.getElementById("root")!).render(
  <CookiesProvider>
    <App />
  </CookiesProvider>
);
