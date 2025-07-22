import { ABSTRACT_PORTAL_API_URL } from "@/config/api";
import { NextRequest, NextResponse } from "next/server";
import type { AbstractPortalProfile } from "@/lib/portal/get-user-profile";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    try {
        const { address } = await params;

        if (!address) {
            return NextResponse.json(
                { error: "Address parameter is required" },
                { status: 400 }
            );
        }

        const response = await fetch(
            `${ABSTRACT_PORTAL_API_URL}/user/address/${address}`
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to fetch user profile" },
                { status: response.status }
            );
        }

        const data: AbstractPortalProfile = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("User profile fetch error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}