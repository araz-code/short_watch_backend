import ReactGA from "react-ga4";
import TagManager from "react-gtm-module";

export const initializeAnalytics = () => {
  ReactGA.initialize("G-PCM4ZBXLGJ");
  TagManager.initialize({
    gtmId: "GTM-M5J9Z58R",
  });
};

// All event names in one place: greppable, typo-proof, easy to audit in GA4.
export type AnalyticsEvent =
  | "sort_change"
  | "filter_change"
  | "period_change"
  | "watchlist_add"
  | "watchlist_remove"
  | "seller_details_view"
  | "position_details_view"
  | "largest_sellers_view"
  | "price_flow_view"
  | "seller_to_position_click"
  | "seller_link_click"
  | "announcement_open"
  | "help_dialog_open"
  | "chart_info_open"
  | "chart_toggle_closing_prices"
  | "banner_click"
  | "outbound_click"
  | "cookie_consent_open"
  | "faq_question_open"
  | "faq_expand_all"
  | "faq_collapse_all"
  | "avg_price_info_click";

type EventParams = Record<string, string | number | boolean | undefined>;

export const trackEvent = (event: AnalyticsEvent, params: EventParams = {}) => {
  TagManager.dataLayer({
    dataLayer: { event, ...params },
  });
};

export const trackPageView = (pagePath: string, pageTitle: string) => {
  TagManager.dataLayer({
    dataLayer: { event: "page_view", pagePath, pageTitle },
  });
};

export const logException = (description: string) => {
  ReactGA.event("exception", { description, fatal: false });
};
