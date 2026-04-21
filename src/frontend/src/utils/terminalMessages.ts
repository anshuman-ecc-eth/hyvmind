export function formatHelpText(): string {
  return `Available Commands:

/help
  Show this help message

/clear
  Clear terminal history

/find <search-term>
  Search for nodes by name
  Example:
    /find constitution

/ont name=<node-name-or-id>
  Generate ontology (Turtle + Mermaid) for a node
  Example:
    /ont name=l1
    /ont name="Indian Constitution"

/filter name=<node-name> [parent=<parent-name>] [child=<child-name>]
  Filter nodes by name and optional parent/child relationships
  Example:
    /filter name=token1
    /filter name=token1 parent=location1

/archive name=<node-name-or-id>
  Archive a node, hiding it from the graph and list views
  Example:
    /archive name="Article 1"
    /archive name=lawtoken123

Notes:
  - Use quotes for names with spaces: name="My Node"
  - To create nodes, publish a source graph from the Sources tab
  - Archived nodes are hidden locally; use /find to check if a node exists`;
}

export function formatGraphNotLoadedError(): string {
  return "Error: Graph data not loaded. Please wait for data to load.";
}

export function formatNodeNotFoundError(
  name: string,
  nodeType: string,
): string {
  return `Error: ${nodeType} "${name}" not found.`;
}

export function formatNoMatchesFound(searchTerm: string): string {
  return `No matches found for "${searchTerm}".`;
}

export function formatOntCommandMissingNameError(): string {
  return "Error: /ont command requires a node name or ID.";
}

export function formatFilterMissingNameError(): string {
  return "Error: /filter command requires a node name.";
}

export function formatArchiveMissingNameError(): string {
  return "Error: /archive command requires a node name or ID.\nUsage: /archive name=<node-name-or-id>";
}

export function formatFindResults(
  matches: Array<{
    id: string;
    type: string;
    name: string;
    parentContext?: string;
  }>,
): string {
  const lines = [
    `Found ${matches.length} match${matches.length === 1 ? "" : "es"}:\n`,
  ];

  for (const match of matches) {
    const contextInfo = match.parentContext
      ? ` (in ${match.parentContext})`
      : "";
    lines.push(`  [${match.type}] ${match.name}${contextInfo}`);
  }

  return lines.join("\n");
}

export function formatFilterResults(
  results: Array<{
    id: string;
    type: string;
    name: string;
    parentContext?: string;
  }>,
): string {
  const lines = [
    `Found ${results.length} result${results.length === 1 ? "" : "s"}:\n`,
  ];

  for (const result of results) {
    const contextInfo = result.parentContext
      ? ` (in ${result.parentContext})`
      : "";
    lines.push(`  [${result.type}] ${result.name}${contextInfo}`);
  }

  return lines.join("\n");
}

export function formatDebugError(message: string): string {
  return `❌ Debug error: ${message}`;
}

export function formatDebugHelpText(isAdmin: boolean): string {
  if (!isAdmin) {
    return "❌ Access denied. Admin only.";
  }
  return `Debug Commands (Admin Only):

Syntax: /debug <action> [paramName=value]

Actions:
  ownedgraph              Get caller's owned graph data
  allgraph                Get all public graph data
  archived                Get all archived node IDs
  profile                 Get caller user profile
  role                    Get caller user role
  admin                   Check if caller is admin
  approved                Check if caller is approved
  approvals               List all approvals
  swarmsbycreator         Get swarms created by caller
  leaderboard             Get BUZZ leaderboard
  mybuzz                  Get my BUZZ balance
  mintsets                Get mint settings
  swarm swarmId=<id>      Get swarm members
  updates swarmId=<id>    Get swarm updates for user
  unvoted swarmId=<id>    Get unvoted tokens for swarm
  vote nodeId=<id>        Get vote data for node
  editions nodeId=<id>    Get collectible editions for node
  userprofile user=<id>   Get user profile by principal
  userlawtokens           Get my law tokens
  userinterp              Get my interpretation tokens
  reset                   Reset all data (requires confirmation)

Examples:
  /debug admin
  /debug ownedgraph
  /debug allgraph
  /debug swarm swarmId=s_abc123
  /debug vote nodeId=t_abc123
  /debug reset`;
}

export function formatTelegramConfigHelp(): string {
  return [
    "",
    "Telegram Config (Admin):",
    "  /config telegram_token=<token>     set bot token",
    "  /config telegram_chat_id=<id>      set chat/forum group id",
    "  /config telegram_status            show config status",
    "  /config telegram_clear             clear all telegram config",
    "",
    "  example: /config telegram_token=123456789:ABCDefgh...",
    "  example: /config telegram_chat_id=-1001234567890",
  ].join("\n");
}
