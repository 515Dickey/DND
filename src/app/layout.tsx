import type { Metadata, Viewport } from "next";
import { Cinzel, EB_Garamond } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider, themeScript } from "@/components/Theme";
import { RegisterSW } from "@/components/RegisterSW";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vellum — Character Sheets",
  description: "A tablet-friendly 5e character sheet that saves to your device.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Vellum",
    statusBarStyle: "default",
  },
  // iPadOS ignores the web manifest's icons for "Add to Home Screen" and looks
  // for apple-touch-icon; without it the home screen gets a screenshot.
  // Icon filenames carry the artwork's name rather than being overwritten in
  // place: browsers re-download an installed app's icons when the manifest
  // changes, not when the bytes behind an unchanged URL do.
  icons: {
    icon: [
      { url: "/icon-seal-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-seal-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon-seal-192.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Let players pinch-zoom the sheet -- some of us need it.
  maximumScale: 5,
  themeColor: "#e9dbb8",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is rendered with its default so the inline script below can
    // overwrite it rather than add it -- an added attribute is a hydration
    // mismatch, an overwritten one is covered by suppressHydrationWarning.
    <html
      lang="en"
      data-theme="day"
      className={`${cinzel.variable} ${garamond.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div id="app-root">
          <ThemeProvider>
            <StoreProvider>{children}</StoreProvider>
          </ThemeProvider>
        </div>
        <RegisterSW />
      </body>
    </html>
  );
}
