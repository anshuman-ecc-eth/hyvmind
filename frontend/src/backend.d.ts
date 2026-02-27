import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Location {
    id: NodeId;
    originalTokenSequence: string;
    title: string;
    creator: Principal;
    content: string;
    customAttributes: Array<CustomAttribute>;
    timestamps: Timestamps;
    parentSwarmId: NodeId;
    version: bigint;
}
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
export interface LawToken {
    id: NodeId;
    parentLocationId: NodeId;
    creator: Principal;
    meaning: string;
    timestamps: Timestamps;
    tokenLabel: string;
}
export type Time = bigint;
export interface BuzzLeaderboardEntry {
    principal: Principal;
    score: BuzzScore;
    profileName?: string;
}
export interface SwarmUpdate {
    status: SwarmUpdateStatus;
    tokenId: NodeId;
    userId: Principal;
    swarmId: NodeId;
    tokenTitle: string;
    creatorPrincipal: Principal;
    timestamp: Time;
}
export type Tag = string;
export interface MintCollectibleRequest {
    tokenId: NodeId;
    tokenType: Variant_lawToken_interpretationToken;
}
export interface GraphNode {
    id: NodeId;
    children: Array<GraphNode>;
    jurisdiction?: string;
    parentId?: NodeId;
    tokenLabel: string;
    nodeType: string;
}
export interface OwnedGraphData {
    curations: Array<Curation>;
    locations: Array<Location>;
    swarms: Array<Swarm>;
    lawTokens: Array<LawToken>;
    interpretationTokens: Array<InterpretationToken>;
}
export interface CollectibleEdition {
    tokenId: NodeId;
    editionNumber: bigint;
    owner: Principal;
    mintedAt: Time;
    tokenType: Variant_lawToken_interpretationToken;
}
export interface Curation {
    id: NodeId;
    creator: Principal;
    name: string;
    timestamps: Timestamps;
    jurisdiction: string;
}
export interface InterpretationToken {
    id: NodeId;
    title: string;
    creator: Principal;
    context: string;
    customAttributes: Array<CustomAttribute>;
    toRelationshipType: string;
    toNodeId: NodeId;
    fromDirectionality: Directionality;
    timestamps: Timestamps;
    fromTokenId: NodeId;
    toDirectionality: Directionality;
    fromRelationshipType: string;
}
export type NodeId = string;
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
export interface GraphEdge {
    source: NodeId;
    target: NodeId;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface GraphData {
    curations: Array<Curation>;
    rootNodes: Array<GraphNode>;
    edges: Array<GraphEdge>;
    locations: Array<Location>;
    swarms: Array<Swarm>;
    lawTokens: Array<LawToken>;
    interpretationTokens: Array<InterpretationToken>;
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
    timestamps: Timestamps;
    parentCurationId: NodeId;
}
export type BuzzScore = bigint;
export interface UserProfile {
    name: string;
    socialUrl?: string;
}
export interface MembershipInfo {
    status: MembershipStatus;
    principal: Principal;
    profileName?: string;
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
export enum MembershipStatus {
    pending = "pending",
    approved = "approved"
}
export enum SwarmUpdateStatus {
    acted = "acted",
    unread = "unread"
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
export interface backendInterface {
    approveJoinRequest(swarmId: NodeId, member: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCuration(name: string, jurisdiction: string): Promise<NodeId>;
    createInterpretationToken(title: string, context: string, fromTokenId: NodeId, fromRelationshipType: string, fromDirectionality: Directionality, toNodeId: NodeId, toRelationshipType: string, toDirectionality: Directionality, customAttributes: Array<CustomAttribute>): Promise<NodeId>;
    createLocation(title: string, content: string, originalTokenSequence: string, customAttributes: Array<CustomAttribute>, parentSwarmId: NodeId): Promise<NodeId>;
    createSwarm(name: string, tags: Array<Tag>, parentCurationId: NodeId): Promise<NodeId>;
    downvoteNode(nodeId: NodeId): Promise<void>;
    getBuzzLeaderboard(): Promise<Array<BuzzLeaderboardEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCollectibleEditions(tokenId: NodeId): Promise<Array<CollectibleEdition>>;
    getGraphData(): Promise<GraphData>;
    getMintSettings(): Promise<MintSettings>;
    getMyBuzzBalance(): Promise<BuzzScore>;
    getMyOwnedGraphData(): Promise<OwnedGraphData>;
    getSwarmMembers(swarmId: NodeId): Promise<Array<Principal>>;
    getSwarmMembershipRequests(swarmId: NodeId): Promise<Array<MembershipInfo>>;
    getSwarmUpdatesForUser(swarmId: NodeId): Promise<Array<SwarmUpdate>>;
    getSwarmsByCreator(): Promise<Array<Swarm>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVoteData(nodeId: NodeId): Promise<VoteData>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    mintCollectible(request: MintCollectibleRequest): Promise<MintCollectibleResult>;
    requestApproval(): Promise<void>;
    requestToJoinSwarm(swarmId: NodeId): Promise<void>;
    resetAllData(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setMintSettings(settings: MintSettings): Promise<void>;
    upvoteNode(nodeId: NodeId): Promise<void>;
}
