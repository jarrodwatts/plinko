"use client";

import { useState } from 'react';
import { PRIMARY_COLOR, PRIMARY_DARK } from '@/lib/colors';

interface LotteryBallMachineProps {
  scale?: number;
}

const LotteryBallMachine = ({ scale = 1 }: LotteryBallMachineProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Generate balls positioned naturally at the bottom of the circle
  const balls = Array.from({ length: 12 }, (_, i) => {
    // Create a semi-circle distribution at the bottom
    const angle = (Math.PI / 8) + (i * Math.PI * 0.75) / 11; // Spread across bottom arc
    const radius = 25 + Math.random() * 15; // Random depth within circle
    const centerX = 50;
    const centerY = 50;
    
    return {
      id: i,
      // Convert polar to cartesian coordinates
      settledX: centerX + Math.cos(angle) * radius,
      settledY: centerY + Math.sin(angle) * radius * 0.7 + 10, // Bias towards bottom
      animationDelay: Math.random() * 3,
      vibrateIntensity: 0.5 + Math.random() * 0.5,
    };
  });

  return (
    <div
      className="relative transition-transform duration-200"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Circular Glass Container */}
      <div className="relative w-20 h-20 mx-auto">
        {/* Main Circle */}
        <div
          className="absolute inset-0 rounded-full border-2 border-gray-300"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(1px)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.1)',
          }}
        />

        {/* Balls Container */}
        <div className="absolute inset-1 overflow-hidden rounded-full">
          {balls.map((ball) => (
            <div
              key={ball.id}
              className={`absolute w-4 h-4 rounded-full transition-all duration-300 ${
                isHovered ? 'ball-vibrate' : 'ball-settle'
              }`}
              style={{
                left: `${ball.settledX}%`,
                top: `${ball.settledY}%`,
                backgroundColor: PRIMARY_COLOR,
                border: `1px solid ${PRIMARY_DARK}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                animationDelay: `${ball.animationDelay}s`,
                '--vibrate-intensity': ball.vibrateIntensity,
                transform: 'translate(-50%, -50%)',
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes settle {
          0%, 100% { 
            transform: translate(-50%, -50%) translate(0, 0);
          }
          50% { 
            transform: translate(-50%, -50%) translate(0, 1px);
          }
        }

        @keyframes hyperactive {
          0% { 
            transform: translate(-50%, -50%) translate(0, 0) scale(1);
          }
          5% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -8px), calc(var(--vibrate-intensity) * -6px)) scale(1.1);
          }
          10% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 6px), calc(var(--vibrate-intensity) * -8px)) scale(0.9);
          }
          15% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -4px), calc(var(--vibrate-intensity) * 7px)) scale(1.05);
          }
          20% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 9px), calc(var(--vibrate-intensity) * 3px)) scale(0.95);
          }
          25% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -7px), calc(var(--vibrate-intensity) * -5px)) scale(1.08);
          }
          30% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 5px), calc(var(--vibrate-intensity) * 8px)) scale(0.92);
          }
          35% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -9px), calc(var(--vibrate-intensity) * -2px)) scale(1.03);
          }
          40% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 8px), calc(var(--vibrate-intensity) * -7px)) scale(0.97);
          }
          45% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -3px), calc(var(--vibrate-intensity) * 6px)) scale(1.06);
          }
          50% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 7px), calc(var(--vibrate-intensity) * -4px)) scale(0.94);
          }
          55% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -6px), calc(var(--vibrate-intensity) * 9px)) scale(1.02);
          }
          60% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 4px), calc(var(--vibrate-intensity) * -8px)) scale(0.98);
          }
          65% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -8px), calc(var(--vibrate-intensity) * 5px)) scale(1.04);
          }
          70% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 9px), calc(var(--vibrate-intensity) * -3px)) scale(0.96);
          }
          75% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -5px), calc(var(--vibrate-intensity) * -7px)) scale(1.01);
          }
          80% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 6px), calc(var(--vibrate-intensity) * 8px)) scale(0.99);
          }
          85% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -7px), calc(var(--vibrate-intensity) * -4px)) scale(1.02);
          }
          90% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * 3px), calc(var(--vibrate-intensity) * 6px)) scale(0.98);
          }
          95% { 
            transform: translate(-50%, -50%) translate(calc(var(--vibrate-intensity) * -4px), calc(var(--vibrate-intensity) * -5px)) scale(1.01);
          }
          100% { 
            transform: translate(-50%, -50%) translate(0, 0) scale(1);
          }
        }

        .ball-settle {
          animation: settle 4s ease-in-out infinite;
        }

        .ball-vibrate {
          animation: hyperactive 0.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LotteryBallMachine;