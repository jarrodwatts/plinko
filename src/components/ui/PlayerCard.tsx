"use client";

import React from "react";
import { useAccount, useBalance } from "wagmi";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { useAbstractProfile } from "@/hooks/use-abstract-profile";
import { getTierName, getTierColor } from "@/lib/portal/tier-colors";
import { getDisplayName } from "@/lib/address-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEther } from "viem";

export function PlayerCard() {
  const { address, isConnected } = useAccount();
  const { data: profile, isLoading } = useAbstractProfile();
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: address,
  });

  if (!isConnected || !address) {
    // Return invisible placeholder to maintain layout consistency
    return <div className="h-[88px] mb-6" />; // Same height as the actual card
  }

  const displayName = getDisplayName(profile?.user?.name || "", address);
  const tierName = profile?.user?.tier ? getTierName(profile.user.tier) : "Silver";

  return (
    <div className="bg-black/10 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-6 relative">
      {/* Tier badge - positioned absolutely in top right */}
      {!isLoading && (
        <span
          className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full border"
          style={{
            color: profile?.user?.tier ? getTierColor(profile.user.tier) : '#C0C0C0',
            borderColor: profile?.user?.tier ? getTierColor(profile.user.tier) : '#C0C0C0',
            backgroundColor: `${profile?.user?.tier ? getTierColor(profile.user.tier) : '#C0C0C0'}20`
          }}
        >
          {tierName}
        </span>
      )}

      {/* Main content */}
      <div className="flex items-center space-x-3">
        <PlayerAvatar
          address={address}
          fallback={displayName.slice(0, 2).toUpperCase()}
          size="lg"
          showTooltip={false}
        />

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ) : (
            <>
              <h3 className="text-white font-semibold text-sm truncate">
                {displayName}
              </h3>
              <div className="text-gray-400 text-xs">
                {balanceLoading ? (
                  <Skeleton className="h-3 w-16" />
                ) : (
                  `${parseFloat(formatEther(balance?.value || BigInt(0))).toFixed(4)} ETH`
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}