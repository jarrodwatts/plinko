import {
    LimitType,
    type SessionConfig,
} from "@abstract-foundation/agw-client/sessions";
import { parseEther, toFunctionSelector } from "viem";
import { PLINKO_CONTRACT_ADDRESS } from "./contracts";

export const DEFAULT_CALL_POLICIES = [
    {
        target: PLINKO_CONTRACT_ADDRESS as `0x${string}`,
        selector: toFunctionSelector("playRound(uint256,uint256,bytes32,bytes)"),
        valueLimit: {
            limitType: LimitType.Lifetime,
            limit: parseEther("100"), // Allow up to 100 ETH total for dropping balls
            period: BigInt(0),
        },
        maxValuePerUse: parseEther("0.1"), // Max 0.1 ETH per ball drop
        constraints: [],
    },
];

export const SESSION_KEY_CONFIG: Omit<SessionConfig, "signer"> = {
    expiresAt: BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30), // 30 days from now
    feeLimit: {
        limitType: LimitType.Lifetime,
        limit: parseEther("1"),
        period: BigInt(0),
    },
    callPolicies: DEFAULT_CALL_POLICIES,
    transferPolicies: [],
};