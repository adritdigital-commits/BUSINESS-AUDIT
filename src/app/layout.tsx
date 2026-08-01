import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AuditProvider } from "@/lib/audit/AuditProvider";
import "./globals.css";

// Fonts are bundled with the app and served from the same origin — the UI
// makes no network request to a third party at any point.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RakeshProTech — Business Growth Audit",
    template: "%s — RakeshProTech",
  },
  description:
    "A consultant-grade business audit that scores your digital maturity across seven areas and returns a prioritised 90-day roadmap and proposal.",
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <AuditProvider>
          <SiteHeader />
          <div id="main">{children}</div>
        </AuditProvider>
      </body>
    </html>
  );
}
