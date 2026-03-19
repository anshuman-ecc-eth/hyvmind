import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Iter "mo:core/Iter";

module {
  // --- Types ---

  // Duplicate type definitions (should match the ones in main.mo)
  type Directionality = {
    #none;
    #unidirectional;
    #bidirectional;
  };
  type Tag = Text;
  type CustomAttribute = { key : Text; value : Text };
  type NodeId = Text;

  type Timestamps = {
    createdAt : Time.Time;
  };

  type Curation = {
    id : NodeId;
    name : Text;
    creator : Principal.Principal;
    jurisdiction : Text;
    timestamps : Timestamps;
  };

  type Swarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    creator : Principal.Principal;
    timestamps : Timestamps;
  };

  type Location = {
    id : NodeId;
    title : Text;
    content : Text;
    originalTokenSequence : Text;
    customAttributes : [CustomAttribute];
    parentSwarmId : NodeId;
    creator : Principal.Principal;
    version : Nat;
    timestamps : Timestamps;
  };

  // Remove semantic meaning from LawToken
  type LawToken = {
    id : NodeId;
    tokenLabel : Text;
    parentLocationId : NodeId;
    creator : Principal.Principal;
    timestamps : Timestamps;
  };

  type InterpretationToken = {
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
    creator : Principal.Principal;
    timestamps : Timestamps;
  };

  // Persistent Data Structures
  type SwarmMembership = {
    swarmId : NodeId;
    member : Principal.Principal;
    status : { #pending; #approved };
  };

  type SwarmUpdate = {
    swarmId : NodeId;
    tokenId : NodeId;
    tokenTitle : Text;
    creatorPrincipal : Principal.Principal;
    timestamp : Time.Time;
    status : { #unread; #acted };
    userId : Principal.Principal;
  };

  type VoteData = {
    upvotes : Nat;
    downvotes : Nat;
  };

  type UserVoteTracking = { votedNodes : Map.Map<Text, Bool> };

  type SwarmType = {
    #regular;
    #questionOfLaw;
  };

  // Old Actor State
  type OldActor = {
    curationMap : Map.Map<NodeId, Curation>;
    swarmMap : Map.Map<NodeId, Swarm>;
    locationMap : Map.Map<NodeId, Location>;
    lawTokenMap : Map.Map<NodeId, LawToken>;
    interpretationTokenMap : Map.Map<NodeId, InterpretationToken>;
    swarmTypeMap : Map.Map<NodeId, SwarmType>;
    membershipRequests : Map.Map<NodeId, List.List<SwarmMembership>>;
    locationLawTokenRelations : Map.Map<NodeId, List.List<NodeId>>;
    voteDataMap : Map.Map<Text, VoteData>;
    archivedNodes : Map.Map<NodeId, ()>;
    buzzScores : Map.Map<Principal.Principal, Int>;
    userVoteTracking : Map.Map<Principal.Principal, UserVoteTracking>;
    interpretationTokenFromEdges : Map.Map<NodeId, List.List<{ source : NodeId; target : NodeId }>>;
    interpretationTokenToEdges : Map.Map<NodeId, List.List<{ source : NodeId; target : NodeId }>>;
    swarmUpdates : Map.Map<Principal.Principal, List.List<SwarmUpdate>>;
    existingAdmins : [Principal.Principal];
  };

  // New Actor State (with LawToken adjusted)
  type NewActor = {
    curationMap : Map.Map<NodeId, Curation>;
    swarmMap : Map.Map<NodeId, Swarm>;
    locationMap : Map.Map<NodeId, Location>;
    lawTokenMap : Map.Map<NodeId, LawToken>;
    interpretationTokenMap : Map.Map<NodeId, InterpretationToken>;
    swarmTypeMap : Map.Map<NodeId, SwarmType>;
    membershipRequests : Map.Map<NodeId, List.List<SwarmMembership>>;
    locationLawTokenRelations : Map.Map<NodeId, List.List<NodeId>>;
    voteDataMap : Map.Map<Text, VoteData>;
    archivedNodes : Map.Map<NodeId, ()>;
    buzzScores : Map.Map<Principal.Principal, Int>;
    userVoteTracking : Map.Map<Principal.Principal, UserVoteTracking>;
    interpretationTokenFromEdges : Map.Map<NodeId, List.List<{ source : NodeId; target : NodeId }>>;
    interpretationTokenToEdges : Map.Map<NodeId, List.List<{ source : NodeId; target : NodeId }>>;
    swarmUpdates : Map.Map<Principal.Principal, List.List<SwarmUpdate>>;
    existingAdmins : [Principal.Principal];
  };

  // Migration Function
  public func run(old : OldActor) : NewActor {
    {
      curationMap = old.curationMap;
      swarmMap = old.swarmMap;
      locationMap = old.locationMap;
      lawTokenMap = old.lawTokenMap; // No changes needed
      interpretationTokenMap = old.interpretationTokenMap;
      swarmTypeMap = old.swarmTypeMap;
      membershipRequests = old.membershipRequests;
      locationLawTokenRelations = old.locationLawTokenRelations;
      voteDataMap = old.voteDataMap;
      archivedNodes = old.archivedNodes;
      buzzScores = old.buzzScores;
      userVoteTracking = old.userVoteTracking;
      interpretationTokenFromEdges = old.interpretationTokenFromEdges;
      interpretationTokenToEdges = old.interpretationTokenToEdges;
      swarmUpdates = old.swarmUpdates;
      existingAdmins = old.existingAdmins;
    };
  };
};
