import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { fontSans } from "@/config/fonts";
import { Providers } from "@/app/providers";
import { AppContextProvider } from "@/contexts/app";
import ErrorBoundary from "@/components/error/error-boundary";
import Navbar from "@/components/layout/navbar/smart-navbar";
import Footer from "@/components/layout/footer/smart-footer";
import LoginModal from "@/components/auth/login-modal";
import { NextIntlClientProvider } from "next-intl";
import { ViewerProvider } from "@/contexts/viewer-store";
import ViewerDrawer from "@/components/generation/ViewerDrawer";
import enMessages from "@/messages/en.json";

export const metadata: Metadata = {
  metadataBase: new URL("https://girlgenerator.net"),
  title: {
    default: "Girl Generator: AI Girl Image & Video Creation Platform",
    template: "%s | Girl Generator",
  },
  description:
    "Use Girl Generator, the all-in-one AI girl generator, to design a signature character and expand her into lifestyle photos and cinematic videos with commercial-ready quality.",
  openGraph: {
    type: "website",
    siteName: "Girl Generator",
    url: "https://girlgenerator.net",
    images: [
      {
        url: "/og/default.jpg",
        alt: "Girl Generator AI girl image and video preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: "/og/default.jpg",
        alt: "Girl Generator AI girl image and video preview",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontSans.className} dark antialiased`}>
      <head>
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png" />
      </head>
      <body className="bg-black text-white">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SM3RBJERKD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SM3RBJERKD');
          `}
        </Script>

        <ErrorBoundary>
          <AppContextProvider>
            <Providers>
              <NextIntlClientProvider messages={enMessages as any} locale="en">
                <ViewerProvider>
                  <div className="min-h-screen relative flex flex-col">
                    <Navbar />
                    <LoginModal />
                    <main className="flex-1">{children}</main>
                    <Footer locale="en" />
                    <ViewerDrawer />
                  </div>
                </ViewerProvider>
              </NextIntlClientProvider>
            </Providers>
          </AppContextProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
