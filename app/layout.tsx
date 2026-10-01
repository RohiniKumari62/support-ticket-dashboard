import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { getTicketStore } from "@/lib/server/get-store";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    template: "%s · Support Desk",
    default: "Support Desk",
  },
  description: "Internal support-agent ticket management dashboard.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Seed initial tickets from the shared server store so SSR data
  // and the API share the same in-memory state.
  const store = getTicketStore();
  const listResult = store.list({ limit: 50 });
  const tickets = listResult.ok ? listResult.tickets : [];
  const duplicatesRemoved = listResult.ok ? listResult.duplicatesRemoved : 0;
  // Use server time as the live-update cursor starting point
  const initialServerTime = listResult.ok
    ? listResult.serverTime
    : new Date().toISOString();
  const initialInstanceId = listResult.ok ? listResult.instanceId : "";

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <StoreProvider
          initialTickets={tickets}
          duplicatesRemoved={duplicatesRemoved}
          initialServerTime={initialServerTime}
          initialInstanceId={initialInstanceId}
        >
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <AppHeader />
          <main
            id="main"
            className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 flex-1"
          >
            {children}
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
