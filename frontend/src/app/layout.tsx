import type { Metadata } from "next";
import Link from "next/link";
import { Newsreader, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { PhaseBanner } from "@/components/phase-banner";
import { getWards } from "@/lib/api";

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
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Toronto 2026 Elections",
  description: "Ward-level council race projections and mayoral polling",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const data = await getWards();
  const phase = data.phase;

  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${newsreader.variable} ${ibmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="site-bg" aria-hidden="true" />
        <header className="sticky top-0 z-30 border-b border-[var(--line-soft)] bg-[color:var(--glass)] backdrop-blur-sm">
          <PhaseBanner phase={phase} />
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 md:px-8">
            <Link href="/" className="brand-mark">
              Toronto Civic Pulse
            </Link>
            <div className="flex items-center gap-1 rounded-full border border-[var(--line-soft)] bg-[var(--panel)] p-1 text-sm">
              <Link href="/" className="nav-pill">
                Home
              </Link>
              <Link href="/wards" className="nav-pill">
                Wards
              </Link>
              <Link href="/polls" className="nav-pill">
                Polls
              </Link>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
