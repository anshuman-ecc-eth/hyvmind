export type NodeType =
  | "curation"
  | "swarm"
  | "location"
  | "sublocation"
  | "lawEntity"
  | "interpEntity";

export interface SourceNode {
  name: string;
  nodeType: NodeType;
  jurisdiction?: string;
  tags?: string[];
  source?: string;
  content?: string;
  from?: string;
  to?: string;
  parentName?: string;
  attributes?: Record<string, string>;
}

export interface Edge {
  source: string;
  target: string;
  label?: string;
  bidirectional?: boolean;
}

export interface SourceGraph {
  id: string;
  name: string;
  nodes: SourceNode[];
  edges: Edge[];
  createdAt: number;
}

export interface SourceGraphsStore {
  graphs: SourceGraph[];
  activeGraphId: string | null;
}
