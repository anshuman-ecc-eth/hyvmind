export type NodeType =
  | "curation"
  | "swarm"
  | "location"
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
  publishedAt?: number;
}

export interface SourceGraphsStore {
  graphs: SourceGraph[];
  activeGraphId: string | null;
}

export interface PublishedNodeInfo {
  localName: string;
  backendId: string;
  nodeType: string;
  publishedAt: number;
}

export interface WeightedValue {
  value: string;
  weight: number;
}

export interface AttributeChange {
  key: string;
  oldValues: WeightedValue[];
  newValues: string[];
}

export interface NodeOperation {
  nodeType: string;
  localName: string;
  backendId: string | null;
  parentName: string | null;
  action: "create" | "update";
  attributeChanges?: AttributeChange[];
  attributes: [string, string[]][];
}

export interface EdgeOperation {
  sourceName: string;
  targetName: string;
  sourceId: string | null;
  targetId: string | null;
  action: "create" | "update";
  labels: string[];
  bidirectional: boolean;
  newLabels?: string[];
}

export interface PublishPreviewResult {
  nodeOperations: NodeOperation[];
  edgeOperations: EdgeOperation[];
  summary: {
    nodesToCreate: number;
    nodesToUpdate: number;
    edgesToCreate: number;
    edgesToUpdate: number;
  };
}

export interface ContentVersionInfo {
  content: string;
  contributor: string;
  timestamp: number;
}
