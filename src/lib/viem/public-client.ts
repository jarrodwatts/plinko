import { createPublicClient, http } from "viem";
import { publicActionsL2 } from "viem/zksync";
import { chain } from "@/config/chain";

// Global Viem public client instance
export const publicClient = createPublicClient({
    chain: chain,
    transport: http(),
}).extend(publicActionsL2());

export type PublicClientZK = typeof publicClient;