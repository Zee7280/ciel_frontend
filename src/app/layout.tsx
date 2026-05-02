import type { Metadata } from "next";
import { Outfit, Dancing_Script } from "next/font/google"; // Added Dancing_Script
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CIEL PK - Community Impact Education Lab",
  description: "Where Youth, Universities & Communities Create Measurable Impact",
};

import { Toaster } from "sonner";
import Script from "next/script";

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
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
