import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, WagmiProvider, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { JUICEBOX_CHAINS } from "../config/juicebox";

const transports = Object.fromEntries(
  JUICEBOX_CHAINS.map((c) => [c.chainId, http(c.rpcUrl)]),
) as Record<number, ReturnType<typeof http>>;

export const juiceboxConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [injected()],
  transports,
});

// Dedicated query client so on-chain reads keep short staleness regardless of
// the app-wide client (which uses staleTime: Infinity).
const wagmiQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 8_000,
    },
  },
});

export function JuiceboxProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={juiceboxConfig}>
      <QueryClientProvider client={wagmiQueryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
