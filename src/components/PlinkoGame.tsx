"use client";

import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

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
  const [score, setScore] = useState(0);
  const [isDropping, setIsDropping] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 620 });

  /**
   * Calculates optimal canvas dimensions based on device type and screen size.
   * Maintains 1:1 aspect ratio for compact game layout.
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
  const PEG_RADIUS = 6; // Smaller pegs for tighter Christmas tree formation
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
            // Score using the predetermined server outcome
            setScore(prev => prev + ballOutcome.multiplier);
            
            // Log for verification (in production, this would validate against server)
            console.log(`Ball ${ballOutcome.ballId} scored: ${ballOutcome.multiplier}x (Target bucket: ${ballOutcome.targetBucket})`);
          } else {
            // Fallback to bucket multiplier for any balls without outcome data
            const multiplier = parseFloat(bucket.label.split('-')[1]);
            setScore(prev => prev + multiplier);
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
        background: '#1a202c', // Professional dark navy background
        showVelocity: false,
        showAngleIndicator: false,
      }
    });
    renderRef.current = render;

    // Invisible boundary walls to contain balls
    const walls = [
      Matter.Bodies.rectangle(-25, CANVAS_HEIGHT / 2, 50, CANVAS_HEIGHT, {
        isStatic: true,
        render: { fillStyle: '#16213e' }
      }),
      Matter.Bodies.rectangle(CANVAS_WIDTH + 25, CANVAS_HEIGHT / 2, 50, CANVAS_HEIGHT, {
        isStatic: true,
        render: { fillStyle: '#16213e' }
      }),
      Matter.Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + 25, CANVAS_WIDTH, 50, {
        isStatic: true,
        render: { fillStyle: '#16213e' }
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
            fillStyle: '#ffffff', // Clean white pegs like Stake
            strokeStyle: '#ffffff', // White border
            lineWidth: 1
          }
        });
        pegs.push(peg);
      }
    }

    // Prize buckets with exponential risk/reward structure
    const buckets: Matter.Body[] = [];
    const bucketCount = 17;
    const multipliers = [2500, 200, 24, 10, 2.4, 1.2, 0.6, 0.3, 0.1, 0.3, 0.6, 1.2, 2.4, 10, 24, 200, 2500]; // Symmetric expansion from center 0.1x
    const bucketSpacing = CANVAS_WIDTH / bucketCount;

    for (let i = 0; i < bucketCount; i++) {
      const x = bucketSpacing * i + bucketSpacing / 2;
      const y = 596; // Last peg at 560 + 36px gap = 596px

      const bucket = Matter.Bodies.rectangle(x, y, BUCKET_WIDTH, BUCKET_HEIGHT, {
        isStatic: true,
        render: {
          fillStyle: (() => {
            // Abstract green theme: VERY small variations of #00d4aa
            const mult = multipliers[i];
            if (mult >= 1000) return '#00c499';    // Slightly darker for extreme edges (2500x)
            if (mult >= 100) return '#00ca9f';     // Tiny bit darker for high payouts (200x)
            if (mult >= 20) return '#00cfa4';      // Very slight darker for good payouts (24x)
            if (mult >= 5) return '#00d2a7';       // Barely darker for decent payouts (10x)
            if (mult >= 2) return '#00d3a8';       // Minimal darker for breaking even (2.4x)
            if (mult >= 1) return '#00d4aa';       // Base Abstract green for small profit (1.2x)
            if (mult >= 0.5) return '#00d5ab';     // Barely lighter for small loss (0.6x)
            if (mult >= 0.2) return '#00d6ac';     // Very slight lighter for bad (0.3x)
            return '#00d7ad';                      // Tiny bit lighter for center (0.1x)
          })(),
          strokeStyle: '#00c499',
          lineWidth: 1
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
  }, []); // Only create physics world once

  /**
   * Creates and drops a new ball with predetermined outcome from server.
   * Ball physics are subtly guided to reach the server-determined bucket.
   */
  const dropBall = async () => {
    if (!engineRef.current || isDropping) return;
    
    setIsDropping(true);
    
    try {
      // Get predetermined outcome from server
      const response = await fetch('/api/drop-ball', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get ball outcome');
      }
      
      const outcome = await response.json();
      
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
            fillStyle: '#00d4aa',
            strokeStyle: '#059669',
            lineWidth: 2
          },
          // Store outcome data for final positioning
          plugin: {
            ballOutcome: {
              ballId: outcome.ballId,
              targetBucket: outcome.targetBucket,
              multiplier: outcome.multiplier,
              randomNumber: outcome.randomNumber
            }
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
      
    } catch (error) {
      console.error('Error dropping ball:', error);
    } finally {
      setIsDropping(false);
    }
  };

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
  }, []);

  const isMobile = displayWidth < 500;

  return (
    <div className={`flex flex-col items-center justify-start min-h-screen ${isMobile ? 'p-1' : 'p-2'}`}
      style={{ backgroundColor: '#1a202c' }}>
      <div className={`${isMobile ? 'mb-1' : 'mb-2'} text-center`}>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-white mb-2`}>Plinko Game</h1>
        <p className={`text-gray-300 ${isMobile ? 'text-sm mb-1' : 'mb-2'}`}>
          {isMobile ? 'Tap to drop a ball' : 'Press SPACEBAR to drop a ball'}
        </p>
        <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-yellow-400`}>
          Score: {score.toFixed(1)}
        </div>
      </div>

      <div className="overflow-hidden relative"
        style={{ width: displayWidth, height: displayHeight }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT
          }}
        />

        {/* Bucket labels positioned exactly over containers */}
        <div className="absolute inset-0 pointer-events-none">
          {[2500, 200, 24, 10, 2.4, 1.2, 0.6, 0.3, 0.1, 0.3, 0.6, 1.2, 2.4, 10, 24, 200, 2500].map((multiplier, index) => {
            const bucketSpacing = CANVAS_WIDTH / 17;
            const x = (bucketSpacing * index + bucketSpacing / 2) * scale;
            const y = 596 * scale; // Match bucket center position

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
                  fontSize: isMobile ? '8px' : '10px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  letterSpacing: '0.025em',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                }}
              >
                {multiplier}x
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${isMobile ? 'mt-1' : 'mt-2'} text-center`}>
        <button
          onClick={dropBall}
          disabled={isDropping}
          className={`${isMobile ? 'px-6 py-3 text-sm' : 'px-8 py-4 text-base'} bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none`}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '0.025em'
          }}
        >
          {isDropping ? 'DROPPING...' : 'DROP BALL'}
        </button>
      </div>
    </div>
  );
};

export default PlinkoGame;