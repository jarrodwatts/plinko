import React from "react";
import Image from "next/image";

interface LoadingStepProps {
  loadingText: string;
}

const LoadingStep: React.FC<LoadingStepProps> = ({ loadingText }) => {
  return (
    <>
      <style>
        {`
          @keyframes pulse-glow {
            0%, 100% {
              opacity: 1;
              filter: drop-shadow(0 0 5px #22C55E);
            }
            50% {
              opacity: 0.8;
              filter: drop-shadow(0 0 15px #4ADE80);
            }
          }
          .animate-pulse-glow {
            animation: pulse-glow 3s infinite ease-in-out;
          }
        `}
      </style>
      <div className="flex flex-col items-center justify-center text-center py-2">
        <div className="animate-pulse-glow">
          <Image
            src="/blue-ball.png"
            alt="Blue Ball"
            width={80}
            height={80}
            className="rounded-full"
            priority
            quality={100}
            unoptimized={true}
          />
        </div>
        <p className="text-neutral-400 text-sm mt-4">{loadingText}</p>
      </div>
    </>
  );
};

export default LoadingStep;