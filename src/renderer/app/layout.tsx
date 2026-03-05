import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SecurityProvider } from "@/context/SecurityContext";
import AppContent from "@/components/AppContent";
import TitleBar from "@/components/TitleBar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DataGuard DLP",
  description: "Data Leak Prevention Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} data-theme="dark" suppressHydrationWarning>
      <body
        className="bg-black text-gray-200 antialiased h-screen flex flex-col overflow-hidden"
        suppressHydrationWarning
      >
        <TitleBar />
        <div className="flex flex-1 overflow-auto">
          <SecurityProvider>
            <AppContent>{children}</AppContent>
          </SecurityProvider>
        </div>
      </body>
    </html>
  );
}