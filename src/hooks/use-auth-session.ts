"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/config/query-keys";

/**
 * Response type for the auth session API
 */
export interface AuthUser {
  isAuthenticated: boolean;
  address: string;
  siweMessage: {
    address: string;
    chainId: number;
    domain: string;
    expirationTime?: string;
    issuedAt: string;
    nonce: string;
    statement?: string;
    uri: string;
    version: string;
  };
}

export interface AuthSessionResponse {
  ok: boolean;
  user?: AuthUser;
  message?: string;
}

/**
 * Hook to manage and retrieve the current SIWE authentication session
 * This checks if the user is authenticated via their iron session cookie
 */
export function useAuthSession() {
  return useQuery({
    queryKey: [QUERY_KEYS.authSession],
    queryFn: async (): Promise<AuthUser | null> => {
      const response = await fetch("/api/siwe/get-user", {
        credentials: "include", // Include cookies for session
      });

      if (!response.ok) {
        // If not authenticated, return null instead of throwing
        if (response.status === 401) {
          return null;
        }
        throw new Error("Failed to get auth session");
      }

      const data: AuthSessionResponse = await response.json();

      if (!data.ok || !data.user) {
        return null;
      }

      return data.user;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: Error & { status?: number }) => {
      // Don't retry if it's a 401 (not authenticated)
      if (error?.status && error?.status === 401) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}