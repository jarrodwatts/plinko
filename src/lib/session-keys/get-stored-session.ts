import { AbstractClient } from "@abstract-foundation/agw-client";
import { SessionConfig, getSessionHash } from "@abstract-foundation/agw-client/sessions";
import type { Address } from "viem";
import { getSessionConfig, hasValidSession } from "./session-storage";
import { validateSession } from "./validate-session";

/**
 * Retrieves and validates a stored session for Privy server wallet setup
 * 
 * Unlike the encrypted local storage pattern, this version:
 * 1. Simply retrieves the session config from localStorage (no decryption needed)
 * 2. Validates the session is still active on-chain
 * 3. Returns the session config (Privy server wallet handles the actual signing)
 * 
 * @param abstractClient - The Abstract client for validation
 * @param address - The wallet address whose session should be retrieved
 * @returns The session config if valid, null otherwise
 */
export const getStoredSession = async (
  abstractClient: AbstractClient,
  address: Address
): Promise<SessionConfig | null> => {
  if (!address) return null;

  // Check if we have a valid session in localStorage
  if (!hasValidSession()) {
    return null;
  }

  const sessionConfig = getSessionConfig();
  if (!sessionConfig) {
    return null;
  }

  try {
    // Validate the session is still active on-chain
    const sessionHash = getSessionHash(sessionConfig);

    // Check if the session is still valid on the Abstract Global Wallet
    const isValid = await validateSession(abstractClient, address, sessionHash);

    if (!isValid) {
      console.log("Session is no longer valid on-chain, clearing local storage");
      // Clear invalid session
      const { clearSessionConfig } = await import("./session-storage");
      clearSessionConfig();
      return null;
    }

    return sessionConfig;
  } catch (error) {
    console.error("Failed to validate session:", error);
    return null;
  }
};