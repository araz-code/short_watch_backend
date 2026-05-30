// Embedded mode for the in-app WebView (iOS). When an analysis URL is opened
// with ?embed=1 we hide the site navigation so the page looks native inside the
// app. The flag is stored in sessionStorage so it survives client-side
// navigation within the same WebView session. An optional ?lang=da|en sets the
// UI language; this module is imported before i18n so the value is picked up on
// init.

function readParams(): void {
  try {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("embed") === "1") {
      sessionStorage.setItem("embed", "1");
    }
    const lang = params.get("lang");
    if (lang === "da" || lang === "en") {
      localStorage.setItem("i18nextLng", lang);
    }
  } catch {
    /* sessionStorage/localStorage may be unavailable; ignore */
  }
}

readParams();

export function isEmbedded(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return (
      new URLSearchParams(window.location.search).get("embed") === "1" ||
      sessionStorage.getItem("embed") === "1"
    );
  } catch {
    return false;
  }
}
