import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { getIronSession } from "iron-session";
import { SiweMessage } from "siwe";

export interface AuthSessionData {
  nonce?: string;
  isAuthenticated?: boolean;
  address?: `0x${string}`;
  siweMessage?: SiweMessage;
}

// Iron session options for SIWE authentication
const authSessionOptions = {
  cookieName: "plinko_auth_session",
  password: process.env.IRON_SESSION_PASSWORD || "complex_password_at_least_32_characters_long",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

/**
 * Sign in with Ethereum - Generate a unique nonce for the SIWE message.
 */
export async function GET() {
  // This is for SIWE authentication, not Abstract session keys
  const authSession = await getIronSession<AuthSessionData>(
    await cookies(),
    authSessionOptions
  );

  // Generate and store the nonce
  const nonce = generateNonce();
  authSession.nonce = nonce;
  await authSession.save();

  // Return the nonce as plain text
  return new NextResponse(nonce);
}