interface ParsedCommand {
  success: boolean;
  command?: string;
  fields?: Record<string, string | string[]>;
  argument?: string;
  error?: string;
}

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  // Check if starts with forward slash
  if (!trimmed.startsWith("/")) {
    // Explicit rejection for backslash-prefixed commands
    if (trimmed.startsWith("\\")) {
      return {
        success: false,
        error: "Error: Commands must start with / (not \\)",
      };
    }
    return {
      success: false,
      error: "Error: Command must start with /",
    };
  }

  // Extract command (first word after forward slash)
  const commandMatch = trimmed.match(/^\/([a-z]+)\s*/i);
  if (!commandMatch) {
    return {
      success: false,
      error: "Error: Invalid command format",
    };
  }

  const command = commandMatch[1];
  const rest = trimmed.slice(commandMatch[0].length);

  // Special handling for /find and /debug commands (take a simple argument, not key=value)
  if (command === "find" || command === "debug") {
    return {
      success: true,
      command,
      argument: rest.trim(),
      fields: {},
    };
  }

  // Parse key=value pairs
  const fields: Record<string, string | string[]> = {};

  // Enhanced regex to handle tokens={...}{...} syntax
  let currentPos = 0;
  const restStr = rest;

  while (currentPos < restStr.length) {
    // Skip whitespace
    while (currentPos < restStr.length && /\s/.test(restStr[currentPos])) {
      currentPos++;
    }

    if (currentPos >= restStr.length) break;

    // Match key
    const keyMatch = restStr.slice(currentPos).match(/^([a-zA-Z0-9_.]+)=/);
    if (!keyMatch) {
      currentPos++;
      continue;
    }

    const key = keyMatch[1];
    currentPos += keyMatch[0].length;

    // Check if value starts with quote
    if (restStr[currentPos] === '"') {
      // Quoted value
      currentPos++; // skip opening quote
      let value = "";
      let escaped = false;

      while (currentPos < restStr.length) {
        const ch = restStr[currentPos];
        if (escaped) {
          value += ch;
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          currentPos++; // skip closing quote
          break;
        } else {
          value += ch;
        }
        currentPos++;
      }

      addField(fields, key, value);
    } else if (key === "tokens" && restStr[currentPos] === "{") {
      // Special handling for tokens={...}{...} syntax
      let value = "";
      let braceDepth = 0;
      const _startPos = currentPos;

      while (currentPos < restStr.length) {
        const ch = restStr[currentPos];
        if (ch === "{") {
          braceDepth++;
          value += ch;
        } else if (ch === "}") {
          value += ch;
          braceDepth--;
          if (braceDepth === 0) {
            currentPos++;
            // Continue capturing more {...} blocks
            while (
              currentPos < restStr.length &&
              /\s/.test(restStr[currentPos])
            ) {
              currentPos++;
            }
            if (currentPos < restStr.length && restStr[currentPos] === "{") {
              continue;
            }
            break;
          }
        } else if (/\s/.test(ch) && braceDepth === 0) {
          break;
        } else {
          value += ch;
        }
        currentPos++;
      }

      addField(fields, key, value);
    } else {
      // Unquoted value (stop at whitespace)
      let value = "";
      while (currentPos < restStr.length && !/\s/.test(restStr[currentPos])) {
        value += restStr[currentPos];
        currentPos++;
      }

      addField(fields, key, value);
    }
  }

  return {
    success: true,
    command,
    fields,
  };
}

function addField(
  fields: Record<string, string | string[]>,
  key: string,
  value: string,
) {
  // Handle repeated keys (for attributes)
  if (fields[key]) {
    if (Array.isArray(fields[key])) {
      (fields[key] as string[]).push(value);
    } else {
      fields[key] = [fields[key] as string, value];
    }
  } else {
    fields[key] = value;
  }
}
