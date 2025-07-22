import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseEther, keccak256, encodePacked, parseAbi, type Address } from 'viem';
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

// Plinko multipliers matching the smart contract
const MULTIPLIERS = [
  11000, 4200, 1000, 500, 300, 150, 100, 50, 30, 50, 100, 150, 300, 500, 1000, 4200, 11000
];

// Iron session options - should match other routes
const ironOptions = {
  cookieName: "plinko_auth_session",
  password: process.env.IRON_SESSION_PASSWORD!,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionConfig: rawSessionConfig, betAmount } = body;
    const betAmountWei = parseEther(betAmount.toString());

    // Setup required environment variables
    const { PRIVY_APP_ID: privyAppId, PRIVY_APP_SECRET: privyAppSecret, PRIVY_SERVER_WALLET_ID: serverWalletId, PRIVY_SERVER_WALLET_ADDRESS: serverWalletAddress } = process.env;

    // Get bet amount from request body

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

    // Generate random outcome (server-controlled)
    const randomSeed = Math.floor(Math.random() * 1000000);
    const targetBucket = generatePlinkoOutcome(randomSeed);
    const multiplier = MULTIPLIERS[targetBucket];

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

    // Get session configuration from request
    if (!rawSessionConfig) {
      return NextResponse.json(
        { error: 'Session configuration required' },
        { status: 400 }
      );
    }

    const sessionConfig = deserializeWithBigInt(rawSessionConfig);


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
      abi: parseAbi(["function playRound(uint256,uint256,uint256,bytes) external payable"]),
      functionName: "playRound",
      args: [BigInt(randomSeed), BigInt(multiplier), BigInt(nonce), signature],
      value: betAmountWei,
    });

    console.log('Plinko round transaction submitted:', hash);

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

// Simplified Plinko outcome generation
function generatePlinkoOutcome(seed: number): number {
  let random = seed;
  const rows = 16;
  let position = 8.5;

  for (let row = 0; row < rows; row++) {
    random = (random * 1103515245 + 12345) & 0x7fffffff;
    const direction = (random / 0x7fffffff) > 0.5 ? 1 : -1;
    const movement = direction * (0.3 + (random % 100) / 500);
    position += movement;
  }

  let bucket = Math.floor(position);
  bucket = Math.max(0, Math.min(16, bucket));

  // Add slight bias toward center buckets
  if (Math.random() < 0.1) {
    const centerBias = Math.random() < 0.5 ? -1 : 1;
    bucket = Math.max(0, Math.min(16, bucket + centerBias));
  }

  return bucket;
}