"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useAbstractProfileByAddress } from "@/hooks/use-abstract-profile";
import { getTierColor } from "@/lib/portal/tier-colors";
import { getDisplayName } from "@/lib/address-utils";

interface PlayerAvatarProps {
  address: string;
  fallback: string;
  shineColor?: string; // Optional now, will use tier color if not provided
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean; // Optional tooltip
}

export function PlayerAvatar({
  address,
  fallback,
  shineColor,
  size = "md",
  showTooltip = true,
}: PlayerAvatarProps) {
  const { data: profile, isLoading } = useAbstractProfileByAddress(address);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const avatarSrc =
    profile?.user?.overrideProfilePictureUrl ||
    "https://abstract-assets.abs.xyz/avatars/1-1-1.png";

  const displayName = getDisplayName(profile?.user?.name || "", address);

  // Use tier-based color if shineColor not provided
  const tierColor = profile?.user?.tier ? getTierColor(profile.user.tier) : getTierColor(2);
  const finalBorderColor = shineColor || tierColor;

  if (isLoading) {
    return (
      <div 
        className={`relative rounded-full ${sizeClasses[size]}`} 
        style={{ border: `2px solid ${finalBorderColor}` }}
      >
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <Skeleton 
            className={`w-full h-full rounded-full transition-transform duration-200 hover:scale-110`} 
          />
        </div>
      </div>
    );
  }

  const avatarElement = (
    <div 
      className={`relative rounded-full ${sizeClasses[size]}`} 
      style={{ border: `2px solid ${finalBorderColor}` }}
    >
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <Avatar 
          className={`w-full h-full transition-transform duration-200 hover:scale-110`}
        >
          <AvatarImage src={avatarSrc} alt={`${displayName} avatar`} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );

  if (!showTooltip) {
    return avatarElement;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {avatarElement}
      </TooltipTrigger>
      <TooltipContent>
        <p>{displayName}</p>
      </TooltipContent>
    </Tooltip>
  );
}