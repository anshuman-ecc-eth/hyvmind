// Fixed color palette for the 5 Hyvmind node types
// Colors matched to reference image (Graph tab light theme)

export interface NodeTypeStyle {
  fill: string;
  stroke: string;
  seed: string;
}

// Theme-independent color palette (fixed across light/dark modes)
// Matched to reference: Curation=red, Swarm=blue, Location=green, Law Token=purple, Interpretation Token=orange
export const NODE_TYPE_PALETTE: Record<string, NodeTypeStyle> = {
  curation: {
    fill: '#EF4444', // Red
    stroke: '#DC2626', // Darker red
    seed: '#000000', // Black seed
  },
  swarm: {
    fill: '#3B82F6', // Blue
    stroke: '#2563EB', // Darker blue
    seed: '#000000', // Black seed
  },
  location: {
    fill: '#10B981', // Green
    stroke: '#059669', // Darker green
    seed: '#000000', // Black seed
  },
  lawToken: {
    fill: '#8B5CF6', // Purple
    stroke: '#7C3AED', // Darker purple
    seed: '#000000', // Black seed
  },
  interpretationToken: {
    fill: '#F97316', // Orange
    stroke: '#EA580C', // Darker orange
    seed: '#000000', // Black seed
  },
};

// Fallback for unknown node types
export const DEFAULT_STYLE: NodeTypeStyle = {
  fill: '#808080',
  stroke: '#606060',
  seed: '#000000',
};

export function getNodeTypeStyle(nodeType: string): NodeTypeStyle {
  return NODE_TYPE_PALETTE[nodeType] || DEFAULT_STYLE;
}
