import ReactGA from "react-ga4";
import TagManager from "react-gtm-module";

export const initializeAnalytics = () => {
  ReactGA.initialize("G-PCM4ZBXLGJ");
  TagManager.initialize({
    gtmId: "GTM-M5J9Z58R",
  });
};

/*export const logPageView = (page: string, title: string) => {
  ReactGA.send({ hitType: "pageview", page, title });
};*/

export const logException = (description: string) => {
  ReactGA.event({
    category: "exception",
    action: description,
  });
};

/*export const logEvent = (category: string, action: string) => {
  ReactGA.event({
    category,
    action,
  });
};*/

export const handleClick = (action: string) => {
  TagManager.dataLayer({
    dataLayer: {
      event: "user_action",
      action: action,
    },
  });
};
