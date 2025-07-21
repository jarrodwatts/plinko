import { abstractTestnet } from "viem/chains";
import { IS_DEVELOPMENT } from "./environment";

export const chain = IS_DEVELOPMENT
    ? abstractTestnet
    // : abstract;
    : abstractTestnet;