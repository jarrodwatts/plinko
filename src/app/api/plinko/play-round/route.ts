import { NextRequest, NextResponse } from 'next/server';
import { parseEther, keccak256, encodePacked, type Address, type Hex, formatEther } from 'viem';
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

// Error types for structured error handling
type ErrorType = 'INSUFFICIENT_BALANCE' | 'GAS_ESTIMATION_FAILED' | 'NONCE_ERROR' | 'NETWORK_ERROR' | 'CONTRACT_ERROR' | 'SESSION_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';

interface StructuredError {
  type: ErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  suggestions?: string[];
}

// Type guard to check if error has message property
function isErrorWithMessage(error: unknown): error is { message: string; shortMessage?: string } {
  return typeof error === 'object' && error !== null && 'message' in error;
}

// Helper function to categorize and structure errors
function categorizeError(error: unknown): StructuredError {
  const errorMessage = isErrorWithMessage(error) ? error.message.toLowerCase() : '';
  const shortMessage = isErrorWithMessage(error) && error.shortMessage ? error.shortMessage.toLowerCase() : '';
  const combinedMessage = `${errorMessage} ${shortMessage}`;

  // Insufficient balance errors
  if (combinedMessage.includes('insufficient balance') || combinedMessage.includes('insufficient funds')) {
    return {
      type: 'INSUFFICIENT_BALANCE',
      message: isErrorWithMessage(error) ? error.message : 'Insufficient balance',
      userMessage: 'You don\'t have enough ETH to place this bet',
      retryable: false,
      suggestions: ['Add more ETH to your wallet', 'Try a smaller bet amount']
    };
  }

  // Gas estimation errors
  if (combinedMessage.includes('gas') && (combinedMessage.includes('estimation') || combinedMessage.includes('limit'))) {
    return {
      type: 'GAS_ESTIMATION_FAILED',
      message: isErrorWithMessage(error) ? error.message : 'Gas estimation failed',
      userMessage: 'Network is busy. Please try again in a moment',
      retryable: true,
      suggestions: ['Wait a moment and try again', 'Check your network connection']
    };
  }

  // Nonce errors
  if (combinedMessage.includes('nonce') || combinedMessage.includes('replacement transaction underpriced')) {
    return {
      type: 'NONCE_ERROR',
      message: isErrorWithMessage(error) ? error.message : 'Transaction nonce error',
      userMessage: 'Transaction ordering issue detected',
      retryable: true,
      suggestions: ['Please refresh the page', 'Try again after refreshing']
    };
  }

  // Network/connection errors
  if (combinedMessage.includes('network') || combinedMessage.includes('connection') || combinedMessage.includes('timeout')) {
    return {
      type: 'NETWORK_ERROR',
      message: isErrorWithMessage(error) ? error.message : 'Network error',
      userMessage: 'Network connection issue',
      retryable: true,
      suggestions: ['Check your internet connection', 'Try again in a moment']
    };
  }

  // Contract-specific errors
  if (combinedMessage.includes('contract') || combinedMessage.includes('execution reverted')) {
    return {
      type: 'CONTRACT_ERROR',
      message: isErrorWithMessage(error) ? error.message : 'Contract error',
      userMessage: 'Smart contract rejected the transaction',
      retryable: false,
      suggestions: ['Check your bet amount and try again', 'Contact support if this persists']
    };
  }

  // Session/authentication errors
  if (combinedMessage.includes('session') || combinedMessage.includes('unauthorized') || combinedMessage.includes('authentication')) {
    return {
      type: 'SESSION_ERROR',
      message: isErrorWithMessage(error) ? error.message : 'Session error',
      userMessage: 'Your session has expired',
      retryable: false,
      suggestions: ['Please refresh the page and reconnect your wallet']
    };
  }

  // Default to unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: isErrorWithMessage(error) ? error.message : 'Unknown error occurred',
    userMessage: 'Something went wrong. Please try again',
    retryable: true,
    suggestions: ['Try again in a moment', 'Contact support if this persists']
  };
}

export async function POST(request: NextRequest) {
  try {
    // Destructure the request body
    const body = await request.json();
    const { sessionConfig: rawSessionConfig, betAmount, walletNonce } = body;

    // Format items from the request body
    const sessionConfig = deserializeWithBigInt(rawSessionConfig);
    const betAmountWei = parseEther(betAmount.toString());

    // Setup required environment variables
    const { PRIVY_APP_ID: privyAppId, PRIVY_APP_SECRET: privyAppSecret, PRIVY_SERVER_WALLET_ID: serverWalletId, PRIVY_SERVER_WALLET_ADDRESS: serverWalletAddress } = process.env;

    // Get iron session for authentication status and player address
    const { isAuthenticated, address: playerAddress } = await getIronSession<AuthSessionData>(
      await cookies(),
      ironOptions
    );

    if (!isAuthenticated || !playerAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate cryptographically secure random outcome and unique game ID
    const { randomSeed, targetBucket, multiplier } = generateProbabilityBasedOutcome();
    const gameId = randomBytes(32); // Generate unique game ID

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
            // Check player balance before proceeding
            try {
              const balance = await publicClient.getBalance({
                address: playerAddress as `0x${string}`
              });

              if (balance < betAmountWei) {
                const balanceEth = formatEther(balance);
                const betEth = formatEther(betAmountWei);
                throw new Error(`Insufficient balance: ${balanceEth} ETH available, ${betEth} ETH required`);
              }

            } catch (balanceError) {
              throw balanceError;
            }

            // Create message hash for signing (proves randomness authenticity)
            const messageHash = keccak256(
              encodePacked(
                ['address', 'uint256', 'uint256', 'uint256', 'bytes32'],
                [playerAddress as `0x${string}`, betAmountWei, BigInt(randomSeed), BigInt(multiplier), gameIdHex]
              )
            );

            // Initialize Privy client and create server wallet account
            const privy = new PrivyClient(privyAppId!, privyAppSecret!);
            const account = await createViemAccount({
              walletId: serverWalletId!,
              address: serverWalletAddress as Address,
              privy: privy as unknown as Parameters<typeof createViemAccount>[0]['privy'],
            });

            // Sign the message (server signature for contract validation)
            const signature = await account.signMessage({
              message: { raw: messageHash }
            });

            // Initialize the AGW Session client for transaction submission
            const agwSessionClient = createSessionClient({
              account: playerAddress,
              chain: chain,
              signer: account, // Privy server wallet as the signer
              session: sessionConfig,
            });

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

            const hash = await agwSessionClient.writeContract(writeContractParams);

            // Chunk 2: Transaction submitted
            const transactionChunk = {
              type: 'transaction_submitted',
              hash,
              gameId: gameIdHex
            };
            controller.enqueue(encoder.encode(serializeWithBigIntSupport(transactionChunk) + '\n'));

            // Chunk 3: Wait for transaction receipt
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            // Chunk 3: Transaction confirmed
            const confirmationChunk = {
              type: 'transaction_confirmed',
              gameId: gameIdHex,
              receipt: {
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed?.toString(),
                status: receipt.status
              }
            };
            controller.enqueue(encoder.encode(serializeWithBigIntSupport(confirmationChunk) + '\n'));

            clearTimeout(timeout);
            controller.close();
          } catch (error) {
            // Categorize the error for better user experience
            const structuredError = categorizeError(error);

            const errorChunk = {
              type: 'error',
              errorType: structuredError.type,
              message: structuredError.message,
              userMessage: structuredError.userMessage,
              retryable: structuredError.retryable,
              suggestions: structuredError.suggestions
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
    // Categorize the error for better user experience
    const structuredError = categorizeError(error);

    // Return streaming error response
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        const errorChunk = {
          type: 'error',
          errorType: structuredError.type,
          message: structuredError.message,
          userMessage: structuredError.userMessage,
          retryable: structuredError.retryable,
          suggestions: structuredError.suggestions
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