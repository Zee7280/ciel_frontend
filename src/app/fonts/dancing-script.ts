import localFont from "next/font/local";

/** Script wordmark font. Imported only by the pages that show it (login, verify-project) so the
 * 42KB woff2 is not downloaded on every dashboard page. */
export const dancingScript = localFont({
  src: "./dancing-script-latin-wght-normal.woff2",
  display: "swap",
  weight: "400 700",
  fallback: ["cursive"],
});
