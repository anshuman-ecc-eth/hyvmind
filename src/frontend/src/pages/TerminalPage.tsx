import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { GraphData, backendInterface } from "../backend";
import { createActor } from "../backend";
import TerminalDisambiguationPicker from "../components/TerminalDisambiguationPicker";
import TerminalOntologyOutput from "../components/TerminalOntologyOutput";
import {
  useGetOwnedData,
  useIsCallerAdmin,
  useResetAllData,
} from "../hooks/useQueries";
import { executeArchiveCommand } from "../utils/terminalCommands";
import {
  formatArchiveMissingNameError,
  formatDebugError,
  formatDebugHelpText,
  formatFilterMissingNameError,
  formatFilterResults,
  formatFindResults,
  formatGraphNotLoadedError,
  formatHelpText,
  formatNoMatchesFound,
  formatNodeNotFoundError,
  formatOntCommandMissingNameError,
  formatTelegramConfigHelp,
} from "../utils/terminalMessages";
import {
  type ResolvedNode,
  resolveNodeReference,
} from "../utils/terminalNameResolution";
import { generateOntologyMermaid } from "../utils/terminalOntologyMermaid";
import { generateOntologyTurtle } from "../utils/terminalOntologyTurtle";
import {
  type LineToken,
  formatTerminalOutput,
  getMessageTypeEmoji,
} from "../utils/terminalOutputFormatting";
import { parseCommand } from "../utils/terminalParser";
import {
  clearTerminalSession,
  loadTerminalSession,
  saveTerminalSession,
} from "../utils/terminalSession";
import { convertTTLToMermaid } from "../utils/ttlToMermaid";

export interface TerminalMessage {
  type: "command" | "success" | "error" | "example" | "ontology" | "normal";
  text: string;
  timestamp: number;
  ontologyData?: {
    turtleText: string;
    mermaidText: string | null;
    mermaidError?: string;
  };
}

interface PendingExecution {
  command: string;
  fields: Record<string, string | string[]>;
  ambiguousField: string;
  candidates: ResolvedNode[];
  originalInput: string;
}

function renderLineTokens(tokens: LineToken[]): React.ReactNode {
  return tokens.map((token, i) => {
    if (token.type === "blank") {
      // biome-ignore lint/suspicious/noArrayIndexKey: stable ordered list
      return <br key={`blank-${i}`} />;
    }
    const indentClass =
      token.indent === 0 ? "" : token.indent === 1 ? "pl-4" : "pl-8";
    const colorClass =
      token.type === "heading"
        ? "font-semibold text-foreground"
        : token.type === "command"
          ? "text-accent-foreground font-medium"
          : token.type === "example"
            ? "text-muted-foreground italic"
            : token.type === "list"
              ? "text-muted-foreground"
              : token.type === "result"
                ? "text-foreground"
                : "text-foreground/80";
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: stable ordered list
      <div key={`token-${i}`} className={`${indentClass} ${colorClass}`}>
        {token.text}
      </div>
    );
  });
}

export default function TerminalPage() {
  const [messages, setMessages] = useState<TerminalMessage[]>(() => {
    const loaded = loadTerminalSession();
    return loaded && loaded.length > 0 ? loaded : [];
  });
  const [input, setInput] = useState("");
  const [pendingExecution, setPendingExecution] =
    useState<PendingExecution | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [isArchiving, setIsArchiving] = useState(false);
  const [pendingDebugJson, setPendingDebugJson] = useState<string | null>(null);
  const [debugResetPending, setDebugResetPending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: graphData } = useGetOwnedData();
  const { actor: _rawActor } = useActor(createActor);
  const actor = _rawActor as backendInterface | null;
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsCallerAdmin();
  const resetAllData = useResetAllData();

  // Persist messages whenever they change
  useEffect(() => {
    saveTerminalSession(messages);
  }, [messages]);

  // Auto-scroll to bottom when messages change
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional scroll trigger
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, pendingExecution]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = (
    type: "command" | "success" | "error" | "example" | "ontology" | "normal",
    text: string,
    ontologyData?: {
      turtleText: string;
      mermaidText: string | null;
      mermaidError?: string;
    },
  ) => {
    setMessages((prev) => [
      ...prev,
      { type, text, timestamp: Date.now(), ontologyData },
    ]);
  };

  const clearMessages = () => {
    setMessages([]);
    clearTerminalSession();
  };

  const handleHelp = () => {
    const helpText = formatHelpText();
    if (isAdmin) {
      addMessage(
        "success",
        `${helpText}\n\n${formatDebugHelpText(true)}${formatTelegramConfigHelp()}`,
      );
    } else {
      addMessage("success", helpText);
    }
  };

  const handleClear = () => {
    clearMessages();
  };

  const handleFind = (searchTerm: string) => {
    if (!graphData) {
      addMessage("error", formatGraphNotLoadedError());
      return;
    }

    const matches: Array<{
      id: string;
      type: string;
      name: string;
      parentContext?: string;
    }> = [];

    // Search curations
    for (const curation of graphData.curations) {
      if (curation.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        matches.push({
          id: curation.id,
          type: "Curation",
          name: curation.name,
        });
      }
    }

    // Search swarms
    for (const swarm of graphData.swarms) {
      if (swarm.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        const parentCuration = graphData.curations.find(
          (c) => c.id === swarm.parentCurationId,
        );
        matches.push({
          id: swarm.id,
          type: "Swarm",
          name: swarm.name,
          parentContext: parentCuration?.name,
        });
      }
    }

    // Search locations
    for (const location of graphData.locations) {
      if (location.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        const parentSwarm = graphData.swarms.find(
          (s) => s.id === location.parentSwarmId,
        );
        matches.push({
          id: location.id,
          type: "Location",
          name: location.title,
          parentContext: parentSwarm?.name,
        });
      }
    }

    // Search law tokens
    for (const lawToken of graphData.lawTokens) {
      if (
        lawToken.tokenLabel.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        const parentLocation = graphData.locations.find(
          (l) => l.id === lawToken.parentLocationId,
        );
        matches.push({
          id: lawToken.id,
          type: "Law Token",
          name: lawToken.tokenLabel,
          parentContext: parentLocation?.title,
        });
      }
    }

    // Search interpretation tokens
    for (const interpretationToken of graphData.interpretationTokens) {
      if (
        interpretationToken.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ) {
        matches.push({
          id: interpretationToken.id,
          type: "Interpretation Token",
          name: interpretationToken.title,
        });
      }
    }

    if (matches.length === 0) {
      addMessage("error", formatNoMatchesFound(searchTerm));
    } else {
      const resultText = formatFindResults(matches);
      addMessage("success", resultText);
    }
  };

  const handleOnt = (nodeName: string) => {
    if (!graphData) {
      addMessage("error", formatGraphNotLoadedError());
      return;
    }

    if (!nodeName) {
      addMessage("error", formatOntCommandMissingNameError());
      return;
    }

    const resolution = resolveNodeReference(nodeName, "ont", "name", graphData);

    if (resolution.status === "not-found") {
      addMessage("error", formatNodeNotFoundError(nodeName, "node"));
      return;
    }

    if (resolution.status === "ambiguous") {
      setPendingExecution({
        command: "/ont",
        fields: { name: nodeName },
        ambiguousField: "name",
        candidates: resolution.candidates,
        originalInput: `/ont name=${nodeName}`,
      });
      setSelectedCandidateIndex(0);
      return;
    }

    if (resolution.status !== "resolved") {
      addMessage("error", formatGraphNotLoadedError());
      return;
    }

    const turtleText = generateOntologyTurtle(resolution.id, graphData);
    const { mermaidText, mermaidError } = convertTTLToMermaid(
      turtleText,
      graphData,
    );
    const nodeInfo = findNodeById(resolution.id, graphData);
    const displayName = nodeInfo?.name || nodeName;

    addMessage("ontology", `Ontology for: ${displayName}`, {
      turtleText,
      mermaidText,
      mermaidError,
    });
  };

  const handleFilter = (
    nodeName: string,
    parentName?: string,
    childName?: string,
  ) => {
    if (!graphData) {
      addMessage("error", formatGraphNotLoadedError());
      return;
    }

    if (!nodeName) {
      addMessage("error", formatFilterMissingNameError());
      return;
    }

    const resolution = resolveNodeReference(
      nodeName,
      "filter",
      "name",
      graphData,
    );

    if (resolution.status === "not-found") {
      addMessage("error", formatNodeNotFoundError(nodeName, "node"));
      return;
    }

    if (resolution.status === "ambiguous") {
      setPendingExecution({
        command: "/filter",
        fields: {
          name: nodeName,
          parent: parentName || "",
          child: childName || "",
        },
        ambiguousField: "name",
        candidates: resolution.candidates,
        originalInput: `/filter name=${nodeName}${parentName ? ` parent=${parentName}` : ""}${childName ? ` child=${childName}` : ""}`,
      });
      setSelectedCandidateIndex(0);
      return;
    }

    if (resolution.status !== "resolved") {
      addMessage("error", formatGraphNotLoadedError());
      return;
    }

    let filteredResults: Array<{
      id: string;
      type: string;
      name: string;
      parentContext?: string;
    }> = [];

    if (parentName) {
      const parentResolution = resolveNodeReference(
        parentName,
        "filter",
        "parent",
        graphData,
      );
      if (parentResolution.status === "resolved") {
        const children = findChildrenOfNode(parentResolution.id, graphData);
        filteredResults = children.filter((child) =>
          child.name.toLowerCase().includes(nodeName.toLowerCase()),
        );
      }
    } else if (childName) {
      const childResolution = resolveNodeReference(
        childName,
        "filter",
        "child",
        graphData,
      );
      if (childResolution.status === "resolved") {
        const parents = findParentsOfNode(childResolution.id, graphData);
        filteredResults = parents.filter((parent) =>
          parent.name.toLowerCase().includes(nodeName.toLowerCase()),
        );
      }
    } else {
      const nodeInfo = findNodeById(resolution.id, graphData);
      if (nodeInfo) {
        filteredResults = [
          {
            id: resolution.id,
            type: nodeInfo.type,
            name: nodeInfo.name,
          },
        ];
      }
    }

    if (filteredResults.length === 0) {
      addMessage("error", formatNoMatchesFound(nodeName));
    } else {
      const resultText = formatFilterResults(filteredResults);
      addMessage("success", resultText);
    }
  };

  const handleArchive = async (nodeName: string) => {
    if (!graphData) {
      addMessage("error", formatGraphNotLoadedError());
      return;
    }

    if (!nodeName || nodeName.trim() === "") {
      addMessage("error", formatArchiveMissingNameError());
      return;
    }

    if (!actor) {
      addMessage(
        "error",
        "Error: Backend not connected. Please wait and try again.",
      );
      return;
    }

    const resolution = resolveNodeReference(
      nodeName,
      "archive",
      "name",
      graphData,
    );

    if (resolution.status === "not-found") {
      addMessage("error", formatNodeNotFoundError(nodeName, "node"));
      return;
    }

    if (resolution.status === "ambiguous") {
      setPendingExecution({
        command: "/archive",
        fields: { name: nodeName },
        ambiguousField: "name",
        candidates: resolution.candidates,
        originalInput: `/archive name=${nodeName}`,
      });
      setSelectedCandidateIndex(0);
      return;
    }

    if (resolution.status !== "resolved") {
      addMessage("error", formatGraphNotLoadedError());
      return;
    }

    const nodeInfo = findNodeById(resolution.id, graphData);
    const displayName = nodeInfo?.name || nodeName;
    const displayType = nodeInfo?.type || "Node";

    setIsArchiving(true);
    try {
      const result = await executeArchiveCommand(
        resolution.id,
        displayName,
        displayType,
        actor,
        queryClient,
      );

      if (result.success) {
        addMessage("success", result.message);
      } else {
        addMessage("error", result.message);
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const executeArchiveForNode = async (
    nodeId: string,
    displayName: string,
    displayType: string,
  ) => {
    if (!actor) {
      addMessage(
        "error",
        "Error: Backend not connected. Please wait and try again.",
      );
      return;
    }
    setIsArchiving(true);
    try {
      const result = await executeArchiveCommand(
        nodeId,
        displayName,
        displayType,
        actor,
        queryClient,
      );
      if (result.success) {
        addMessage("success", result.message);
      } else {
        addMessage("error", result.message);
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDebug = async (
    action: string,
    fields: Record<string, string | string[]>,
  ) => {
    if (!isAdmin) {
      addMessage("error", formatDebugError("Access denied. Admin only."));
      return;
    }
    if (!actor) {
      addMessage("error", formatDebugError("Actor not available."));
      return;
    }

    const bigIntReplacer = (_: string, v: unknown) =>
      typeof v === "bigint" ? v.toString() : v;

    const showJsonPrompt = (data: unknown) => {
      const json = JSON.stringify(data, bigIntReplacer, 2);
      setPendingDebugJson(json);
      addMessage("normal", "Show full JSON? (Y/N)");
    };

    try {
      switch (action) {
        case "ownedgraph": {
          addMessage(
            "success",
            "📊 getOwnedData was removed. Use /debug publishedgraphs to see published graphs.",
          );
          break;
        }
        case "allgraph": {
          addMessage(
            "success",
            "📊 getAllData was removed. Use /debug publishedgraphs to see published graphs.",
          );
          break;
        }
        case "archived": {
          const ids = await actor.getArchivedNodeIds();
          addMessage("success", `📋 Archived nodes: ${ids.length} total`);
          showJsonPrompt(ids);
          break;
        }
        case "profile": {
          const profile = await actor.getCallerUserProfile();
          addMessage("success", "👤 Caller profile retrieved");
          showJsonPrompt(profile);
          break;
        }
        case "role": {
          const role = await actor.getCallerUserRole();
          addMessage(
            "success",
            `🔑 Caller role: ${JSON.stringify(role, bigIntReplacer)}`,
          );
          break;
        }
        case "admin": {
          const adminResult = await actor.isCallerAdmin();
          addMessage("success", `🔐 Is admin: ${adminResult}`);
          break;
        }
        case "approved": {
          const approved = await actor.isCallerApproved();
          addMessage("success", `✅ Is approved: ${approved}`);
          break;
        }
        case "approvals": {
          const approvals = await actor.listApprovals();
          addMessage("success", `📋 Approvals: ${approvals.length} entries`);
          showJsonPrompt(approvals);
          break;
        }
        case "swarmsbycreator": {
          const swarms: unknown[] = [];
          addMessage("success", `🌀 Swarms by creator: ${swarms.length}`);
          showJsonPrompt(swarms);
          break;
        }
        case "leaderboard": {
          const lb: unknown[] = [];
          addMessage("success", `🏆 Leaderboard: ${lb.length} entries`);
          showJsonPrompt(lb);
          break;
        }
        case "mybuzz": {
          const buzz = await actor.getMyBuzzBalance();
          const display =
            typeof buzz === "bigint" ? (Number(buzz) / 10).toFixed(1) : buzz;
          addMessage("success", `💰 BUZZ balance: ${display}`);
          break;
        }
        case "mintsets": {
          const settings = await actor.getMintSettings();
          addMessage("success", "⚙️ Mint settings retrieved");
          showJsonPrompt(settings);
          break;
        }
        case "swarm": {
          const swarmId = fields?.swarmId as string;
          if (!swarmId) {
            addMessage(
              "error",
              formatDebugError("Missing required param: swarmId"),
            );
            return;
          }
          const members = await actor.getSwarmMembers(swarmId);
          addMessage(
            "success",
            `👥 Swarm members for ${swarmId}: ${members.length}`,
          );
          showJsonPrompt(members);
          break;
        }
        case "updates": {
          const swarmId = fields?.swarmId as string;
          if (!swarmId) {
            addMessage(
              "error",
              formatDebugError("Missing required param: swarmId"),
            );
            return;
          }
          const updates: unknown[] = [];
          addMessage(
            "success",
            `🔔 Swarm updates for ${swarmId}: ${Array.isArray(updates) ? updates.length : 1}`,
          );
          showJsonPrompt(updates);
          break;
        }
        case "unvoted": {
          const swarmId = fields?.swarmId as string;
          if (!swarmId) {
            addMessage(
              "error",
              formatDebugError("Missing required param: swarmId"),
            );
            return;
          }
          const graphDataAll = {
            locations: [] as { parentSwarmId: string; id: string }[],
            lawTokens: [] as { parentLocationId: string }[],
          };
          const swarmLocations = graphDataAll.locations.filter(
            (l) => l.parentSwarmId === swarmId,
          );
          const locationIds = new Set(swarmLocations.map((l) => l.id));
          const unvotedTokens = graphDataAll.lawTokens.filter((t) =>
            locationIds.has(t.parentLocationId),
          );
          addMessage(
            "success",
            `🗳️ Tokens in swarm ${swarmId} locations: ${unvotedTokens.length}`,
          );
          showJsonPrompt(unvotedTokens);
          break;
        }
        case "vote": {
          const nodeId = fields?.nodeId as string;
          if (!nodeId) {
            addMessage(
              "error",
              formatDebugError("Missing required param: nodeId"),
            );
            return;
          }
          const voteData = await actor.getVoteData(nodeId);
          addMessage("success", `🗳️ Vote data for ${nodeId} retrieved`);
          showJsonPrompt(voteData);
          break;
        }
        case "editions": {
          const nodeId = fields?.nodeId as string;
          if (!nodeId) {
            addMessage(
              "error",
              formatDebugError("Missing required param: nodeId"),
            );
            return;
          }
          const editions = await actor.getCollectibleEditions(nodeId);
          addMessage(
            "success",
            `🎴 Collectible editions for ${nodeId}: ${editions.length}`,
          );
          showJsonPrompt(editions);
          break;
        }
        case "userprofile": {
          const user = fields?.user as string;
          if (!user) {
            addMessage(
              "error",
              formatDebugError("Missing required param: user"),
            );
            return;
          }
          const userProfile = await actor.getUserProfile(user as any);
          addMessage("success", `👤 User profile for ${user} retrieved`);
          showJsonPrompt(userProfile);
          break;
        }
        case "userlawtokens": {
          addMessage(
            "success",
            "⚖️ getOwnedData was removed. Law token lookup is no longer available.",
          );
          break;
        }
        case "userinterp": {
          addMessage(
            "success",
            "💡 getOwnedData was removed. Interpretation token lookup is no longer available.",
          );
          break;
        }
        case "reset": {
          setDebugResetPending(true);
          addMessage("normal", "⚠️ Type 'yes' to confirm reset:");
          break;
        }
        case "publishedgraphs": {
          try {
            const metas = await actor.getAllPublishedSourceGraphs();
            if (!metas || metas.length === 0) {
              addMessage("success", "No published graphs found.");
              break;
            }
            for (const meta of metas) {
              addMessage("success", `Graph: ${meta.name} | id: ${meta.id}`);
              addMessage(
                "normal",
                `  Published: ${new Date(Number(meta.publishedAt) / 1_000_000).toISOString()}`,
              );
              addMessage(
                "normal",
                `  Nodes: ${Number(meta.nodeCount)} | Edges: ${Number(meta.edgeCount)} | Hierarchy: ${Number((meta as { hierarchyEdgeCount?: bigint }).hierarchyEdgeCount ?? 0n)}`,
              );
              if (meta.extensionLog && meta.extensionLog.length > 0) {
                addMessage(
                  "normal",
                  `  Extensions (${meta.extensionLog.length}):`,
                );
                for (const ext of meta.extensionLog) {
                  addMessage(
                    "normal",
                    `    +${Number(ext.addedNodes)} nodes, +${Number(ext.addedEdges)} edges, +${Number(ext.addedAttributes)} attrs, +${Number((ext as { addedSources?: bigint }).addedSources ?? 0n)} sources at ${new Date(Number(ext.extendedAt) / 1_000_000).toISOString()}`,
                  );
                }
              }
            }
          } catch (e) {
            addMessage("error", formatDebugError(String(e)));
          }
          break;
        }
        case "checknode": {
          const nodeName = fields?.name as string | undefined;
          if (!nodeName) {
            addMessage(
              "error",
              formatDebugError("Usage: /debug checknode name=<nodename>"),
            );
            break;
          }
          try {
            const metas = await actor.getAllPublishedSourceGraphs();
            if (!metas || metas.length === 0) {
              addMessage("success", "No published graphs found.");
              break;
            }
            const sorted = [...metas].sort(
              (a, b) => Number(b.publishedAt) - Number(a.publishedAt),
            );
            const mostRecent = sorted[0];
            const graphResult = await actor.getPublishedSourceGraph(
              mostRecent.id,
            );
            if (!graphResult || !graphResult[0]) {
              addMessage(
                "error",
                formatDebugError(`Could not load graph: ${mostRecent.id}`),
              );
              break;
            }
            const graphData = graphResult[0];
            const found = graphData.interpretationTokens?.find(
              (it: { title: string }) => it.title === nodeName,
            );
            if (!found) {
              addMessage(
                "success",
                `interpToken "${nodeName}" not found in graph "${mostRecent.name}"`,
              );
              break;
            }
            addMessage("success", `Found interpToken: "${found.title}"`);
            addMessage("normal", `  id: ${found.id}`);
            addMessage(
              "normal",
              `  parentLawTokenId: ${(found as { parentLawTokenId?: string }).parentLawTokenId ?? "(none)"}`,
            );
            const parentLawTokenId = (found as { parentLawTokenId?: string })
              .parentLawTokenId;
            const parentLaw = parentLawTokenId
              ? graphData.lawTokens?.find(
                  (lt: { id: string }) => lt.id === parentLawTokenId,
                )
              : undefined;
            if (parentLaw) {
              addMessage(
                "normal",
                `  parentLawToken: "${(parentLaw as { title?: string; tokenLabel?: string }).title ?? (parentLaw as { title?: string; tokenLabel?: string }).tokenLabel ?? parentLaw.id}" (found)`,
              );
              const parentLocationId = (
                parentLaw as { parentLocationId?: string }
              ).parentLocationId;
              const parentLoc = parentLocationId
                ? graphData.locations?.find(
                    (loc: { id: string }) => loc.id === parentLocationId,
                  )
                : undefined;
              if (parentLoc) {
                addMessage(
                  "normal",
                  `  location: "${(parentLoc as { name?: string; title?: string }).name ?? (parentLoc as { name?: string; title?: string }).title ?? parentLoc.id}"`,
                );
                const parentSwarmId = (parentLoc as { parentSwarmId?: string })
                  .parentSwarmId;
                const parentSwarm = parentSwarmId
                  ? graphData.swarms?.find(
                      (s: { id: string }) => s.id === parentSwarmId,
                    )
                  : undefined;
                if (parentSwarm) {
                  addMessage("normal", `  swarm: "${parentSwarm.name}"`);
                  const parentCurationId = (
                    parentSwarm as { parentCurationId?: string }
                  ).parentCurationId;
                  const parentCuration = parentCurationId
                    ? graphData.curations?.find(
                        (c: { id: string }) => c.id === parentCurationId,
                      )
                    : undefined;
                  if (parentCuration)
                    addMessage(
                      "normal",
                      `  curation: "${parentCuration.name}"`,
                    );
                }
              }
            } else if (parentLawTokenId) {
              addMessage(
                "normal",
                `  parentLawToken id ${parentLawTokenId}: NOT FOUND in graph`,
              );
            }
          } catch (e) {
            addMessage("error", formatDebugError(String(e)));
          }
          break;
        }
        case "curationtags": {
          try {
            const metas = await actor.getAllPublishedSourceGraphs();
            if (!metas || metas.length === 0) {
              addMessage("success", "No published graphs found.");
              break;
            }
            for (const meta of metas) {
              const graphResult = await actor.getPublishedSourceGraph(meta.id);
              if (!graphResult || !graphResult[0]) continue;
              const gd = graphResult[0];
              const rootCuration = gd.curations?.[0];
              addMessage(
                "normal",
                `Graph "${meta.id}": curation = "${rootCuration?.name ?? "(unknown)"}"`,
              );
            }
          } catch (e) {
            addMessage("error", formatDebugError(String(e)));
          }
          break;
        }
        case "inputpreview": {
          try {
            const raw = localStorage.getItem("source_graphs");
            const graphs = raw ? JSON.parse(raw) : [];
            const activeId = localStorage.getItem("active_source_graph_id");
            const activeGraph = activeId
              ? graphs.find((g: { id: string }) => g.id === activeId)
              : graphs[0];
            if (!activeGraph) {
              addMessage(
                "success",
                "No active source graph found in localStorage.",
              );
              break;
            }
            const { sourceGraphToInput } = await import(
              "../hooks/usePublishGraph"
            );
            const input = sourceGraphToInput(activeGraph);
            addMessage(
              "success",
              `Input preview for graph: ${activeGraph.name}`,
            );
            addMessage("normal", `Nodes (${input.nodes.length}):`);
            for (const n of input.nodes) {
              addMessage(
                "normal",
                `  [${n.nodeType}] ${n.name} | id: ${n.id} | parent: ${n.parentName ?? "(root)"}`,
              );
              if (n.attributes && n.attributes.length > 0) {
                addMessage(
                  "normal",
                  `    attributes: ${(n.attributes as [string, unknown[]][]).map((a) => `${a[0]}:${JSON.stringify(a[1])}`).join(", ")}`,
                );
              }
              if (n.sources && n.sources.length > 0) {
                addMessage(
                  "normal",
                  `    sources: ${(n.sources as { name: string; url: string }[]).map((s) => s.name).join(", ")}`,
                );
              }
            }
            addMessage("normal", `Edges (${input.edges.length}):`);
            for (const e of input.edges) {
              addMessage("normal", `  ${e.sourceName} → ${e.targetName}`);
            }
          } catch (e) {
            addMessage("error", formatDebugError(String(e)));
          }
          break;
        }
        default: {
          addMessage(
            "error",
            formatDebugError(
              `Unknown action: "${action}". Type /help for available debug actions.`,
            ),
          );
        }
      }
    } catch (error) {
      addMessage(
        "error",
        formatDebugError(
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  };

  const findNodeById = (
    nodeId: string,
    graphData: GraphData,
  ): { id: string; name: string; type: string } | null => {
    for (const curation of graphData.curations) {
      if (curation.id === nodeId)
        return { id: curation.id, name: curation.name, type: "Curation" };
    }
    for (const swarm of graphData.swarms) {
      if (swarm.id === nodeId)
        return { id: swarm.id, name: swarm.name, type: "Swarm" };
    }
    for (const location of graphData.locations) {
      if (location.id === nodeId)
        return { id: location.id, name: location.title, type: "Location" };
    }
    for (const lawToken of graphData.lawTokens) {
      if (lawToken.id === nodeId)
        return {
          id: lawToken.id,
          name: lawToken.tokenLabel,
          type: "Law Token",
        };
    }
    for (const interpretationToken of graphData.interpretationTokens) {
      if (interpretationToken.id === nodeId)
        return {
          id: interpretationToken.id,
          name: interpretationToken.title,
          type: "Interpretation Token",
        };
    }
    return null;
  };

  const findChildrenOfNode = (
    nodeId: string,
    graphData: GraphData,
  ): Array<{
    id: string;
    type: string;
    name: string;
    parentContext?: string;
  }> => {
    const children: Array<{
      id: string;
      type: string;
      name: string;
      parentContext?: string;
    }> = [];

    for (const swarm of graphData.swarms) {
      if (swarm.parentCurationId === nodeId) {
        children.push({ id: swarm.id, type: "Swarm", name: swarm.name });
      }
    }
    for (const location of graphData.locations) {
      if (location.parentSwarmId === nodeId) {
        children.push({
          id: location.id,
          type: "Location",
          name: location.title,
        });
      }
    }
    for (const lawToken of graphData.lawTokens) {
      if (lawToken.parentLocationId === nodeId) {
        children.push({
          id: lawToken.id,
          type: "Law Token",
          name: lawToken.tokenLabel,
        });
      }
    }

    return children;
  };

  const findParentsOfNode = (
    nodeId: string,
    graphData: GraphData,
  ): Array<{
    id: string;
    type: string;
    name: string;
    parentContext?: string;
  }> => {
    const parents: Array<{
      id: string;
      type: string;
      name: string;
      parentContext?: string;
    }> = [];

    for (const swarm of graphData.swarms) {
      if (swarm.id === nodeId) {
        const parentCuration = graphData.curations.find(
          (c) => c.id === swarm.parentCurationId,
        );
        if (parentCuration) {
          parents.push({
            id: parentCuration.id,
            type: "Curation",
            name: parentCuration.name,
          });
        }
      }
    }
    for (const location of graphData.locations) {
      if (location.id === nodeId) {
        const parentSwarm = graphData.swarms.find(
          (s) => s.id === location.parentSwarmId,
        );
        if (parentSwarm) {
          parents.push({
            id: parentSwarm.id,
            type: "Swarm",
            name: parentSwarm.name,
          });
        }
      }
    }
    for (const lawToken of graphData.lawTokens) {
      if (lawToken.id === nodeId) {
        const parentLocation = graphData.locations.find(
          (l) => l.id === lawToken.parentLocationId,
        );
        if (parentLocation) {
          parents.push({
            id: parentLocation.id,
            type: "Location",
            name: parentLocation.title,
          });
        }
      }
    }

    return parents;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isArchiving) return;

    addMessage("command", input);

    // Handle pending debug JSON display
    if (pendingDebugJson !== null) {
      const answer = input.trim().toLowerCase();
      if (answer === "y" || answer === "yes") {
        addMessage("normal", pendingDebugJson);
      } else {
        addMessage("normal", "JSON display skipped.");
      }
      setPendingDebugJson(null);
      setInput("");
      return;
    }

    // Handle pending debug reset confirmation
    if (debugResetPending) {
      const answer = input.trim();
      if (answer === "yes") {
        try {
          await resetAllData.mutateAsync();
          addMessage("success", "✅ All data has been reset.");
        } catch (error) {
          addMessage(
            "error",
            formatDebugError(
              `Reset failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            ),
          );
        }
      } else {
        addMessage("normal", "Reset cancelled.");
      }
      setDebugResetPending(false);
      setInput("");
      return;
    }

    const parsed = parseCommand(input);

    if (!parsed.success) {
      addMessage("error", parsed.error || "Invalid command");
      setInput("");
      return;
    }

    const { command, fields, argument } = parsed;

    if (!command) {
      addMessage("error", "Error: Invalid command");
      setInput("");
      return;
    }

    if (command === "help") {
      handleHelp();
      setInput("");
      return;
    }

    if (command === "clear") {
      handleClear();
      setInput("");
      return;
    }

    if (command === "find") {
      if (!argument || argument.trim() === "") {
        addMessage(
          "error",
          "Error: /find requires a search term.\nUsage: /find <search term>",
        );
      } else {
        handleFind(argument);
      }
      setInput("");
      return;
    }

    if (command === "ont") {
      const nodeName = fields?.name as string;
      handleOnt(nodeName);
      setInput("");
      return;
    }

    if (command === "filter") {
      const nodeName = fields?.name as string;
      const parentName = fields?.parent as string;
      const childName = fields?.child as string;
      handleFilter(nodeName, parentName, childName);
      setInput("");
      return;
    }

    if (command === "archive") {
      const nodeName = fields?.name as string;
      setInput("");
      await handleArchive(nodeName);
      return;
    }

    if (command === "config") {
      setInput("");
      const rawInput = input.trim();

      // /config telegram_token=<value>
      const tokenMatch = rawInput.match(/\/config\s+telegram_token=(.+)/);
      if (tokenMatch) {
        if (!isAdmin) {
          addMessage("error", "Not authorized. This command requires admin.");
          return;
        }
        if (!actor) {
          addMessage(
            "error",
            "Backend not connected. Please wait and try again.",
          );
          return;
        }
        const token = tokenMatch[1].trim();
        if (!/^\d+:/.test(token)) {
          addMessage(
            "error",
            "Invalid token format. Expected: <bot_id>:<token_string>",
          );
          return;
        }
        try {
          const result = await actor.setTelegramConfig(token, "");
          if ("ok" in result) {
            addMessage("success", "Telegram bot token configured.");
          } else {
            addMessage(
              "error",
              `Failed: ${"err" in result ? String(result.err) : "Unknown error"}`,
            );
          }
        } catch (e) {
          addMessage("error", String(e));
        }
        return;
      }

      // /config telegram_chat_id=<value>
      const chatIdMatch = rawInput.match(/\/config\s+telegram_chat_id=(.+)/);
      if (chatIdMatch) {
        if (!isAdmin) {
          addMessage("error", "Not authorized. This command requires admin.");
          return;
        }
        if (!actor) {
          addMessage(
            "error",
            "Backend not connected. Please wait and try again.",
          );
          return;
        }
        const chatId = chatIdMatch[1].trim();
        if (!chatId.startsWith("-")) {
          addMessage(
            "error",
            "Invalid chat ID. Forum group IDs typically start with - (e.g. -1001234567890)",
          );
          return;
        }
        try {
          const result = await actor.setTelegramConfig("", chatId);
          if ("ok" in result) {
            addMessage("success", "Telegram chat ID configured.");
          } else {
            addMessage(
              "error",
              `Failed: ${"err" in result ? String(result.err) : "Unknown error"}`,
            );
          }
        } catch (e) {
          addMessage("error", String(e));
        }
        return;
      }

      // /config telegram_status
      if (rawInput === "/config telegram_status") {
        if (!actor) {
          addMessage(
            "error",
            "Backend not connected. Please wait and try again.",
          );
          return;
        }
        try {
          const status = await actor.getTelegramConfigStatus();
          const updatedAt = status.updatedAt?.[0]
            ? new Date(
                Number(status.updatedAt[0] / BigInt(1_000_000)),
              ).toLocaleString()
            : "never";
          const updatedBy = status.updatedBy?.[0] ?? "unknown";
          addMessage(
            "success",
            [
              "Telegram Config Status:",
              `  Bot token: ${status.hasToken ? "configured" : "not set"}`,
              `  Chat ID:   ${status.hasChatId ? "configured" : "not set"}`,
              `  Last updated: ${updatedAt}`,
              `  Updated by: ${updatedBy}`,
            ].join("\n"),
          );
        } catch (e) {
          addMessage("error", String(e));
        }
        return;
      }

      // /config telegram_clear
      if (rawInput === "/config telegram_clear") {
        if (!isAdmin) {
          addMessage("error", "Not authorized. This command requires admin.");
          return;
        }
        if (!actor) {
          addMessage(
            "error",
            "Backend not connected. Please wait and try again.",
          );
          return;
        }
        try {
          const result = await actor.setTelegramConfig("", "");
          if ("ok" in result) {
            addMessage("success", "Telegram config cleared.");
          } else {
            addMessage(
              "error",
              `Failed: ${"err" in result ? String(result.err) : "Unknown error"}`,
            );
          }
        } catch (e) {
          addMessage("error", String(e));
        }
        return;
      }

      addMessage(
        "error",
        "Unknown /config sub-command. Type /help for available config commands.",
      );
      return;
    }

    if (command === "buzz") {
      setInput("");
      if (!isAdmin) {
        addMessage("error", "Not authorized. This command requires admin.");
        return;
      }
      if (!actor) {
        addMessage(
          "error",
          "Backend not connected. Please wait and try again.",
        );
        return;
      }
      const buzzArg = (argument || "").trim();
      const buzzMatch = buzzArg.match(/^(\d+)\s*,?\s*(\d+)$/);
      if (!buzzMatch) {
        addMessage("error", "Usage: /buzz <count>,<days>\nExample: /buzz 5,7");
        return;
      }
      const buzzCount = Number.parseInt(buzzMatch[1], 10);
      const buzzDays = Number.parseInt(buzzMatch[2], 10);
      if (buzzCount <= 0 || buzzDays <= 0) {
        addMessage("error", "Count and days must be positive integers.");
        return;
      }
      try {
        type BuzzAdminActor = {
          generateInviteCodes: (
            count: bigint,
            validDays: bigint,
          ) => Promise<string[]>;
        };
        const codes = await (
          actor as unknown as BuzzAdminActor
        ).generateInviteCodes(BigInt(buzzCount), BigInt(buzzDays));
        addMessage(
          "success",
          `Generated ${codes.length} invite code${codes.length === 1 ? "" : "s"} (valid for ${buzzDays} day${buzzDays === 1 ? "" : "s"}):\n${codes.map((c) => `  ${c}`).join("\n")}`,
        );
      } catch (e) {
        addMessage(
          "error",
          `Failed to generate invite codes: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      return;
    }

    if (command === "debug") {
      const action = (argument || "").trim();
      if (!action) {
        addMessage(
          "error",
          formatDebugError(
            "Missing action. Usage: /debug <action> [paramName=value]",
          ),
        );
      } else {
        await handleDebug(
          action,
          (fields || {}) as Record<string, string | string[]>,
        );
      }
      setInput("");
      return;
    }

    addMessage(
      "error",
      `Error: Unknown command /${command}. Type /help for available commands.`,
    );
    setInput("");
  };

  const handleDisambiguationConfirm = async (selectedNode: ResolvedNode) => {
    if (!pendingExecution) return;

    const { command, fields, ambiguousField } = pendingExecution;
    setPendingExecution(null);

    // Handle /archive disambiguation
    if (command === "/archive") {
      await executeArchiveForNode(
        selectedNode.id,
        selectedNode.name,
        selectedNode.type,
      );
      return;
    }

    // Handle /ont disambiguation
    if (command === "/ont") {
      if (!graphData) return;
      const turtleText = generateOntologyTurtle(selectedNode.id, graphData);
      const { mermaidText, mermaidError } = convertTTLToMermaid(
        turtleText,
        graphData,
      );
      addMessage("ontology", `Ontology for: ${selectedNode.name}`, {
        turtleText,
        mermaidText,
        mermaidError,
      });
      return;
    }

    // Handle /filter disambiguation
    if (command === "/filter") {
      if (!graphData) return;
      const nodeName = fields.name as string;
      const parentName = fields.parent as string;
      const childName = fields.child as string;

      let filteredResults: Array<{
        id: string;
        type: string;
        name: string;
        parentContext?: string;
      }> = [];

      if (parentName) {
        const children = findChildrenOfNode(selectedNode.id, graphData);
        filteredResults = children.filter((child) =>
          child.name.toLowerCase().includes(nodeName.toLowerCase()),
        );
      } else if (childName) {
        const parents = findParentsOfNode(selectedNode.id, graphData);
        filteredResults = parents.filter((parent) =>
          parent.name.toLowerCase().includes(nodeName.toLowerCase()),
        );
      } else {
        filteredResults = [
          {
            id: selectedNode.id,
            type: selectedNode.type,
            name: selectedNode.name,
          },
        ];
      }

      if (filteredResults.length === 0) {
        addMessage("error", formatNoMatchesFound(nodeName));
      } else {
        addMessage("success", formatFilterResults(filteredResults));
      }
      return;
    }

    // Unknown create command disambiguation — should no longer occur
    addMessage("error", `Unknown disambiguation for command: ${command}`);
    // suppress unused variable warning
    void ambiguousField;
  };

  const handleDisambiguationCancel = () => {
    setPendingExecution(null);
    addMessage("error", "Command cancelled.");
  };

  const renderMessage = (message: TerminalMessage, index: number) => {
    const emoji =
      message.type !== "normal" ? getMessageTypeEmoji(message.type) : undefined;

    if (message.type === "ontology" && message.ontologyData) {
      return (
        <div key={index} className="mb-3">
          <div className="text-muted-foreground text-xs mb-1">
            {emoji && <span className="mr-1">{emoji}</span>}
            {message.text}
          </div>
          <TerminalOntologyOutput
            turtleText={message.ontologyData.turtleText}
            mermaidText={message.ontologyData.mermaidText}
            mermaidError={message.ontologyData.mermaidError}
          />
        </div>
      );
    }

    if (message.type === "command") {
      return (
        <div key={index} className="mb-1">
          <span className="text-accent font-medium">$ </span>
          <span className="text-foreground">{message.text}</span>
        </div>
      );
    }

    if (message.type === "normal") {
      return (
        <div
          key={index}
          className="mb-1 text-sm text-muted-foreground font-mono whitespace-pre-wrap"
        >
          {message.text}
        </div>
      );
    }

    const tokens = formatTerminalOutput(message.text, message.type);

    return (
      <div
        key={index}
        className={`mb-1 text-sm ${
          message.type === "error" ? "text-destructive" : "text-foreground"
        }`}
      >
        {emoji && <span className="mr-1">{emoji}</span>}
        {renderLineTokens(tokens)}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono text-sm">
      {/* Display bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-dashed border-border bg-card shrink-0">
        <span className="text-sm font-semibold text-foreground mr-auto">
          Terminal
        </span>
      </div>

      {/* Terminal output */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
        <div className="p-4 space-y-0.5">
          {messages.map((message, index) => renderMessage(message, index))}

          {/* Disambiguation picker */}
          {pendingExecution && (
            <div className="mt-2 mb-2">
              <div className="text-muted-foreground text-xs mb-1">
                Multiple matches found for &quot;
                {Array.isArray(
                  pendingExecution.fields[pendingExecution.ambiguousField],
                )
                  ? (
                      pendingExecution.fields[
                        pendingExecution.ambiguousField
                      ] as string[]
                    )[0]
                  : (pendingExecution.fields[
                      pendingExecution.ambiguousField
                    ] as string)}
                &quot;. Select one:
              </div>
              <TerminalDisambiguationPicker
                candidates={pendingExecution.candidates}
                selectedIndex={selectedCandidateIndex}
                onSelect={setSelectedCandidateIndex}
                onConfirm={handleDisambiguationConfirm}
                onCancel={handleDisambiguationCancel}
              />
            </div>
          )}

          {/* Archiving indicator */}
          {isArchiving && (
            <div className="text-muted-foreground text-xs animate-pulse">
              Archiving node...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t border-border p-3 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isArchiving
                ? "Archiving..."
                : pendingExecution
                  ? "Select an option above with ↑/↓ then Enter..."
                  : pendingDebugJson !== null
                    ? "Enter Y to show JSON or N to skip..."
                    : debugResetPending
                      ? "Type 'yes' to confirm reset..."
                      : "Type a command (e.g. /help)"
            }
            disabled={isArchiving || !!pendingExecution}
            className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 font-mono text-sm placeholder:text-muted-foreground/50"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>
    </div>
  );
}
