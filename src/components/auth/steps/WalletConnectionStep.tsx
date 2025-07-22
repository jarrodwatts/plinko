"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useAbstractLogin } from "@/hooks/use-abstract-login";
import { PRIMARY_COLOR, PRIMARY_HOVER } from "@/lib/colors";
import LoadingStep from "../LoadingStep";

interface WalletConnectionStepProps {
  onComplete: () => void;
}

/**
 * Step 1: Connect to Abstract Global Wallet
 * Handles wallet connection and automatically advances when connected
 */
export const WalletConnectionStep: React.FC<WalletConnectionStepProps> = ({
  onComplete,
}) => {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const { login, isError, error } = useAbstractLogin();

  // Auto-advance when wallet is connected
  React.useEffect(() => {
    if (isConnected) {
      onComplete();
    }
  }, [isConnected, onComplete]);

  if (isConnecting || isReconnecting) {
    return <LoadingStep loadingText="Connect your wallet in the pop-up window." />;
  }

  if (isError) {
    return (
      <div className="text-center space-y-4 transition-all duration-300 ease-in-out">
        <div className="text-red-400">
          <h3 className="text-lg font-semibold mb-2 text-red-400">Connection Failed</h3>
          <p className="text-sm">
            {error?.message?.includes("User rejected")
              ? "Please approve the connection in your wallet"
              : "Failed to connect to wallet. Please try again."
            }
          </p>
        </div>
        <button
          onClick={() => login()}
          className="w-full text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, cursor: 'pointer' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
        >
          Try Again
        </button>
        <a
          href="https://support.google.com/chrome/answer/95472"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline block"
          style={{ color: PRIMARY_COLOR }}
        >
          Having trouble? Check if pop-ups are blocked
        </a>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4 transition-all duration-300 ease-in-out">
      <div>
        <h3 className="text-xl font-semibold mb-2 text-white">Connect Your Wallet</h3>
        <p className="text-neutral-400 text-sm">
          Connect your Abstract Global Wallet to start playing!
        </p>
      </div>
      <button
        onClick={() => login()}
        className="w-full text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
        style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
      >
        Connect Abstract Global Wallet
      </button>
    </div>
  );
};