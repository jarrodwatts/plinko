"use client";

import React from "react";
import { useAbstractSession } from "@/hooks/use-abstract-session";
import { useCreateAbstractSession } from "@/hooks/use-create-abstract-session";
import LoadingStep from "../LoadingStep";
import { PRIMARY_COLOR, PRIMARY_HOVER } from "@/lib/colors";

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
    return <LoadingStep loadingText="Create a session key in the pop-up window." />;
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
          style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, cursor: 'pointer' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
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
            {(() => {
              const errorMsg = createSessionError.message.toLowerCase();
              if (errorMsg.includes("userrejectedrequest") || errorMsg.includes("user rejected")) {
                return "Please create the session key in the pop-up window.";
              }
              if (errorMsg.includes("popup") || errorMsg.includes("blocked")) {
                return "Pop-up window was blocked. Please allow pop-ups for this site and try again";
              }
              if (errorMsg.includes("closed") || errorMsg.includes("window closed")) {
                return "Pop-up window was closed. Please complete the session creation process";
              }
              if (errorMsg.includes("timeout") || errorMsg.includes("timed out")) {
                return "Session creation timed out. Please try again";
              }
              return "Error creating session. Please ensure pop-ups are enabled and try again.";
            })()}
          </p>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => createSession()}
            className="w-full text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
          >
            Try Again
          </button>
          {(createSessionError.message.toLowerCase().includes("popup") ||
            createSessionError.message.toLowerCase().includes("blocked")) && (
              <p className="text-xs text-neutral-500">
                <span className="text-blue-400">💡 Tip:</span> Check if pop-ups are blocked in your browser settings
              </p>
            )}
        </div>
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
        style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR, cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = PRIMARY_HOVER}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = PRIMARY_COLOR}
      >
        Create Session Key
      </button>
    </div>
  );
};