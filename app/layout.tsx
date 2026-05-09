import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "FocusFlow",
  description: "A FocusFlow dashboard for focused work, tasks, goals, and study sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster richColors position="bottom-center" />
        </ThemeProvider>
        <div id="timer-sound-player" style={{ display: "none" }}></div>
        <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />
      </body>
    </html>
  );
}
