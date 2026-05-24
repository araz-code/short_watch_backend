import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navigation from "./Navigation";
import RecentlyVisitedSidebar from "./RecentlyVisitedSidebar";
import QuickFeedbackWidget from "./QuickFeedbackWidget";
import { recordVisit } from "../utils/recentlyVisited";
import { analyses } from "../data/analyses";

interface PageTemplateProps {
  /** Set to true when the page already renders its own flex-row layout
   * with sidebars. Default false: PageTemplate wraps children with a right-side
   * RecentlyVisitedSidebar slot. */
  customLayout?: boolean;
}

function getAnalysisFromPath(path: string) {
  if (!path.startsWith("/analyse/")) return null;
  const stem = path.slice("/analyse/".length).replace(/\/\d{4}-\d{2}-\d{2}$/, "");
  return analyses.find((a) => a.slug.replace(/\/\d{4}-\d{2}-\d{2}$/, "") === stem) ?? null;
}

const PageTemplate: React.FC<React.PropsWithChildren<PageTemplateProps>> = ({
  children,
  customLayout = false,
}) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const isDa = i18n.language.startsWith("da");

  useEffect(() => {
    const analysis = getAnalysisFromPath(location.pathname);
    if (analysis) {
      recordVisit({
        path: `/analyse/${analysis.slug}`,
        title: analysis.title,
        subtitle: analysis.subtitle[isDa ? "da" : "en"],
        type: "analysis",
      });
    }
  }, [location.pathname, isDa]);

  const showQuickFeedback = location.pathname !== "/contact";

  return (
    <div className="flex flex-col text-gray-800 flex-1 min-h-0">
      <Navigation />
      {customLayout ? (
        <main id="main-content" className="flex flex-col items-center justify-center w-full flex-1 min-h-0">
          {children}
        </main>
      ) : (
        <main id="main-content" className="w-screen lg:justify-center lg:gap-4 m-auto flex flex-col flex-1 min-h-0 lg:flex-row">
          <div className="hidden xl:block xl:flex-1" aria-hidden="true"></div>
          <div className="flex flex-col flex-1 min-h-0 lg:w-[900px] lg:flex-initial w-full">
            {children}
          </div>
          <div className="hidden xl:block xl:flex-1 relative">
            <div className="absolute inset-0 flex flex-col items-center pt-[88px] px-4 overflow-y-auto gap-4">
              <RecentlyVisitedSidebar />
            </div>
          </div>
        </main>
      )}
      {showQuickFeedback && <QuickFeedbackWidget />}
    </div>
  );
};

export default PageTemplate;
