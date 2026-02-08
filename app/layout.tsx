import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToasterProvider } from "@/components/providers/ToasterProvider";
import { ThemeProvider } from "@/components/theme-provider";
import GoogleTranslate from "@/components/GoogleTranslate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Murajiah",
  description: "Interactive Quiz Platform for Education",
};

import { AnnouncementModal } from "@/components/marketing/AnnouncementModal";
import { getActiveAnnouncement } from "@/app/actions/announcements";

// ... imports remain the same

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeAnnouncement = await getActiveAnnouncement();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <AnnouncementModal announcement={activeAnnouncement} />
          <ToasterProvider />
          <GoogleTranslate />
        </ThemeProvider>
      </body>
    </html>
  );
}
