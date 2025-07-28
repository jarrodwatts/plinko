"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Matter from 'matter-js';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useAbstractSession } from '@/hooks/use-abstract-session';
import { usePlinkoPlayRound } from '@/hooks/use-plinko-play-round';
interface StructuredError extends Error {
  errorType?: string;
  userMessage?: string;
  retryable?: boolean;
  suggestions?: string[];
}
import { useWalletNonce } from '@/hooks/use-wallet-nonce';
import { useGameHistory } from '@/hooks/use-game-history';
import { useAudio } from '@/hooks/use-audio';
import { useEthBalance } from '@/hooks/use-eth-balance';
import { GameHistoryTable } from '@/components/GameHistoryTable';
import LotteryBallMachine from '@/components/LotteryBallMachine';
import { ShinyButton } from '@/components/ui/shiny-button';
import { PlayerCard } from '@/components/ui/PlayerCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import SignInModal from '@/components/auth/SignInModal';
import { PRIMARY_COLOR, PRIMARY_DARK } from '@/lib/colors';
import { toast } from 'sonner';
import { CONTAINER_PROBABILITIES, PRECISION } from '@/config/probabilities';

/**
 * A fully responsive Plinko game built with Matter.js physics engine.
 * The game automatically adapts to mobile and desktop screen sizes,
 * providing an immersive full-screen experience on mobile devices.
 */
const PlinkoGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const pegsRef = useRef<Matter.Body[]>([]);
  const bucketsRef = useRef<Matter.Body[]>([]);
  const pegAnimationTimeouts = useRef<Map<Matter.Body, NodeJS.Timeout>>(new Map());
  const bucketAnimationTimeouts = useRef<Map<Matter.Body, NodeJS.Timeout>>(new Map());
  const [dimensions, setDimensions] = useState({ width: 800, height: 620 });

  // Transaction status tracking (for UI feedback only)
  const [, setTransactionStatus] = useState<{
    stage: 'idle' | 'outcome' | 'submitted' | 'confirmed';
    hash?: string;
    receipt?: {
      blockNumber: bigint;
      gasUsed: string;
      status: string;
    };
    error?: string;
  }>({ stage: 'idle' });

  // Track which games have had their balls land (results revealed)
  const [ballsLanded, setBallsLanded] = useState<Set<string>>(new Set());

  // Bet amount state management
  const [betAmount, setBetAmount] = useState<number>(0.001);

  // Plinko play round mutation with streaming callbacks
  const submitTransactionMutation = usePlinkoPlayRound({
    onSuccess: (outcome) => {
      // Add to history with 'dropping' status - hide the result until ball lands
      const currentBetAmount = betAmount; // Use state bet amount

      // Create ball immediately with the outcome from server (include betAmount for later use)
      createBallWithOutcome({ ...outcome, betAmount: currentBetAmount });

      // Play ball drop sound
      playBallDrop();

      addGameResult({
        gameId: outcome.gameId,
        betAmount: currentBetAmount,
        multiplier: outcome.multiplier / 100, // Store actual multiplier but display ??x in UI
        payout: currentBetAmount * outcome.multiplier / 100, // Store actual payout but display ??? in UI
        status: 'dropping'
      });

      // Just add to history - no complex tracking needed
      setTransactionStatus({ stage: 'outcome' });
    },
    onTransactionSubmitted: (hash, gameId) => {
      setTransactionStatus(prev => ({ ...prev, stage: 'submitted', hash }));

      // Always update game status immediately - UI will handle hiding results until ball lands
      updateGameStatus(gameId, 'submitted', hash);
    },
    onTransactionConfirmed: (receipt, gameId) => {
      setTransactionStatus(prev => ({ ...prev, stage: 'confirmed', receipt }));

      // Always update game status immediately - UI will handle hiding results until ball lands
      updateGameStatus(gameId, 'confirmed');

      // Refresh balance after transaction confirmation to show updated balance
      refetchBalance();
    },
    onError: (error: StructuredError) => {
      console.error('Ball drop transaction failed:', error);
      setTransactionStatus({ stage: 'idle', error: error.message });

      // Enhanced error display with user-friendly messages and suggestions
      const displayMessage = error.userMessage || error.message || 'Transaction failed';

      // Create enhanced error toast with suggestions
      if (error.suggestions && error.suggestions.length > 0) {
        const suggestionText = error.suggestions.join(' or ');
        toast.error(displayMessage, {
          description: `Suggestion: ${suggestionText}`,
          duration: error.retryable ? 5000 : 8000, // Longer duration for non-retryable errors
          action: error.retryable ? {
            label: 'Retry',
            onClick: () => {
              // Retry the last failed transaction with same parameters
              if (isFullyAuthenticated) {
                const walletNonce = getNextNonce();
                if (walletNonce !== null) {
                  submitTransactionMutation.mutate({ betAmount, walletNonce });
                }
              }
            }
          } : undefined
        });
      } else {
        // Fallback to simpler error display
        toast.error(displayMessage, {
          duration: 6000
        });
      }

      // Enhanced error logging for debugging
      console.error('Structured error details:', {
        type: error.errorType,
        message: error.message,
        userMessage: error.userMessage,
        retryable: error.retryable,
        suggestions: error.suggestions
      });

      // Find the most recent dropping game and mark it as failed
      const droppingGame = gameHistory.find(game => game.status === 'dropping');
      if (droppingGame) {
        // Pass error context to game history for detailed error display
        const gameError = {
          errorType: error.errorType,
          message: error.message,
          userMessage: error.userMessage,
          retryable: error.retryable,
          suggestions: error.suggestions
        };

        updateGameStatus(droppingGame.gameId, 'failed', undefined, gameError);
      }
    },
    onNonceError: () => {
      resetNonce();
    },
  });

  // Authentication state
  const { isConnected } = useAccount();
  const { data: authSession } = useAuthSession();
  const { data: session } = useAbstractSession();

  // Wallet nonce management for rapid transactions
  const { currentNonce, getNextNonce, resetNonce, isLoading: nonceLoading, error: nonceError } = useWalletNonce();

  // Show toast notifications for wallet nonce status
  useEffect(() => {
    if (nonceLoading) {
      toast.loading("Loading wallet nonce...", {
        id: "wallet-nonce-loading"
      });
    } else {
      toast.dismiss("wallet-nonce-loading");
    }
  }, [nonceLoading]);

  useEffect(() => {
    if (nonceError) {
      toast.error(`Wallet nonce error: ${nonceError}`, {
        id: "wallet-nonce-error",
        action: {
          label: "Retry",
          onClick: resetNonce
        }
      });
    } else {
      toast.dismiss("wallet-nonce-error");
    }
  }, [nonceError, resetNonce]);

  // Game history management
  const { gameHistory, addGameResult, updateGameStatus, revealBallResult, isLoading: historyLoading } = useGameHistory();

  // Audio management
  const { playBallDrop, playBounce, playLand, playBigWin } = useAudio();

  // ETH balance management
  const { balanceEth, refetch: refetchBalance } = useEthBalance();

  // Demo mode state with auto-switching based on wallet connection
  const [isDemoMode, setIsDemoMode] = useState(!isConnected);

  // Auto-adjust bet amount if current selection exceeds balance
  useEffect(() => {
    if (!isDemoMode && balanceEth !== null && betAmount > balanceEth) {
      // Find the highest available bet amount that user can afford
      const availableAmounts = [0.001, 0.01, 0.1].filter(amount => amount <= balanceEth);
      if (availableAmounts.length > 0) {
        const newBetAmount = Math.max(...availableAmounts);
        setBetAmount(newBetAmount);
      }
    }
  }, [balanceEth, betAmount, isDemoMode]);

  // Auto-switch demo mode based on wallet connection
  useEffect(() => {
    if (!isConnected) {
      // Force demo mode when disconnected
      setIsDemoMode(true);
    } else {
      // Default to real mode when connected (user can still manually toggle)
      setIsDemoMode(false);
    }
  }, [isConnected]);

  // Check if user is fully authenticated and wallet nonce is ready
  const isFullyAuthenticated = isConnected && authSession?.isAuthenticated && session && currentNonce !== null;

  /**
   * Calculates optimal canvas dimensions based on device type and screen size.
   */
  const getCanvasDimensions = () => {
    // Guard against SSR where window is undefined
    if (typeof window === 'undefined') {
      return { width: 800, height: 620 };
    }

    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? 20 : 40;
    const maxWidth = window.innerWidth - padding;
    const maxHeight = window.innerHeight - (isMobile ? 120 : 200);

    // Maintain 800:620 aspect ratio for compact layout
    const aspectRatio = 800 / 620;

    if (isMobile) {
      const width = Math.max(320, Math.min(maxWidth, 400));
      const height = Math.max(360, Math.min(maxHeight, width / aspectRatio));
      return { width, height };
    } else {
      const width = Math.max(600, Math.min(maxWidth, 800));
      const height = Math.max(620, Math.min(maxHeight, width / aspectRatio));
      return { width, height };
    }
  };

  // Fixed canvas size for stable physics world - optimized height for content
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 620;
  const PEG_RADIUS = 4; // Smaller pegs for tighter Christmas tree formation
  const BALL_RADIUS = 8; // Smaller ball for tighter peg spacing
  const BUCKET_WIDTH = (CANVAS_WIDTH / 17) * 0.9; // 17 containers with 10% gap
  const BUCKET_HEIGHT = 30; // Half height for better proportions

  // Calculate CSS scaling for responsiveness
  const displayWidth = dimensions.width;
  const displayHeight = dimensions.height;
  const scaleX = displayWidth / CANVAS_WIDTH;
  const scaleY = displayHeight / CANVAS_HEIGHT;
  const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio

  // Handle window resize and set initial dimensions
  useEffect(() => {
    const handleResize = () => {
      const newDimensions = getCanvasDimensions();
      setDimensions(newDimensions);
    };

    // Set initial dimensions after component mounts
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Production velocity mapping - one optimal velocity per bucket
  const BUCKET_TO_VELOCITY = useMemo((): Record<number, number> => ({
    0: 1,       // 110x
    1: 1.25,    // 42x  
    2: -4.25,   // 10x
    3: -0.45,   // 5x (using closer velocity)
    4: 0.85,    // 3x
    5: 0.7,     // 1.5x
    6: -1.1,    // 1x
    7: -1.2,    // 0.5x
    8: -1.05,   // 0.3x (center)
    9: 1.2,     // 0.5x
    10: 0.6,    // 1x
    11: 0.9,    // 1.5x
    12: 2.1,    // 3x
    13: -1.15,  // 5x
    14: 1.45,   // 10x
    15: 0.8,    // 42x
    16: 1.4     // 110x
  }), []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Capture ref values at the beginning to avoid stale closure warnings
    const pegTimeouts = pegAnimationTimeouts.current;
    const bucketTimeouts = bucketAnimationTimeouts.current;

    // Physics engine setup with custom gravity for good ball flow
    const engine = Matter.Engine.create();
    engine.gravity.y = 1; // Strong downward pull
    engine.gravity.x = 0; // No sideways gravity
    engine.gravity.scale = 0.001; // Fine-tuned gravity strength
    engineRef.current = engine;

    // Handle ball-bucket collisions for scoring
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;

        let ball = null;
        let bucket = null;
        let peg = null;

        // Identify ball and bucket
        if (bodyA.label?.startsWith('bucket-') && ballsRef.current.includes(bodyB)) {
          ball = bodyB;
          bucket = bodyA;
        } else if (bodyB.label?.startsWith('bucket-') && ballsRef.current.includes(bodyA)) {
          ball = bodyA;
          bucket = bodyB;
        }

        // Identify ball and peg collisions for bounce sounds
        if (bodyA.label === 'peg' && ballsRef.current.includes(bodyB)) {
          ball = bodyB;
          peg = bodyA;
        } else if (bodyB.label === 'peg' && ballsRef.current.includes(bodyA)) {
          ball = bodyA;
          peg = bodyB;
        }

        // Handle peg bounce sounds and visual effects
        if (ball && peg) {
          playBounce();

          // Add visual effect to peg on collision
          animatePegHit(peg);
        }

        if (ball && bucket) {
          // Use server-validated outcome instead of bucket multiplier
          const ballOutcome = ball.plugin?.ballOutcome;
          if (ballOutcome) {
            // Play appropriate landing sound and animate bucket
            if (ballOutcome.multiplier === 11000) { // 110x multiplier
              playBigWin();
              animateBucketLanding(bucket, 'big-win');
            } else {
              playLand();
              animateBucketLanding(bucket, ballOutcome.multiplier);
            }

            // Reveal the result in the GameHistoryTable now that the ball has landed
            const payout = ballOutcome.betAmount * ballOutcome.multiplier / 100;
            revealBallResult(ballOutcome.gameId, ballOutcome.multiplier / 100, payout);

            // Mark that this ball has landed - UI can now show the results
            setBallsLanded(prev => new Set(prev).add(ballOutcome.gameId));
          }

          // Remove ball
          const index = ballsRef.current.indexOf(ball);
          if (index > -1) {
            ballsRef.current.splice(index, 1);
            Matter.World.remove(engine.world, ball);
          }
        }
      });
    });

    // Visual renderer with dark theme
    const render = Matter.Render.create({
      canvas: canvasRef.current,
      engine: engine,
      options: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        wireframes: false,
        background: 'transparent',
        showVelocity: false,
        showAngleIndicator: false,
      }
    });
    renderRef.current = render;

    // Invisible boundary walls to contain balls
    const walls = [
      Matter.Bodies.rectangle(-25, CANVAS_HEIGHT / 2, 50, CANVAS_HEIGHT, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        collisionFilter: {
          category: 0x0001, // Wall category - balls can collide with this
          mask: 0xFFFF      // Walls can collide with everything
        }
      }),
      Matter.Bodies.rectangle(CANVAS_WIDTH + 25, CANVAS_HEIGHT / 2, 50, CANVAS_HEIGHT, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        collisionFilter: {
          category: 0x0001, // Wall category - balls can collide with this
          mask: 0xFFFF      // Walls can collide with everything
        }
      }),
      Matter.Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + 25, CANVAS_WIDTH, 50, {
        isStatic: true,
        render: { fillStyle: 'transparent' },
        collisionFilter: {
          category: 0x0001, // Wall category - balls can collide with this
          mask: 0xFFFF      // Walls can collide with everything
        }
      })
    ];

    // Peg layout: pyramid formation with responsive positioning
    const pegs: Matter.Body[] = [];
    const rows = 16;
    const startY = CANVAS_HEIGHT * 0.125; // Start lower to give balls spawn space
    const rowSpacing = CANVAS_HEIGHT * 0.05; // Tighter spacing for 16 rows
    const pegSpacing = CANVAS_WIDTH * 0.055; // Much tighter spacing for Christmas tree shape

    for (let row = 0; row < rows; row++) {
      const pegsInRow = row + 3;
      const rowWidth = (pegsInRow - 1) * pegSpacing;
      const startX = (CANVAS_WIDTH - rowWidth) / 2;

      for (let col = 0; col < pegsInRow; col++) {
        const x = startX + col * pegSpacing;
        const y = startY + row * rowSpacing;

        const peg = Matter.Bodies.circle(x, y, PEG_RADIUS, {
          isStatic: true,
          render: {
            fillStyle: '#e2e8f0', // Refined light gray
            strokeStyle: '#cbd5e1', // Subtle border
            lineWidth: 1
          },
          collisionFilter: {
            category: 0x0001, // Peg category - balls can collide with this
            mask: 0xFFFF      // Pegs can collide with everything
          },
          label: 'peg' // Add label to identify pegs
        });
        pegs.push(peg);
        pegsRef.current.push(peg);
      }
    }

    // Prize buckets with exponential risk/reward structure
    // Probability distribution (symmetric from center):
    // 110x: 0.0015% | 42x: 0.0244% | 10x: 0.1831% | 5x: 0.8545% | 3x: 2.7771%
    // 1.5x: 6.6650% | 1x: 12.2192% | 0.5x: 17.5461% | 0.3x: 19.6381% (center)
    const buckets: Matter.Body[] = [];
    const bucketCount = 17;
    const multipliers = [110, 42, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 42, 110]; // Symmetric from center 0.3x
    const bucketSpacing = CANVAS_WIDTH / bucketCount;

    for (let i = 0; i < bucketCount; i++) {
      const x = bucketSpacing * i + bucketSpacing / 2;
      const y = 596; // Last peg at 560 + 36px gap = 596px

      const bucket = Matter.Bodies.rectangle(x, y, BUCKET_WIDTH, BUCKET_HEIGHT, {
        isStatic: true,
        render: {
          fillStyle: (() => {
            // Primary blue theme: variations of #1475E1
            const mult = multipliers[i];
            if (mult >= 1000) return '#0F5BA8';    // Darker for extreme edges (110x)
            if (mult >= 100) return '#1165C7';     // Darker for high payouts (42x)
            if (mult >= 20) return '#1269D3';      // Slight darker for good payouts (10x)
            if (mult >= 5) return '#1370DB';       // Darker for decent payouts (5x)
            if (mult >= 2) return '#1473DE';       // Minimal darker for breaking even (3x)
            if (mult >= 1) return '#1475E1';       // Base primary blue for small profit (1.5x, 1x)
            if (mult >= 0.5) return '#2A82E6';     // Lighter for small loss (0.5x)
            if (mult >= 0.2) return '#4A90E6';     // Lighter for bad (0.3x)
            return '#4A90E6';                      // Same light blue for center (0.3x)
          })(),
          strokeStyle: '#0F5BA8',
          lineWidth: 1
        },
        chamfer: {
          radius: 3
        },
        collisionFilter: {
          category: 0x0001, // Bucket category - balls can collide with this
          mask: 0xFFFF      // Buckets can collide with everything
        },
        label: `bucket-${multipliers[i]}` // Used for collision detection
      });
      buckets.push(bucket);
      bucketsRef.current.push(bucket);
    }

    // Add all physics bodies to the world
    Matter.World.add(engine.world, [...walls, ...pegs, ...buckets]);

    // Start rendering and physics simulation
    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    // Cleanup when component unmounts or dimensions change
    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      // Clear references and timeouts
      pegsRef.current = [];
      bucketsRef.current = [];
      // Clear all animation timeouts using captured values
      pegTimeouts.forEach(timeout => clearTimeout(timeout));
      pegTimeouts.clear();
      bucketTimeouts.forEach(timeout => clearTimeout(timeout));
      bucketTimeouts.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BUCKET_WIDTH, revealBallResult]);

  /**
   * Creates a ball with server-determined outcome using velocity mapping
   */
  const createBallWithOutcome = useCallback((outcome: { randomSeed: number; targetBucket: number; multiplier: number; gameId: string; betAmount: number }) => {
    if (!engineRef.current) return;

    // Fixed starting position
    const startX = CANVAS_WIDTH / 2; // Always center
    const startY = 20; // Always top

    // Use production mapping for server outcomes
    const targetVelocity = BUCKET_TO_VELOCITY[outcome.targetBucket];
    const velocityX = targetVelocity !== undefined ? targetVelocity : 0; // Fallback to center
    const velocityY = 2; // Fixed downward velocity

    // Create ball at fixed position with collision filtering
    const ball = Matter.Bodies.circle(
      startX,
      startY,
      BALL_RADIUS,
      {
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.001,
        render: {
          fillStyle: PRIMARY_COLOR,
          strokeStyle: PRIMARY_DARK,
          lineWidth: 2
        },
        collisionFilter: {
          category: 0x0002, // Ball category
          mask: 0x0001      // Only collide with pegs/buckets (category 0x0001), not other balls
        },
        plugin: {
          ballOutcome: outcome
        }
      }
    );

    ballsRef.current.push(ball);
    Matter.World.add(engineRef.current.world, ball);

    // Set calculated velocity for precise placement
    Matter.Body.setVelocity(ball, {
      x: velocityX,
      y: velocityY
    });

    // Remove ball after 15 seconds to prevent accumulation
    setTimeout(() => {
      const index = ballsRef.current.indexOf(ball);
      if (index > -1) {
        ballsRef.current.splice(index, 1);
        if (engineRef.current) {
          Matter.World.remove(engineRef.current.world, ball);
        }
      }
    }, 15000);
  }, [engineRef, CANVAS_WIDTH, BUCKET_TO_VELOCITY]);

  /**
   * Animates a peg when hit by a ball
   */
  const animatePegHit = useCallback((peg: Matter.Body) => {
    if (!peg.render) return;

    // Clear any existing timeout for this peg
    const existingTimeout = pegAnimationTimeouts.current.get(peg);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Store original colors (only if not already animated)
    const originalFill = '#e2e8f0';
    const originalStroke = '#cbd5e1';

    // Set hit colors (bright blue glow)
    peg.render.fillStyle = PRIMARY_COLOR; // Bright blue
    peg.render.strokeStyle = '#ffffff'; // White stroke
    peg.render.lineWidth = 2;

    // Fade back to original after 150ms
    const timeout = setTimeout(() => {
      if (peg.render) {
        peg.render.fillStyle = originalFill;
        peg.render.strokeStyle = originalStroke;
        peg.render.lineWidth = 1;
      }
      // Remove timeout from map
      pegAnimationTimeouts.current.delete(peg);
    }, 150);

    // Store timeout for this peg
    pegAnimationTimeouts.current.set(peg, timeout);
  }, []);

  /**
   * Animates a bucket when a ball lands in it
   */
  const animateBucketLanding = useCallback((bucket: Matter.Body, multiplierOrType: number | 'big-win') => {
    if (!bucket.render) return;

    // Clear any existing timeout for this bucket
    const existingTimeout = bucketAnimationTimeouts.current.get(bucket);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Get bucket multiplier from label to determine original colors
    const bucketMultiplier = parseFloat(bucket.label?.split('-')[1] || '1');
    let originalFill: string;
    const originalStroke = '#0F5BA8';
    const originalLineWidth = 1;

    // Recreate original bucket colors based on multiplier
    if (bucketMultiplier >= 100) originalFill = '#0F5BA8';    // 110x
    else if (bucketMultiplier >= 40) originalFill = '#1165C7';     // 42x
    else if (bucketMultiplier >= 10) originalFill = '#1269D3';      // 10x
    else if (bucketMultiplier >= 5) originalFill = '#1370DB';       // 5x
    else if (bucketMultiplier >= 2) originalFill = '#1473DE';       // 3x
    else if (bucketMultiplier >= 1) originalFill = '#1475E1';       // 1.5x, 1x
    else if (bucketMultiplier >= 0.5) originalFill = '#2A82E6';     // 0.5x
    else originalFill = '#4A90E6';                      // 0.3x

    // Determine animation colors based on multiplier
    let glowColor: string;
    let strokeColor: string;
    let duration: number;

    if (multiplierOrType === 'big-win') {
      // Epic gold animation for 110x wins
      glowColor = '#FFD700'; // Gold
      strokeColor = '#FFA500'; // Orange
      duration = 800; // Longer for big wins
    } else {
      const multiplier = multiplierOrType as number;
      if (multiplier >= 4200) { // 42x
        glowColor = '#FF6B35'; // Orange-red
        strokeColor = '#FF4500';
        duration = 600;
      } else if (multiplier >= 1000) { // 10x
        glowColor = '#FF8C42'; // Orange
        strokeColor = '#FF6B35';
        duration = 500;
      } else if (multiplier >= 500) { // 5x
        glowColor = '#4ECDC4'; // Teal
        strokeColor = '#26A69A';
        duration = 400;
      } else if (multiplier >= 300) { // 3x
        glowColor = '#45B7D1'; // Light blue
        strokeColor = '#2196F3';
        duration = 350;
      } else if (multiplier >= 100) { // 1x+
        glowColor = '#96CEB4'; // Light green
        strokeColor = '#4CAF50';
        duration = 300;
      } else {
        // Loss buckets (0.3x, 0.5x)
        glowColor = '#FF7675'; // Light red
        strokeColor = '#E74C3C';
        duration = 250;
      }
    }

    // Apply glow effect
    bucket.render.fillStyle = glowColor;
    bucket.render.strokeStyle = strokeColor;
    bucket.render.lineWidth = 3;

    // For big wins, add a pulsing effect
    if (multiplierOrType === 'big-win') {
      let pulseCount = 0;
      const pulseInterval = setInterval(() => {
        if (bucket.render && pulseCount < 4) {
          bucket.render.lineWidth = bucket.render.lineWidth === 3 ? 5 : 3;
          pulseCount++;
        } else {
          clearInterval(pulseInterval);
        }
      }, 100);
    }

    // Fade back to original after duration
    const timeout = setTimeout(() => {
      if (bucket.render) {
        bucket.render.fillStyle = originalFill;
        bucket.render.strokeStyle = originalStroke;
        bucket.render.lineWidth = originalLineWidth;
      }
      // Remove timeout from map
      bucketAnimationTimeouts.current.delete(bucket);
    }, duration);

    // Store timeout for this bucket
    bucketAnimationTimeouts.current.set(bucket, timeout);
  }, []);

  /**
   * Generate demo outcome using same probability system as server
   */
  const generateDemoOutcome = useCallback(() => {
    // Generate random value between 0 and PRECISION-1
    const randomValue = Math.floor(Math.random() * PRECISION);

    // Find the container using the same logic as server
    const container = CONTAINER_PROBABILITIES.find(c =>
      randomValue >= c.range[0] && randomValue <= c.range[1]
    );

    if (!container) {
      // Fallback to center bucket
      return {
        randomSeed: randomValue,
        targetBucket: 8, // Center bucket index
        multiplier: 30,  // 0.3x multiplier
        gameId: crypto.randomUUID()
      };
    }

    // Find bucket index by multiplier
    const bucketIndex = CONTAINER_PROBABILITIES.findIndex(c => c.multiplier === container.multiplier);

    return {
      randomSeed: randomValue,
      targetBucket: bucketIndex,
      multiplier: container.multiplier,
      gameId: crypto.randomUUID()
    };
  }, []);

  /**
   * Drops a demo ball with local randomness (no blockchain transaction)
   */
  const dropDemoBall = useCallback(() => {
    if (!engineRef.current) return;
    // Generate demo outcome
    const outcome = generateDemoOutcome();

    // Create ball immediately with demo outcome
    createBallWithOutcome({
      ...outcome,
      betAmount: 0 // Demo balls have no bet amount
    });

    // Play ball drop sound
    playBallDrop();

  }, [engineRef, generateDemoOutcome, createBallWithOutcome, playBallDrop]);

  /**
   * Drops a ball by triggering server-controlled randomness and transaction
   */
  const dropBall = useCallback(async () => {
    if (!engineRef.current) return;

    // Require authentication and wallet nonce to drop balls
    if (!isFullyAuthenticated) {
      return;
    }

    // Get next wallet nonce for this transaction
    const walletNonce = getNextNonce();
    if (walletNonce === null) {
      console.error('Could not get next wallet nonce');
      setTransactionStatus({ stage: 'idle', error: 'Wallet nonce not available' });
      return;
    }

    try {
      // Fire and forget - don't await or block on this
      submitTransactionMutation.mutate({
        betAmount,
        walletNonce
      });

    } catch (error) {
      console.error('Error dropping ball:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTransactionStatus({ stage: 'idle', error: errorMessage });
    }
  }, [engineRef, isFullyAuthenticated, submitTransactionMutation, getNextNonce, betAmount]);

  // Bet amount control functions
  const handlePresetBet = useCallback((amount: number) => {
    setBetAmount(amount);
  }, []);

  // Keyboard controls: spacebar to drop balls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (isDemoMode) {
          dropDemoBall();
        } else {
          dropBall();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [dropBall, dropDemoBall, isDemoMode]);

  const isMobile = displayWidth < 500;

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Main Layout */}
      <div className="flex flex-col 2xl:flex-row justify-center items-start min-h-[calc(100vh-8rem)]">

        {/* Top Section: Game + Controls (horizontal on lg/xl, vertical on smaller) */}
        <div className="w-full flex flex-col lg:flex-row lg:gap-8 lg:justify-center lg:items-start lg:mt-4 2xl:mt-0 2xl:contents order-1">

          {/* Game Controls - Compact for lg/xl, full panel for 2xl */}
          <div className="w-full lg:w-auto 2xl:w-[400px] 2xl:fixed 2xl:left-0 2xl:top-[60px] 2xl:h-[calc(100vh-60px)] order-2 lg:order-1 2xl:order-1 lg:pl-8 2xl:pl-0">
            <div className="bg-black/5 backdrop-blur-sm p-6 lg:rounded-xl lg:border 2xl:border-r 2xl:border-b-0 2xl:rounded-none border-white/10 w-full lg:w-80 2xl:w-full h-auto lg:h-[652px] 2xl:h-full flex flex-col">
              <div className="flex flex-col h-full 2xl:justify-center">
                {/* Player Card - Only shown on 2xl+ screens */}
                <div className="hidden 2xl:block">
                  <PlayerCard />
                </div>

                {/* Top section - normal on lg/xl, centered on 2xl+ */}
                <div className="2xl:flex-1 2xl:flex 2xl:flex-col 2xl:justify-center">
                  <h2 className="text-white font-bold text-lg text-center mb-6 lg:mb-4 2xl:mb-6 hidden lg:block">Game Controls</h2>

                  {/* Bet Amount Section */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold text-sm">Bet Amount</h3>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="demo-mode"
                          checked={isDemoMode}
                          onCheckedChange={(checked) => setIsDemoMode(checked === true)}
                          disabled={!isConnected} // Force demo mode when disconnected
                        />
                        <label
                          htmlFor="demo-mode"
                          className="text-white font-semibold text-sm cursor-pointer select-none"
                        >
                          Demo Mode
                        </label>
                      </div>
                    </div>
                    <div className="flex flex-row lg:flex-col gap-2 lg:gap-0 lg:space-y-2">
                      {[0.001, 0.01, 0.1].map((amount) => {
                        const isDisabled = !isDemoMode && balanceEth !== null && amount > balanceEth;
                        const isSelected = betAmount === amount;

                        return (
                          <Button
                            key={amount}
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePresetBet(amount)}
                            disabled={isDisabled}
                            className={`flex-1 lg:flex-none lg:w-full justify-center text-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            title={isDisabled ? `Insufficient balance (${balanceEth?.toFixed(4)} ETH available)` : undefined}
                          >
                            {amount} ETH
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Play Button Section - Shown below bet amount on all screens */}
                  <div className="mb-6">
                    <ShinyButton
                      onClick={isFullyAuthenticated && !isDemoMode ? dropBall : dropDemoBall}
                      disabled={false}
                      className="w-full"
                    >
                      {(() => {
                        if (isFullyAuthenticated && !isDemoMode) {
                          if (balanceEth !== null && betAmount > balanceEth) {
                            return 'Insufficient Balance';
                          } else {
                            return 'Drop Ball';
                          }
                        } else {
                          return 'Drop Ball (Demo Mode)';
                        }
                      })()}
                    </ShinyButton>

                    <p className="text-xs text-gray-400 text-center mt-3">
                      or press <kbd className="px-1.5 py-0.5 bg-gray-700 text-gray-200 rounded text-xs font-mono">space</kbd> to drop ball
                    </p>

                    {/* Show Connect Wallet button when not fully authenticated */}
                    {!isFullyAuthenticated && (
                      <SignInModal>
                        <Button
                          variant="outline"
                          className="w-full mt-3 border-white/20 text-white hover:bg-white/10 h-12 text-base"
                        >
                          Connect Wallet to Play
                          <Image
                            src="/abs.svg"
                            alt="Abstract"
                            width={20}
                            height={20}
                            className="ml-2 icon-spin"
                          />
                        </Button>
                      </SignInModal>
                    )}
                  </div>
                </div>

                {/* How to Play Section - Shown on lg/xl and 2xl+ */}
                <div className="space-y-2 mb-6 hidden lg:block border-t border-white/10 pt-6">
                  <h3 className="text-white font-semibold text-sm">How to Play</h3>
                  <div className="text-xs text-gray-400 space-y-2">
                    <p>Drop balls down the peg board to win ETH based on where they land.</p>
                    <p>Higher payouts are at the edges, lower payouts in the center.</p>
                    <p>Each ball drop is a blockchain transaction with provably fair randomness.</p>
                  </div>
                </div>

                {/* Instructions Section - Hidden on lg/xl, shown on 2xl+ */}
                <div className="space-y-2 hidden 2xl:block">
                  <h3 className="text-white font-semibold text-sm">Controls</h3>
                  <div className="text-sm text-gray-400">
                    Press <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">SPACE</kbd> to play
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Game Container - Center */}
          <div className="flex items-center justify-center order-1 lg:order-2 2xl:order-2 2xl:mx-[400px] w-full lg:flex-1 pt-8 lg:pt-0 lg:pr-8 lg:min-h-[620px] 2xl:h-[calc(100vh-280px)] 2xl:pt-0 2xl:pr-0">
            <div className="relative lg:border lg:border-white/10 lg:rounded-2xl lg:p-4 lg:bg-black/5 lg:backdrop-blur-sm">
              <div className="overflow-hidden relative rounded-2xl"
                style={{ width: displayWidth, height: displayHeight }}>
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="block rounded-2xl"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT
                  }}
                />

                {/* Lottery Ball Machine */}
                <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto z-10" style={{ top: `${-10 * scale}px` }}>
                  <LotteryBallMachine scale={scale * 0.75} />
                </div>

                {/* Enhanced Bucket labels */}
                <div className="absolute inset-0 pointer-events-none">
                  {[110, 42, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 42, 110].map((multiplier, index) => {
                    const bucketSpacing = CANVAS_WIDTH / 17;
                    const x = (bucketSpacing * index + bucketSpacing / 2) * scale;
                    const y = 596 * scale;

                    return (
                      <div
                        key={index}
                        className="absolute text-white font-bold text-center"
                        style={{
                          left: `${x - (BUCKET_WIDTH * scale) / 2}px`,
                          top: `${y - (BUCKET_HEIGHT * scale) / 2}px`,
                          width: `${BUCKET_WIDTH * scale}px`,
                          height: `${BUCKET_HEIGHT * scale}px`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isMobile ? '10px' : '12px',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          fontWeight: '700',
                          letterSpacing: '0.025em',
                          color: '#ffffff'
                        }}
                      >
                        {multiplier}x
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Table - Below everything on sm/md/lg/xl, right panel on 2xl */}
        <div className="w-full 2xl:w-[400px] 2xl:fixed 2xl:right-0 2xl:top-[60px] 2xl:h-[calc(100vh-60px)] 2xl:border-t 2xl:border-white/10 order-2 mt-8 lg:mt-12 2xl:mt-0">
          {isDemoMode ? (
            <div className="bg-black/5 backdrop-blur-sm p-6 2xl:rounded-none rounded-xl border border-white/10 h-full">
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-white font-bold text-lg">Demo Mode Active</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>You&rsquo;re playing with demo balls!</p>
                  <p>• No real money involved</p>
                  <p>• Same physics and experience</p>
                  <p>• No game history tracked</p>
                </div>
                {isConnected && (
                  <p className="text-xs text-gray-400 mt-4">
                    Turn off demo mode above to play with real ETH
                  </p>
                )}
              </div>
            </div>
          ) : (
            <GameHistoryTable
              gameHistory={gameHistory}
              isLoading={historyLoading}
              height={null}
              ballsLanded={ballsLanded}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PlinkoGame;