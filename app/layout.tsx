import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

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
        </ThemeProvider>
        <div id="timer-sound-player" style={{ display: "none" }}></div>
        <script src="https://www.youtube.com/iframe_api"></script>
      </body>
    </html>
  );
}
