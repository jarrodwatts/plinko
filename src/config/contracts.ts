import { IS_PRODUCTION } from "./environment";

export const PLINKO_CONTRACT_ADDRESS: `0x${string}` = IS_PRODUCTION
    ? "0x"
    : "0x";

export const PLINKO_CONTRACT_ABI = [];