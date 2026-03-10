import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { ToasterProvider } from "@/components/providers/ToasterProvider";
import { ThemeProvider } from "@/components/theme-provider";
import GoogleTranslate from "@/components/GoogleTranslate";
import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  metadataBase: new URL("https://murajiah.vercel.app"),
  title: {
    default: "Murajiah | Interactive Quiz Platform for Education",
    template: "%s | Murajiah",
  },
  description: "Create, host, and play interactive quizzes. Murajiah is the ultimate platform for teachers, students, and organizations in Nigeria and beyond.",
  keywords: ["Murajiah", "Quiz", "Educational Games", "Interactive Learning", "AI Quiz Generator", "Nigeria Education"],
  authors: [{ name: "Murajiah Team" }],
  creator: "Murajiah",
  publisher: "Murajiah",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://murajiah.vercel.app",
    siteName: "Murajiah",
    title: "Murajiah | Interactive Quiz Platform",
    description: "The most engaging way to learn and test knowledge. Join thousands of users creating quizzes with AI.",
    images: [
      {
        url: "/murajiah-logo.png",
        width: 1200,
        height: 630,
        alt: "Murajiah Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Murajiah | Interactive Quiz Platform",
    description: "The most engaging way to learn and test knowledge.",
    images: ["/murajiah-logo.png"],
    creator: "@coderhafiz",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body className={`antialiased font-sans`}>
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
