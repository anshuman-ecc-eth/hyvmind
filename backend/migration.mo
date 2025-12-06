import OrderedMap "mo:base/OrderedMap";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";

module {
  type OldUserProfile = {
    name : Text;
    swarmIds : [Nat];
    createdAt : Int;
    credits : Float;
    approvedTripleIds : [Nat];
    notebookColors : [(Nat, Text)];
    ownedAssetIds : [Nat];
    purchaseHistory : [Nat];
  };

  type Swarm = {
    id : Nat;
    title : Text;
    description : Text;
    creator : Principal;
    members : [Principal];
    jurisdiction : Text;
    isPublic : Bool;
    tags : [Text];
    createdAt : Int;
    treasuryCredits : Float;
  };

  type Triple = {
    id : Nat;
    subject : Text;
    predicate : Text;
    objectValue : Text;
    creator : Principal;
    swarmId : Nat;
    isPublic : Bool;
    createdAt : Int;
    approvalScore : Nat;
    referenceIds : [Nat];
    properties : [(Text, Text)];
    linkedLocationIds : [Nat];
  };

  type Location = {
    id : Nat;
    title : Text;
    content : Text;
    metadata : [(Text, Text)];
    parentIds : [Nat];
    childIds : [Nat];
    siblingIds : [Nat];
    creator : Principal;
    createdAt : Int;
  };

  type Asset = {
    id : Nat;
    name : Text;
    description : Text;
    creator : Principal;
    price : Float;
    createdAt : Int;
    assetType : Text;
    content : Text;
  };

  type Transaction = {
    id : Nat;
    buyer : Principal;
    seller : Principal;
    assetId : Nat;
    price : Float;
    timestamp : Int;
    transactionType : Text;
  };

  type OldActor = {
    userProfiles : OrderedMap.Map<Principal, OldUserProfile>;
    swarms : OrderedMap.Map<Nat, Swarm>;
    triples : OrderedMap.Map<Nat, Triple>;
    locations : OrderedMap.Map<Nat, Location>;
    assets : OrderedMap.Map<Nat, Asset>;
    transactions : OrderedMap.Map<Nat, Transaction>;
    approvals : [(Nat, Principal, Bool)];
    nextSwarmId : Nat;
    nextTripleId : Nat;
    nextLocationId : Nat;
    nextAssetId : Nat;
    nextTransactionId : Nat;
  };

  type NewUserProfile = {
    name : Text;
    swarmIds : [Nat];
    createdAt : Int;
    credits : Float;
    approvedAnnotationIds : [Nat];
    notebookColors : [(Nat, Text)];
    ownedAssetIds : [Nat];
    purchaseHistory : [Nat];
  };

  type NewActor = {
    userProfiles : OrderedMap.Map<Principal, NewUserProfile>;
    swarms : OrderedMap.Map<Nat, Swarm>;
    locations : OrderedMap.Map<Nat, Location>;
    approvals : [(Nat, Principal, Bool)];
    nextSwarmId : Nat;
    nextLocationId : Nat;
    nextAssetId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    let userProfiles = principalMap.map<OldUserProfile, NewUserProfile>(
      old.userProfiles,
      func(_principal, oldProfile) {
        {
          name = oldProfile.name;
          swarmIds = oldProfile.swarmIds;
          createdAt = oldProfile.createdAt;
          credits = oldProfile.credits;
          approvedAnnotationIds = oldProfile.approvedTripleIds;
          notebookColors = oldProfile.notebookColors;
          ownedAssetIds = oldProfile.ownedAssetIds;
          purchaseHistory = oldProfile.purchaseHistory;
        };
      },
    );

    {
      userProfiles;
      swarms = old.swarms;
      locations = old.locations;
      approvals = old.approvals;
      nextSwarmId = old.nextSwarmId;
      nextLocationId = old.nextLocationId;
      nextAssetId = old.nextAssetId;
    };
  };
};

