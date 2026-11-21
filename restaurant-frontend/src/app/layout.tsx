import type { Metadata } from "next";
import "./globals.css";

const cairo = { variable: "font-cairo" };

export const metadata: Metadata = {
  title: "RestoSystem | نظام إدارة المطاعم ونقاط البيع - TechTwo",
  description: "نظام RestoSystem المتكامل لإدارة المطاعم والمقاهي ونقاط البيع، تطوير فريق TechTwo للحلول البرمجية المتكاملة",
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