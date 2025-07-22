"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { useAccount } from 'wagmi';
import { useAuthSession } from '@/hooks/use-auth-session';
import { useAbstractSession } from '@/hooks/use-abstract-session';
import { usePlinkoPlayRound } from '@/hooks/use-plinko-play-round';
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
  const [isDropping, setIsDropping] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 620 });

  // Plinko play round mutation
  const submitTransactionMutation = usePlinkoPlayRound({
    onSuccess: (data) => {
      console.log('Ball drop transaction successful:', data);
      // Create ball with the outcome from server
      createBallWithOutcome(data);
    },
    onError: (error) => {
      console.error('Ball drop transaction failed:', error);
    },
  });

  // Authentication state
  const { isConnected } = useAccount();
  const { data: authSession } = useAuthSession();
  const { data: session } = useAbstractSession();

  // Check if user is fully authenticated
  const isFullyAuthenticated = isConnected && authSession?.isAuthenticated && session;

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

            // Log for verification (in production, this would validate against server)
            console.log(`Ball ${ballOutcome.ballId} scored: ${ballOutcome.multiplier}x (Target bucket: ${ballOutcome.targetBucket})`);
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
        render: { fillStyle: 'transparent' }
      }),
      Matter.Bodies.rectangle(CANVAS_WIDTH + 25, CANVAS_HEIGHT / 2, 50, CANVAS_HEIGHT, {
        isStatic: true,
        render: { fillStyle: 'transparent' }
      }),
      Matter.Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + 25, CANVAS_WIDTH, 50, {
        isStatic: true,
        render: { fillStyle: 'transparent' }
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
   * Creates a ball with physics and guided outcome
   */
  const createBallWithOutcome = useCallback((outcome: { randomSeed: number; targetBucket: number; multiplier: number; nonce: number }) => {
    if (!engineRef.current) return;

    // Create ball with normal random starting position
    const ball = Matter.Bodies.circle(
      CANVAS_WIDTH / 2 + (Math.random() - 0.5) * (CANVAS_WIDTH * 0.05), // Random starting position
      20, // Start near top
      BALL_RADIUS,
      {
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        density: 0.001,
        render: {
          fillStyle: PRIMARY_COLOR, // Modern blue
          strokeStyle: PRIMARY_DARK, // Darker blue border
          lineWidth: 2
        },
        // Store outcome data for final positioning
        plugin: {
          ballOutcome: outcome
        }
      }
    );

    ballsRef.current.push(ball);
    Matter.World.add(engineRef.current.world, ball);

    // Give ball normal random initial momentum
    Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 2, y: 2 });

    // Monitor ball and teleport to correct bucket at the last moment
    const monitorBall = () => {
      if (!ballsRef.current.includes(ball) || !engineRef.current) return;

      const ballPosition = ball.position;

      // When ball reaches the bucket level, teleport it to the correct bucket
      if (ballPosition.y >= 580) { // Just above bucket level
        const targetBucketX = (CANVAS_WIDTH / 17) * (outcome.targetBucket + 0.5);

        // Teleport ball to correct X position while maintaining Y position and velocity
        Matter.Body.setPosition(ball, {
          x: targetBucketX,
          y: ballPosition.y
        });

        // Ensure ball has downward velocity to hit the bucket
        Matter.Body.setVelocity(ball, { x: 0, y: Math.max(ball.velocity.y, 2) });

        return; // Stop monitoring after teleport
      }

      // Continue monitoring
      if (ballsRef.current.includes(ball)) {
        requestAnimationFrame(monitorBall);
      }
    };

    // Start monitoring immediately
    monitorBall();

    // Remove ball after 15 seconds
    setTimeout(() => {
      const index = ballsRef.current.indexOf(ball);
      if (index > -1) {
        ballsRef.current.splice(index, 1);
        if (engineRef.current) {
          Matter.World.remove(engineRef.current.world, ball);
        }
      }
    }, 15000);
  }, [engineRef, CANVAS_WIDTH]);

  /**
   * Drops a ball by triggering server-controlled randomness and transaction
   */
  const dropBall = useCallback(async () => {
    if (!engineRef.current || isDropping || submitTransactionMutation.isPending) return;

    // Require authentication to drop balls
    if (!isFullyAuthenticated) {
      console.log('Authentication required to drop balls');
      return;
    }

    setIsDropping(true);

    try {
      const betAmount = 0.01; // Default bet amount - can be made configurable

      // Single call to server: generates randomness, signs it, and submits transaction
      await submitTransactionMutation.mutateAsync({
        betAmount
      });

    } catch (error) {
      console.error('Error dropping ball:', error);
    } finally {
      setIsDropping(false);
    }
  }, [engineRef, isDropping, isFullyAuthenticated, submitTransactionMutation.mutateAsync, submitTransactionMutation.isPending]);

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
        {/* Transaction Status */}
        {submitTransactionMutation.isPending && (
          <div className="mb-4 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
            Processing transaction via session key...
          </div>
        )}

        {submitTransactionMutation.isError && submitTransactionMutation.error && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
            Transaction failed: {submitTransactionMutation.error.message}
          </div>
        )}

        {submitTransactionMutation.isSuccess && submitTransactionMutation.data && (
          <div className="mb-4 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
            Transaction successful! Ball dropped. Hash: {submitTransactionMutation.data.hash.slice(0, 10)}...
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