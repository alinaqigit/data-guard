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
    <html lang="en" className={`dark ${inter.variable}`} data-theme="dark" suppressHydrationWarning>
      <body
        className="antialiased min-h-screen flex"
        style={{
          background: "var(--background-body)",
          color: "var(--text-primary)",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        }}
        suppressHydrationWarning
      >
        <SecurityProvider>
          <AppContent>{children}</AppContent>
        </SecurityProvider>
      </body>
    </html>
  );
}