"use client";

import React from "react";
import { useAbstractSession } from "@/hooks/use-abstract-session";
import { useCreateAbstractSession } from "@/hooks/use-create-abstract-session";
import LoadingStep from "../LoadingStep";

interface SessionKeyStepProps {
  onComplete: () => void;
}

/**
 * Step 3: Create Session Key for gasless transactions
 * Handles creation of Abstract session keys for improved UX
 */
export const SessionKeyStep: React.FC<SessionKeyStepProps> = ({
  onComplete,
}) => {
  const {
    data: session,
    isLoading,
    isError,
    error,
    refetch,
  } = useAbstractSession();
  const {
    mutate: createSession,
    isPending: isCreatingSession,
    error: createSessionError,
  } = useCreateAbstractSession();

  // Auto-advance when session is available
  React.useEffect(() => {
    if (session) {
      // Small delay to show success state
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [session, onComplete]);

  if (isLoading) {
    return <LoadingStep loadingText="Checking for existing session..." />;
  }

  if (isCreatingSession) {
    return <LoadingStep loadingText="Creating your session key..." />;
  }

  if (session) {
    return <LoadingStep loadingText="Session key ready! You're all set!" />;
  }

  if (isError) {
    return (
      <div className="text-center space-y-4">
        <div className="text-red-400">
          <h3 className="text-lg font-semibold mb-2 text-red-400">Session Check Failed</h3>
          <p className="text-sm">
            Error checking for session: {error?.message}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="w-full text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          style={{ backgroundColor: '#00ca51', borderColor: '#00ca51', cursor: 'pointer' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00b847'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00ca51'}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (createSessionError) {
    return (
      <div className="text-center space-y-4">
        <div className="text-red-400">
          <h3 className="text-lg font-semibold mb-2 text-red-400">Session Creation Failed</h3>
          <p className="text-sm">
            {createSessionError.message.includes("UserRejectedRequest")
              ? "Please approve the session creation in your wallet"
              : "Error creating session. Please try again."}
          </p>
        </div>
        <button
          onClick={() => createSession()}
          className="w-full text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          style={{ backgroundColor: '#00ca51', borderColor: '#00ca51', cursor: 'pointer' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00b847'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00ca51'}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4 transition-all duration-300 ease-in-out">
      <div>
        <h3 className="text-xl font-semibold mb-2 text-white">Create Session Key</h3>
        <p className="text-neutral-400 text-sm">
          Create a session key to enable uninterrupted gameplay.
        </p>
      </div>
      <button
        onClick={() => createSession()}
        className="w-full text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
        style={{ backgroundColor: '#00ca51', borderColor: '#00ca51', cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00b847'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00ca51'}
      >
        Create Session Key
      </button>
    </div>
  );
};