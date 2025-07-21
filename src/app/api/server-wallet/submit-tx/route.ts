import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createViemAccount } from "@privy-io/server-auth/viem";
import { parseAbi, type Address } from "viem";
import { abstractTestnet } from "viem/chains";
import { createSessionClient } from "@abstract-foundation/agw-client/sessions";
import { SessionData } from "../../siwe/nonce/route";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

type ServerWalletResponse = {
  hash?: string;
  error?: string;
};

// Iron session options - should match other routes
const ironOptions = {
  cookieName: "plinko_session",
  password: process.env.IRON_SESSION_PASSWORD || "complex_password_at_least_32_characters_long",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

/**
 * Submit a transaction from a session key using the Privy server wallet as the signer.
 * Docs: https://docs.privy.io/guide/server-wallets/usage/ethereum#viem
 * @returns {Promise<NextResponse<ServerWalletResponse>>} An object containing the transaction hash or error.
 */
export async function POST(
  request: Request
): Promise<NextResponse<ServerWalletResponse>> {
  try {
    if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET || !process.env.PRIVY_SERVER_WALLET_ID) {
      throw new Error("Required Privy environment variables must be set");
    }

    // Session here is not related to our session keys.
    // This is just related to auth / sign in with Ethereum.
    // We implement SIWE auth to get the AGW on the server side.
    const session = await getIronSession<SessionData>(
      await cookies(),
      ironOptions
    );
    
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!session.address) {
      return NextResponse.json({ error: "No address found" }, { status: 401 });
    }

    // Get request body
    const { sessionConfig, contractAddress, contractAbi, functionName, args, value } = await request.json();

    // Initialize Privy client using environment variables
    const privy = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    );

    // Create a viem account instance for the server wallet
    const account = await createViemAccount({
      walletId: process.env.PRIVY_SERVER_WALLET_ID!,
      address: process.env.PRIVY_SERVER_WALLET_ADDRESS as Address,
      privy,
    });

    // Initialize the AGW Session client to send transactions from the server wallet using the session key
    const agwSessionClient = createSessionClient({
      account: session.address, // The AGW wallet address to send the transaction from
      chain: abstractTestnet,
      signer: account, // The Privy server wallet as the signer
      session: sessionConfig, // The session configuration
    });

    // Submit the transaction
    const hash = await agwSessionClient.writeContract({
      account: session.address, // The AGW wallet address to send the transaction from
      chain: abstractTestnet,
      address: contractAddress,
      abi: parseAbi(contractAbi),
      functionName,
      args,
      value: value ? BigInt(value) : undefined,
    });

    return NextResponse.json({
      hash,
    });
  } catch (error) {
    console.error("Error submitting transaction:", error);
    return NextResponse.json(
      { error: "Failed to submit transaction" },
      { status: 500 }
    );
  }
}