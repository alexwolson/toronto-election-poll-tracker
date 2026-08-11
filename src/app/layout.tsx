import type { Metadata } from "next";
import { Newsreader, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { MastheadNav } from "@/components/masthead-nav";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Toronto 2026 Elections",
  description: "Ward-level council race projections and mayoral polling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const monthYear = new Date()
    .toLocaleDateString("en-CA", { month: "long", year: "numeric" })
    .toUpperCase();

  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${newsreader.variable} ${ibmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <header className="site-header">
          <div className="site-brand">
            <div className="font-heading">Toronto Election 2026</div>
            <div className="font-mono">Polls and Council races · {monthYear}</div>
          </div>
          <MastheadNav />
        </header>
        {children}
      </body>
    </html>
  );
}
