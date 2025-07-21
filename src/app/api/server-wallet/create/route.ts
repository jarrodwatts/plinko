import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

type ServerWalletResponse = {
  walletId: string;
  address: string;
};

/**
 * Create a new Privy server wallet to use as the signer for session keys.
 * We call this API a single time to generate a Privy server wallet ID and address.
 * We take these values and store them in the environment variables (or a database for example)
 * Docs: https://docs.privy.io/guide/server-wallets/create/
 * @returns {Promise<NextResponse<ServerWalletResponse>>} An object containing the walletId, wallet address.
 */
export async function GET(): Promise<NextResponse<ServerWalletResponse>> {
  if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
    throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set");
  }

  // Initialize Privy client using environment variables
  const privy = new PrivyClient(
    process.env.PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!
  );

  // Create a server wallet using Privy's API
  const { id: walletId, address } = await privy.walletApi.create({
    chainType: "ethereum",
  });

  return NextResponse.json({
    walletId,
    address,
  });
}