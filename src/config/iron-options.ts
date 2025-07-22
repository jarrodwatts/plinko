// Shared iron options for SIWE authentication.
export const ironOptions = {
    cookieName: "plinko_auth_session",
    password: process.env.IRON_SESSION_PASSWORD!,
    cookieOptions: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax" as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
};