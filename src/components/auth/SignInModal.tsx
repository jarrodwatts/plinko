"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { SignInFlow } from "./SignInFlow";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";

interface SignInModalProps {
  children?: React.ReactNode;
  triggerClassName?: string;
}

/**
 * Main sign-in modal that wraps the multi-step authentication flow
 * Can be triggered by custom children or a default button
 */
const SignInModal: React.FC<SignInModalProps> = ({
  children,
  triggerClassName
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address, isConnected } = useAccount();

  const handleComplete = () => {
    setIsModalOpen(false);
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="default"
            className={triggerClassName}
          >
            Connect Wallet
          </Button>
        )}
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="bg-black/80 backdrop-blur-md" />
        <DialogContent className="sm:max-w-md w-full bg-neutral-900 border-neutral-700 text-white transition-all duration-500 ease-in-out overflow-hidden" showCloseButton={true}>
          <DialogHeader className="sr-only">
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          {/* User avatar in top left corner of modal when connected */}
          {isConnected && address && (
            <div className="absolute top-4 left-4 z-20">
              <PlayerAvatar
                address={address}
                fallback={address.slice(2, 4).toUpperCase()}
                size="sm"
                showTooltip={true}
              />
            </div>
          )}
          <div className="p-2 relative">
            <SignInFlow onComplete={handleComplete} />
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default SignInModal;