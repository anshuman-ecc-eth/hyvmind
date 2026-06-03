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
    sources: Array<SourceRef>;
}
export interface LawToken {
    id: NodeId;
    parentLocationId: NodeId;
    creator: Principal;
    customAttributes: Array<WeightedAttribute>;
    timestamps: Timestamps;
    sources: Array<SourceRef>;
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
    sourcesCount?: bigint;
    artworkDataUrl?: string;
    hierarchyEdgeCount: bigint;
    nodeCount: bigint;
    terrainParams?: string;
    authors: string[];
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
    sourceChanges: Array<SourceRef>;
    attributes: Array<[string, Array<string>]>;
    backendId?: NodeId;
    parentName?: string;
    nodeType: string;
}
export interface BuzzLeaderboardEntry {
    principal: Principal;
    score: BuzzScore;
    profileName?: string;
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
    buzzCost: bigint;
    summary: {
        hierarchyEdgesToCreate: bigint;
        edgesToCreate: bigint;
        edgesToUpdate: bigint;
        attributesAdded: bigint;
        sourcesAdded: bigint;
        nodesToCreate: bigint;
        nodesToUpdate: bigint;
    };
    edgeOperations: Array<EdgeOperation>;
    nodeOperations: Array<NodeOperation>;
}
export interface GraphNode {
    id: NodeId;
    customAttributes: Array<WeightedAttribute>;
    children: Array<GraphNode>;
    jurisdiction?: string;
    sources: Array<SourceRef>;
    parentId?: NodeId;
    tokenLabel: string;
    nodeType: string;
}
export interface ExtensionEntry {
    addedNodes: bigint;
    extendedByName: string;
    addedSources?: bigint;
    addedAttributes: bigint;
    extendedAt: Time;
    extendedBy: Principal;
    addedHierarchyEdges: bigint;
    addedEdges: bigint;
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
        buzzCost: bigint;
        message: string;
        nodeMappings: Array<[string, NodeId]>;
    };
};
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
    sources: Array<SourceRef>;
}
export interface SourceRef {
    url: string;
    name: string;
}
export interface InterpretationToken {
    id: NodeId;
    title: string;
    creator: Principal;
    customAttributes: Array<WeightedAttribute>;
    timestamps: Timestamps;
    contentVersions: Array<ContentVersion>;
    sources: Array<SourceRef>;
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
    sources: Array<SourceRef>;
    parentName?: string;
    nodeType: string;
}
export interface Timestamps {
    createdAt: Time;
}
export type TrustScore = bigint;
export type NodeId = string;
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
export interface TrustTransaction {
    totalBuzzCost: bigint;
    saver: Principal;
    earned: bigint;
    savedAt: bigint;
    saveNumber: bigint;
    contributionIds: string[];
    contributionDetails: CreditedContribution[];
}

export interface CreditedContribution {
    contributionId: string;
    description: string;
    payer: Principal;
    buzzAmount: bigint;
    earned: bigint;
    saveCount: bigint;
}

export interface ContributionView {
    id: string;
    nodeId: NodeId;
    description: string;
    payer: Principal;
    buzzAmount: bigint;
    alreadyCredited: boolean;
    isFromExtension: boolean;
    extensionIndex?: bigint;
}

export type SaveResult = {
    __kind__: "ok";
    ok: { contributions: CreditedContribution[] };
} | {
    __kind__: "noNewTrust";
    noNewTrust: { reason: string };
} | {
    __kind__: "err";
    err: string;
};
export interface GraphData {
    curations: Array<Curation>;
    rootNodes: Array<GraphNode>;
    edges: Array<GraphEdge>;
    locations: Array<Location>;
    sources: Array<SourceRef>;
    swarms: Array<Swarm>;
    lawTokens: Array<LawToken>;
    interpretationTokens: Array<InterpretationToken>;
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
    sources: Array<SourceRef>;
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
export interface backendInterface {
    approvePluginBinding(pluginPubKey: Principal): Promise<void>;
    requestPluginBinding(pluginPubKey: Principal, forPrincipal: Principal): Promise<void>;
    archiveNode(nodeId: NodeId): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    commitPublishSourceGraph(input: PublishSourceGraphInput, existingMappings: Array<[string, NodeId]>): Promise<PublishCommitResult>;
    createCuration(name: string, customAttributes: Array<WeightedAttribute>): Promise<NodeId>;
    createInterpretationToken(title: string, content: string, parentLawTokenId: NodeId, customAttributes: Array<WeightedAttribute>): Promise<NodeId>;
    createLocation(title: string, customAttributes: Array<WeightedAttribute>, parentSwarmId: NodeId): Promise<NodeId>;
    createSwarm(name: string, tags: Array<Tag>, parentCurationId: NodeId, customAttributes: Array<WeightedAttribute>): Promise<NodeId>;
    generateApiKey(): Promise<string>;
    generateBuzzSecret(score: bigint): Promise<string>;
    generateInviteCodes(count: bigint, validDays: bigint): Promise<Array<string>>;
    getAllPublishedSourceGraphs(): Promise<Array<PublishedSourceGraphMeta>>;
    getArchivedNodeIds(): Promise<Array<NodeId>>;
    getBoundPluginKeys(): Promise<Array<Principal>>;
    getBuzzLeaderboard(topN: bigint): Promise<Array<BuzzLeaderboardEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannels(): Promise<Array<ChatChannelSummary>>;
    getMessages(channelId: string): Promise<{
        __kind__: "ok";
        ok: Array<ChatMessage>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getMyApiKey(): Promise<string | null>;
    getMyBuzzBalance(): Promise<BuzzScore>;
    getMyPrincipal(): Promise<Principal>;
    getMyTrustBalance(): Promise<TrustScore>;
    getMyTrustTransactions(): Promise<Array<TrustTransaction>>;
    getNotesData(): Promise<string | null>;
    getPendingPluginBindings(): Promise<Array<Principal>>;
    getPluginBindingStatus(): Promise<boolean>;
    getPublishedSourceGraph(publishedId: string): Promise<GraphData | null>;
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
    hasTelegramConfig(): Promise<boolean>;
    hasUserSavedGraph(publishedGraphId: string): Promise<boolean>;
    http_request(req: HttpRequest): Promise<HttpResponse>;
    icChallengeNonce(): Promise<string>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isNodeArchived(nodeId: NodeId): Promise<boolean>;
    previewPublishSourceGraph(input: PublishSourceGraphInput, existingMappings: Array<[string, NodeId]>): Promise<PublishPreviewResult>;
    redeemBuzzSecret(secret: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    resetAllData(): Promise<void>;
    revokeApiKey(): Promise<void>;
    revokePluginBinding(pluginKey: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    savePublishedGraph(publishedGraphId: string, selectedContributionIds: Array<string>): Promise<SaveResult>;
    getGraphContributions(publishedGraphId: string): Promise<Array<ContributionView>>;
    ensureContributionsMigrated(publishedGraphId: string): Promise<void>;
    sendMessage(channelId: string, text: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setTelegramConfig(botToken: string, chatId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    storeNotesData(json: string): Promise<void>;
    track_api_request(apiKey: string): Promise<void>;
    updateSourceGraphArtwork(id: string, dataUrl: string): Promise<boolean>;
    updateSourceGraphTerrainParams(id: string, paramsJson: string): Promise<boolean>;
}
