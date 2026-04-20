import type { Metadata } from "next";
import { Newsreader, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { MastheadNav } from "@/components/masthead-nav";
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
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Toronto 2026 Elections",
  description: "Ward-level council race projections and mayoral polling",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getWards();
  const phase = data.phase;

  const monthYear = new Date()
    .toLocaleDateString("en-CA", { month: "long", year: "numeric" })
    .toUpperCase();

  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${newsreader.variable} ${ibmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">

        <header style={{ borderBottom: "1px solid #ccc" }}>
          <div
            style={{
              textAlign: "center",
              padding: "0.9rem 1rem 0.6rem",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-newsreader), serif",
                fontSize: "clamp(1.1rem, 2.5vw, 1.9rem)",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#1a1a1a",
                lineHeight: 1,
              }}
            >
              Toronto Civic Pulse
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-mono), monospace",
                fontSize: "0.58rem",
                color: "#555",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginTop: "0.3rem",
              }}
            >
              Municipal Projection Desk · {monthYear} · {phase.label.toUpperCase()}
            </div>
          </div>
          <MastheadNav />
        </header>
        {children}
      </body>
    </html>
  );
}
