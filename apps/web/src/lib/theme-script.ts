export const THEME_KEY = "theme";

/**
 * Runs before the page paints (see the root layout) so there is no flash:
 * the saved choice wins, otherwise the device setting.
 */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_KEY}");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

