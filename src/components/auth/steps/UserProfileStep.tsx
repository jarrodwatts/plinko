"use client";

import React from "react";
import { useAbstractProfile } from "@/hooks/use-abstract-profile";
import { useAccount } from "wagmi";
import { useBalance } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getDisplayName, trimAddress } from "@/lib/address-utils";
import LoadingStep from "../LoadingStep";

const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

/**
 * Displays the connected user's profile information
 * Shows avatar, name/address, balance, and logout option
 */
export const UserProfileStep = () => {
  const { address } = useAccount();
  const { logout } = useLoginWithAbstract();
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useAbstractProfile();
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address,
    query: {
      enabled: !!address,
    },
  });

  if (isLoading) {
    return <LoadingStep loadingText="Fetching your profile..." />;
  }

  if (isError) {
    return (
      <div className="text-center text-red-400">
        <p className="text-sm mb-2">Error fetching profile: {error?.message}</p>
        <Button onClick={() => refetch()} className="mt-2" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  const displayName = profile?.user?.name 
    ? getDisplayName(profile.user.name, address) 
    : address 
      ? trimAddress(address) 
      : "anon";

  const fallbackInitials = profile?.user?.name
    ? profile.user.name.slice(0, 2).toUpperCase()
    : address
      ? address.slice(2, 4).toUpperCase()
      : "AN";

  return (
    <div className="flex items-center justify-between w-full p-3 border border-neutral-700 rounded-lg bg-neutral-800/50">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-blue-600 text-white text-sm">
            {fallbackInitials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-sm font-semibold">{displayName}</h3>
          {isBalanceLoading ? (
            <p className="text-xs text-neutral-400">Checking balance...</p>
          ) : balance ? (
            <p className="text-xs text-neutral-400">
              {(Number(balance.value) / 1e18).toFixed(4)} {balance.symbol}
            </p>
          ) : (
            <p className="text-xs text-neutral-400">No balance data</p>
          )}
        </div>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout?.()}
              className="text-neutral-500 hover:text-red-500 hover:bg-red-500/10 h-8 w-8 p-0"
            >
              <LogoutIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-neutral-900 border-neutral-700 text-white">
            <p>Logout</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};