import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import type { Principal } from "@dfinity/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import {
  JB_PROJECT_NAMES,
  NATIVE_CURRENCY,
  NATIVE_TOKEN,
  PROJECT_CREATION_FEE,
  juiceboxChainInfo,
} from "../config/juicebox";
import { deploymentForChain } from "../data/juicebox";
import {
  ERC20_ABI,
  JB_CONTROLLER_ABI,
  JB_DIRECTORY_ABI,
  JB_MULTI_ABI,
  JB_PROJECTS_ABI,
  JB_RULESETS_ABI,
  JB_TOKENS_ABI,
} from "../lib/juicebox/abis";
import { useBackendActor } from "./useQueries";

export const DEFAULT_CHAIN_ID = 8453;
export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;
export const EMPTY_BYTES = "0x" as const;

export interface JbRulesetView {
  cycleNumber: bigint;
  id: bigint;
  basedOnId: bigint;
  start: bigint;
  duration: bigint;
  weight: bigint;
  weightCutPercent: bigint;
  approvalHook: Address;
  metadata: bigint;
}

export interface JbRulesetMetadataView {
  reservedPercent: bigint;
  cashOutTaxRate: bigint;
  baseCurrency: bigint;
  pausePay: boolean;
  pauseCreditTransfers: boolean;
  allowOwnerMinting: boolean;
  allowSetCustomToken: boolean;
  allowTerminalMigration: boolean;
  allowSetTerminals: boolean;
  allowSetController: boolean;
  allowAddAccountingContext: boolean;
  allowAddPriceFeed: boolean;
  ownerMustSendPayouts: boolean;
  holdFees: boolean;
  scopeCashOutsToLocalBalances: boolean;
  useDataHookForPay: boolean;
  useDataHookForCashOut: boolean;
  dataHook: Address;
  metadata: bigint;
}

export interface JbAccountingContextView {
  token: Address;
  decimals: number;
  currency: number;
}

export function rulesetView(
  data: unknown,
): { ruleset: JbRulesetView; metadata: JbRulesetMetadataView } | null {
  if (!Array.isArray(data) || data.length < 2) return null;
  const [ruleset, metadata] = data as [JbRulesetView, JbRulesetMetadataView];
  if (!ruleset || !metadata) return null;
  return { ruleset, metadata };
}

// The chain we operate on: the connected chain if it has a Juicebox V6
// deployment, otherwise Base mainnet.
export function useJbChain(): { chainId: number } {
  const { chain } = useAccount();
  const chainId =
    chain?.id !== undefined && deploymentForChain(chain.id)
      ? chain.id
      : DEFAULT_CHAIN_ID;
  return { chainId };
}

export function deploymentAddress(chainId: number, name: string): Address {
  const deployment =
    deploymentForChain(chainId) ?? deploymentForChain(DEFAULT_CHAIN_ID);
  const address = deployment?.contracts[name]?.address;
  if (!address)
    throw new Error(`No deployment address for ${name} on chain ${chainId}`);
  return address as Address;
}

export function useJbConnect() {
  const { connect, connectors, isPending: connectPending } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switchPending } = useSwitchChain();
  const { chainId } = useJbChain();
  const needsSwitch =
    isConnected && chain !== undefined && chain.id !== chainId;
  return {
    connect,
    connectors,
    connectPending,
    address,
    isConnected,
    chain,
    chainId,
    disconnect,
    switchChain,
    switchPending,
    needsSwitch,
  };
}

export function useJbTerminalAddress(projectId: bigint | null): {
  terminal: Address;
  isResolved: boolean;
} {
  const { chainId } = useJbChain();
  const result = useReadContract({
    chainId,
    abi: JB_DIRECTORY_ABI,
    address: deploymentAddress(chainId, "JBDirectory"),
    functionName: "primaryTerminalOf",
    args: projectId === null ? undefined : [projectId, NATIVE_TOKEN],
    query: { enabled: projectId !== null },
  });
  const canonical = deploymentAddress(chainId, "JBMultiTerminal");
  const resolved = result.data as Address | undefined;
  const terminal = resolved && resolved !== ZERO_ADDRESS ? resolved : canonical;
  return { terminal, isResolved: result.isSuccess || !result.isPending };
}

export function useJbProjectState(projectId: bigint | null) {
  const { chainId } = useJbChain();
  const enabled = projectId !== null;
  const args = (projectId === null ? undefined : [projectId]) as
    | readonly [bigint]
    | undefined;

  const ruleset = useReadContract({
    chainId,
    abi: JB_RULESETS_ABI,
    address: deploymentAddress(chainId, "JBRulesets"),
    functionName: "currentRulesetOf",
    args,
    query: { enabled },
  });

  const totalSupply = useReadContract({
    chainId,
    abi: JB_TOKENS_ABI,
    address: deploymentAddress(chainId, "JBTokens"),
    functionName: "totalSupplyOf",
    args,
    query: { enabled },
  });

  const totalCreditSupply = useReadContract({
    chainId,
    abi: JB_TOKENS_ABI,
    address: deploymentAddress(chainId, "JBTokens"),
    functionName: "totalCreditSupplyOf",
    args,
    query: { enabled },
  });

  const owner = useReadContract({
    chainId,
    abi: JB_PROJECTS_ABI,
    address: deploymentAddress(chainId, "JBProjects"),
    functionName: "ownerOf",
    args,
    query: { enabled },
  });

  const tokenUri = useReadContract({
    chainId,
    abi: JB_PROJECTS_ABI,
    address: deploymentAddress(chainId, "JBProjects"),
    functionName: "tokenURI",
    args,
    query: { enabled },
  });

  const surplus = useReadContract({
    chainId,
    abi: JB_MULTI_ABI,
    address: deploymentAddress(chainId, "JBMultiTerminal"),
    functionName: "currentSurplusOf",
    args: projectId === null ? undefined : [projectId, [], 18n, 1n],
    query: { enabled },
  });

  const accountingContexts = useReadContract({
    chainId,
    abi: JB_MULTI_ABI,
    address: deploymentAddress(chainId, "JBMultiTerminal"),
    functionName: "accountingContextsOf",
    args,
    query: { enabled },
  });

  return {
    ruleset: rulesetView(ruleset.data),
    rulesetError: ruleset.error,
    rulesetLoading: ruleset.isLoading,
    totalSupply: totalSupply.data as bigint | undefined,
    totalSupplyLoading: totalSupply.isLoading,
    totalCreditSupply: totalCreditSupply.data as bigint | undefined,
    owner: owner.data as Address | undefined,
    tokenUri: tokenUri.data as string | undefined,
    surplus: surplus.data as bigint | undefined,
    surplusError: surplus.error,
    surplusLoading: surplus.isLoading,
    accountingContexts:
      (accountingContexts.data as JbAccountingContextView[] | undefined) ?? [],
  };
}

function ipfsToHttp(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    const cid = uri.slice("ipfs://".length).replace(/^ipfs\//, "");
    return `https://w3s.link/ipfs/${cid}`;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return null;
}

export function useJbProjectMeta(projectId: bigint | null) {
  const { tokenUri } = useJbProjectState(projectId);
  const localName =
    projectId !== null ? JB_PROJECT_NAMES[Number(projectId)] : undefined;

  const meta = useQuery({
    queryKey: ["jb-project-meta", projectId, tokenUri],
    enabled: projectId !== null && !!tokenUri && ipfsToHttp(tokenUri) !== null,
    staleTime: 60_000,
    queryFn: async () => {
      const url = ipfsToHttp(tokenUri!);
      if (!url) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = (await res.json()) as {
          name?: string;
          description?: string;
        };
        return { name: json.name, description: json.description };
      } catch {
        return null;
      }
    },
  });

  return {
    name: meta.data?.name ?? localName,
    description: meta.data?.description,
    tokenUri: tokenUri ?? null,
    loading: meta.isFetching,
  };
}

export function useJbHolderBalance(
  projectId: bigint | null,
  holder: Address | null,
): bigint | undefined {
  const { chainId } = useJbChain();
  const enabled = projectId !== null && holder !== null;
  const result = useReadContract({
    chainId,
    abi: JB_TOKENS_ABI,
    address: deploymentAddress(chainId, "JBTokens"),
    functionName: "totalBalanceOf",
    args: enabled ? [holder!, projectId!] : undefined,
    query: { enabled },
  });
  return result.data as bigint | undefined;
}

export function useJbAllowance(
  token: Address,
  owner: Address | null,
  spender: Address | null,
): bigint | undefined {
  const enabled = owner !== null && spender !== null;
  const result = useReadContract({
    abi: ERC20_ABI,
    address: token,
    functionName: "allowance",
    args: enabled ? [owner!, spender!] : undefined,
    query: { enabled },
  });
  return result.data as bigint | undefined;
}

export function useJbPayPreview(
  projectId: bigint | null,
  token: Address,
  amountWei: bigint,
  beneficiary: Address | null,
  terminal?: Address,
) {
  const { chainId } = useJbChain();
  const enabled = projectId !== null && amountWei > 0n && beneficiary !== null;
  const result = useReadContract({
    chainId,
    abi: JB_MULTI_ABI,
    address: terminal ?? deploymentAddress(chainId, "JBMultiTerminal"),
    functionName: "previewPayFor",
    args: enabled
      ? [projectId!, token, amountWei, beneficiary!, EMPTY_BYTES]
      : undefined,
    query: { enabled },
  });
  const data = result.data as
    | readonly [unknown, bigint, bigint, unknown[]]
    | undefined;
  return {
    ...result,
    beneficiaryTokenCount: data?.[1],
    reservedTokenCount: data?.[2],
  };
}

export function useJbCashOutPreview(
  projectId: bigint | null,
  cashOutCount: bigint,
  tokenToReclaim: Address,
  holder: Address | null,
  terminal?: Address,
) {
  const { chainId } = useJbChain();
  const enabled = projectId !== null && cashOutCount > 0n && holder !== null;
  const result = useReadContract({
    chainId,
    abi: JB_MULTI_ABI,
    address: terminal ?? deploymentAddress(chainId, "JBMultiTerminal"),
    functionName: "previewCashOutFrom",
    args: enabled
      ? [
          holder!,
          projectId!,
          cashOutCount,
          tokenToReclaim,
          holder!,
          EMPTY_BYTES,
        ]
      : undefined,
    query: { enabled },
  });
  const data = result.data as
    | readonly [unknown, bigint, bigint, unknown[]]
    | undefined;
  return { ...result, reclaimAmount: data?.[1], cashOutTaxRate: data?.[2] };
}

export function useJbPay() {
  return useWriteContract();
}

export function useJbCashOut() {
  return useWriteContract();
}

export function useJbApprove() {
  return useWriteContract();
}

export function useJbTokenInfo(chainId: number) {
  const info =
    juiceboxChainInfo(chainId) ?? juiceboxChainInfo(DEFAULT_CHAIN_ID)!;
  return info;
}

// ── Backend: wallet link + recorded graph projects ─────────────────────────

export function useJbLinkedWallet(): string | null {
  const { actor, isFetching } = useBackendActor();
  const { identity } = useInternetIdentity();
  const result = useQuery({
    queryKey: ["jb-linked-wallet"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getLinkedWallet();
    },
    enabled: !!actor && !!identity && !isFetching,
  });
  return result.data ?? null;
}

export function useJbLinkWallet() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      wallet: string;
      message: string;
      signature: string;
    }) => {
      if (!actor) throw new Error("backend unavailable");
      return actor.linkWallet(args.wallet, args.message, args.signature);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jb-linked-wallet"] });
    },
  });
}

export function useJbUnlinkWallet() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("backend unavailable");
      return actor.unlinkWallet();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jb-linked-wallet"] });
    },
  });
}

export interface JuiceboxProjectRecord {
  publishedGraphId: string;
  projectId: bigint;
  chainId: bigint;
  launchedBy: Principal;
  launchedAt: bigint;
  ownerWallet: string;
}

export function useJbJuiceboxProjects(): JuiceboxProjectRecord[] {
  const { actor, isFetching } = useBackendActor();
  const result = useQuery({
    queryKey: ["jb-projects"],
    queryFn: async () => {
      if (!actor) return [] as JuiceboxProjectRecord[];
      return (await actor.getJuiceboxProjects()) as unknown as JuiceboxProjectRecord[];
    },
    enabled: !!actor && !isFetching,
  });
  return (result.data ?? []) as JuiceboxProjectRecord[];
}

// ── Project launch (JBController.launchProjectFor) ─────────────────────────

export interface LaunchConfig {
  durationSec: number;
  weight: bigint;
  reservedPercent: number;
  cashOutTaxRate: number;
}

export function defaultLaunchConfig(): LaunchConfig {
  return {
    durationSec: 0,
    weight: 1_000_000_000_000_000_000n,
    reservedPercent: 0,
    cashOutTaxRate: 0,
  };
}

export function buildLaunchProjectRequest(
  chainId: number,
  owner: Address,
  projectUri: string,
  cfg: LaunchConfig,
) {
  const terminal = deploymentAddress(chainId, "JBMultiTerminal");
  const args = [
    owner,
    projectUri,
    [
      {
        mustStartAtOrAfter: 0,
        duration: cfg.durationSec,
        weight: cfg.weight,
        weightCutPercent: 0,
        approvalHook: ZERO_ADDRESS,
        metadata: {
          reservedPercent: cfg.reservedPercent,
          cashOutTaxRate: cfg.cashOutTaxRate,
          baseCurrency: 1,
          pausePay: false,
          pauseCreditTransfers: false,
          allowOwnerMinting: false,
          allowSetCustomToken: false,
          allowTerminalMigration: false,
          allowSetTerminals: false,
          allowSetController: false,
          allowAddAccountingContext: false,
          allowAddPriceFeed: false,
          ownerMustSendPayouts: false,
          holdFees: false,
          scopeCashOutsToLocalBalances: false,
          useDataHookForPay: false,
          useDataHookForCashOut: false,
          dataHook: ZERO_ADDRESS,
          metadata: 0,
        },
        splitGroups: [],
        fundAccessLimitGroups: [],
      },
    ],
    [
      {
        terminal,
        accountingContextsToAccept: [
          { token: NATIVE_TOKEN, decimals: 18, currency: NATIVE_CURRENCY },
        ],
      },
    ],
    "",
  ] as const;
  return { terminal, args, value: PROJECT_CREATION_FEE };
}

export function useJbRecordProject() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      graphId: string;
      projectId: bigint;
      chainId: number;
      ownerWallet: string;
    }) => {
      if (!actor) throw new Error("backend unavailable");
      return actor.recordJuiceboxProject(
        args.graphId,
        args.projectId,
        BigInt(args.chainId),
        args.ownerWallet,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jb-projects"] });
    },
  });
}

export function useJbLaunchProject() {
  return useWriteContract();
}

export {
  NATIVE_TOKEN,
  JB_PROJECT_NAMES,
  JB_CONTROLLER_ABI,
  PROJECT_CREATION_FEE,
};
