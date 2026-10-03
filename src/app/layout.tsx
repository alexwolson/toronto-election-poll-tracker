import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Hanken_Grotesk, Schibsted_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { MastheadNav } from "@/components/masthead-nav";
import { SiteFooter } from "@/components/site-footer";

const hanken = Hanken_Grotesk({
  variable: "--font-chw-body",
  subsets: ["latin"],
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-chw-display",
  subsets: ["latin"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Toronto 2026 Elections",
  description:
    "A mayoral forecast, the polls behind it, and Toronto’s council and school-board races.",
  icons: { icon: "/brand/chw-favicon-32.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hanken.variable} ${schibsted.variable} ${ibmMono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <header className="masthead site-header">
          <div className="wrap masthead__inner">
            <Link href="/" className="brand" aria-label="City Hall Watcher · Toronto Election 2026 home">
              <Image src="/brand/chw-mark-64.png" alt="" width={30} height={30} priority />
              <span className="site-brand">
                <span className="brand__name">City Hall Watcher</span>
                <span className="site-brand__edition">Toronto Election 2026</span>
              </span>
            </Link>
            <MastheadNav />
          </div>
        </header>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
