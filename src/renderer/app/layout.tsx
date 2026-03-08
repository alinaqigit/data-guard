import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SecurityProvider } from "@/context/SecurityContext";
import AppContent from "@/components/AppContent";

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
    <html lang="en" className={inter.variable} data-theme="dark" suppressHydrationWarning>
      <body
        style={{ height: "100vh", overflow: "hidden", margin: 0 }}
        suppressHydrationWarning
      >
        <SecurityProvider>
          <AppContent>{children}</AppContent>
        </SecurityProvider>
      </body>
    </html>
  );
}