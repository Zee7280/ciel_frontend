import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CIEL PK - Community Impact Education Lab",
  description: "Where Youth, Universities & Communities Create Measurable Impact",
  icons: {
    icon: "/ciel-logo-v2.png",
  },
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} font-sans antialiased text-slate-800 bg-slate-50`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
