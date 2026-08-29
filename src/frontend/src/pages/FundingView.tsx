import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useEffect, useMemo, useState } from "react";
import {
  type Address,
  type GetTransactionReceiptReturnType,
  formatUnits,
  parseEventLogs,
  parseUnits,
} from "viem";
import { usePublicClient, useSignMessage } from "wagmi";
import { JB_PROJECT_NAMES, NATIVE_TOKEN } from "../config/juicebox";
import {
  type LaunchConfig,
  ZERO_ADDRESS,
  buildLaunchProjectRequest,
  defaultLaunchConfig,
  deploymentAddress,
  rulesetView,
  useJbAllowance,
  useJbApprove,
  useJbCashOut,
  useJbCashOutPreview,
  useJbConnect,
  useJbHolderBalance,
  useJbJuiceboxProjects,
  useJbLaunchProject,
  useJbLinkWallet,
  useJbLinkedWallet,
  useJbPay,
  useJbPayPreview,
  useJbProjectMeta,
  useJbProjectState,
  useJbRecordProject,
  useJbTerminalAddress,
  useJbTokenInfo,
  useJbUnlinkWallet,
} from "../hooks/useJuicebox";
import { usePublishedGraphMetas } from "../hooks/usePublicGraphs";
import {
  ERC20_ABI,
  JB_CONTROLLER_ABI,
  JB_MULTI_ABI,
  JB_PROJECTS_ABI,
} from "../lib/juicebox/abis";

function fmt(value: bigint | undefined, decimals: number, digits = 4): string {
  if (value === undefined) return "—";
  const formatted = formatUnits(value, decimals);
  const [int, frac] = formatted.split(".");
  if (!frac) return int;
  const trimmed = frac.slice(0, digits).replace(/0+$/, "");
  return trimmed ? `${int}.${trimmed}` : int;
}

function shortAddr(addr: string): string {
  if (!addr || addr === ZERO_ADDRESS) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function useTxConfirmed(hash: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<
    "pending" | "confirmed" | "failed" | undefined
  >();
  const [receipt, setReceipt] = useState<
    GetTransactionReceiptReturnType | undefined
  >();
  useEffect(() => {
    if (!hash || !publicClient) return;
    let cancelled = false;
    setStatus("pending");
    setReceipt(undefined);
    publicClient
      .waitForTransactionReceipt({ hash })
      .then((r) => {
        if (cancelled) return;
        setReceipt(r);
        setStatus(r.status === "success" ? "confirmed" : "failed");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [hash, publicClient]);
  return { status, receipt };
}

const EXPLORER = "https://basescan.org/tx/";

export function FundingView() {
  const jb = useJbConnect();
  const info = useJbTokenInfo(jb.chainId);
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toText();

  const [projectIdInput, setProjectIdInput] = useState("3");
  const [payToken, setPayToken] = useState<"native" | "usdc">("native");
  const [reclaimToken, setReclaimToken] = useState<"native" | "usdc">("native");
  const [payAmount, setPayAmount] = useState("0.1");
  const [cashOutCount, setCashOutCount] = useState("");

  const projectId = useMemo(() => {
    const n = Number(projectIdInput.trim());
    return Number.isInteger(n) && n > 0 ? BigInt(n) : null;
  }, [projectIdInput]);

  const state = useJbProjectState(projectId);
  const meta = useJbProjectMeta(projectId);
  const { terminal } = useJbTerminalAddress(projectId);

  const payTokenInfo =
    payToken === "native" ? info.tokens.native : info.tokens.usdc;
  const reclaimTokenInfo =
    reclaimToken === "native" ? info.tokens.native : info.tokens.usdc;

  const payAmountWei = useMemo(() => {
    try {
      return payAmount.trim()
        ? parseUnits(payAmount.trim(), payTokenInfo.decimals)
        : 0n;
    } catch {
      return 0n;
    }
  }, [payAmount, payTokenInfo.decimals]);

  const cashOutCountWei = useMemo(() => {
    try {
      return cashOutCount.trim() ? parseUnits(cashOutCount.trim(), 18) : 0n;
    } catch {
      return 0n;
    }
  }, [cashOutCount]);

  const holderBalance = useJbHolderBalance(projectId, jb.address ?? null);
  const allowance = useJbAllowance(
    payTokenInfo.address,
    jb.address ?? null,
    terminal,
  );
  const needsApproval =
    payToken === "usdc" &&
    payAmountWei > 0n &&
    allowance !== undefined &&
    allowance < payAmountWei;

  const payPreview = useJbPayPreview(
    projectId,
    payTokenInfo.address,
    payAmountWei,
    jb.address ?? null,
    terminal,
  );
  const cashOutPreview = useJbCashOutPreview(
    projectId,
    cashOutCountWei,
    reclaimTokenInfo.address,
    jb.address ?? null,
    terminal,
  );

  const pay = useJbPay();
  const approve = useJbApprove();
  const cashOut = useJbCashOut();
  const { status: payTxStatus } = useTxConfirmed(pay.data);
  const { status: approveTxStatus } = useTxConfirmed(approve.data);
  const { status: cashOutTxStatus } = useTxConfirmed(cashOut.data);

  // ── Wallet link + graph projects ───────────────────────────────────────
  const linkedWallet = useJbLinkedWallet();
  const linked = linkedWallet !== null && linkedWallet !== undefined;
  const linkMutation = useJbLinkWallet();
  const unlinkMutation = useJbUnlinkWallet();
  const { signMessageAsync } = useSignMessage();
  const jbProjects = useJbJuiceboxProjects();
  const publishedGraphs = usePublishedGraphMetas().data ?? [];
  const myGraphs = useMemo(
    () =>
      publishedGraphs.filter(
        (g) => principal && g.creator.toText() === principal,
      ),
    [publishedGraphs, principal],
  );
  const projectByGraph = useMemo(() => {
    const m = new Map<string, (typeof jbProjects)[number]>();
    for (const p of jbProjects) m.set(p.publishedGraphId, p);
    return m;
  }, [jbProjects]);

  const [linkError, setLinkError] = useState<string | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [launchTarget, setLaunchTarget] = useState<{
    graphId: string;
    graphName: string;
  } | null>(null);
  const [launchCfg, setLaunchCfg] = useState<LaunchConfig>(defaultLaunchConfig);
  const launch = useJbLaunchProject();
  const recordProject = useJbRecordProject();
  const { status: launchTxStatus, receipt: launchReceipt } = useTxConfirmed(
    launch.data,
  );

  const canLink =
    !!principal && !!jb.address && !linked && !linkMutation.isPending;

  function handleLink() {
    if (!principal || !jb.address) return;
    setLinkError(null);
    const nonce = crypto.randomUUID();
    const message = `Hyvmind wallet link\nPrincipal: ${principal}\nNonce: ${nonce}`;
    signMessageAsync({ message })
      .then((signature) =>
        linkMutation.mutateAsync({
          wallet: jb.address!.toLowerCase(),
          message,
          signature,
        }),
      )
      .then((res) => {
        if (res.__kind__ === "err") {
          setLinkError(`Link rejected by backend: ${res.err}`);
        } else {
          setLinkError(null);
        }
      })
      .catch((err: Error) => setLinkError(err.message ?? "Link failed"));
  }

  // On launch confirmation, decode the new projectId from the Create event and
  // record the graph -> project mapping on the backend (best-effort).
  useEffect(() => {
    if (launchTxStatus !== "confirmed" || !launchReceipt || !launchTarget)
      return;
    const events = parseEventLogs({
      abi: JB_PROJECTS_ABI,
      logs: launchReceipt.logs,
      eventName: "Create",
    });
    const projectId = events[0]?.args.projectId;
    if (projectId === undefined) return;
    recordProject.mutate({
      graphId: launchTarget.graphId,
      projectId,
      chainId: jb.chainId,
      ownerWallet: jb.address?.toLowerCase() ?? "",
    });
  }, [
    launchTxStatus,
    launchReceipt,
    launchTarget,
    recordProject,
    jb.chainId,
    jb.address,
  ]);

  function handleLaunch(graphId: string, graphName: string) {
    setLaunchTarget({ graphId, graphName });
    setLaunchCfg(defaultLaunchConfig());
  }

  // Switch the wallet onto the Juicebox chain (Base) before any write. wagmi's
  // switchChain resolves only after the wallet emits chainChanged for the target
  // chain, so `jb.chain` is guaranteed to be Base on success.
  async function ensureChain(): Promise<boolean> {
    if (!jb.isConnected) return false;
    if (!jb.needsSwitch) return true;
    try {
      setChainError(null);
      await jb.switchChain({ chainId: jb.chainId });
      return true;
    } catch {
      setChainError(`Could not switch wallet to ${info.name}.`);
      return false;
    }
  }

  async function handleLaunchSubmit() {
    if (!launchTarget || !jb.address) return;
    if (!(await ensureChain())) return;
    const { args, value } = buildLaunchProjectRequest(
      jb.chainId,
      jb.address,
      `hyvmind://graph/${launchTarget.graphId}`,
      launchCfg,
    );
    launch.writeContract({
      chainId: jb.chainId,
      address: deploymentAddress(jb.chainId, "JBController"),
      abi: JB_CONTROLLER_ABI,
      functionName: "launchProjectFor",
      args,
      value,
    });
  }

  const ruleset = state.ruleset;

  function handleConnect() {
    const connector = jb.connectors[0];
    if (connector) jb.connect({ connector });
  }

  function handleSwitchChain() {
    jb.switchChain({ chainId: jb.chainId });
  }

  async function handleApprove() {
    if (!(await ensureChain())) return;
    approve.writeContract({
      chainId: jb.chainId,
      abi: ERC20_ABI,
      address: payTokenInfo.address,
      functionName: "approve",
      args: [terminal, payAmountWei],
    });
  }

  async function handlePay() {
    if (!projectId || !jb.address) return;
    if (!(await ensureChain())) return;
    const isNative = payTokenInfo.isNative;
    pay.writeContract({
      chainId: jb.chainId,
      address: terminal,
      abi: JB_MULTI_ABI,
      functionName: "pay",
      args: isNative
        ? [projectId, NATIVE_TOKEN, 0n, jb.address, 0n, "", "0x"]
        : [
            projectId,
            payTokenInfo.address,
            payAmountWei,
            jb.address,
            0n,
            "",
            "0x",
          ],
      value: isNative ? payAmountWei : undefined,
    });
  }

  async function handleCashOut() {
    if (!projectId || !jb.address) return;
    if (!(await ensureChain())) return;
    cashOut.writeContract({
      chainId: jb.chainId,
      address: terminal,
      abi: JB_MULTI_ABI,
      functionName: "cashOutTokensOf",
      args: [
        jb.address,
        projectId,
        cashOutCountWei,
        reclaimTokenInfo.address,
        0n,
        jb.address,
        "0x",
      ],
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 h-11 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-medium">Funding</span>
        <span className="text-xs text-muted-foreground">
          Juicebox V6 · {info.name}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {jb.isConnected ? (
            <>
              <span className="font-mono text-xs text-muted-foreground">
                {shortAddr(jb.address ?? "")}
              </span>
              {jb.needsSwitch && (
                <button
                  type="button"
                  onClick={handleSwitchChain}
                  className="text-xs bg-muted/80 px-2 py-1 rounded hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {jb.switchPending ? "Switching…" : `Switch to ${info.name}`}
                </button>
              )}
              <button
                type="button"
                onClick={() => jb.disconnect()}
                className="text-xs bg-muted/80 px-2 py-1 rounded hover:text-foreground transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="text-xs bg-muted/80 px-2 py-1 rounded hover:text-foreground transition-colors disabled:opacity-50"
              disabled={jb.connectPending}
            >
              {jb.connectPending ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>

      {chainError && (
        <div className="px-4 py-2 border-b border-dashed border-border bg-muted/30 text-xs text-red-400">
          {chainError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {/* Wallet <-> principal link */}
          {principal && (
            <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
              <div className="text-sm font-medium">Wallet link</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  Principal: <span className="font-mono">{principal}</span>
                </div>
                <div>
                  Wallet:{" "}
                  <span className="font-mono">
                    {jb.isConnected
                      ? shortAddr(jb.address ?? "")
                      : "not connected"}
                  </span>
                </div>
              </div>
              {linked ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400">
                    Linked to {shortAddr(linkedWallet ?? "")}
                  </span>
                  <button
                    type="button"
                    onClick={() => unlinkMutation.mutate()}
                    disabled={unlinkMutation.isPending}
                    className="text-xs bg-muted/80 px-2 py-1 rounded hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Unlink
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleLink}
                    disabled={!canLink || linkMutation.isPending}
                    className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {linkMutation.isPending
                      ? "Signing & linking…"
                      : "Link wallet to principal"}
                  </button>
                  {linkError && (
                    <div className="text-xs text-red-400">{linkError}</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Your published graphs -> Juicebox projects */}
          <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
            <div className="text-sm font-medium">Your curations</div>
            {!principal ? (
              <div className="text-xs text-muted-foreground">
                Log in with Internet Identity to launch funding projects for
                your published graphs.
              </div>
            ) : myGraphs.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                You haven't published any graphs yet. Publish a graph from the
                Graphs tab, then return here to launch its Juicebox funding
                project.
              </div>
            ) : (
              <div className="space-y-2">
                {myGraphs.map((g) => {
                  const project = projectByGraph.get(g.id);
                  return (
                    <div
                      key={g.id}
                      className="flex items-center gap-2 border border-dashed border-border rounded px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs truncate">{g.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {g.nodeCount} nodes · {g.id}
                        </div>
                      </div>
                      {project ? (
                        <a
                          href={`https://juicebox.money/v2/p/${project.chainId.toString()}/${project.projectId.toString()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-green-400 underline"
                        >
                          Project #{project.projectId.toString()}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLaunch(g.id, g.name)}
                          disabled={
                            !jb.isConnected || !linked || launchTarget !== null
                          }
                          className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                        >
                          {!jb.isConnected
                            ? "Connect wallet"
                            : !linked
                              ? "Link wallet"
                              : "Create project"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Explore any project */}
          <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <label
                className="text-xs text-muted-foreground"
                htmlFor="jb-project"
              >
                Project
              </label>
              <input
                id="jb-project"
                value={projectIdInput}
                onChange={(e) => setProjectIdInput(e.target.value)}
                placeholder="project id"
                className="font-mono text-xs bg-background border border-border px-2 py-1 rounded w-24"
              />
              <div className="flex items-center gap-1">
                {Object.entries(JB_PROJECT_NAMES).map(([id, name]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setProjectIdInput(id)}
                    className={`text-[11px] px-2 py-1 rounded border transition-colors ${
                      projectIdInput === id
                        ? "bg-accent text-accent-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {projectId !== null && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-1">Name</div>
                  <div className="font-mono">
                    {meta.name ?? `Project #${projectId.toString()}`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Owner</div>
                  <div className="font-mono">
                    {shortAddr(state.owner ?? ZERO_ADDRESS)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Total supply</div>
                  <div className="font-mono">{fmt(state.totalSupply, 18)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">
                    Surplus (ETH)
                  </div>
                  <div className="font-mono">
                    {state.surplusLoading
                      ? "…"
                      : state.surplusError
                        ? "—"
                        : fmt(state.surplus, 18)}
                  </div>
                </div>
              </div>
            )}

            {ruleset && (
              <div className="space-y-1 text-xs border-t border-dashed border-border pt-3">
                <div className="text-muted-foreground mb-1">
                  Ruleset #{ruleset.ruleset.id.toString()} · cycle{" "}
                  {ruleset.ruleset.cycleNumber.toString()}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
                  <div>
                    <span className="text-muted-foreground">duration: </span>
                    {ruleset.ruleset.duration.toString()}s
                  </div>
                  <div>
                    <span className="text-muted-foreground">weight: </span>
                    {fmt(ruleset.ruleset.weight, 18)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">reserved: </span>
                    {(Number(ruleset.metadata.reservedPercent) / 100).toFixed(
                      1,
                    )}
                    %
                  </div>
                  <div>
                    <span className="text-muted-foreground">tax rate: </span>
                    {(Number(ruleset.metadata.cashOutTaxRate) / 100).toFixed(1)}
                    %
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-muted-foreground">
                  <div>
                    {ruleset.metadata.pausePay
                      ? "⚠ payments paused"
                      : "payments open"}
                  </div>
                  <div>
                    {ruleset.metadata.holdFees ? "hold fees" : "no hold fees"}
                  </div>
                  <div>
                    {ruleset.metadata.useDataHookForPay ||
                    ruleset.metadata.useDataHookForCashOut ? (
                      <span className="text-amber-300">
                        ⚠ data hook {shortAddr(ruleset.metadata.dataHook)}
                      </span>
                    ) : (
                      "no data hook"
                    )}
                  </div>
                </div>
              </div>
            )}

            {state.accountingContexts.length > 0 && (
              <div className="text-xs border-t border-dashed border-border pt-3">
                <span className="text-muted-foreground">accepted tokens: </span>
                <span className="font-mono">
                  {state.accountingContexts
                    .map((c) =>
                      c.token === NATIVE_TOKEN ? "ETH" : shortAddr(c.token),
                    )
                    .join(", ")}
                </span>
              </div>
            )}
          </div>

          {!jb.isConnected ? (
            <div className="rounded-lg border border-border bg-muted/30 p-8 text-center space-y-3">
              <div className="text-sm">
                Connect a wallet to pay into projects or cash out tokens.
              </div>
              <div className="text-xs text-muted-foreground">
                Browser wallet (MetaMask, Rabby, Coinbase Wallet, …) on{" "}
                {info.name}.
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
                <div className="text-sm font-medium">Pay</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={payToken}
                    onChange={(e) =>
                      setPayToken(e.target.value as "native" | "usdc")
                    }
                    className="text-xs bg-background border border-border px-2 py-1 rounded"
                  >
                    <option value="native">{info.tokens.native.symbol}</option>
                    <option value="usdc">{info.tokens.usdc.symbol}</option>
                  </select>
                  <input
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder={`amount in ${payTokenInfo.symbol}`}
                    className="font-mono text-xs bg-background border border-border px-2 py-1 rounded w-40"
                  />
                  <div className="text-xs text-muted-foreground">
                    ~ {fmt(payPreview.beneficiaryTokenCount, 18)} project tokens
                    {payPreview.reservedTokenCount !== undefined &&
                      payPreview.reservedTokenCount > 0n &&
                      ` (+ ${fmt(payPreview.reservedTokenCount, 18)} reserved)`}
                  </div>
                </div>
                {payPreview.isError && (
                  <div className="text-xs text-red-400">
                    Preview failed: {payPreview.error?.message}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {needsApproval ? (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={
                        approve.isPending || approveTxStatus === "pending"
                      }
                      className="text-xs bg-muted/80 px-3 py-1.5 rounded hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      {approve.isPending ? "Approving…" : "Approve USDC"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePay}
                      disabled={
                        pay.isPending ||
                        payTxStatus === "pending" ||
                        !projectId ||
                        payAmountWei <= 0n
                      }
                      className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      {pay.isPending || payTxStatus === "pending"
                        ? "Sending…"
                        : "Pay"}
                    </button>
                  )}
                  {payTxStatus === "confirmed" && (
                    <a
                      href={`${EXPLORER}${pay.data}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-green-400 underline"
                    >
                      confirmed
                    </a>
                  )}
                  {pay.data && payTxStatus === undefined && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortAddr(pay.data)}
                    </span>
                  )}
                  {(pay.isError || payTxStatus === "failed") && (
                    <span className="text-xs text-red-400">
                      {pay.error?.message ?? "transaction failed"}
                    </span>
                  )}
                  {needsApproval && approve.isError && (
                    <span className="text-xs text-red-400">
                      {approve.error?.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
                <div className="text-sm font-medium">Cash out</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={reclaimToken}
                    onChange={(e) =>
                      setReclaimToken(e.target.value as "native" | "usdc")
                    }
                    className="text-xs bg-background border border-border px-2 py-1 rounded"
                  >
                    <option value="native">{info.tokens.native.symbol}</option>
                    <option value="usdc">{info.tokens.usdc.symbol}</option>
                  </select>
                  <input
                    value={cashOutCount}
                    onChange={(e) => setCashOutCount(e.target.value)}
                    inputMode="decimal"
                    placeholder="project tokens to burn"
                    className="font-mono text-xs bg-background border border-border px-2 py-1 rounded w-48"
                  />
                  <div className="text-xs text-muted-foreground">
                    balance: {fmt(holderBalance, 18)}
                  </div>
                  {cashOutPreview.reclaimAmount !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      ~ reclaims{" "}
                      {fmt(
                        cashOutPreview.reclaimAmount,
                        reclaimTokenInfo.decimals,
                      )}{" "}
                      {reclaimTokenInfo.symbol}
                    </div>
                  )}
                </div>
                {cashOutPreview.isError && (
                  <div className="text-xs text-red-400">
                    Preview failed: {cashOutPreview.error?.message}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCashOut}
                    disabled={
                      cashOut.isPending ||
                      cashOutTxStatus === "pending" ||
                      !projectId ||
                      cashOutCountWei <= 0n
                    }
                    className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {cashOut.isPending || cashOutTxStatus === "pending"
                      ? "Cashing out…"
                      : "Cash out"}
                  </button>
                  {cashOutTxStatus === "confirmed" && (
                    <a
                      href={`${EXPLORER}${cashOut.data}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-green-400 underline"
                    >
                      confirmed
                    </a>
                  )}
                  {cashOut.data && cashOutTxStatus === undefined && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortAddr(cashOut.data)}
                    </span>
                  )}
                  {(cashOut.isError || cashOutTxStatus === "failed") && (
                    <span className="text-xs text-red-400">
                      {cashOut.error?.message ?? "transaction failed"}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="text-[11px] text-muted-foreground space-y-1">
            <div>
              Protocol fee: 2.5% on outflows, held 28 days. Cash outs follow the
              ruleset bonding curve.
            </div>
            <div>
              Preview estimates can drift from execution when a project uses a
              data hook — verify before signing.
            </div>
          </div>
        </div>
      </div>

      {/* Launch project wizard */}
      {launchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-lg border border-border bg-background w-full max-w-md p-5 space-y-4">
            <div className="text-sm font-medium">
              Create Juicebox project for "{launchTarget.graphName}"
            </div>
            <div className="text-[11px] text-muted-foreground">
              Launches a new Juicebox V6 project on {info.name}, owned by{" "}
              {jb.isConnected ? shortAddr(jb.address ?? "") : "your wallet"}.
              Creation fee: 0.0001 ETH.
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-muted-foreground">
                Ruleset duration (seconds, 0 = no auto-cycle)
                <input
                  type="number"
                  min={0}
                  value={launchCfg.durationSec}
                  onChange={(e) =>
                    setLaunchCfg({
                      ...launchCfg,
                      durationSec: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="mt-1 w-full font-mono text-xs bg-background border border-border px-2 py-1 rounded"
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Weight (tokens per unit paid, 18 decimals)
                <input
                  type="number"
                  min={0}
                  value={launchCfg.weight.toString()}
                  onChange={(e) =>
                    setLaunchCfg({
                      ...launchCfg,
                      weight: BigInt(Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className="mt-1 w-full font-mono text-xs bg-background border border-border px-2 py-1 rounded"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-muted-foreground">
                  Reserved % (basis / 100)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={launchCfg.reservedPercent / 100}
                    onChange={(e) =>
                      setLaunchCfg({
                        ...launchCfg,
                        reservedPercent: Math.min(
                          10000,
                          Math.max(0, Number(e.target.value) || 0) * 100,
                        ),
                      })
                    }
                    className="mt-1 w-full font-mono text-xs bg-background border border-border px-2 py-1 rounded"
                  />
                </label>
                <label className="block text-xs text-muted-foreground">
                  Cash-out tax % (basis / 100)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={launchCfg.cashOutTaxRate / 100}
                    onChange={(e) =>
                      setLaunchCfg({
                        ...launchCfg,
                        cashOutTaxRate: Math.min(
                          10000,
                          Math.max(0, Number(e.target.value) || 0) * 100,
                        ),
                      })
                    }
                    className="mt-1 w-full font-mono text-xs bg-background border border-border px-2 py-1 rounded"
                  />
                </label>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Accepts ETH on the canonical terminal. No splits or payout limits
              yet — you keep full ownership and can configure them later.
            </div>
            {jb.needsSwitch && (
              <div className="text-xs text-amber-300">
                Wallet is on {jb.chain?.name ?? "another chain"} — will switch
                to {info.name} before launching.
              </div>
            )}
            {(launch.isError || launchTxStatus === "failed") && (
              <div className="text-xs text-red-400">
                {launch.error?.message ?? "transaction failed"}
              </div>
            )}
            {launchTxStatus === "confirmed" && (
              <div className="text-xs text-green-400">
                Project launched
                {launch.data ? (
                  <>
                    {" "}
                    —{" "}
                    <a
                      className="underline"
                      href={`${EXPLORER}${launch.data}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      tx
                    </a>
                  </>
                ) : null}
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLaunchTarget(null)}
                disabled={launch.isPending || launchTxStatus === "pending"}
                className="text-xs bg-muted/80 px-3 py-1.5 rounded hover:text-foreground transition-colors disabled:opacity-50"
              >
                {launchTxStatus === "confirmed" ? "Close" : "Cancel"}
              </button>
              {launchTxStatus !== "confirmed" && (
                <button
                  type="button"
                  onClick={handleLaunchSubmit}
                  disabled={
                    launch.isPending ||
                    launchTxStatus === "pending" ||
                    !jb.isConnected
                  }
                  className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {launch.isPending || launchTxStatus === "pending"
                    ? "Launching…"
                    : "Launch project"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
