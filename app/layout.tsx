import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SiteHeader } from "./(site)/components/site-header";
import { SiteFooter } from "./(site)/components/site-footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OpenGolfAPI — The Open Golf Course Database",
    template: "%s | OpenGolfAPI",
  },
  description:
    "OpenGolfAPI — the open golf course database. Scorecards, tee data, hazards, weather, and nearby amenities for every course in the United States.",
  openGraph: {
    siteName: "OpenGolfAPI",
    type: "website",
    title: "OpenGolfAPI — The Open Golf Course Database",
  },
  twitter: {
    title: "OpenGolfAPI — The Open Golf Course Database",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${fraunces.variable} ${publicSans.variable}`}>
      <head>
        <Script id="impact-tracker" strategy="afterInteractive">
          {`(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('https://utt.impactcdn.com/P-A7226155-756a-4a68-b724-976ba65abb7d1.js','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression');`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
