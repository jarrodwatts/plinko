"use client";

import { useMutation } from "@tanstack/react-query";
import { useSignMessage, useAccount } from "wagmi";
import { SiweMessage } from "siwe";
import { abstractTestnet } from "viem/chains";

/**
 * Hook for SIWE (Sign-In With Ethereum) authentication flow
 * Handles nonce generation, message creation, signing, and verification
 */
export function useSiweAuth() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const authMutation = useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("No wallet address found");
      }

      // Step 1: Get nonce from server
      const nonceResponse = await fetch("/api/siwe/nonce");
      if (!nonceResponse.ok) {
        throw new Error("Failed to get nonce");
      }
      const nonce = await nonceResponse.text();

      // Step 2: Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to Blue Balls with Ethereum",
        uri: window.location.origin,
        version: "1",
        chainId: abstractTestnet.id,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
      });

      // Step 3: Sign the message
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // Step 4: Verify with server
      const verifyResponse = await fetch("/api/siwe/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.prepareMessage(),
          signature,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.message || "Verification failed");
      }

      const result = await verifyResponse.json();
      if (!result.ok) {
        throw new Error(result.message || "Verification failed");
      }

      return { message, signature, verified: true };
    },
  });

  return {
    signIn: authMutation.mutate,
    isLoading: authMutation.isPending,
    isError: authMutation.isError,
    error: authMutation.error,
    isSuccess: authMutation.isSuccess,
    data: authMutation.data,
    reset: authMutation.reset,
  };
}