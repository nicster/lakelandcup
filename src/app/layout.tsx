import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout";

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
      <body className="antialiased min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-lake-gold focus:text-lake-blue-dark focus:font-semibold focus:rounded-md focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main" className="flex-1 ice-texture">
          {children}
        </main>
      </body>
    </html>
  );
}
