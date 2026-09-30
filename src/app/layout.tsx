import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Outfit, Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { messagesByLocale } from "@/messages/source";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "+54",
  description: "Book lessons, track progress, and manage your padel schedule in one place.",
  icons: {
    icon: [
      {
        url: "/brand/favicon-light.png",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/brand/favicon-dark.png",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [{ url: "/brand/favicon-light.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="padellab-theme" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("padellab_theme_pref");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",!!d);r.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`}
        </Script>
      </head>
      <body className={`${outfit.variable} ${geist.variable} font-sans`} suppressHydrationWarning>
        <Providers messagesByLocale={messagesByLocale}>{children}</Providers>
      </body>
    </html>
  );
}
