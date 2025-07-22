import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { AuthSessionData } from "../nonce/route";
import { abstractTestnet } from "viem/chains";

// Iron session options for SIWE authentication - should match nonce route
const authSessionOptions = {
  cookieName: "plinko_auth_session",
  password: process.env.IRON_SESSION_PASSWORD || "complex_password_at_least_32_characters_long",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

/**
 * Sign in with Ethereum - Get the currently authenticated user information.
 * @returns
 */
export async function GET() {
  try {
    // This is for SIWE authentication, not Abstract session keys
    const authSession = await getIronSession<AuthSessionData>(
      await cookies(),
      authSessionOptions
    );

    if (!authSession.isAuthenticated || !authSession.siweMessage) {
      return NextResponse.json(
        { ok: false, message: "No user session found." },
        { status: 401 }
      );
    }

    if (
      authSession.siweMessage.expirationTime &&
      new Date(authSession.siweMessage.expirationTime).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { ok: false, message: "SIWE session expired." },
        { status: 401 }
      );
    }

    if (authSession.siweMessage.chainId !== abstractTestnet.id) {
      return NextResponse.json(
        { ok: false, message: "Invalid chain." },
        { status: 401 }
      );
    }

    // Return the SIWE authentication data
    return NextResponse.json({
      ok: true,
      user: {
        isAuthenticated: authSession.isAuthenticated,
        address: authSession.address,
        siweMessage: authSession.siweMessage,
      },
    });
  } catch (error) {
    console.error("Error getting user:", error);
    return NextResponse.json({ ok: false });
  }
}