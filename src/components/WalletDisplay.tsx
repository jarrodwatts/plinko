"use client";

import React, { useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { useLoginWithAbstract } from "@abstract-foundation/agw-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { TooltipProvider } from "@/components/ui/tooltip";

// Helper function to shorten address
const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}..${address.slice(-4)}`;
};

// SVG Icons
const WalletIcon = () => (
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
        className="h-5 w-5"
    >
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
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
        className={className}
    >
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
);

const EthIcon = ({ className }: { className?: string }) => (
    <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 3.20798L6.97874 10.1605L12 12.8643L17.0213 10.1605L12 3.20798ZM11.0272 1.13901C11.5062 0.4758 12.4938 0.475796 12.9728 1.13901L19.1771 9.72952C19.6017 10.3175 19.4118 11.1448 18.7732 11.4887L12.5689 14.8294C12.2138 15.0207 11.7863 15.0207 11.4311 14.8294L5.22683 11.4887C4.58826 11.1448 4.3983 10.3175 4.82294 9.72952L11.0272 1.13901Z"
        />
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M17.7098 13.5271C18.8691 12.9474 19.9967 14.3627 19.1728 15.3632L12.9263 22.9482C12.4463 23.5311 11.5537 23.5311 11.0737 22.9482L4.82719 15.3632C4.00325 14.3627 5.13091 12.9474 6.29016 13.5271L12 16.382L17.7098 13.5271ZM16 16.5L12.5367 18.3497C12.1988 18.5186 11.8012 18.5186 11.4633 18.3497L8 16.5L12 20.927L16 16.5Z"
        />
    </svg>
);

export const WalletDisplay = () => {
    const { address } = useAccount();
    const { logout } = useLoginWithAbstract();
    const { data: balance } = useBalance({
        address,
        query: {
            refetchInterval: 15000,
        },
    });
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        }
    };

    if (!address) return null;

    return (
        <TooltipProvider>
            <div className="flex items-center gap-2">
                <PlayerAvatar
                    address={address}
                    fallback={address.slice(0, 2).toUpperCase()}
                    size="sm"
                    showTooltip={false}
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="group flex items-center rounded-lg border border-[#00ca51]/40 bg-[#00ca51]/20 p-2 text-[#00ca51] animate-pulse-glow hover:bg-[#00ca51]/30 hover:text-white"
                        >
                            <WalletIcon />
                            {balance ? Number(balance.formatted).toFixed(4).replace(/\.?0+$/, '') : '0'} ETH
                            <EthIcon className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 bg-neutral-900 border-neutral-700 text-white"
                        align="end"
                    >
                        <DropdownMenuLabel>Connected Wallet</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-neutral-700" />
                        <div className="flex items-center justify-between p-2">
                            <span className="text-sm">{shortenAddress(address)}</span>
                            <button
                                onClick={handleCopy}
                                className="p-1 rounded-md hover:bg-neutral-700 text-sm"
                                aria-label="Copy address"
                                disabled={copied}
                            >
                                {copied ? (
                                    <span className="text-[#00ca51] h-4 w-4 flex items-center justify-center text-xs">✓</span>
                                ) : (
                                    <CopyIcon className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <DropdownMenuSeparator className="bg-neutral-700" />
                        <DropdownMenuItem
                            onSelect={() => logout?.()}
                            className="text-red-500 cursor-pointer focus:bg-neutral-800 focus:text-red-400"
                        >
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </TooltipProvider>
    );
};