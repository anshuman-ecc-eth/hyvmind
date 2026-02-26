// Shared sanitization utility for Turtle and Mermaid identifiers

/**
 * Sanitize a human-readable name to a valid Turtle local name / Mermaid node ID
 * - Replace spaces and special characters with underscores
 * - Keep alphanumeric, underscore, and hyphen
 * - Ensure it doesn't start with a number or hyphen
 * - Collapse multiple underscores
 */
export function sanitizeToLocalName(name: string): string {
  // Replace spaces and special characters with underscores
  let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Ensure it doesn't start with a number or hyphen
  if (/^[0-9-]/.test(sanitized)) {
    sanitized = 'n_' + sanitized;
  }
  
  // Collapse multiple underscores
  sanitized = sanitized.replace(/_+/g, '_');
  
  return sanitized;
}

/**
 * Truncate a label for compact display in Mermaid diagrams
 */
export function truncateLabel(label: string, maxLength: number = 20): string {
  if (label.length <= maxLength) {
    return label;
  }
  return label.substring(0, maxLength - 1) + '…';
}
