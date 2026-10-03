import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import FloatingSupportButton from "@/components/FloatingSupportButton";

/** Self-hosted so `next build` does not fetch Google Fonts (Vercel module-not-found on Outfit CSS). */
const outfit = localFont({
  src: "./fonts/outfit-latin-wght-normal.woff2",
  variable: "--font-outfit",
  display: "swap",
  weight: "300 800",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const dancingScript = localFont({
  src: "./fonts/dancing-script-latin-wght-normal.woff2",
  variable: "--font-dancing",
  display: "swap",
  weight: "400 700",
  fallback: ["cursive"],
});

export const metadata: Metadata = {
  title: "CIEL PK - Community Impact Education Lab",
  description: "Where Youth, Universities & Communities Create Measurable Impact",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${dancingScript.variable} font-sans antialiased text-slate-800 bg-slate-50`}
      >
        {children}
        <FloatingSupportButton />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
