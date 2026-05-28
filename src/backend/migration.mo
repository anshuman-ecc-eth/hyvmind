import Map "mo:core/Map";
import List "mo:core/List";

module {

  // ── Old types (as they existed in the previous canister version) ─────────────

  type NodeId = Text;
  type Tag = Text;
  type BuzzScore = Int;
  type TrustScore = Int;
  type Time = Int;

  type Timestamps = { createdAt : Time };
  type WeightedValue = { value : Text; weight : Nat };
  type WeightedAttribute = { key : Text; weightedValues : [WeightedValue] };
  type SourceRef = { name : Text; url : Text };
  type ContentVersion = { content : Text; contributor : Principal; timestamp : Time };
  type UserProfile = { name : Text; socialUrl : ?Text };
  type BuzzSecretRecord = { points : Int; createdAt : Int; expiresAt : Int; isUsed : Bool };
  type BuzzTransaction = { amount : Int; timestamp : Int; publishedGraphId : Text };
  type TrustTransaction = { saver : Principal; savedAt : Int; saveNumber : Nat; totalBuzzCost : Int; earned : Int };
  type NodeContribution = { payers : List.List<(Principal, Int)> };
  type ExtensionEntry = {
    extendedAt : Time;
    extendedBy : Principal;
    extendedByName : Text;
    addedNodes : Nat;
    addedEdges : Nat;
    addedHierarchyEdges : Nat;
    addedAttributes : Nat;
    addedSources : ?Nat;
  };
  type PublishedSourceGraphMeta = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    publishedAt : Time;
    nodeCount : Nat;
    edgeCount : Nat;
    hierarchyEdgeCount : Nat;
    attributeCount : Nat;
    sourcesCount : ?Nat;
    extensionLog : [ExtensionEntry];
    artworkDataUrl : ?Text;
    terrainParams : ?Text;
  };
  type Directionality = { #none; #unidirectional; #bidirectional };
  type SourceGraphEdge = {
    source : NodeId;
    target : NodeId;
    weightedLabels : [WeightedValue];
    directionality : Directionality;
  };
  type Curation = {
    id : NodeId;
    name : Text;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    timestamps : Timestamps;
  };
  type Swarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    timestamps : Timestamps;
    forkSource : ?NodeId;
    forkPrincipal : ?Principal;
  };
  type Location = {
    id : NodeId;
    title : Text;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    parentSwarmId : NodeId;
    creator : Principal;
    timestamps : Timestamps;
  };
  type LawToken = {
    id : NodeId;
    tokenLabel : Text;
    parentLocationId : NodeId;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    timestamps : Timestamps;
  };
  type InterpretationToken = {
    id : NodeId;
    title : Text;
    contentVersions : [ContentVersion];
    parentLawTokenId : NodeId;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    creator : Principal;
    timestamps : Timestamps;
  };
  type ChatMessage = { sender : Principal; senderName : Text; text : Text; timestamp : Int };
  type ChatChannel = {
    id : Text;
    name : Text;
    isSubchannel : Bool;
    parentCuration : ?Text;
    members : List.List<Principal>;
    messages : List.List<ChatMessage>;
    unreadCounts : Map.Map<Principal, Nat>;
  };
  type TelegramConfig = {
    encryptedBotToken : Blob;
    encryptedChatId : Blob;
    updatedAt : Nat64;
    updatedBy : Principal;
  };
  type UserRole = { #admin; #guest; #user };
  type ApprovalStatus = { #approved; #pending; #rejected };

  // ── Types for removed stable variables ────────────────────────────────────

  type MembershipStatus = { #pending; #approved };
  type SwarmMembership = { swarmId : NodeId; member : Principal; status : MembershipStatus };
  type SwarmType = { #questionOfLaw; #regular };
  type SwarmUpdateStatus = { #unread; #acted };
  type SwarmUpdate = {
    swarmId : NodeId;
    tokenId : NodeId;
    tokenTitle : Text;
    creatorPrincipal : Principal;
    timestamp : Time;
    status : SwarmUpdateStatus;
    userId : Principal;
  };
  type ForkedSwarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    timestamps : Timestamps;
    forkSource : ?NodeId;
    forkPrincipal : ?Principal;
  };
  type VoteData = { upvotes : Nat; downvotes : Nat };
  type UserVoteTracking = { votedNodes : Map.Map<Text, Bool> };
  type MintSettings = { numCopies : Nat };
  type CollectibleEdition = {
    tokenId : NodeId;
    tokenType : { #lawToken; #interpretationToken };
    editionNumber : Nat;
    owner : Principal;
    mintedAt : Time;
  };

  // ── OldActor: all stable fields from the previous deployed version ─────────

  type OldActor = {
    // Constants
    BUZZ_DECIMALS : Int;
    HEX_CHARS : [Text];
    TRUST_DECIMALS : Int;

    // Access control
    accessControlState : { var adminAssigned : Bool; userRoles : Map.Map<Principal, UserRole> };

    // HTTP API
    var apiKeysByPrincipal : Map.Map<Principal, Text>;
    var apiRateLimitCounts : Map.Map<Text, Nat>;
    var apiRateLimitWindowStarts : Map.Map<Text, Int>;
    var principalByApiKey : Map.Map<Text, Principal>;

    // Approval (REMOVED)
    approvalState : { var approvalStatus : Map.Map<Principal, ApprovalStatus> };

    // Core maps (kept)
    var archivedNodes : Map.Map<NodeId, ()>;
    var buzzScores : Map.Map<Principal, BuzzScore>;
    var buzzSecrets : Map.Map<Text, BuzzSecretRecord>;
    var buzzTransactions : Map.Map<Principal, List.List<BuzzTransaction>>;
    var chatChannels : Map.Map<Text, ChatChannel>;
    var curationMap : Map.Map<NodeId, Curation>;
    var curationToPublishedGraphId : Map.Map<NodeId, Text>;
    var existingAdmins : [Principal];
    var graphSavers : Map.Map<Text, List.List<Principal>>;
    var interpretationTokenMap : Map.Map<NodeId, InterpretationToken>;
    var lawTokenMap : Map.Map<NodeId, LawToken>;
    var locationMap : Map.Map<NodeId, Location>;
    var notesImports : Map.Map<Principal, Text>;
    var pendingPluginBindings : Map.Map<Principal, List.List<Principal>>;
    var pluginBindings : Map.Map<Principal, Principal>;
    var publishedGraphBuzzMetrics : Map.Map<Text, { cumulativeBuzzSpent : Int; extensionCount : Nat }>;
    var publishedNodeContributions : Map.Map<Text, Map.Map<NodeId, NodeContribution>>;
    var publishedSourceGraphs : Map.Map<Text, PublishedSourceGraphMeta>;
    var sourceEdges : Map.Map<NodeId, List.List<SourceGraphEdge>>;
    var swarmMap : Map.Map<NodeId, Swarm>;
    var telegramConfig : ?TelegramConfig;
    var trustScores : Map.Map<Principal, TrustScore>;
    var trustTransactions : Map.Map<Principal, List.List<TrustTransaction>>;
    var userProfiles : Map.Map<Principal, UserProfile>;

    // Collectibles (REMOVED)
    collectibleEditionsMap : Map.Map<NodeId, List.List<CollectibleEdition>>;
    collectibleSupplyMap : Map.Map<NodeId, Nat>;

    // Swarm membership (REMOVED)
    var forkPulledSourceNodes : Map.Map<NodeId, List.List<NodeId>>;
    var forkedSwarmMap : Map.Map<NodeId, ForkedSwarm>;
    var membershipRequests : Map.Map<NodeId, List.List<SwarmMembership>>;
    mintSettingsMap : Map.Map<Principal, MintSettings>;
    var swarmMembers : Map.Map<NodeId, List.List<Principal>>;
    var swarmTypeMap : Map.Map<NodeId, SwarmType>;
    var swarmUpdates : Map.Map<Principal, List.List<SwarmUpdate>>;

    // Voting (REMOVED)
    userVoteTracking : Map.Map<Principal, UserVoteTracking>;
    voteData : Map.Map<Text, VoteData>;
    var voteDataMap : Map.Map<Text, VoteData>;
  };

  // ── NewActor: stable fields in the current actor (all non-removed) ─────────

  type NewActor = {
    // Constants
    BUZZ_DECIMALS : Int;
    HEX_CHARS : [Text];
    TRUST_DECIMALS : Int;

    // Access control
    accessControlState : { var adminAssigned : Bool; userRoles : Map.Map<Principal, UserRole> };

    // HTTP API
    var apiKeysByPrincipal : Map.Map<Principal, Text>;
    var apiRateLimitCounts : Map.Map<Text, Nat>;
    var apiRateLimitWindowStarts : Map.Map<Text, Int>;
    var principalByApiKey : Map.Map<Text, Principal>;

    // Core maps
    var archivedNodes : Map.Map<NodeId, ()>;
    var buzzScores : Map.Map<Principal, BuzzScore>;
    var buzzSecrets : Map.Map<Text, BuzzSecretRecord>;
    var buzzTransactions : Map.Map<Principal, List.List<BuzzTransaction>>;
    var chatChannels : Map.Map<Text, ChatChannel>;
    var curationMap : Map.Map<NodeId, Curation>;
    var curationToPublishedGraphId : Map.Map<NodeId, Text>;
    var existingAdmins : [Principal];
    var graphSavers : Map.Map<Text, List.List<Principal>>;
    var interpretationTokenMap : Map.Map<NodeId, InterpretationToken>;
    var lawTokenMap : Map.Map<NodeId, LawToken>;
    var locationMap : Map.Map<NodeId, Location>;
    var notesImports : Map.Map<Principal, Text>;
    var pendingPluginBindings : Map.Map<Principal, List.List<Principal>>;
    var pluginBindings : Map.Map<Principal, Principal>;
    var publishedGraphBuzzMetrics : Map.Map<Text, { cumulativeBuzzSpent : Int; extensionCount : Nat }>;
    var publishedNodeContributions : Map.Map<Text, Map.Map<NodeId, NodeContribution>>;
    var publishedSourceGraphs : Map.Map<Text, PublishedSourceGraphMeta>;
    var sourceEdges : Map.Map<NodeId, List.List<SourceGraphEdge>>;
    var swarmMap : Map.Map<NodeId, Swarm>;
    var telegramConfig : ?TelegramConfig;
    var trustScores : Map.Map<Principal, TrustScore>;
    var trustTransactions : Map.Map<Principal, List.List<TrustTransaction>>;
    var userProfiles : Map.Map<Principal, UserProfile>;
  };

  // ── Migration function: drops 13 removed stable variables ─────────────────
  // Consumes: approvalState, collectibleEditionsMap, collectibleSupplyMap,
  //   forkPulledSourceNodes, forkedSwarmMap, membershipRequests, mintSettingsMap,
  //   swarmMembers, swarmTypeMap, swarmUpdates, userVoteTracking, voteData, voteDataMap.
  // Passes through all remaining stable fields unchanged.

  public func run(old : OldActor) : NewActor {
    // Discard removed fields by not referencing them in the output.
    // Suppress unused-variable warnings with ignore.
    ignore old.approvalState;
    ignore old.collectibleEditionsMap;
    ignore old.collectibleSupplyMap;
    ignore old.forkPulledSourceNodes;
    ignore old.forkedSwarmMap;
    ignore old.membershipRequests;
    ignore old.mintSettingsMap;
    ignore old.swarmMembers;
    ignore old.swarmTypeMap;
    ignore old.swarmUpdates;
    ignore old.userVoteTracking;
    ignore old.voteData;
    ignore old.voteDataMap;

    {
      BUZZ_DECIMALS = old.BUZZ_DECIMALS;
      HEX_CHARS = old.HEX_CHARS;
      TRUST_DECIMALS = old.TRUST_DECIMALS;
      accessControlState = old.accessControlState;
      var apiKeysByPrincipal = old.apiKeysByPrincipal;
      var apiRateLimitCounts = old.apiRateLimitCounts;
      var apiRateLimitWindowStarts = old.apiRateLimitWindowStarts;
      var principalByApiKey = old.principalByApiKey;
      var archivedNodes = old.archivedNodes;
      var buzzScores = old.buzzScores;
      var buzzSecrets = old.buzzSecrets;
      var buzzTransactions = old.buzzTransactions;
      var chatChannels = old.chatChannels;
      var curationMap = old.curationMap;
      var curationToPublishedGraphId = old.curationToPublishedGraphId;
      var existingAdmins = old.existingAdmins;
      var graphSavers = old.graphSavers;
      var interpretationTokenMap = old.interpretationTokenMap;
      var lawTokenMap = old.lawTokenMap;
      var locationMap = old.locationMap;
      var notesImports = old.notesImports;
      var pendingPluginBindings = old.pendingPluginBindings;
      var pluginBindings = old.pluginBindings;
      var publishedGraphBuzzMetrics = old.publishedGraphBuzzMetrics;
      var publishedNodeContributions = old.publishedNodeContributions;
      var publishedSourceGraphs = old.publishedSourceGraphs;
      var sourceEdges = old.sourceEdges;
      var swarmMap = old.swarmMap;
      var telegramConfig = old.telegramConfig;
      var trustScores = old.trustScores;
      var trustTransactions = old.trustTransactions;
      var userProfiles = old.userProfiles;
    }
  };

};
