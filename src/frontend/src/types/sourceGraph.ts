export type NodeType =
  | "curation"
  | "swarm"
  | "location"
  | "lawEntity"
  | "lawRelation"
  | "interpEntity"
  | "interpRelation";

export interface SourceNode {
  id: string;
  name: string;
  nodeType: NodeType;
  jurisdiction?: string;
  tags?: string[];
  source?: string;
  content?: string;
  from?: string;
  to?: string;
  parentId?: string;
  attributes?: Record<string, string>;
}

export interface Edge {
  source: string;
  target: string;
  label?: string;
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
