import type { Metadata, Viewport } from "next";
import { Inter, Jost, JetBrains_Mono } from "next/font/google";

import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Display face: Jost — an open-source geometric sans that directly
 * revives Futura's proportions. It carries the same cinematic Nolan /
 * Interstellar-poster voice (wide letterspacing, tall apex, monoline
 * strokes) without needing a paid Futura licence. Loaded in the three
 * weights we actually use for headings so the bundle stays minimal.
 */
const display = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#05070d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // `viewportFit: cover` lets `env(safe-area-inset-*)` reach real values
  // on iOS Safari / PWAs — required for the explore HUD's safe-area
  // paddings to actually clear the notch and home indicator.
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name }],
  keywords: [
    "space",
    "solar system",
    "planets",
    "astronomy",
    "NASA",
    "education",
    "3D",
    "interactive",
    "APOD",
  ],
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [{ url: site.ogImage, width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [site.ogImage],
    creator: site.twitter,
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.svg" },
  // Tells iOS Safari that Cosmos is web-app-capable when "Add to Home
  // Screen" is used — status bar styling, standalone chrome, title
  // matching the rest of the product instead of the URL bar.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: site.name,
  },
  formatDetection: {
    // Phone/email/address auto-linking turns scientific figures
    // ("5.972e24 kg", "230 km/s") into tappable blue phone links on
    // iOS. Disabled globally; real links stay explicit <a> tags.
    telephone: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(sans.variable, display.variable, mono.variable)}>
      <body className="min-h-screen font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:cosmos-panel focus:px-3 focus:py-2 focus:text-sm"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
