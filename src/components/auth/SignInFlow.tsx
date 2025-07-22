"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useAbstractSession } from "@/hooks/use-abstract-session";
import { useAbstractProfile } from "@/hooks/use-abstract-profile";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PRIMARY_COLOR } from "@/lib/colors";
import { WalletConnectionStep } from "./steps/WalletConnectionStep";
import { SiweAuthStep } from "./steps/SiweAuthStep";
import { SessionKeyStep } from "./steps/SessionKeyStep";
import LoadingStep from "./LoadingStep";

interface SignInFlowProps {
  onComplete: () => void;
}

enum SignInStep {
  WALLET_CONNECTION = "wallet",
  SIWE_AUTH = "siwe",
  SESSION_KEY = "session",
  COMPLETED = "completed",
}

/**
 * Orchestrates the multi-step sign-in flow
 * 1. Connect wallet
 * 2. SIWE authentication
 * 3. Create session key
 * 4. Show profile and complete
 */
export const SignInFlow: React.FC<SignInFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<SignInStep>(SignInStep.WALLET_CONNECTION);

  const { isConnected } = useAccount();
  const { data: authSession, isLoading: isAuthLoading } = useAuthSession();
  const { data: session, isLoading: isSessionLoading } = useAbstractSession();
  const { isLoading: isProfileLoading } = useAbstractProfile();

  // Auto-advance through steps based on current state
  useEffect(() => {
    if (!isConnected) {
      setCurrentStep(SignInStep.WALLET_CONNECTION);
    } else if (!authSession?.isAuthenticated && !isAuthLoading) {
      setCurrentStep(SignInStep.SIWE_AUTH);
    } else if (authSession?.isAuthenticated && !session && !isSessionLoading) {
      setCurrentStep(SignInStep.SESSION_KEY);
    } else if (authSession?.isAuthenticated && session) {
      setCurrentStep(SignInStep.COMPLETED);
    }
  }, [isConnected, authSession, session, isAuthLoading, isSessionLoading]);

  // Complete the flow when everything is ready
  useEffect(() => {
    if (currentStep === SignInStep.COMPLETED && authSession?.isAuthenticated && session) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, authSession, session, onComplete]);

  // Progress indicator component
  const ProgressDots = () => {
    const steps = [
      { key: SignInStep.WALLET_CONNECTION, label: "Connect" },
      { key: SignInStep.SIWE_AUTH, label: "Authenticate" },
      { key: SignInStep.SESSION_KEY, label: "Session" }
    ];

    const getCurrentStepIndex = () => {
      const stepIndex = steps.findIndex(step => step.key === currentStep);
      // If we're in completed state, show all steps as completed
      if (currentStep === SignInStep.COMPLETED) {
        return steps.length - 1; // All steps completed
      }
      return stepIndex;
    };

    const currentStepIndex = getCurrentStepIndex();

    return (
      <div className="flex items-center justify-center mb-4" style={{ marginTop: '-8px' }}>
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${index <= currentStepIndex
                ? 'shadow-sm'
                : 'bg-neutral-600'
                }`}
              style={index <= currentStepIndex ? {
                backgroundColor: PRIMARY_COLOR,
                boxShadow: `0 1px 2px 0 ${PRIMARY_COLOR}80`
              } : {}}
            />
            {index < steps.length - 1 && (
              <div
                className={`w-6 h-px mx-1.5 transition-all duration-300 opacity-40 ${index < currentStepIndex
                  ? ''
                  : 'bg-neutral-600'
                  }`}
                style={index < currentStepIndex ? { backgroundColor: PRIMARY_COLOR } : {}}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Show loading while checking initial state
  if (isAuthLoading || isSessionLoading || isProfileLoading) {
    return (
      <div className="flex flex-col transition-all duration-500 ease-in-out">
        <ProgressDots />
        <div className="space-y-4 transition-all duration-500 ease-in-out">
          <LoadingStep loadingText="Checking authentication status..." />
        </div>
      </div>
    );
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case SignInStep.WALLET_CONNECTION:
        return (
          <WalletConnectionStep
            onComplete={() => setCurrentStep(SignInStep.SIWE_AUTH)}
          />
        );

      case SignInStep.SIWE_AUTH:
        return (
          <SiweAuthStep
            onComplete={() => setCurrentStep(SignInStep.SESSION_KEY)}
          />
        );

      case SignInStep.SESSION_KEY:
        return (
          <SessionKeyStep
            onComplete={() => setCurrentStep(SignInStep.COMPLETED)}
          />
        );

      case SignInStep.COMPLETED:
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold" style={{ color: PRIMARY_COLOR }}>
              You&rsquo;re all set!
            </h3>
            <p className="text-neutral-400 text-sm">
              Welcome to <strong>Blue Balls</strong>! You can now drop balls and play without signing every transaction.
            </p>
          </div>
        );

      default:
        return <LoadingStep loadingText="Initializing..." />;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col transition-all duration-500 ease-in-out">

        <ProgressDots />
        <div className="space-y-4 transition-all duration-500 ease-in-out">
          {renderCurrentStep()}
        </div>
      </div>
    </TooltipProvider>
  );
};