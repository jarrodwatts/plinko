"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Matter from 'matter-js';
import { useAccount } from 'wagmi';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useAbstractSession } from '@/hooks/use-abstract-session';
import { usePlinkoPlayRound } from '@/hooks/use-plinko-play-round';
import { useWalletNonce } from '@/hooks/use-wallet-nonce';
import { PRIMARY_COLOR, PRIMARY_DARK } from '@/lib/colors';

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
  const [dimensions, setDimensions] = useState({ width: 800, height: 620 });

  // Transaction status tracking
  const [transactionStatus, setTransactionStatus] = useState<{
    stage: 'idle' | 'outcome' | 'submitted' | 'confirmed';
    hash?: string;
    receipt?: {
      blockNumber: bigint;
      gasUsed: string;
      status: string;
    };
    error?: string;
  }>({ stage: 'idle' });

  // Plinko play round mutation with streaming callbacks
  const submitTransactionMutation = usePlinkoPlayRound({
    onSuccess: (outcome) => {
      console.log('Ball drop outcome received:', outcome);
      // Create ball immediately with the outcome from server
      createBallWithOutcome(outcome);
      setTransactionStatus({ stage: 'outcome' });
    },
    onTransactionSubmitted: (hash) => {
      console.log('Transaction submitted:', hash);
      setTransactionStatus(prev => ({ ...prev, stage: 'submitted', hash }));
    },
    onTransactionConfirmed: (receipt) => {
      console.log('Transaction confirmed:', receipt);
      setTransactionStatus(prev => ({ ...prev, stage: 'confirmed', receipt }));
    },
    onError: (error) => {
      console.error('Ball drop transaction failed:', error);
      setTransactionStatus({ stage: 'idle', error: error.message });
    },
    onNonceError: () => {
      console.log('🔄 Nonce error detected, resetting wallet nonce...');
      resetNonce();
    },
  });

  // Authentication state
  const { isConnected } = useAccount();
  const { data: authSession } = useAuthSession();
  const { data: session } = useAbstractSession();

  // Wallet nonce management for rapid transactions
  const { currentNonce, getNextNonce, resetNonce, isLoading: nonceLoading, error: nonceError } = useWalletNonce();

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
      const height = Math.max(675, Math.min(maxHeight, width / aspectRatio));
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

        // Identify ball and bucket
        if (bodyA.label?.startsWith('bucket-') && ballsRef.current.includes(bodyB)) {
          ball = bodyB;
          bucket = bodyA;
        } else if (bodyB.label?.startsWith('bucket-') && ballsRef.current.includes(bodyA)) {
          ball = bodyA;
          bucket = bodyB;
        }

        if (ball && bucket) {
          // Use server-validated outcome instead of bucket multiplier
          const ballOutcome = ball.plugin?.ballOutcome;
          if (ballOutcome) {
            // Log the predetermined server outcome
            console.log(`Ball scored: ${ballOutcome.multiplier}x`);

            console.log(`Ball ${ballOutcome.gameId} scored: ${ballOutcome.multiplier}x (Target bucket: ${ballOutcome.targetBucket})`);
          } else {
            // Fallback to bucket multiplier for any balls without outcome data
            const multiplier = parseFloat(bucket.label.split('-')[1]);
            console.log(`Ball scored: ${multiplier}x`);
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
          }
        });
        pegs.push(peg);
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
    };
  }, [BUCKET_WIDTH]); // Only create physics world once

  /**
   * Creates a ball with server-determined outcome using velocity mapping
   */
  const createBallWithOutcome = useCallback((outcome: { randomSeed: number; targetBucket: number; multiplier: number; gameId: string }) => {
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
   * Drops a ball by triggering server-controlled randomness and transaction
   */
  const dropBall = useCallback(async () => {
    if (!engineRef.current) return;

    // Require authentication and wallet nonce to drop balls
    if (!isFullyAuthenticated) {
      console.log('Authentication or wallet nonce not ready');
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
      const betAmount = 0.001; // Default bet amount - can be made configurable

      console.log(`⚡ Dropping ball with wallet nonce: ${walletNonce}`);

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
  }, [engineRef, isFullyAuthenticated, submitTransactionMutation, getNextNonce]);

  // Keyboard controls: spacebar to drop balls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        dropBall();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [dropBall]);

  const isMobile = displayWidth < 500;

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4 md:p-8">
        {/* 3-Stage Transaction Status */}
        {transactionStatus.stage !== 'idle' && (
          <div className="mb-4 space-y-2">
            {/* Stage 1: Outcome received - Ball drops */}
            {transactionStatus.stage === 'outcome' && (
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                🎯 Ball dropped! Submitting transaction...
              </div>
            )}

            {/* Stage 2: Transaction submitted */}
            {transactionStatus.stage === 'submitted' && transactionStatus.hash && (
              <div className="space-y-2">
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  🎯 Ball dropped!
                </div>
                <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                  📡 Transaction submitted: {transactionStatus.hash.slice(0, 10)}...
                  <br />Waiting for blockchain confirmation...
                </div>
              </div>
            )}

            {/* Stage 3: Transaction confirmed */}
            {transactionStatus.stage === 'confirmed' && (
              <div className="space-y-2">
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  🎯 Ball dropped!
                </div>
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  ✅ Transaction confirmed on blockchain!
                  {transactionStatus.hash && (
                    <>
                      <br />Hash: {transactionStatus.hash.slice(0, 10)}...
                    </>
                  )}
                  {transactionStatus.receipt?.blockNumber && (
                    <>
                      <br />Block: {transactionStatus.receipt.blockNumber.toString()}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wallet Nonce Loading Status */}
        {nonceLoading && (
          <div className="mb-4 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
            🔄 Loading wallet nonce...
          </div>
        )}

        {/* Wallet Nonce Error Status */}
        {nonceError && (
          <div className="mb-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
            ⚠️ Wallet nonce error: {nonceError}
            <button 
              onClick={resetNonce}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Error Status */}
        {transactionStatus.error && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
            ❌ Transaction failed: {transactionStatus.error}
          </div>
        )}

        {/* Processing Status */}
        {submitTransactionMutation.isPending && (
          <div className="mb-4 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
            🎲 Generating outcome...
          </div>
        )}

        {/* Game Container */}
        <div className="relative mb-6">
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
  );
};

export default PlinkoGame;