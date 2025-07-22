"use client";

import { useAbstractSession } from "@/hooks/use-abstract-session";
import {
  Swords,
  Users,
  Gem,
  Flame,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import SignInModal from "./auth/SignInModal";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { WalletDisplay } from "./WalletDisplay";


const NavLink = ({
  children,
  href,
  icon: Icon,
}: {
  children: React.ReactNode;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  const isExternal = href.startsWith("http");
  const linkProps = isExternal
    ? { target: "_blank" as const, rel: "noopener noreferrer" as const }
    : {};

  return (
    <Link
      href={href}
      className="flex items-center gap-2 text-sm"
      {...linkProps}
    >
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span className="text-white">{children}</span>
    </Link>
  );
};

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
              src="/green-ball.png"
              alt="Plinko"
              width={40}
              height={40}
              className="transition-transform duration-300 hover:scale-110"
              style={{
                filter: "drop-shadow(0 0 8px rgba(0, 202, 81, 0.4))"
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
                className="bg-[#00ca51] hover:bg-[#00b048] text-white font-bold px-6 rounded-md shadow-xl hover:shadow-2xl transition-all duration-200 border-0 text-sm group cursor-pointer hover:cursor-pointer h-[36px]"
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