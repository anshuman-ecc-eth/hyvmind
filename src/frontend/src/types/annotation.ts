export type TokenType = "lawEntity" | "interpEntity";

export interface AnnotationPath {
  curation: string;
  swarm: string;
  location: string;
  isNewCuration: boolean;
  isNewSwarm: boolean;
  isNewLocation: boolean;
}

export interface TokenAnnotation {
  id: string;
  start: number;
  end: number;
  tag: TokenType;
  name: string;
  color: string;
  attributes: Record<string, string>;
  inheritedAttributes?: Record<string, string>;
  parentLawTokenId?: string;
  linkedLawTokenIds: string[];
}

export interface AnnotationSession {
  id: string;
  url: string;
  title: string;
  rawText: string;
  tokens: string[];
  path: AnnotationPath;
  annotations: TokenAnnotation[];
  undoStack: AnnotationAction[];
  redoStack: AnnotationAction[];
  createdAt: number;
  updatedAt: number;
}

export type AnnotationAction =
  | { type: "CREATE_TOKEN"; token: TokenAnnotation }
  | { type: "DELETE_TOKEN"; token: TokenAnnotation }
  | {
      type: "UPDATE_TOKEN";
      tokenId: string;
      updates: Partial<TokenAnnotation>;
      previous: Partial<TokenAnnotation>;
    }
  | { type: "ADD_LINK"; interpId: string; lawId: string }
  | { type: "REMOVE_LINK"; interpId: string; lawId: string };
