import ReactDOM from "react-dom/client";
import { CookiesProvider } from "react-cookie";
import "./index.css";
import App from "./App";
import { reloadForNewBuild } from "./components/ErrorBoundary";

// After a deploy, a client on the old build may fail to preload a hashed chunk
// that no longer exists. Vite fires this event; pull the new build instead.
window.addEventListener("vite:preloadError", () => {
  reloadForNewBuild();
});

// Rendering the root component
ReactDOM.createRoot(document.getElementById("root")!).render(
  <CookiesProvider>
    <App />
  </CookiesProvider>
);
