import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";

module {
  // ─── Old types (copied from .old/src/backend/main.mo) ─────────────────────

  type NodeId = Text;
  type Directionality = { #none; #unidirectional; #bidirectional };
  type Tag = Text;
  type CustomAttribute = { key : Text; value : Text };
  type Timestamps = { createdAt : Time.Time };

  type OldCuration = {
    id : NodeId;
    name : Text;
    creator : Principal;
    jurisdiction : Text;
    timestamps : Timestamps;
  };

  type OldSwarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    creator : Principal;
    timestamps : Timestamps;
    forkSource : ?NodeId;
    forkPrincipal : ?Principal;
  };

  type OldLocation = {
    id : NodeId;
    title : Text;
    content : Text;
    originalTokenSequence : Text;
    customAttributes : [CustomAttribute];
    parentSwarmId : NodeId;
    creator : Principal;
    version : Nat;
    timestamps : Timestamps;
  };

  type OldLawToken = {
    id : NodeId;
    tokenLabel : Text;
    parentLocationId : NodeId;
    creator : Principal;
    timestamps : Timestamps;
  };

  type OldSublocation = {
    id : NodeId;
    title : Text;
    content : Text;
    originalTokenSequence : Text;
    creator : Principal;
    timestamps : Timestamps;
  };

  type OldInterpretationToken = {
    id : NodeId;
    title : Text;
    context : Text;
    fromTokenId : NodeId;
    fromRelationshipType : Text;
    fromDirectionality : Directionality;
    toNodeId : NodeId;
    toRelationshipType : Text;
    toDirectionality : Directionality;
    customAttributes : [CustomAttribute];
    creator : Principal;
    timestamps : Timestamps;
  };

  // Old GraphEdge had no label or directionality
  type OldGraphEdge = {
    source : NodeId;
    target : NodeId;
  };

  // ─── New types (must match field names in main.mo) ─────────────────────────

  type NewCuration = {
    id : NodeId;
    name : Text;
    creator : Principal;
    customAttributes : [CustomAttribute];
    timestamps : Timestamps;
  };

  type NewSwarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    creator : Principal;
    customAttributes : [CustomAttribute];
    timestamps : Timestamps;
    forkSource : ?NodeId;
    forkPrincipal : ?Principal;
  };

  type NewLocation = {
    id : NodeId;
    title : Text;
    customAttributes : [CustomAttribute];
    parentSwarmId : NodeId;
    creator : Principal;
    timestamps : Timestamps;
  };

  type NewLawToken = {
    id : NodeId;
    tokenLabel : Text;
    parentLocationId : NodeId;
    creator : Principal;
    customAttributes : [CustomAttribute];
    timestamps : Timestamps;
  };

  type NewInterpretationToken = {
    id : NodeId;
    title : Text;
    content : Text;
    parentLawTokenId : NodeId;
    customAttributes : [CustomAttribute];
    creator : Principal;
    timestamps : Timestamps;
  };

  type SourceGraphEdge = {
    source : NodeId;
    target : NodeId;
    edgeLabel : Text;
    directionality : Directionality;
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

  type SwarmType = { #regular; #questionOfLaw };
  type MembershipStatus = { #pending; #approved };
  type SwarmMembership = {
    swarmId : NodeId;
    member : Principal;
    status : MembershipStatus;
  };
  type SwarmUpdateStatus = { #unread; #acted };
  type SwarmUpdate = {
    swarmId : NodeId;
    tokenId : NodeId;
    tokenTitle : Text;
    creatorPrincipal : Principal;
    timestamp : Time.Time;
    status : SwarmUpdateStatus;
    userId : Principal;
  };
  type UserProfile = { name : Text; socialUrl : ?Text };
  type VoteData = { upvotes : Nat; downvotes : Nat };
  type UserVoteTracking = { votedNodes : Map.Map<Text, Bool> };
  type MintSettings = { numCopies : Nat };
  type CollectibleEdition = {
    tokenId : NodeId;
    tokenType : { #lawToken; #interpretationToken };
    editionNumber : Nat;
    owner : Principal;
    mintedAt : Time.Time;
  };
  type BuzzScore = Int;
  type UserRole = { #admin; #user; #guest };
  type ApprovalStatus = { #pending; #approved; #rejected };

  // ─── Migration record types ────────────────────────────────────────────────

  type OldActor = {
    // Changed type: old Curation had jurisdiction, no customAttributes
    var curationMap : Map.Map<NodeId, OldCuration>;
    // Changed type: old Swarm had no customAttributes
    var swarmMap : Map.Map<NodeId, OldSwarm>;
    // Changed type: old Location had content/originalTokenSequence/version
    var locationMap : Map.Map<NodeId, OldLocation>;
    // Changed type: old LawToken had no customAttributes
    var lawTokenMap : Map.Map<NodeId, OldLawToken>;
    // Changed type: old InterpretationToken had fromTokenId/toNodeId/context etc.
    var interpretationTokenMap : Map.Map<NodeId, OldInterpretationToken>;
    // Removed vars: consume them so the compiler doesn't complain about implicit discard
    var sublocationMap : Map.Map<NodeId, OldSublocation>;
    var sublocationLawTokenRelations : Map.Map<NodeId, List.List<NodeId>>;
    var locationLawTokenRelations : Map.Map<NodeId, List.List<NodeId>>;
    var interpretationTokenFromEdges : Map.Map<NodeId, List.List<OldGraphEdge>>;
    var interpretationTokenToEdges : Map.Map<NodeId, List.List<OldGraphEdge>>;
    // Unchanged vars — pass through
    var forkedSwarmMap : Map.Map<NodeId, ForkedSwarm>;
    var membershipRequests : Map.Map<NodeId, List.List<SwarmMembership>>;
    var swarmMembers : Map.Map<NodeId, List.List<Principal>>;
    var userProfiles : Map.Map<Principal, UserProfile>;
    var swarmUpdates : Map.Map<Principal, List.List<SwarmUpdate>>;
    var voteDataMap : Map.Map<Text, VoteData>;
    var buzzScores : Map.Map<Principal, BuzzScore>;
    var existingAdmins : [Principal];
    var archivedNodes : Map.Map<NodeId, ()>;
    var forkPulledSourceNodes : Map.Map<NodeId, List.List<NodeId>>;
    var swarmTypeMap : Map.Map<NodeId, SwarmType>;
    accessControlState : {
      var adminAssigned : Bool;
      userRoles : Map.Map<Principal, UserRole>;
    };
    approvalState : {
      var approvalStatus : Map.Map<Principal, ApprovalStatus>;
    };
    voteData : Map.Map<Text, VoteData>;
    userVoteTracking : Map.Map<Principal, UserVoteTracking>;
    mintSettingsMap : Map.Map<Principal, MintSettings>;
    collectibleEditionsMap : Map.Map<NodeId, List.List<CollectibleEdition>>;
    collectibleSupplyMap : Map.Map<NodeId, Nat>;
  };

  type NewActor = {
    // Cleared: user must call resetAllData after upgrade
    var curationMap : Map.Map<NodeId, NewCuration>;
    var swarmMap : Map.Map<NodeId, NewSwarm>;
    var locationMap : Map.Map<NodeId, NewLocation>;
    var lawTokenMap : Map.Map<NodeId, NewLawToken>;
    var interpretationTokenMap : Map.Map<NodeId, NewInterpretationToken>;
    // New field added in this version
    var sourceEdges : Map.Map<NodeId, List.List<SourceGraphEdge>>;
    // Unchanged vars — pass through
    var forkedSwarmMap : Map.Map<NodeId, ForkedSwarm>;
    var membershipRequests : Map.Map<NodeId, List.List<SwarmMembership>>;
    var swarmMembers : Map.Map<NodeId, List.List<Principal>>;
    var userProfiles : Map.Map<Principal, UserProfile>;
    var swarmUpdates : Map.Map<Principal, List.List<SwarmUpdate>>;
    var voteDataMap : Map.Map<Text, VoteData>;
    var buzzScores : Map.Map<Principal, BuzzScore>;
    var existingAdmins : [Principal];
    var archivedNodes : Map.Map<NodeId, ()>;
    var forkPulledSourceNodes : Map.Map<NodeId, List.List<NodeId>>;
    var swarmTypeMap : Map.Map<NodeId, SwarmType>;
    accessControlState : {
      var adminAssigned : Bool;
      userRoles : Map.Map<Principal, UserRole>;
    };
    approvalState : {
      var approvalStatus : Map.Map<Principal, ApprovalStatus>;
    };
    voteData : Map.Map<Text, VoteData>;
    userVoteTracking : Map.Map<Principal, UserVoteTracking>;
    mintSettingsMap : Map.Map<Principal, MintSettings>;
    collectibleEditionsMap : Map.Map<NodeId, List.List<CollectibleEdition>>;
    collectibleSupplyMap : Map.Map<NodeId, Nat>;
  };

  // ─── Migration function ────────────────────────────────────────────────────
  // Strategy: wipe all incompatible maps. The user will call resetAllData()
  // after deployment to confirm the full data wipe and re-publish source graphs.

  public func run(old : OldActor) : NewActor {
    // Discard the removed/incompatible state; pass through unchanged state.
    // All graph data maps are cleared — user calls resetAllData() post-deploy.
    {
      // Cleared: incompatible old types → start empty with new types
      var curationMap = Map.empty<NodeId, NewCuration>();
      var swarmMap = Map.empty<NodeId, NewSwarm>();
      var locationMap = Map.empty<NodeId, NewLocation>();
      var lawTokenMap = Map.empty<NodeId, NewLawToken>();
      var interpretationTokenMap = Map.empty<NodeId, NewInterpretationToken>();
      // New field: no old data to migrate
      var sourceEdges = Map.empty<NodeId, List.List<SourceGraphEdge>>();
      // Cleared: these depended on old entity types
      var membershipRequests = Map.empty<NodeId, List.List<SwarmMembership>>();
      var swarmMembers = Map.empty<NodeId, List.List<Principal>>();
      var swarmTypeMap = Map.empty<NodeId, SwarmType>();
      var archivedNodes = Map.empty<NodeId, ()>();
      var forkPulledSourceNodes = Map.empty<NodeId, List.List<NodeId>>();
      // Pass through: unchanged fields
      var forkedSwarmMap = old.forkedSwarmMap;
      var userProfiles = old.userProfiles;
      var swarmUpdates = old.swarmUpdates;
      var voteDataMap = old.voteDataMap;
      var buzzScores = old.buzzScores;
      var existingAdmins = old.existingAdmins;
      accessControlState = old.accessControlState;
      approvalState = old.approvalState;
      voteData = old.voteData;
      userVoteTracking = old.userVoteTracking;
      mintSettingsMap = old.mintSettingsMap;
      collectibleEditionsMap = old.collectibleEditionsMap;
      collectibleSupplyMap = old.collectibleSupplyMap;
    };
  };
};
