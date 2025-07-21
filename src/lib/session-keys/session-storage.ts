import { SessionConfig } from "@abstract-foundation/agw-client/sessions";

const SESSION_KEY = "plinko-session-config";
const BIGINT_PREFIX = "__bigint__";

/**
 * Serialize session config with BigInt support
 */
function serializeWithBigInt(obj: SessionConfig): string {
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
 * Check if session is still valid based on expiration time
 */
export function hasValidSession(): boolean {
  const config = getSessionConfig();
  if (!config) return false;

  const now = BigInt(Math.floor(Date.now() / 1000));
  return config.expiresAt > now;
}

/**
 * Clear session config from localStorage
 */
export function clearSessionConfig(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}