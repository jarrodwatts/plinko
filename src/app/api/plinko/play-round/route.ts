import { NextRequest, NextResponse } from 'next/server';
import { parseEther, keccak256, encodePacked, type Address } from 'viem';
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
import { randomBytes } from 'crypto';
import { ironOptions } from '@/config/iron-options';
import { CONTAINER_PROBABILITIES, PRECISION } from '@/config/probabilities';

export async function POST(request: NextRequest) {
  try {
    // Destructure the request body
    const body = await request.json();
    const { sessionConfig: rawSessionConfig, betAmount } = body;

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

    console.log('isAuthenticated', isAuthenticated);
    console.log('playerAddress', playerAddress);

    if (!isAuthenticated || !playerAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get player's current nonce
    const nonce = await publicClient.readContract({
      address: PLINKO_CONTRACT_ADDRESS,
      abi: PLINKO_CONTRACT_ABI,
      functionName: 'getPlayerNonce',
      args: [playerAddress as `0x${string}`]
    });

    // Generate cryptographically secure random outcome
    const { randomSeed, targetBucket, multiplier } = generateProbabilityBasedOutcome();

    // Create message hash for signing (proves randomness authenticity)
    const messageHash = keccak256(
      encodePacked(
        ['address', 'uint256', 'uint256', 'uint256', 'uint256'],
        [playerAddress as `0x${string}`, betAmountWei, BigInt(randomSeed), BigInt(multiplier), BigInt(nonce)]
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

    // Submit the transaction with signed randomness
    const hash = await agwSessionClient.writeContract({
      account: playerAddress,
      chain: chain,
      address: PLINKO_CONTRACT_ADDRESS,
      abi: PLINKO_CONTRACT_ABI,
      functionName: "playRound",
      args: [BigInt(randomSeed), BigInt(multiplier), BigInt(nonce), signature],
      value: betAmountWei,
    });

    console.log('Plinko round transaction submitted:', hash);

    console.log('Should land in multiplier', multiplier / 100, 'x');

    return NextResponse.json({
      hash,
      randomSeed,
      multiplier,
      targetBucket,
      nonce: Number(nonce)
    });

  } catch (error) {
    console.error('Plinko play round error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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