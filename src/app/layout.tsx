import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter as FontSans } from "next/font/google";
import NextAbstractWalletProvider from "@/components/NextAbstractWalletProvider";
import Header from "@/components/Header";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Abstract Plinko",
    template: "%s | Abstract Plinko",
  },
  description: "A crypto-based Plinko game on Abstract Chain where every ball drop is an on-chain transaction",
  keywords: [
    "Plinko",
    "Crypto Game",
    "Abstract Chain",
    "Web3",
    "Blockchain Gaming",
    "Abstract Global Wallet",
  ],
  authors: [
    {
      name: "Jarrod",
    },
  ],
  creator: "Jarrod",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Abstract Plinko",
    description: "A crypto-based Plinko game on Abstract Chain where every ball drop is an on-chain transaction",
    siteName: "Abstract Plinko",
  },
  twitter: {
    card: "summary_large_image",
    title: "Abstract Plinko",
    description: "A crypto-based Plinko game on Abstract Chain where every ball drop is an on-chain transaction",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

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
            "min-h-screen font-sans antialiased",
            fontSans.variable,
            fontHeading.variable
          )}>
          <Header />
          <main className="pt-[70px] sm:pt-[70px]">
            {children}
          </main>
        </body>
      </NextAbstractWalletProvider>
    </html>
  );
}
