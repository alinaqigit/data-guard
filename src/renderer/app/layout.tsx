import type { Metadata } from "next";
import "./globals.css";
import { SecurityProvider } from "@/context/SecurityContext";
import AppContent from "@/components/AppContent";
import TitleBar from "@/components/TitleBar";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Data Leak Prevention Admin Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-black text-gray-200 antialiased min-h-screen flex flex-col"
        suppressHydrationWarning
      >
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <SecurityProvider>
            <AppContent>{children}</AppContent>
          </SecurityProvider>
        </div>
      </body>
    </html>
  );
}
