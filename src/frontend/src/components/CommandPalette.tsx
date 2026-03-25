import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: string) => void;
  onExecuteCommand: (command: string) => void;
}

const navCommands = [
  { id: "nav-graph", label: "Go to Graph", view: "graph" },
  { id: "nav-tree", label: "Go to List", view: "tree" },
  { id: "nav-terminal", label: "Go to Terminal", view: "terminal" },
  { id: "nav-swarms", label: "Go to Swarms", view: "swarms" },
  { id: "nav-collectibles", label: "Go to Collectibles", view: "collectibles" },
  { id: "nav-buzz", label: "Go to Leaderboard", view: "buzz" },
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
    id: "cmd-c",
    label: "/c name=<name>",
    description: "Create a curation",
    command: "/c name=",
  },
  {
    id: "cmd-s",
    label: "/s name=<name>",
    description: "Create a swarm",
    command: "/s name=",
  },
  {
    id: "cmd-l",
    label: "/l name=<name>",
    description: "Create a location",
    command: "/l name=",
  },
  {
    id: "cmd-i",
    label: "/i name=<name>",
    description: "Create an interpretation token",
    command: "/i name=",
  },
  {
    id: "cmd-archive",
    label: "/archive name=<node>",
    description: "Archive a node",
    command: "/archive name=",
  },
];

export default function CommandPalette({
  open,
  onOpenChange,
  onViewChange,
  onExecuteCommand,
}: CommandPaletteProps) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="/command-palette"
    >
      <div className="font-mono">
        <CommandInput
          placeholder="Type a command or search..."
          className="font-mono"
        />
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
                  onOpenChange(false);
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
                  onExecuteCommand(item.command);
                  onOpenChange(false);
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
      </div>
    </CommandDialog>
  );
}
