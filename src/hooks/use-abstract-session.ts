"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { getStoredSession } from "@/lib/session-keys/get-stored-session";
import { useAbstractClient } from "@abstract-foundation/agw-react";
import { QUERY_KEYS } from "@/config/query-keys";

/**
 * Hook to retrieve and validate the stored Abstract session for Privy server wallet setup
 * @returns The session config with loading and error states
 */
export function useAbstractSession() {
  const { address } = useAccount();
  const { data: abstractClient } = useAbstractClient();

  return useQuery({
    queryKey: [QUERY_KEYS.session, address],
    queryFn: async () => {
      if (!abstractClient) {
        throw new Error("Failed to get session. Error: No Abstract client");
      }
      if (!address) {
        throw new Error("Failed to get session. Error: No connected wallet");
      }

      // With Privy server wallets, we only need to validate the session config
      // No private keys are stored locally - Privy TEE handles the signing
      return await getStoredSession(abstractClient, address);
    },
    enabled: !!address && !!abstractClient,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}