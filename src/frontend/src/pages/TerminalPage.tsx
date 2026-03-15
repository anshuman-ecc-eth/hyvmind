import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { GraphData } from "../backend";
import TerminalDisambiguationPicker from "../components/TerminalDisambiguationPicker";
import TerminalOntologyOutput from "../components/TerminalOntologyOutput";
import { useActor } from "../hooks/useActor";
import {
  useCreateCuration,
  useCreateInterpretationToken,
  useCreateLocation,
  useCreateSwarm,
  useGetGraphData,
} from "../hooks/useQueries";
import {
  executeArchiveCommand,
  executeCommand,
} from "../utils/terminalCommands";
import {
  formatArchiveMissingNameError,
  formatFilterMissingNameError,
  formatFilterResults,
  formatFindResults,
  formatGraphNotLoadedError,
  formatHelpText,
  formatNoMatchesFound,
  formatNodeNotFoundError,
  formatOntCommandMissingNameError,
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
  type: "command" | "success" | "error" | "example" | "ontology";
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

const DEFAULT_MESSAGE: TerminalMessage = {
  type: "success",
  text: "Terminal ready. Type /help for list of commands.",
  timestamp: Date.now(),
};

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
    return loaded && loaded.length > 0 ? loaded : [DEFAULT_MESSAGE];
  });
  const [input, setInput] = useState("");
  const [pendingExecution, setPendingExecution] =
    useState<PendingExecution | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [isArchiving, setIsArchiving] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const createCuration = useCreateCuration();
  const createSwarm = useCreateSwarm();
  const createLocation = useCreateLocation();
  const createInterpretationToken = useCreateInterpretationToken();
  const { data: graphData } = useGetGraphData();
  const { actor } = useActor();
  const queryClient = useQueryClient();

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
    type: "command" | "success" | "error" | "example" | "ontology",
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
    addMessage("success", helpText);
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
        const fromNode =
          graphData.locations.find(
            (l) => l.id === interpretationToken.fromTokenId,
          ) ||
          graphData.lawTokens.find(
            (lt) => lt.id === interpretationToken.fromTokenId,
          ) ||
          graphData.interpretationTokens.find(
            (it) => it.id === interpretationToken.fromTokenId,
          );

        let parentContext: string | undefined;
        if (fromNode) {
          if ("title" in fromNode) {
            parentContext = fromNode.title;
          } else if ("tokenLabel" in fromNode) {
            parentContext = fromNode.tokenLabel;
          }
        }

        matches.push({
          id: interpretationToken.id,
          type: "Interpretation Token",
          name: interpretationToken.title,
          parentContext,
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

    // Handle create commands (c, s, l, i)
    if (["c", "s", "l", "i"].includes(command)) {
      if (!graphData) {
        addMessage("error", formatGraphNotLoadedError());
        setInput("");
        return;
      }

      const resolvedFields = await resolveFieldsWithNames(
        command,
        fields || {},
        graphData,
      );

      if (resolvedFields.ambiguous) {
        setPendingExecution({
          command,
          fields: fields || {},
          ambiguousField: resolvedFields.ambiguousField!,
          candidates: resolvedFields.candidates!,
          originalInput: input,
        });
        setSelectedCandidateIndex(0);
        setInput("");
        return;
      }

      if (resolvedFields.error) {
        addMessage("error", resolvedFields.error);
        setInput("");
        return;
      }

      try {
        const result = await executeCommand(
          command,
          resolvedFields.fields,
          createCuration,
          createSwarm,
          createLocation,
          createInterpretationToken,
        );

        if (result.success) {
          addMessage("success", result.message);
        } else {
          addMessage("error", result.message);
        }
      } catch (error) {
        addMessage(
          "error",
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
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

  const resolveFieldsWithNames = async (
    command: string,
    fields: Record<string, string | string[]>,
    graphData: GraphData,
  ): Promise<{
    fields: Record<string, string | string[]>;
    ambiguous?: boolean;
    ambiguousField?: string;
    candidates?: ResolvedNode[];
    error?: string;
  }> => {
    const resolvedFields = { ...fields };

    // Determine which fields need name resolution
    const fieldsToResolve: Array<{ field: string; nodeField: string }> = [];

    if (command === "s" && fields.parent) {
      fieldsToResolve.push({ field: "parent", nodeField: "parent" });
    }
    if (command === "l" && fields.parent) {
      fieldsToResolve.push({ field: "parent", nodeField: "parent" });
    }
    if (command === "i") {
      if (fields.from)
        fieldsToResolve.push({ field: "from", nodeField: "from" });
      if (fields.to) fieldsToResolve.push({ field: "to", nodeField: "to" });
    }

    for (const { field } of fieldsToResolve) {
      const value = Array.isArray(fields[field])
        ? (fields[field] as string[])[0]
        : (fields[field] as string);
      if (!value) continue;

      const resolution = resolveNodeReference(value, command, field, graphData);

      if (resolution.status === "not-found") {
        return {
          fields: resolvedFields,
          error: formatNodeNotFoundError(value, field),
        };
      }

      if (resolution.status === "ambiguous") {
        return {
          fields: resolvedFields,
          ambiguous: true,
          ambiguousField: field,
          candidates: resolution.candidates,
        };
      }

      if (resolution.status === "resolved") {
        resolvedFields[field] = resolution.id;
      }
    }

    return { fields: resolvedFields };
  };

  const handleDisambiguationConfirm = async (selectedNode: ResolvedNode) => {
    if (!pendingExecution) return;

    const { command, fields, ambiguousField, originalInput } = pendingExecution;
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

    // Handle create command disambiguation
    if (!graphData) return;

    const resolvedFields = { ...fields };
    resolvedFields[ambiguousField] = selectedNode.id;

    // Check if there are more ambiguous fields
    const furtherResolved = await resolveFieldsWithNames(
      command,
      resolvedFields,
      graphData,
    );

    if (furtherResolved.ambiguous) {
      setPendingExecution({
        command,
        fields: resolvedFields,
        ambiguousField: furtherResolved.ambiguousField!,
        candidates: furtherResolved.candidates!,
        originalInput,
      });
      setSelectedCandidateIndex(0);
      return;
    }

    if (furtherResolved.error) {
      addMessage("error", furtherResolved.error);
      return;
    }

    try {
      const result = await executeCommand(
        command,
        furtherResolved.fields,
        createCuration,
        createSwarm,
        createLocation,
        createInterpretationToken,
      );

      if (result.success) {
        addMessage("success", result.message);
      } else {
        addMessage("error", result.message);
      }
    } catch (error) {
      addMessage(
        "error",
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleDisambiguationCancel = () => {
    setPendingExecution(null);
    addMessage("error", "Command cancelled.");
  };

  const renderMessage = (message: TerminalMessage, index: number) => {
    const emoji = getMessageTypeEmoji(message.type);

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

    const tokens = formatTerminalOutput(message.text, message.type);

    return (
      <div
        key={index}
        className={`mb-1 text-sm ${message.type === "error" ? "text-destructive" : "text-foreground"}`}
      >
        {emoji && <span className="mr-1">{emoji}</span>}
        {renderLineTokens(tokens)}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background font-mono text-sm">
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
          <span className="text-accent font-medium shrink-0">$</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isArchiving
                ? "Archiving..."
                : pendingExecution
                  ? "Select an option above with ↑/↓ then Enter..."
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
