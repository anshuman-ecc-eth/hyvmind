import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createActor } from "../backend";
import type { backendInterface } from "../backend";
import { useGetOwnedData } from "../hooks/useQueries";
import {
  handleArchiveCommand,
  handleFilterCommand,
  handleFindCommand,
  handleOntCommand,
} from "../utils/commandPaletteHandlers";
import {
  formatGraphNotLoadedError,
  formatHelpText,
} from "../utils/terminalMessages";
import type { ResolvedNode } from "../utils/terminalNameResolution";
import { resolveNodeReference } from "../utils/terminalNameResolution";
import { parseCommand } from "../utils/terminalParser";
import TerminalDisambiguationPicker from "./TerminalDisambiguationPicker";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: string) => void;
}

const navCommands = [
  { id: "nav-graph", label: "Go to Graph", view: "graph" },
  { id: "nav-tree", label: "Go to List", view: "tree" },
  { id: "nav-terminal", label: "Go to Terminal", view: "terminal" },
  { id: "nav-swarms", label: "Go to Swarms", view: "swarms" },
  { id: "nav-sources", label: "Go to Sources", view: "sources" },
];

const terminalCommands = [
  {
    id: "cmd-help",
    label: "/help",
    description: "Show all commands",
    command: "/help",
  },
  {
    id: "cmd-find",
    label: "/find <term>",
    description: "Search nodes by name",
    command: "/find ",
  },
  {
    id: "cmd-ont",
    label: "/ont name=<node>",
    description: "Generate ontology for a node",
    command: "/ont name=",
  },
  {
    id: "cmd-filter",
    label: "/filter name=<node>",
    description: "Filter nodes by name",
    command: "/filter name=",
  },
  {
    id: "cmd-archive",
    label: "/archive name=<node>",
    description: "Archive a node",
    command: "/archive name=",
  },
];

function getFieldStr(
  fields: Record<string, string | string[]>,
  key: string,
): string {
  const v = fields[key];
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

export default function CommandPalette({
  open,
  onOpenChange,
  onViewChange,
}: CommandPaletteProps) {
  const [inputValue, setInputValue] = useState("");
  const [inputMode, setInputMode] = useState<"search" | "command">("search");
  const [commandOutput, setCommandOutput] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingDisambiguation, setPendingDisambiguation] = useState<{
    candidates: ResolvedNode[];
    command: string;
    fields: Record<string, string | string[]>;
    argument?: string;
    disambField?: string;
  } | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);

  const { data: graphData } = useGetOwnedData();
  const { actor: _rawActor } = useActor(createActor);
  const actor = _rawActor as backendInterface | null;
  const queryClient = useQueryClient();

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue("");
      setInputMode("search");
      setCommandOutput(null);
      setPendingDisambiguation(null);
      setSelectedCandidateIndex(0);
      setIsExecuting(false);
    }
  }, [open]);

  async function handleExecuteInput(input?: string) {
    const cmd = input ?? inputValue;
    const parsed = parseCommand(cmd);
    if (!parsed.success) {
      setCommandOutput({
        success: false,
        message: parsed.error ?? "Invalid command",
      });
      return;
    }

    setIsExecuting(true);
    setCommandOutput(null);
    setPendingDisambiguation(null);

    const command = parsed.command!;
    const fields = parsed.fields ?? {};
    const argument = parsed.argument ?? "";

    switch (command) {
      case "help":
        setCommandOutput({ success: true, message: formatHelpText() });
        break;

      case "clear":
        setCommandOutput({
          success: true,
          message: "Use the Terminal tab to clear terminal history.",
        });
        break;

      case "find":
        if (!graphData) {
          setCommandOutput({
            success: false,
            message: formatGraphNotLoadedError(),
          });
        } else {
          setCommandOutput(handleFindCommand(argument, graphData));
        }
        break;

      case "filter": {
        if (!graphData) {
          setCommandOutput({
            success: false,
            message: formatGraphNotLoadedError(),
          });
          break;
        }
        const filterName = getFieldStr(fields, "name");
        const filterResult = handleFilterCommand(
          filterName,
          graphData,
          getFieldStr(fields, "parent") || undefined,
          getFieldStr(fields, "child") || undefined,
        );
        if ("needsDisambiguation" in filterResult) {
          setPendingDisambiguation({
            candidates: filterResult.candidates,
            command,
            fields,
            disambField: filterResult.field,
          });
          setSelectedCandidateIndex(0);
        } else {
          setCommandOutput(filterResult);
        }
        break;
      }

      case "ont": {
        if (!graphData) {
          setCommandOutput({
            success: false,
            message: formatGraphNotLoadedError(),
          });
          break;
        }
        const ontName = getFieldStr(fields, "name");
        const ontResult = handleOntCommand(ontName, graphData);
        if ("needsDisambiguation" in ontResult) {
          setPendingDisambiguation({
            candidates: ontResult.candidates,
            command,
            fields,
            disambField: ontResult.field,
          });
          setSelectedCandidateIndex(0);
        } else {
          setCommandOutput(ontResult);
        }
        break;
      }

      case "archive": {
        if (!graphData || !actor) {
          setCommandOutput({
            success: false,
            message: formatGraphNotLoadedError(),
          });
          break;
        }
        const archiveName = getFieldStr(fields, "name");
        const archiveResult = await handleArchiveCommand(
          archiveName,
          graphData,
          actor,
          queryClient,
        );
        if ("needsDisambiguation" in archiveResult) {
          setPendingDisambiguation({
            candidates: archiveResult.candidates,
            command,
            fields,
            disambField: archiveResult.field,
          });
          setSelectedCandidateIndex(0);
        } else {
          setCommandOutput(archiveResult);
        }
        break;
      }

      default:
        setCommandOutput({
          success: false,
          message: `Error: Unknown command /${command}. Type /help for available commands.`,
        });
    }

    setIsExecuting(false);
  }

  async function handleDisambiguationConfirm(selectedNode: ResolvedNode) {
    if (!pendingDisambiguation) return;

    const { command, fields, disambField } = pendingDisambiguation;
    const resolvedFields = {
      ...fields,
      ...(disambField ? { [disambField]: selectedNode.id } : {}),
    };

    setPendingDisambiguation(null);
    setIsExecuting(true);

    const reconstructed = buildCommandString(
      command,
      resolvedFields,
      pendingDisambiguation.argument,
    );
    await handleExecuteInput(reconstructed);
  }

  function buildCommandString(
    command: string,
    fields: Record<string, string | string[]>,
    _argument?: string,
  ): string {
    const parts = [`/${command}`];
    for (const [key, value] of Object.entries(fields)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (v) parts.push(`${key}="${v}"`);
    }
    return parts.join(" ");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputMode === "command") {
      e.preventDefault();
      if (pendingDisambiguation) {
        handleDisambiguationConfirm(
          pendingDisambiguation.candidates[selectedCandidateIndex],
        );
      } else {
        handleExecuteInput();
      }
    } else if (e.key === "Escape") {
      if (pendingDisambiguation) {
        e.preventDefault();
        e.stopPropagation();
        setPendingDisambiguation(null);
      } else {
        onOpenChange(false);
      }
    } else if (e.key === "ArrowUp" && pendingDisambiguation) {
      e.preventDefault();
      setSelectedCandidateIndex(
        (i) =>
          (i - 1 + pendingDisambiguation.candidates.length) %
          pendingDisambiguation.candidates.length,
      );
    } else if (e.key === "ArrowDown" && pendingDisambiguation) {
      e.preventDefault();
      setSelectedCandidateIndex(
        (i) => (i + 1) % pendingDisambiguation.candidates.length,
      );
    }
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="/command-palette"
    >
      <div className="font-mono flex flex-col">
        <CommandInput
          value={inputValue}
          onValueChange={(val) => {
            setInputValue(val);
            const isCmd = val.startsWith("/");
            setInputMode(isCmd ? "command" : "search");
            if (!isCmd) {
              setCommandOutput(null);
              setPendingDisambiguation(null);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a command or search... (/ for command mode)"
          className="font-mono"
          data-ocid="command_palette.search_input"
        />

        {/* Output panel — command mode */}
        {inputMode === "command" && (
          <div className="px-3 py-2 min-h-[60px] max-h-[300px] overflow-y-auto border-t border-dashed border-border">
            {isExecuting && (
              <span className="text-muted-foreground text-xs animate-pulse font-mono">
                executing_
              </span>
            )}
            {!isExecuting && pendingDisambiguation && (
              <TerminalDisambiguationPicker
                candidates={pendingDisambiguation.candidates}
                selectedIndex={selectedCandidateIndex}
                onSelect={setSelectedCandidateIndex}
                onConfirm={handleDisambiguationConfirm}
                onCancel={() => setPendingDisambiguation(null)}
              />
            )}
            {!isExecuting && !pendingDisambiguation && commandOutput && (
              <pre
                className={`text-xs whitespace-pre-wrap font-mono ${
                  commandOutput.success ? "text-green-400" : "text-red-400"
                }`}
                data-ocid={
                  commandOutput.success
                    ? "command_palette.success_state"
                    : "command_palette.error_state"
                }
              >
                {commandOutput.message}
              </pre>
            )}
            {!isExecuting && !pendingDisambiguation && !commandOutput && (
              <span className="text-muted-foreground text-xs font-mono">
                Press Enter to execute
              </span>
            )}
          </div>
        )}

        {/* Command list — search mode */}
        {inputMode === "search" && (
          <CommandList>
            <CommandEmpty className="font-mono text-sm py-4 text-center">
              No commands found.
            </CommandEmpty>
            <CommandGroup heading="Navigation" className="font-mono">
              {navCommands.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => {
                    onViewChange(item.view);
                    // palette stays open — do NOT call onOpenChange(false)
                  }}
                  className="font-mono cursor-pointer"
                  data-ocid={`command_palette.${item.id}.button`}
                >
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Terminal Commands" className="font-mono">
              {terminalCommands.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.description}`}
                  onSelect={() => {
                    setInputValue(item.command);
                    setInputMode("command");
                    setCommandOutput(null);
                  }}
                  className="font-mono cursor-pointer flex items-center justify-between gap-4"
                  data-ocid={`command_palette.${item.id}.button`}
                >
                  <span className="shrink-0">{item.label}</span>
                  <span className="text-muted-foreground text-xs truncate">
                    {item.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </div>
    </CommandDialog>
  );
}
