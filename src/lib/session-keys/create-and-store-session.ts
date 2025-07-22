import { AbstractClient } from "@abstract-foundation/agw-client";
import { SessionConfig } from "@abstract-foundation/agw-client/sessions";
import { saveSessionConfig, clearSessionConfig } from "./session-storage";
import { SESSION_KEY_CONFIG } from "@/config/session-key-config";
import type { Address } from "viem";

/**
 * Creates and stores a new Abstract session for Privy server wallet setup
 * 
 * This function:
 * 1. Gets the Privy server wallet address to use as the signer
 * 2. Creates a session config for Plinko game with appropriate permissions
 * 3. Requests user approval for the session
 * 4. Stores the session config in localStorage (no private keys stored locally)
 * 
 * @param abstractClient - The Abstract client for session creation
 * @returns The created session config
 */
export const createAndStoreSession = async (
  abstractClient: AbstractClient
): Promise<SessionConfig> => {
  try {
    // Clear any existing session first
    clearSessionConfig();

    // Get the Privy server wallet address to use as signer
    const serverWalletResponse = await fetch("/api/server-wallet/get");
    if (!serverWalletResponse.ok) {
      throw new Error("Failed to get server wallet address");
    }
    const { address: serverWalletAddress } = await serverWalletResponse.json();

    // Create session config for Plinko game using the predefined config
    const sessionConfig: SessionConfig = {
      ...SESSION_KEY_CONFIG,
      signer: serverWalletAddress as Address,
    };

    console.log("sessionConfig", sessionConfig);

    // Request user approval for the session
    const approvedSession = await abstractClient.createSession({
      session: sessionConfig,
    });

    // Store the approved session config in localStorage
    saveSessionConfig(approvedSession.session);

    return approvedSession.session;
  } catch (error) {
    console.error("Failed to create session:", error);
    // Clear any partial data on error
    clearSessionConfig();
    throw error;
  }
};