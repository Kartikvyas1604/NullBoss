import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Fraunces, Unbounded } from "next/font/google";
import { Providers } from "./providers";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { SystemStatus } from "./components/SystemStatus";
import { NewTradeToast } from "./components/NewTradeToast";
import { PageTitleUpdater } from "./components/PageTitle";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NULLBOSS — The Fund That Has No Boss",
  description:
    "An autonomous AI hedge fund on Avalanche C-Chain. No managers. No emotions. No sleep.",
  manifest: "/manifest.json",
  icons: {
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "NULLBOSS — The Fund That Has No Boss",
    description:
      "An autonomous AI hedge fund on Avalanche C-Chain. No managers. No emotions. No sleep.",
    type: "website",
    siteName: "NULLBOSS",
  },
  other: {},
  twitter: {
    card: "summary_large_image",
    title: "NULLBOSS — The Fund That Has No Boss",
    description:
      "An autonomous AI hedge fund on Avalanche C-Chain. No managers. No emotions. No sleep.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0B0D",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${fraunces.variable} ${unbounded.variable} dark`}
    >
      <body className="min-h-dvh flex flex-col bg-background text-foreground font-sans antialiased">
        <Providers>
          <div className="relative flex flex-1 flex-col">
            <Header />
            <div className="flex-1 reveal">{children}</div>
            <PageTitleUpdater />
            <NewTradeToast />
            <SystemStatus />
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
