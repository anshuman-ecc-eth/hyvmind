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
    title: string;
    creator: Principal;
    customAttributes: Array<WeightedAttribute>;
    timestamps: Timestamps;
    parentSwarmId: NodeId;
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
    customAttributes: Array<WeightedAttribute>;
    timestamps: Timestamps;
    tokenLabel: string;
}
export type Time = bigint;
export interface ChatChannelSummary {
    id: string;
    name: string;
    isSubchannel: boolean;
    unreadCount: bigint;
    parentCuration?: string;
}
export interface PublishedSourceGraphMeta {
    id: string;
    creator: Principal;
    extensionLog: Array<ExtensionEntry>;
    name: string;
    publishedAt: Time;
    attributeCount: bigint;
    creatorName: string;
    edgeCount: bigint;
    nodeCount: bigint;
}
export interface NodeOperation {
    localName: string;
    action: {
        __kind__: "create";
        create: null;
    } | {
        __kind__: "update";
        update: Array<AttributeChange>;
    };
    attributes: Array<[string, Array<string>]>;
    backendId?: NodeId;
    parentName?: string;
    nodeType: string;
}
export interface AttributeChange {
    key: string;
    newValues: Array<string>;
    oldValues: Array<WeightedValue>;
    newWeightedValues: Array<WeightedValue>;
}
export type Tag = string;
export interface SourceGraphEdgeInput {
    sourceName: string;
    bidirectional: boolean;
    targetName: string;
    edgeLabel: string;
}
export interface PublishPreviewResult {
    summary: {
        edgesToCreate: bigint;
        edgesToUpdate: bigint;
        nodesToCreate: bigint;
        nodesToUpdate: bigint;
    };
    edgeOperations: Array<EdgeOperation>;
    nodeOperations: Array<NodeOperation>;
}
export interface MintCollectibleRequest {
    tokenId: NodeId;
    tokenType: Variant_lawToken_interpretationToken;
}
export interface GraphNode {
    id: NodeId;
    customAttributes: Array<WeightedAttribute>;
    children: Array<GraphNode>;
    jurisdiction?: string;
    parentId?: NodeId;
    tokenLabel: string;
    nodeType: string;
}
export type PublishCommitResult = {
    __kind__: "error";
    error: {
        message: string;
        failedAt?: {
            name: string;
            nodeType: string;
        };
    };
} | {
    __kind__: "success";
    success: {
        publishedSourceGraphId?: string;
        message: string;
        nodeMappings: Array<[string, NodeId]>;
    };
};
export interface ExtensionEntry {
    addedNodes: bigint;
    addedAttributes: bigint;
    extendedAt: Time;
    addedEdges: bigint;
}
export interface CollectibleEdition {
    tokenId: NodeId;
    editionNumber: bigint;
    owner: Principal;
    mintedAt: Time;
    tokenType: Variant_lawToken_interpretationToken;
}
export interface ChatMessage {
    text: string;
    sender: Principal;
    timestamp: bigint;
    senderName: string;
}
export interface Curation {
    id: NodeId;
    creator: Principal;
    customAttributes: Array<WeightedAttribute>;
    name: string;
    timestamps: Timestamps;
}
export interface InterpretationToken {
    id: NodeId;
    title: string;
    creator: Principal;
    customAttributes: Array<WeightedAttribute>;
    timestamps: Timestamps;
    contentVersions: Array<ContentVersion>;
    parentLawTokenId: NodeId;
}
export interface PublishSourceGraphInput {
    edges: Array<SourceGraphEdgeInput>;
    nodes: Array<SourceGraphNodeInput>;
}
export interface WeightedAttribute {
    key: string;
    weightedValues: Array<WeightedValue>;
}
export interface SourceGraphNodeInput {
    id?: string;
    content?: string;
    name: string;
    tags: Array<string>;
    jurisdiction?: string;
    attributes: Array<[string, Array<string>]>;
    parentName?: string;
    nodeType: string;
}
export interface Timestamps {
    createdAt: Time;
}
export interface VoteData {
    upvotes: bigint;
    downvotes: bigint;
}
export type NodeId = string;
export interface MintSettings {
    numCopies: bigint;
}
export interface GraphEdge {
    source: NodeId;
    directionality: Directionality;
    target: NodeId;
    edgeLabel: string;
}
export interface ContentVersion {
    content: string;
    timestamp: Time;
    contributor: Principal;
}
export interface HttpHeader {
    value: string;
    name: string;
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
export interface IcHttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface HttpResponse {
    body: Uint8Array;
    headers: Array<[string, string]>;
    status_code: number;
}
export type BuzzScore = bigint;
export interface Swarm {
    id: NodeId;
    creator: Principal;
    customAttributes: Array<WeightedAttribute>;
    name: string;
    tags: Array<Tag>;
    forkSource?: NodeId;
    timestamps: Timestamps;
    parentCurationId: NodeId;
    forkPrincipal?: Principal;
}
export interface EdgeOperation {
    action: {
        __kind__: "create";
        create: null;
    } | {
        __kind__: "update";
        update: {
            newLabels: Array<string>;
        };
    };
    labels: Array<string>;
    sourceId?: NodeId;
    sourceName: string;
    bidirectional: boolean;
    targetName: string;
    targetId?: NodeId;
}
export interface WeightedValue {
    weight: bigint;
    value: string;
}
export interface UserProfile {
    name: string;
    socialUrl?: string;
}
export interface HttpRequest {
    url: string;
    method: string;
    body: Uint8Array;
    headers: Array<[string, string]>;
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
export interface backendInterface {
    archiveNode(nodeId: NodeId): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    commitPublishSourceGraph(input: PublishSourceGraphInput, existingMappings: Array<[string, NodeId]>): Promise<PublishCommitResult>;
    createCuration(name: string, customAttributes: Array<WeightedAttribute>): Promise<NodeId>;
    createInterpretationToken(title: string, content: string, parentLawTokenId: NodeId, customAttributes: Array<WeightedAttribute>): Promise<NodeId>;
    createLocation(title: string, customAttributes: Array<WeightedAttribute>, parentSwarmId: NodeId): Promise<NodeId>;
    createSwarm(name: string, tags: Array<Tag>, parentCurationId: NodeId, customAttributes: Array<WeightedAttribute>): Promise<NodeId>;
    createSwarmFork(swarmId: NodeId): Promise<NodeId>;
    downvoteNode(nodeId: NodeId): Promise<void>;
    fetchURL(url: string): Promise<{
        __kind__: "ok";
        ok: {
            title: string;
            html: string;
        };
    } | {
        __kind__: "err";
        err: string;
    }>;
    generateApiKey(): Promise<string>;
    getAllPublishedSourceGraphs(): Promise<Array<PublishedSourceGraphMeta>>;
    getArchivedNodeIds(): Promise<Array<NodeId>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannels(): Promise<Array<ChatChannelSummary>>;
    getCollectibleEditions(tokenId: NodeId): Promise<Array<CollectibleEdition>>;
    getMessages(channelId: string): Promise<{
        __kind__: "ok";
        ok: Array<ChatMessage>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getMintSettings(): Promise<MintSettings>;
    getMyApiKey(): Promise<string | null>;
    getMyBuzzBalance(): Promise<BuzzScore>;
    getPublishedPaths(): Promise<Array<{
        graphId: string;
        swarm: string;
        curation: string;
        location: string;
    }>>;
    getPublishedSourceGraph(publishedId: string): Promise<GraphData | null>;
    getSwarmForks(swarmId: NodeId): Promise<Array<Swarm>>;
    getSwarmMembers(swarmId: NodeId): Promise<Array<Principal>>;
    getTelegramConfig(): Promise<{
        chatId: string;
        botToken: string;
    } | null>;
    getTelegramConfigStatus(): Promise<{
        updatedAt?: bigint;
        updatedBy?: string;
        hasToken: boolean;
        hasChatId: boolean;
    }>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVoteData(nodeId: NodeId): Promise<VoteData>;
    hasTelegramConfig(): Promise<boolean>;
    hasUserFork(swarmId: NodeId): Promise<boolean>;
    http_request(req: HttpRequest): Promise<HttpResponse>;
    icChallengeNonce(): Promise<string>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    isNodeArchived(nodeId: NodeId): Promise<boolean>;
    joinSwarm(swarmId: NodeId): Promise<void>;
    leaveSwarm(swarmId: NodeId): Promise<void>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    mintCollectible(request: MintCollectibleRequest): Promise<MintCollectibleResult>;
    previewPublishSourceGraph(input: PublishSourceGraphInput, existingMappings: Array<[string, NodeId]>): Promise<PublishPreviewResult>;
    pullFromSwarm(sourceSwarmId: NodeId): Promise<NodeId>;
    requestApproval(): Promise<void>;
    resetAllData(): Promise<void>;
    revokeApiKey(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendMessage(channelId: string, text: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setMintSettings(settings: MintSettings): Promise<void>;
    setTelegramConfig(botToken: string, chatId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    track_api_request(apiKey: string): Promise<void>;
    transform(arg0: {
        context: Uint8Array;
        response: IcHttpRequestResult;
    }): Promise<IcHttpRequestResult>;
    upvoteNode(nodeId: NodeId): Promise<void>;
}
