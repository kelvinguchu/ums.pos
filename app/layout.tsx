import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import Reload from "@/components/Reload";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import QueryProvider from "@/components/providers/QueryProvider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import Script from "next/script";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UMS POS",
  description: "UMS POS",
  manifest: "/manifest.json",
  icons: {
    icon: "/favi.png",
    apple: "/favi.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000080" },
    { media: "(prefers-color-scheme: dark)", color: "#000080" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <head>
        <script src='https://unpkg.com/react-scan/dist/auto.global.js' />
      </head>
      <body>
        <NuqsAdapter>
          <QueryProvider>
            <AuthProvider>
              <NotificationProvider>
                <div className={`${geistMono.className}`}>{children}</div>
                <Toaster />
                <Reload />
              </NotificationProvider>
            </AuthProvider>
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
