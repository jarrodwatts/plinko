"use client";

import { useAbstractSession } from "@/hooks/use-abstract-session";
import Image from "next/image";
import Link from "next/link";
import SignInModal from "./auth/SignInModal";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { WalletDisplay } from "./WalletDisplay";
import { PRIMARY_COLOR, PRIMARY_HOVER } from "@/lib/colors";

const Header = () => {
  const { address } = useAccount();
  const { data: session } = useAbstractSession();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 w-full h-[60px] px-4 sm:px-8 bg-background overflow-hidden"
      style={{
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
      }}
    >
      <nav className="relative z-10 flex items-center justify-between h-full max-w-[95rem] mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/">
            <Image
              src="/blue-balls-text-logo.png"
              alt="Blue Balls"
              width={140}
              height={40}
              className="transition-transform duration-300 hover:scale-110"
              style={{
                filter: `drop-shadow(0 0 8px ${PRIMARY_COLOR}66)`
              }}
            />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {address && session ? (
            <WalletDisplay />
          ) : (
            <SignInModal>
              <Button
                variant="default"
                style={{ backgroundColor: PRIMARY_COLOR }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
                className="text-white font-bold px-6 rounded-md shadow-xl hover:shadow-2xl transition-all duration-200 border-0 text-sm group cursor-pointer hover:cursor-pointer h-[36px]"
              >
                Connect Wallet
                <Image
                  src="/abs.svg"
                  alt="Abstract"
                  width={20}
                  height={20}
                  className="ml-1 icon-spin"
                />
              </Button>
            </SignInModal>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;