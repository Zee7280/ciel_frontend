import localFont from "next/font/local";

/** Script wordmark font. Imported only by the pages that show it (login, verify-project) so the
 * 42KB woff2 is not downloaded on every dashboard page. */
export const dancingScript = localFont({
  src: "./dancing-script-latin-wght-normal.woff2",
  display: "swap",
  weight: "400 700",
  fallback: ["cursive"],
  // Not preloaded: a prefetched link to /login would otherwise preload it on every page that shows
  // that link (the home page), competing with critical CSS on slow mobile networks.
  preload: false,
});
