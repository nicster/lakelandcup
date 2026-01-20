import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lakeland Cup - Fantasy Hockey League",
  description: "The official home of the Lakeland Cup fantasy hockey dynasty league. Track draft history, trades, standings, and more.",
  keywords: ["fantasy hockey", "dynasty league", "Lakeland Cup", "NHL fantasy"],
  openGraph: {
    title: "Lakeland Cup - Fantasy Hockey League",
    description: "Your fantasy hockey league hub",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
