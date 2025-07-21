"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";

interface EthPriceResponse {
  current_price: string;
}

/**
 * Hook to fetch the current ETH price from Abstract Portal's oracle
 * @returns The ETH price data with loading and error states
 */
export function useEthPrice() {
  return useQuery({
    queryKey: [QUERY_KEYS.ethPrice],
    queryFn: async (): Promise<EthPriceResponse> => {
      const response = await fetch("/api/eth-price");
      if (!response.ok) {
        throw new Error("Failed to fetch ETH price");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 1, // Refetch every minute
  });
}

/**
 * Utility function to convert ETH amount to USD
 * @param ethAmount - Amount in ETH as string
 * @param ethPrice - Current ETH price in USD
 * @returns USD value as number
 */
export function ethToUsd(ethAmount: string, ethPrice: string): number {
  return parseFloat(ethAmount) * parseFloat(ethPrice);
}