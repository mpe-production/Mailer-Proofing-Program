import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Mailer Proofing System",
  description: "Direct Mail Sequence Proofing | MP Express",
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'Mailer Proofing System',
    description: 'Direct Mail Sequence Proofing | MP Express',
    url: 'https://mailer.mpexpress.com',
    siteName: 'MP Express Mailer Proofing System',
    images: [
      {
        url: '/mailer-system-opengraph-img.jpg',
        width: 1200,
        height: 630,
        alt: 'MP Express Mailer Proofing System Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
