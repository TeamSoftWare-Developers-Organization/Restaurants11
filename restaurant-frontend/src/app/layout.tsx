import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900", "1000"],
});

export const metadata: Metadata = {
  title: "نظام إدارة المطعم المتكامل | Restaurant AI ERP & POS",
  description: "نظام شامل لإدارة المطاعم، الموظفين، المخزون، والطلبات مدعوم بالذكاء الاصطناعي",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

import { ThemeProvider, GlobalModals, ActivationGuard, ElectronWindowControls } from "@/components";
import { SettingsInitializer } from "@/components/SettingsInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} antialiased font-cairo`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SettingsInitializer />
          <ElectronWindowControls />
          <ActivationGuard>
            {children}
          </ActivationGuard>
          <GlobalModals />
        </ThemeProvider>
      </body>
    </html>
  );
}