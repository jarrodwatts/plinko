"use client";

import React from "react";
import { useSiweAuth } from "@/hooks/use-siwe-auth";
import { useAuthSession } from "@/hooks/use-auth-session";
import LoadingStep from "../LoadingStep";
import { PRIMARY_COLOR, PRIMARY_HOVER } from "@/lib/colors";

interface SiweAuthStepProps {
  onComplete: () => void;
}

/**
 * Step 2: Sign-In With Ethereum (SIWE) Authentication
 * Creates and signs a SIWE message to establish authentication session
 */
export const SiweAuthStep: React.FC<SiweAuthStepProps> = ({ onComplete }) => {
  const { signIn, isLoading, isError, error, isSuccess } = useSiweAuth();
  const { data: authSession, refetch } = useAuthSession();

  // Auto-advance when authentication is successful
  React.useEffect(() => {
    if (isSuccess || authSession?.isAuthenticated) {
      // Small delay to show success state
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, authSession?.isAuthenticated, onComplete]);

  // Refetch auth session when sign-in succeeds
  React.useEffect(() => {
    if (isSuccess) {
      refetch();
    }
  }, [isSuccess, refetch]);

  if (isLoading) {
    return <LoadingStep loadingText="Please sign the message in the pop-up window." />;
  }

  if (isSuccess) {
    return <LoadingStep loadingText="Authentication successful!" />;
  }

  if (isError) {
    return (
      <div className="text-center space-y-4 transition-all duration-300 ease-in-out">
        <div className="text-red-400">
          <h3 className="text-lg font-semibold mb-2 text-red-400">Authentication Failed</h3>
          <p className="text-sm">
            {error?.message?.includes("User rejected") ||
              error?.message?.includes("rejected")
              ? "Please approve the message signing in your wallet"
              : error?.message || "Failed to authenticate. Please try again."}
          </p>
        </div>
        <button
          onClick={() => signIn()}
          className="w-full text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, cursor: 'pointer' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Check if already authenticated
  if (authSession?.isAuthenticated) {
    return <LoadingStep loadingText="Already authenticated!" />;
  }

  return (
    <div className="text-center space-y-4 transition-all duration-300 ease-in-out">
      <div>
        <h3 className="text-xl font-semibold mb-2 text-white">Sign Authentication Message</h3>
        <p className="text-neutral-400 text-sm">
          Sign a message to prove you own this wallet.
        </p>
      </div>
      <button
        onClick={() => signIn()}
        className="w-full text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
        style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
      >
        Sign Message
      </button>
    </div>
  );
};