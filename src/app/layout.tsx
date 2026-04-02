import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BookingProvider } from "@/lib/store";
import { MessageStoreProvider } from "@/lib/message-store";
import { SettingsProvider } from "@/lib/settings-store";
import { WhatsAppProvider } from "@/lib/whatsapp-context";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Park & Fly — Operations Hub",
  description:
    "Real-time airport parking operations dashboard for check-ins, returns, and shuttle dispatch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full flex">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <WhatsAppProvider>
            <BookingProvider>
              <MessageStoreProvider>
                <SettingsProvider>
                  <Sidebar />
                  <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {children}
                  </main>
                  <MobileNav />
                  <Toaster richColors position="bottom-right" />
                </SettingsProvider>
              </MessageStoreProvider>
            </BookingProvider>
          </WhatsAppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
