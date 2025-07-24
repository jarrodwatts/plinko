import { NextRequest, NextResponse } from 'next/server';
import { parseEther, keccak256, encodePacked, type Address, type Hex } from 'viem';
import { PrivyClient } from '@privy-io/server-auth';
import { createViemAccount } from '@privy-io/server-auth/viem';
import { createSessionClient } from '@abstract-foundation/agw-client/sessions';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { AuthSessionData } from '../../siwe/nonce/route';
import { chain } from '@/config/chain';
import { PLINKO_CONTRACT_ADDRESS, PLINKO_CONTRACT_ABI } from '@/config/contracts';
import { publicClient } from '@/lib/viem/public-client';
import { deserializeWithBigInt } from '@/lib/session-keys/session-storage';

// Helper function to serialize objects with BigInt support
function serializeWithBigIntSupport(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === "bigint") {
      return `__bigint__${value.toString()}`;
    }
    return value;
  });
}
import { randomBytes } from 'crypto';
import { ironOptions } from '@/config/iron-options';
import { CONTAINER_PROBABILITIES, PRECISION } from '@/config/probabilities';

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  let stepTime = startTime;
  
  const logStep = (stepName: string) => {
    const now = performance.now();
    const stepDuration = now - stepTime;
    const totalDuration = now - startTime;
    console.log(`⏱️  [${stepName}] ${stepDuration.toFixed(2)}ms (Total: ${totalDuration.toFixed(2)}ms)`);
    stepTime = now;
  };

  try {
    // Destructure the request body
    const body = await request.json();
    const { sessionConfig: rawSessionConfig, betAmount, walletNonce } = body;
    logStep('Parse request body');


    // Format items from the request body
    const sessionConfig = deserializeWithBigInt(rawSessionConfig);
    const betAmountWei = parseEther(betAmount.toString());
    logStep('Format request data');

    // Setup required environment variables
    const { PRIVY_APP_ID: privyAppId, PRIVY_APP_SECRET: privyAppSecret, PRIVY_SERVER_WALLET_ID: serverWalletId, PRIVY_SERVER_WALLET_ADDRESS: serverWalletAddress } = process.env;
    logStep('Setup environment variables');

    // Get iron session for authentication status and player address
    const { isAuthenticated, address: playerAddress } = await getIronSession<AuthSessionData>(
      await cookies(),
      ironOptions
    );
    logStep('Get iron session');

    console.log('isAuthenticated', isAuthenticated);
    console.log('playerAddress', playerAddress);

    if (!isAuthenticated || !playerAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate cryptographically secure random outcome and unique game ID
    const { randomSeed, targetBucket, multiplier } = generateProbabilityBasedOutcome();
    const gameId = randomBytes(32); // Generate unique game ID
    logStep('Generate random outcome and game ID');

    // Create streaming response immediately - send outcome first!
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Chunk 1: Send outcome immediately for instant ball drop
        const gameIdHex = `0x${gameId.toString('hex')}` as Hex;
        const outcomeChunk = {
          type: 'outcome',
          randomSeed,
          multiplier,
          targetBucket,
          gameId: gameIdHex
        };
        controller.enqueue(encoder.encode(serializeWithBigIntSupport(outcomeChunk) + '\n'));
        console.log(`🚀 Chunk 1: Outcome sent immediately with gameId ${outcomeChunk.gameId}`);

        // Set up timeout to prevent hanging streams (30 seconds)
        const timeout = setTimeout(() => {
          const timeoutChunk = {
            type: 'error',
            message: 'Transaction timeout - please try again'
          };
          controller.enqueue(encoder.encode(serializeWithBigIntSupport(timeoutChunk) + '\n'));
          controller.close();
        }, 30000);

        // Now do all the slow blockchain operations in background
        (async () => {
          try {
            // No nonce validation needed - gameId prevents replay attacks
            console.log(`✅ Using gameId: ${gameIdHex} for replay protection`);

            // Create message hash for signing (proves randomness authenticity)
            const messageHash = keccak256(
              encodePacked(
                ['address', 'uint256', 'uint256', 'uint256', 'bytes32'],
                [playerAddress as `0x${string}`, betAmountWei, BigInt(randomSeed), BigInt(multiplier), gameIdHex]
              )
            );
            logStep('Create message hash');

            // Initialize Privy client and create server wallet account
            const privy = new PrivyClient(privyAppId!, privyAppSecret!);
            const account = await createViemAccount({
              walletId: serverWalletId!,
              address: serverWalletAddress as Address,
              privy: privy as unknown as Parameters<typeof createViemAccount>[0]['privy'],
            });
            logStep('🔴 INITIALIZE PRIVY + SERVER WALLET');

            // Sign the message (server signature for contract validation)
            const signature = await account.signMessage({
              message: { raw: messageHash }
            });
            logStep('🔴 SIGN MESSAGE WITH SERVER WALLET');

            // Initialize the AGW Session client for transaction submission
            const agwSessionClient = createSessionClient({
              account: playerAddress,
              chain: chain,
              signer: account, // Privy server wallet as the signer
              session: sessionConfig,
            });
            logStep('🔴 CREATE AGW SESSION CLIENT');

            // Chunk 2: Submit transaction with explicit nonce if provided
            const writeContractParams = {
              account: playerAddress,
              chain: chain,
              address: PLINKO_CONTRACT_ADDRESS,
              abi: PLINKO_CONTRACT_ABI,
              functionName: "playRound" as const,
              args: [BigInt(randomSeed), BigInt(multiplier), gameIdHex, signature] as const,
              value: betAmountWei,
              ...(typeof walletNonce === 'number' && { nonce: walletNonce }),
            };
            
            if (typeof walletNonce === 'number') {
              console.log(`🎯 Using explicit wallet nonce: ${walletNonce}`);
            } else {
              console.log('🎯 Using auto-nonce (fallback)');
            }
            
            const hash = await agwSessionClient.writeContract(writeContractParams);
            logStep('🔴 SUBMIT TRANSACTION TO BLOCKCHAIN');
            
            // Chunk 2: Transaction submitted
            const transactionChunk = {
              type: 'transaction_submitted',
              hash
            };
            controller.enqueue(encoder.encode(serializeWithBigIntSupport(transactionChunk) + '\n'));
            console.log('🚀 Chunk 2: Transaction hash sent');
            console.log('Plinko round transaction submitted:', hash);
            console.log('Should land in multiplier', multiplier / 100, 'x');

            // Chunk 3: Wait for transaction receipt
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            logStep('🔴 TRANSACTION CONFIRMED ON BLOCKCHAIN');
            
            // Chunk 3: Transaction confirmed
            const confirmationChunk = {
              type: 'transaction_confirmed',
              receipt: {
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed?.toString(),
                status: receipt.status
              }
            };
            controller.enqueue(encoder.encode(serializeWithBigIntSupport(confirmationChunk) + '\n'));
            console.log('🚀 Chunk 3: Transaction confirmation sent');
            
            const totalTime = performance.now() - startTime;
            console.log(`🎯 TOTAL REQUEST TIME: ${totalTime.toFixed(2)}ms`);
            
            clearTimeout(timeout);
            controller.close();
          } catch (error) {
            console.error('Transaction error:', error);
            
            const errorChunk = {
              type: 'error',
              message: error instanceof Error ? error.message : 'Transaction failed'
            };
            controller.enqueue(encoder.encode(serializeWithBigIntSupport(errorChunk) + '\n'));
            clearTimeout(timeout);
            controller.close();
          }
        })();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Plinko play round error:', error);
    
    // Return streaming error response
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        const errorChunk = {
          type: 'error',
          message: error instanceof Error ? error.message : 'Internal server error'
        };
        controller.enqueue(encoder.encode(serializeWithBigIntSupport(errorChunk) + '\n'));
        controller.close();
      }
    });

    return new Response(errorStream, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}

// Pre-compute the inclusive upper bound for each bucket so we can binary-search instead of scanning
const BUCKET_ENDS = CONTAINER_PROBABILITIES.map(c => c.range[1]);

/**
 * Binary search helper – returns the index of the first BUCKET_END >= value.
 * All arrays are tiny (17 entries) but this is O(log n) and conceptually clearer.
 */
function bucketIndexFor(value: number): number {
  let left = 0;
  let right = BUCKET_ENDS.length - 1;

  while (left < right) {
    const mid = (left + right) >>> 1; // unsigned shift for fast floor(div 2)
    if (value <= BUCKET_ENDS[mid]) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  return left;
}

// Generate cryptographically secure random outcome based on probability matrix
function generateProbabilityBasedOutcome(): { randomSeed: number; targetBucket: number; multiplier: number } {
  // Generate cryptographically secure random bytes
  const randomBuffer = randomBytes(4);
  const randomSeed = randomBuffer.readUInt32BE(0);

  // Convert to 0-PRECISION range for probability mapping
  const probabilityRoll = randomSeed % PRECISION;

  // Find the container using binary search over the bucket ends
  const index = bucketIndexFor(probabilityRoll);
  const container = CONTAINER_PROBABILITIES[index];

  return {
    randomSeed,
    targetBucket: index,
    multiplier: container.multiplier
  };
}