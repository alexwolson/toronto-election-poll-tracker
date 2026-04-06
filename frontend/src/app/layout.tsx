import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PhaseBanner } from "@/components/phase-banner";
import { getWards } from "@/lib/api";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PhaseBanner phase={phase} />
        <nav className="border-b px-6 py-3 flex gap-6 text-sm font-medium">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/wards" className="hover:underline">Wards</Link>
          <Link href="/polls" className="hover:underline">Polls</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
