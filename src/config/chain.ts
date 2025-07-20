import { abstractTestnet } from "viem/chains";

export const IS_DEV_ENV = process.env.NODE_ENV === "development";

export const chain = IS_DEV_ENV
    ? abstractTestnet
    // : abstract;
    : abstractTestnet;