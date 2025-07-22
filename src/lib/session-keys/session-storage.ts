import { SessionConfig } from "@abstract-foundation/agw-client/sessions";
import { SESSION_KEY_CONFIG } from "@/config/session-key-config";

const SESSION_KEY = "plinko-session-config";
const CONFIG_HASH_KEY = "plinko-session-config-hash";
const BIGINT_PREFIX = "__bigint__";

/**
 * Serialize session config with BigInt support
 */
export function serializeWithBigInt(obj: SessionConfig): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "bigint") {
      return `${BIGINT_PREFIX}${value.toString()}`;
    }
    return value;
  });
}

/**
 * Deserialize session config with BigInt support
 */
export function deserializeWithBigInt(json: string): SessionConfig {
  return JSON.parse(json, (key, value) => {
    if (typeof value === "string" && value.startsWith(BIGINT_PREFIX)) {
      return BigInt(value.substring(BIGINT_PREFIX.length));
    }
    return value;
  });
}

/**
 * Save session config to localStorage
 * Note: With Privy server wallets, we only store the session config (not private keys)
 * The actual signing is done by Privy's TEE, so no sensitive data is stored locally
 */
export function saveSessionConfig(config: SessionConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, serializeWithBigInt(config));
    saveConfigHash();
  }
}

/**
 * Retrieve session config from localStorage
 */
export function getSessionConfig(): SessionConfig | null {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        return deserializeWithBigInt(stored);
      } catch (error) {
        console.error("Failed to parse session config:", error);
        clearSessionConfig(); // Clear invalid data
        return null;
      }
    }
  }
  return null;
}

/**
 * Check if session is still valid based on expiration time and config changes
 */
export function hasValidSession(): boolean {
  const config = getSessionConfig();
  if (!config) return false;

  // Check if config has changed since session was created
  if (hasConfigChanged()) {
    clearSessionConfig(); // Auto-clear if config has changed
    return false;
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  return config.expiresAt > now;
}

/**
 * Generate a hash of the session config to detect changes
 */
function generateConfigHash(config: Omit<SessionConfig, "signer" | "expiresAt">): string {
  const configForHash = {
    feeLimit: config.feeLimit,
    callPolicies: config.callPolicies,
    transferPolicies: config.transferPolicies,
  };
  return btoa(JSON.stringify(configForHash, (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  }));
}

/**
 * Check if the current session config matches the stored config hash
 */
export function hasConfigChanged(): boolean {
  if (typeof window === "undefined") return false;
  
  const storedHash = localStorage.getItem(CONFIG_HASH_KEY);
  const currentHash = generateConfigHash(SESSION_KEY_CONFIG);
  
  return storedHash !== currentHash;
}

/**
 * Save the current config hash to localStorage
 */
function saveConfigHash(): void {
  if (typeof window !== "undefined") {
    const currentHash = generateConfigHash(SESSION_KEY_CONFIG);
    localStorage.setItem(CONFIG_HASH_KEY, currentHash);
  }
}

/**
 * Clear session config from localStorage
 */
export function clearSessionConfig(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(CONFIG_HASH_KEY);
  }
}