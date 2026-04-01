import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type MintCollectibleResult = {
    __kind__: "editionLimitReached";
    editionLimitReached: null;
} | {
    __kind__: "alreadyOwned";
    alreadyOwned: null;
} | {
    __kind__: "insufficientFunds";
    insufficientFunds: null;
} | {
    __kind__: "success";
    success: CollectibleEdition;
} | {
    __kind__: "tokenNotFound";
    tokenNotFound: null;
};
export type NodeId = string;
export type Time = bigint;
export interface VoteData {
    upvotes: bigint;
    downvotes: bigint;
}
export interface Timestamps {
    createdAt: Time;
}
export interface MintSettings {
    numCopies: bigint;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export type Tag = string;
export interface MintCollectibleRequest {
    tokenId: NodeId;
    tokenType: Variant_lawToken_interpretationToken;
}
export interface CollectibleEdition {
    tokenId: NodeId;
    editionNumber: bigint;
    owner: Principal;
    mintedAt: Time;
    tokenType: Variant_lawToken_interpretationToken;
}
export interface CustomAttribute {
    key: string;
    value: string;
}
export interface Swarm {
    id: NodeId;
    creator: Principal;
    name: string;
    tags: Array<Tag>;
    forkSource?: NodeId;
    timestamps: Timestamps;
    parentCurationId: NodeId;
    forkPrincipal?: Principal;
}
export type BuzzScore = bigint;
export interface UserProfile {
    name: string;
    socialUrl?: string;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum Directionality {
    none = "none",
    bidirectional = "bidirectional",
    unidirectional = "unidirectional"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_lawToken_interpretationToken {
    lawToken = "lawToken",
    interpretationToken = "interpretationToken"
}
export interface GraphNode {
    id: NodeId;
    nodeType: string;
    tokenLabel: string;
    jurisdiction?: string;
    parentId?: NodeId;
    children: GraphNode[];
}
export interface GraphEdge {
    source: NodeId;
    target: NodeId;
}
export interface OwnedGraphData {
    curations: Array<Curation>;
    swarms: Array<Swarm>;
    locations: Array<Location>;
    lawTokens: Array<LawToken>;
    interpretationTokens: Array<InterpretationToken>;
    sublocations?: Array<Sublocation>;
    edges?: Array<GraphEdge>;
}
export interface GraphData {
    curations: Array<Curation>;
    swarms: Array<Swarm>;
    locations: Array<Location>;
    lawTokens: Array<LawToken>;
    interpretationTokens: Array<InterpretationToken>;
    sublocations: Array<Sublocation>;
    rootNodes: Array<GraphNode>;
    edges: Array<GraphEdge>;
}
export interface Curation {
    id: NodeId;
    name: string;
    jurisdiction: string;
    creator: Principal;
    timestamps: Timestamps;
}
export interface Location {
    id: NodeId;
    title: string;
    content: string;
    originalTokenSequence: string;
    customAttributes: Array<CustomAttribute>;
    parentSwarmId: NodeId;
    creator: Principal;
    version: number;
    timestamps: Timestamps;
}
export interface LawToken {
    id: NodeId;
    tokenLabel: string;
    parentLocationId: NodeId;
    creator: Principal;
    timestamps: Timestamps;
}
export interface Sublocation {
    id: NodeId;
    title: string;
    content: string;
    originalTokenSequence: string;
    creator: Principal;
    timestamps: Timestamps;
}
export interface InterpretationToken {
    id: NodeId;
    title: string;
    context: string;
    fromTokenId: NodeId;
    fromRelationshipType: string;
    fromDirectionality: Directionality;
    toNodeId: NodeId;
    toRelationshipType: string;
    toDirectionality: Directionality;
    customAttributes: Array<CustomAttribute>;
    creator: Principal;
    timestamps: Timestamps;
}
export interface backendInterface {
    archiveNode(nodeId: NodeId): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCuration(name: string, jurisdiction: string): Promise<NodeId>;
    createInterpretationToken(title: string, context: string, fromTokenId: NodeId, fromRelationshipType: string, fromDirectionality: Directionality, toNodeId: NodeId, toRelationshipType: string, toDirectionality: Directionality, customAttributes: Array<CustomAttribute>): Promise<NodeId>;
    createLocation(title: string, content: string, originalTokenSequence: string, customAttributes: Array<CustomAttribute>, parentSwarmId: NodeId): Promise<NodeId>;
    createSublocation(title: string, content: string, originalTokenSequence: string, parentLawTokenIds: Array<NodeId>): Promise<NodeId>;
    createSwarm(name: string, tags: Array<Tag>, parentCurationId: NodeId): Promise<NodeId>;
    downvoteNode(nodeId: NodeId): Promise<void>;
    getArchivedNodeIds(): Promise<Array<NodeId>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCollectibleEditions(tokenId: NodeId): Promise<Array<CollectibleEdition>>;
    getAllData(): Promise<GraphData>;
    getLeaderboard(): Promise<Array<{ principal: Principal; score: bigint }>>;
    getMintSettings(): Promise<MintSettings>;
    getMyBuzzBalance(): Promise<BuzzScore>;
    getOwnedData(): Promise<OwnedGraphData>;
    getSwarmForks(swarmId: NodeId): Promise<Array<Swarm>>;
    getSwarmMembers(swarmId: NodeId): Promise<Array<Principal>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVoteData(nodeId: NodeId): Promise<VoteData>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isNodeArchived(nodeId: NodeId): Promise<boolean>;
    joinSwarm(swarmId: NodeId): Promise<NodeId>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    mintCollectible(request: MintCollectibleRequest): Promise<MintCollectibleResult>;
    pullFromSwarm(targetSwarmId: NodeId): Promise<NodeId>;
    createSwarmFork(swarmId: NodeId): Promise<NodeId>;
    leaveSwarm(swarmId: NodeId): Promise<void>;
    hasUserFork(swarmId: NodeId): Promise<boolean>;
    requestApproval(): Promise<void>;
    resetAllData(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setMintSettings(settings: MintSettings): Promise<void>;
    upvoteNode(nodeId: NodeId): Promise<void>;
}
