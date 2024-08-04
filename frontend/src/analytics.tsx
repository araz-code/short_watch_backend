import ReactGA from "react-ga4";

export const initializeAnalytics = () => {
  ReactGA.initialize("G-PCM4ZBXLGJ");
};

export const logPageView = (page: string, title: string) => {
  ReactGA.send({ hitType: "pageview", page, title });
};

export const logException = (description: string) => {
  ReactGA.event({
    category: "exception",
    action: description,
  });
};

export const logEvent = (category: string, action: string) => {
  ReactGA.event({
    category,
    action,
  });
};
