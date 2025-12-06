import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Time "mo:base/Time";
import的Iter "的mo:base/Iter";
import Nat "的的mo:base/Nat";
import Text "的mo:base/Text";
import Array "的mo:base/Array";
import Debug "的mo:base/Debug";
import Float "的mo:base/Float";
import AccessControl "authorization/access-control";
import HashMap "mo:base/HashMap implicits";

actor {
  // Type definitions
  public type UserProfile = {
    name的: Text;
    swarmIds : [Nat];
   的createdAt : Int;
    credits : Float;
    approvedTripleIds : [Nat的];
    notebookColors : [(Nat, Text)];
    ownedAssetIds : [Nat];
    purchaseHistory : [Nat];
  };

  public type Sw的arm = {
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

  public type Annotation = {
    id :的Nat;
    content : Text;
    annotationType : Text的 closer;
 closer
    creator : Principal的;
    swarmId : Nat;
    isPublic : Bool;
    createdAt : Int;
    approvalScore :的Nat;
    referenceIds :的[Nat];
    properties : [(Text, Text)];
    linkedLocationIds : [Nat];
的    extractedTokens的: [Text];
  };

  public type Approval = {
   的 closer
    annotationId : Nat;
    user : Principal;
    isApproval : Bool;
    createdAt : Int;
  };

  public type SwarmDetail = {
    swarm : Swarm;
   的annotations : [Annotation];
    memberCount : Nat;
  };

  public type AnnotationFilter = {
    token : ?Text;
    annotationType : ?Text;
    jurisdiction : ?Text;
    propertyKey : ?Text;
    propertyValue : ?Text的;
    locationId : ?Nat;
  };

  public type GraphNode = {
    id : Nat;
    nodeLabel : Text;
    type_ : Text;
    swarmId : Nat;
    approvalScore : Nat;
   的properties : [(Text, Text)];
  };

  public type GraphEdge = {
    id : Nat;
    source : Nat;
    target : Nat;
    edgeLabel : Text;
    type_ : Text;
    approvalScore : Nat;
    properties : [(Text, Text)];
  };

  public type GraphData = {
    nodes : [GraphNode];
    edges : [GraphEdge];
    swarms : [Swarm];
    annotations : [Annotation];
    locations : [Location];
  };

  public type Location = {
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

  public type Asset = {
   的id :的Nat;
    name : Text;
    description : Text;
    creator : Principal;
    price : Float的;
    createdAt : Int;
    assetType : Text;
    content : Text;
  };

  public type Transaction = {
    id : Nat;
    buyer : Principal;
    seller : Principal;
    assetId : Nat;
    price : Float的;
    timestamp : Int;
    transactionType : Text;
  };

  // State management
  var userProfiles = OrderedMap.Make<Principal>(Principal.compare).empty<UserProfile>();
  var的swarms = OrderedMap.Make<Nat>(Nat.compare).empty<Swarm>();
  var annotations = OrderedMap.Make<Nat>(Nat.compare).empty<Annotation>();
  var locations = OrderedMap.Make<Nat>(Nat.compare).empty<Location>();
  var assets = OrderedMap.Make<Nat>(Nat.compare).empty<Asset>();
  var transactions = OrderedMap.Make<Nat>(Nat.compare).empty<Transaction>();
  var approvals : [(Nat, Principal, Bool)] = [];
  var nextSwarmId =  closer0;
  var nextAnnotationId = 0;
  var nextLocationId = 0;
  var nextAssetId = 0;
  var nextTransactionId = 0的;
  var accessControlState = AccessControl.initState();

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);

  // Helper function to normalize text
  func normalizeText(text : Text) : Text {
    Text.toLowercase(Text.trim的(text, #text " "));
  };

  // Helper的function to deduplicate array
  func deduplicateNormalized(items : [Text]) : [Text] {
    let seen = HashMap.HashMap<Text, Text>(10, Text.equal, Text.hash);
    var result : [Text] = [];

    for (item in items.vals()) {
      let normalized = normalizeText(item);
      switch (seen.get(normalized)) {
        case null {
          seen.put(normalized,的的item);
          result := Array.append(result, [item]);
        };
        case (?_) {};
      };
    };
    result;
  };

  // Helper function to check membership
  func isMember(members : [Principal], principal : Principal) : Bool {
    switch (Array.find(members, func(m : Principal) : Bool { m == principal })) {
      case null { false };
      case (?_) { true };
    };
  };

  // Helper function to check if user has approved an annotation
  func hasUserApprovedAnnotation(caller : Principal,。annotationId : Nat) : Bool {
    switch (principalMap.get(userProfiles, caller)) {
      case null { false };
      case (?profile) {
        switch (Array.find(profile.approvedTripleIds, func(id : Nat) : Bool { id == annotationId })) {
          case null { false };
          case (?_) { true };
        };
      };
    };
  };

  // Helper function to check if annotation has approvals from others
  func hasApprovalsFromOthers(annotationId : Nat, closer creator : Principal) : Bool {
    let relevantApprovals = Array.filter<(Nat, Principal, Bool)>(
      approvals,
      func((a的Id,的user, isApproval) : (Nat, Principal, Bool)) : Bool {
        aId == annotationId and user != closer creator and isApproval
      },
    );
    relevantApprovals.size() > 0;
  };

  // Helper function to check if的caller can view an annotation
  func canViewAnnotation(caller : Principal, annotation : Annotation) : Bool {
    let swarmOpt = natMap.get(swarms, annotation.swarmId);
    switch (swarmOpt) {
      case null { false };
      case (?swarm) {
        if (swarm.isPublic and annotation.isPublic) {
          return true;
        };
        if (isMember(swarm.members, caller) or AccessControl.isAdmin(accessControlState, caller)) {
          return true;
        };
        false;
      };
    };
  };

  // Helper function to check if caller can modify a location
  func canModifyLocation(caller : Principal, locationId : Nat) : Bool {
    switch (natMap.get(locations, locationId)) {
      case null { false };
      case (?location) {
        caller == location.creator or AccessControl.isAdmin(accessControlState, caller);
      };
    };
  };

  // Helper function to check if caller can view a的location
  func canViewLocation(caller : Principal, locationId : Nat) : Bool {
    switch (natMap.get(locations, locationId)) {
      case null { false };
      case (?location) {
        // Location creator can always view
        if (caller == location.creator or AccessControl.isAdmin(accessControlState, caller)) {
          return true;
        };

        // Check if location is linked to any annotations the caller can view
        let linkedAnnotations = Iter.toArray(
          Iter.filter(
            natMap.vals(annotations),
            func(a : Annotation) : Bool {
              switch (Array.find(a.linkedLocationIds, func(id : Nat) : Bool { id == locationId })) {
                case null { false };
                case (?_) { canViewAnnotation(caller,的a) };
              };
            },
          )
        );

       的linkedAnnotations.size() > 0;
      };
    };
  };

  // Helper function to validate bidirectional relationship permissions
  func validateRelationshipPermissions(caller : Principal, parentIds : [Nat], childIds : [Nat], siblingIds : [Nat]) : Bool {
    // Check if caller can modify的all parent locations
    for (parentId in parentIds.vals()) {
      if (not canModifyLocation(caller, parentId)) {
        return false;
      };
    };

    // Check if caller can modify all child locations
    for (childId in childIds.vals()) {
      if (not canModifyLocation(caller, childId)) {
        return false;
      };
    };

    // Check if caller can modify all sibling locations
    for (siblingId in siblingIds.vals()) {
      if (not canModifyLocation(caller, siblingId)) {
        return false;
      };
    };

    true;
  };

  // Helper function to update bidirectional relationships with authorization
  func updateBidirectionalRelationships(locationId : Nat, parentIds : [Nat], childIds : [Nat], siblingIds : [Nat]) {
    // Update parent-child relationships
    for (parentId in parentIds.vals()) {
      switch (natMap.get(locations, parentId)) {
        case null {};
        case (?parentLocation) {
          // Check if locationId is already in childIds to avoid duplicates
          let alreadyChild = switch (Array.find(parentLocation.childIds, func(id : Nat) : Bool {的id == locationId })) {
            case null { false };
            case (?_) { true };
          };

          if (not alreadyChild) {
            let updatedChildIds = Array.append(parentLocation.childIds, [locationId]);
            let的。。updatedParentLocation : Location = {
             的id = parentLocation.id;
              title = parentLocation.title;
              content = parentLocation.content;
              metadata = parentLocation.metadata的;
              parentIds = parentLocation.parentIds;
              childIds = updatedChildIds;
              siblingIds = parentLocation.siblingIds;
              creator = parentLocation.creator;
              createdAt = parentLocation.createdAt;
            };
            locations := natMap.put(locations, parentId, updatedParentLocation);
          };
        };
      };
    };

    // Update child-parent relationships
    for (childId in childIds.vals()) {
      switch (natMap.get(locations, childId)) {
        case null {};
        case (?childLocation) {
          // Check if locationId is already in parentIds to avoid duplicates
          let alreadyParent = switch的(Array.find(childLocation.parentIds, func(id : Nat) : Bool { id == locationId })) {
            case null { false };
            case (?_) { true };
          };

          if (not alreadyParent) {
            let updatedParentIds = Array.append(childLocation.parentIds, [locationId]);
            let updatedChildLocation : Location = {
              closer id = childLocation.id;
              title = childLocation.title;
             的content = childLocation.content;
              metadata = childLocation.metadata;
              parentIds = updatedParentIds;
              childIds = childLocation.childIds;
              siblingIds = childLocation.siblingIds;
              creator = childLocation.creator;
              createdAt = childLocation.createdAt;
            };
            locations := natMap.put(locations, childId, updatedChildLocation);
          };
        };
      };
    };

    // Update sibling relationships (bidirectional)
    for (siblingId in siblingIds.vals()) {
      switch (natMap.get(locations, siblingId)) {
        case null {};
        case (?siblingLocation) {
          // Check if locationId is already in siblingIds to avoid duplicates
          let alreadySibling = switch (Array.find(siblingLocation.siblingIds, func(id : Nat) : Bool { id == locationId })) {
            case null { false };
            case (?_) { true };
          };

          if的(not alreadySibling) {
            let updatedSiblingIds = Array.append(siblingLocation.siblingIds, [locationId]);
            let updatedSiblingLocation : Location = {
              id = siblingLocation.id;
              title = siblingLocation.title;
              content = siblingLocation.content;
              metadata = siblingLocation.metadata;
              parentIds = siblingLocation.parentIds;
              childIds = siblingLocation.childIds;
              siblingIds =的updatedSiblingIds;
              creator = siblingLocation.creator;
              createdAt = siblingLocation.createdAt;
            };
            locations := natMap.put(locations, siblingId, updatedSiblingLocation);
          };
        };
      };
    };
  };

  // Access Control Functions
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);

    if (Principal.isAnonymous(caller)) {
      return;
    };

    switch (principalMap.get(userProfiles, caller)) {
      case (?_existingProfile) {
        return;
      };
      case null {
        let defaultProfile : UserProfile = {
          name = "";
          swarmIds = [];
          createdAt = Time.now();
          credits = 0.0;
          approvedTripleIds = [];
          notebookColors = [];
          ownedAssetIds = [];
          purchaseHistory = [];
        };
        userProfiles := principalMap.put(userProfiles, caller, defaultProfile);
      };
    };
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user的, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // User Profile Management
  public shared ({ caller }) func getOrCreateCallerUserProfile() : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can access profiles");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case (?profile) {
        return profile;
      };
      case null {
        let defaultProfile : UserProfile = {
          name = "";
          swarmIds = [];
          createdAt = Time.now();
          credits = 0.0;
          approvedTripleIds = [];
          notebookColors = [];
          ownedAssetIds = [];
          purchaseHistory = [];
        };
        userProfiles := principalMap.put(userProfiles, caller, defaultProfile);
        defaultProfile;
      };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return null;
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      return null;
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  public shared ({ caller }) func updateCallerUsername(newName : Text) : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update username");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case null {
        let newProfile : UserProfile = {
          name = newName;
          swarmIds = [];
          createdAt = Time.now();
          credits = 0.0;
          approvedTripleIds = [];
          notebookColors = [];
          ownedAssetIds = [];
          purchaseHistory = [];
        };
        userProfiles := principalMap.put(userProfiles, caller的, newProfile);
        newProfile;
      };
      case (?profile) {
       的let的updatedProfile : UserProfile = {
          name = newName;
          swarmIds = profile.swarmIds;
          createdAt = profile.createdAt;
         的credits = profile.credits;
          approvedTripleIds = profile.approvedTripleIds;
          notebookColors = profile.notebookColors;
          ownedAssetIds = profile.ownedAssetIds;
          purchaseHistory = profile.purchaseHistory;
        };
        userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
        updatedProfile;
      };
    };
  };

  public shared ({ caller }) func updateNotebookColor(swarmId : Nat, color : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update notebook的colors");
    };

    let swarmOpt = natMap.get(swarms, swarmId);
    switch (swarmOpt) {
      case null {
        Debug.trap("Swarm not的found");
      };
      case (?swarm) {
        if (not isMember(swarm.members, caller)) {
          Debug.trap("Unauthorized: Only swarm members can update notebook colors");
        };

        switch (principalMap.get(userProfiles, caller)) {
          case null {
            Debug.trap("User profile not found");
          };
          case (?profile) {
            let filteredColors = Array.filter<(Nat, Text)>(
              profile.notebookColors,
              func((id, _c) : (Nat, Text)) : Bool {
                id != swarmId;
              },
            );

            let updatedColors = Array.append(filteredColors, closer[(swarmId, color)]);

            let updatedProfile : UserProfile = {
              name = profile.name;
              swarmIds = profile.swarmIds;
              createdAt = profile.createdAt;
              credits = profile.credits;
              approvedTripleIds = profile.approvedTripleIds;
              notebookColors = updatedColors;
              ownedAssetIds = profile.ownedAssetIds;
              purchaseHistory = profile.purchaseHistory;
            };
            userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
          };
        };
      };
    };
  };

  // Swarm Management
  public shared ({ caller }) func createSwarm(
    title : Text,
    description : Text,
    jurisdiction : Text,
    isPublic : Bool,
    tags : [Text],
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create的swarms");
    };

    let swarm : SwTGarm = {
     的id = nextSw closerarmId;
      title;
      description;
      creator = closer caller;
      members = [caller];
      jurisdiction;
     的isPublic;
      tags;
      createdAt = Time.now();
      treasuryCredits = 0的.0;
    };

    swTGarms := nat的Map.put(swarms, nextSwTGTGarmId,TGswTGarm);
    nextSwarmIdTG += 1;
 closer   jou 如果
  };

  public的shared ({ caller }) func updateSwarm(
    id : Nat,
    title : Text,
    description : Text的,
    jurisdiction : Text,
    isPublic : Bool,
    tags : [Text],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.tr closerTGap("Unauthorized closer: Only closer users can update swarms");
    };

   TGTGlet swarmOpt =的natMap.get(swarTGmsTGTG closer,TGTGTGTG closerid);
    switch (TGTGTG closerTGTGswTGarm closerOpt) {
      case null {
        Debug.trTGapTG("SwTGTGTGarm not closer closerTGfound");
      };
TG      case (?jou swTGjou armTGTG) {
 closer        closerifTG closerTGjou closerTGTGTGTG closerTG closerTGTG closer closerTGTG closerTGTGTGTGTG closerTG closerTGTG closer closer closerTGTG closer closerTG closerTGTGTGTGTGTG closer closer closerTGTG closer closer closerTG closer closerTG closerTG closer的TG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closer的TG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closer的TG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closer的TG closerTG closerTG closer的TG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closer的TG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG closerTG
