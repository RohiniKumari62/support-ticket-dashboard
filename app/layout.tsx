import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { getNormalizedTicketsData } from "@/lib/tickets/data";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Support Desk",
    default: "Support Desk",
  },
  description: "Internal support-agent ticket management dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tickets, duplicatesRemoved } = getNormalizedTicketsData();

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <StoreProvider
          initialTickets={tickets}
          duplicatesRemoved={duplicatesRemoved}
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
