/**
 * Terminal output formatting utilities for auto-indentation and visual hierarchy
 */

export type LineToken = {
  type: 'heading' | 'command' | 'description' | 'example' | 'list' | 'blank' | 'result';
  text: string;
  indent: number;
};

/**
 * Parse raw message text into structured line tokens with indentation and type metadata
 */
export function formatTerminalOutput(text: string, messageType: 'success' | 'error' | 'example' | 'command' | 'ontology'): LineToken[] {
  const lines = text.split('\n');
  const tokens: LineToken[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank lines
    if (trimmed === '') {
      tokens.push({ type: 'blank', text: '', indent: 0 });
      continue;
    }

    // Detect headings (lines ending with colon or all caps)
    if (trimmed.endsWith(':') || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.startsWith('/'))) {
      tokens.push({ type: 'heading', text: trimmed, indent: 0 });
      continue;
    }

    // Detect commands (lines starting with forward slash)
    if (trimmed.startsWith('/')) {
      tokens.push({ type: 'command', text: trimmed, indent: 1 });
      continue;
    }

    // Detect example markers
    if (trimmed.startsWith('Example:')) {
      tokens.push({ type: 'example', text: trimmed, indent: 1 });
      continue;
    }

    // Detect list items (lines starting with dash or bullet)
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
      tokens.push({ type: 'list', text: trimmed, indent: 2 });
      continue;
    }

    // Detect result lines (lines with brackets like [Type])
    if (trimmed.match(/^\[[\w\s]+\]/)) {
      tokens.push({ type: 'result', text: trimmed, indent: 2 });
      continue;
    }

    // Detect description lines (indented or following a command/heading)
    const prevToken = tokens[tokens.length - 1];
    if (line.startsWith('  ') || (prevToken && (prevToken.type === 'command' || prevToken.type === 'heading'))) {
      tokens.push({ type: 'description', text: trimmed, indent: 2 });
      continue;
    }

    // Default: treat as description with minimal indent
    tokens.push({ type: 'description', text: trimmed, indent: 1 });
  }

  return tokens;
}

/**
 * Get emoji marker for message type (only for success/error)
 */
export function getMessageTypeEmoji(messageType: 'success' | 'error' | 'example' | 'command' | 'ontology'): string | undefined {
  switch (messageType) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    default:
      return undefined;
  }
}
