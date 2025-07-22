import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { AuthSessionData } from "../nonce/route";
import { createPublicClient, http } from "viem";
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

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    // This is for SIWE authentication, not Abstract session keys
    const authSession = await getIronSession<AuthSessionData>(
      await cookies(),
      authSessionOptions
    );

    const publicClient = createPublicClient({
      chain: abstractTestnet,
      transport: http()
    });

    try {
      // Create and verify the SIWE message
      const valid = await publicClient.verifySiweMessage({
        message,
        signature,
        nonce: authSession.nonce,
      });

      // If verification is successful, update the auth state
      if (valid) {
        const siweMessage = new SiweMessage(message);
        authSession.isAuthenticated = true;
        authSession.address = siweMessage.address as `0x${string}`;
        authSession.siweMessage = siweMessage;
        await authSession.save();
      }

      if (!valid) {
        return NextResponse.json(
          { ok: false, message: "Invalid signature." },
          { status: 422 }
        );
      }
    } catch (error) {
      console.error("Error verifying SIWE message:", error);
      return NextResponse.json(
        { ok: false, message: "Error verifying SIWE message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("SIWE verification error:", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}