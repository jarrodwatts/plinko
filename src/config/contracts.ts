import { IS_PRODUCTION } from "./environment";

export const PLINKO_CONTRACT_ADDRESS: `0x${string}` = IS_PRODUCTION
    ? "0xC4822AbB9F05646A9Ce44EFa6dDcda0Bf45595AA"
    : "0xC4822AbB9F05646A9Ce44EFa6dDcda0Bf45595AA";

export const PLINKO_CONTRACT_ABI = [];