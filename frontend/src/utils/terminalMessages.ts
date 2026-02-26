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

Create Commands:

/c name=<name> juris=<ISO-3166-1-alpha-3>
  Create a Curation
  Example:
    /c name="Indian Constitution" juris=IND

/s name=<name> parent=<curation-name> [tags=<tag1,tag2>]
  Create a Swarm
  Example:
    /s name="Constitutional Law" parent="Indian Constitution" tags=law,constitution

/l name=<name> parent=<swarm-name> content=<text> [tokens={a}{b}{c}] [attr=<key:value,key:value>]
  Create a Location
  Example:
    /l name="Article 1" parent="Constitutional Law" content="The Union and its territory" tokens={Union}{territory}

/i name=<name> context=<text> from=<node-name> to=<node-name> [fromrel=<type>] [torel=<type>] [fromdir=<none|uni|bi>] [todir=<none|uni|bi>] [attr=<key:value,key:value>]
  Create an Interpretation Token
  Example:
    /i name="Interpretation 1" context="Analysis of Union" from="Union" to="territory"

Attribute Format:
  attr=key:value,key:value
  Supports typed tags: tag[type] where type is string, number, boolean, or date
  Example:
    attr=category:legal,year[number]:2024,active[boolean]:true,date[date]:2024-01-01

Notes:
  - Use quotes for names with spaces: name="My Node"
  - Jurisdiction codes must be valid ISO 3166-1 alpha-3 (e.g., IND, USA, GBR)
  - Directionality: none, uni (unidirectional), bi (bidirectional)`;
}

export function formatGraphNotLoadedError(): string {
  return 'Error: Graph data not loaded. Please wait for data to load.';
}

export function formatNodeNotFoundError(name: string, nodeType: string): string {
  return `Error: ${nodeType} "${name}" not found.`;
}

export function formatNoMatchesFound(searchTerm: string): string {
  return `No matches found for "${searchTerm}".`;
}

export function formatOntCommandMissingNameError(): string {
  return 'Error: /ont command requires a node name or ID.';
}

export function formatFilterMissingNameError(): string {
  return 'Error: /filter command requires a node name.';
}

export function formatFindResults(matches: Array<{ id: string; type: string; name: string; parentContext?: string }>): string {
  const lines = [`Found ${matches.length} match${matches.length === 1 ? '' : 'es'}:\n`];
  
  for (const match of matches) {
    const contextInfo = match.parentContext ? ` (in ${match.parentContext})` : '';
    lines.push(`  [${match.type}] ${match.name}${contextInfo}`);
  }
  
  return lines.join('\n');
}

export function formatFilterResults(results: Array<{ id: string; type: string; name: string; parentContext?: string }>): string {
  const lines = [`Found ${results.length} result${results.length === 1 ? '' : 's'}:\n`];
  
  for (const result of results) {
    const contextInfo = result.parentContext ? ` (in ${result.parentContext})` : '';
    lines.push(`  [${result.type}] ${result.name}${contextInfo}`);
  }
  
  return lines.join('\n');
}
