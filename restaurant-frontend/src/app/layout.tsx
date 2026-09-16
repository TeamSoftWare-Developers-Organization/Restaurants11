import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900", "1000"],
});

export const metadata: Metadata = {
  title: "نظام إدارة المطعم المتكامل",
  description: "نظام شامل لإدارة المطاعم، الموظفين، المخزون، والطلبات",
};

import { ThemeProvider } from "@/components";
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
