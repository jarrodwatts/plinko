import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter as FontSans } from "next/font/google";
import NextAbstractWalletProvider from "@/components/NextAbstractWalletProvider";
import "./globals.css";
import { cn } from "@/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontHeading = localFont({
  src: "../../assets/fonts/CalSans-SemiBold.woff2",
  variable: "--font-heading",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <NextAbstractWalletProvider>
        <body
          className={cn(
            "min-h-screen bg-background font-sans antialiased",
            fontSans.variable,
            fontHeading.variable
          )}>
          {children}
        </body>
      </NextAbstractWalletProvider>
    </html>
  );
}
