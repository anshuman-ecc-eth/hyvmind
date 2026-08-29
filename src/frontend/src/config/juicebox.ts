// Juicebox V6 chain + token configuration for the Hyvmind Funding tab.
// Token addresses are per-chain (they are NOT portable). Sources:
// - NATIVE_TOKEN sentinel: JBConstants.NATIVE_TOKEN (0x...EEEe)
// - WETH: Bananapus/deploy-all-v6 script/Deploy.s.sol _setupChainAddresses
// - USDC: Bananapus/deploy-all-v6 script/Deploy.s.sol _usdcTokenFor

export const NATIVE_TOKEN =
  "0x000000000000000000000000000000000000EEEe" as const;

// uint32(uint160(NATIVE_TOKEN)) — the accounting-context currency id for native.
export const NATIVE_CURRENCY = 61166;

// JBProjects.createFor creation fee: 0.0001 ETH (deploy-all-v6 PROJECT_CREATION_FEE).
export const PROJECT_CREATION_FEE = 100_000_000_000_000n;

export interface JuiceboxTokenInfo {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
  isNative: boolean;
}

export interface JuiceboxChainInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  nativeSymbol: string;
  tokens: Record<"native" | "usdc", JuiceboxTokenInfo>;
}

export const JUICEBOX_CHAINS: JuiceboxChainInfo[] = [
  {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    nativeSymbol: "ETH",
    tokens: {
      native: {
        symbol: "ETH",
        address: NATIVE_TOKEN,
        decimals: 18,
        isNative: true,
      },
      usdc: {
        symbol: "USDC",
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        isNative: false,
      },
    },
  },
  {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    nativeSymbol: "ETH",
    tokens: {
      native: {
        symbol: "ETH",
        address: NATIVE_TOKEN,
        decimals: 18,
        isNative: true,
      },
      usdc: {
        symbol: "USDC",
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        decimals: 6,
        isNative: false,
      },
    },
  },
];

export function juiceboxChainInfo(
  chainId: number,
): JuiceboxChainInfo | undefined {
  return JUICEBOX_CHAINS.find((c) => c.chainId === chainId);
}

// Canonical revnets / ecosystem projects reserved by deploy-all-v6 (Deploy.s.sol).
// Names are cosmetic (metadata on-chain lives behind tokenURI).
export const JB_PROJECT_NAMES: Record<number, string> = {
  1: "NANA",
  2: "CPN",
  3: "REV",
  4: "BAN",
  5: "DEFIFA",
  6: "ART",
  7: "MARKEE",
};
