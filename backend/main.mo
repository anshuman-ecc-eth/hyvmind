import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Float "mo:base/Float";
import AccessControl "authorization/access-control";
import HashMap "mo:base/HashMap";
import Migration "migration";

(with migration = Migration.run) actor {
  // Type definitions
  public type UserProfile = {
    name : Text;
    swarmIds : [Nat];
    createdAt : Int;
    credits : Float;
    approvedAnnotationIds : [Nat];
    notebookColors : [(Nat, Text)];
    ownedAssetIds : [Nat];
    purchaseHistory : [Nat];
  };

  public type Swarm = {
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

  public type AnnotationType = {
    #positiveLaw;
    #interpretation;
  };

  public type Annotation = {
    id : Nat;
    content : Text;
    annotationType : AnnotationType;
    creator : Principal;
    swarmId : Nat;
    isPublic : Bool;
    createdAt : Int;
    approvalScore : Nat;
    referenceIds : [Nat];
    properties : [(Text, Text)];
    linkedLocationIds : [Nat];
    extractedTokens : [Text];
  };

  public type Approval = {
    annotationId : Nat;
    user : Principal;
    isApproval : Bool;
    createdAt : Int;
  };

  public type SwarmDetail = {
    swarm : Swarm;
    annotations : [Annotation];
    memberCount : Nat;
  };

  public type AnnotationFilter = {
    tokens : ?[Text];
    annotationType : ?AnnotationType;
    jurisdiction : ?Text;
    propertyKey : ?Text;
    propertyValue : ?Text;
    locationId : ?Nat;
  };

  public type GraphNode = {
    id : Nat;
    nodeLabel : Text;
    type_ : Text;
    swarmId : Nat;
    approvalScore : Nat;
    properties : [(Text, Text)];
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

  public type DigitalAsset = {
    id : Nat;
    name : Text;
    assetType : Text;
    creator : Principal;
    createdAt : Int;
    visibility : Text;
    provenance : [Text];
  };

  public type Frame = {
    id : Nat;
    title : Text;
    description : Text;
    assetIds : [Nat];
    creator : Principal;
    createdAt : Int;
    visibility : Text;
  };

  // State management
  var userProfiles = OrderedMap.Make<Principal>(Principal.compare).empty<UserProfile>();
  var swarms = OrderedMap.Make<Nat>(Nat.compare).empty<Swarm>();
  var annotations = OrderedMap.Make<Nat>(Nat.compare).empty<Annotation>();
  var locations = OrderedMap.Make<Nat>(Nat.compare).empty<Location>();
  var digitalAssets = OrderedMap.Make<Nat>(Nat.compare).empty<DigitalAsset>();
  var frames = OrderedMap.Make<Nat>(Nat.compare).empty<Frame>();
  var approvals : [(Nat, Principal, Bool)] = [];
  var nextSwarmId = 0;
  var nextAnnotationId = 0;
  var nextLocationId = 0;
  var nextAssetId = 0;
  var nextFrameId = 0;
  var accessControlState = AccessControl.initState();

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);

  // Helper function to normalize text
  func normalizeText(text : Text) : Text {
    Text.toLowercase(Text.trim(text, #text " "));
  };

  // Helper function to deduplicate array
  func deduplicateNormalized(items : [Text]) : [Text] {
    let seen = HashMap.HashMap<Text, Text>(10, Text.equal, Text.hash);
    var result : [Text] = [];

    for (item in items.vals()) {
      let normalized = normalizeText(item);
      switch (seen.get(normalized)) {
        case null {
          seen.put(normalized, item);
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
  func hasUserApprovedAnnotation(caller : Principal, annotationId : Nat) : Bool {
    switch (principalMap.get(userProfiles, caller)) {
      case null { false };
      case (?profile) {
        switch (Array.find(profile.approvedAnnotationIds, func(id : Nat) : Bool { id == annotationId })) {
          case null { false };
          case (?_) { true };
        };
      };
    };
  };

  // Helper function to check if annotation has approvals from others
  func hasApprovalsFromOthers(annotationId : Nat, creator : Principal) : Bool {
    let relevantApprovals = Array.filter<(Nat, Principal, Bool)>(
      approvals,
      func((aId, user, isApproval) : (Nat, Principal, Bool)) : Bool {
        aId == annotationId and user != creator and isApproval
      },
    );
    relevantApprovals.size() > 0;
  };

  // Helper function to check if caller can view an annotation
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

  // Helper function to check if caller can view a location
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
                case (?_) { canViewAnnotation(caller, a) };
              };
            },
          )
        );

        linkedAnnotations.size() > 0;
      };
    };
  };

  // Helper function to validate bidirectional relationship permissions
  func validateRelationshipPermissions(caller : Principal, parentIds : [Nat], childIds : [Nat], siblingIds : [Nat]) : Bool {
    // Check if caller can modify all parent locations
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
          let alreadyChild = switch (Array.find(parentLocation.childIds, func(id : Nat) : Bool { id == locationId })) {
            case null { false };
            case (?_) { true };
          };

          if (not alreadyChild) {
            let updatedChildIds = Array.append(parentLocation.childIds, [locationId]);
            let updatedParentLocation : Location = {
              id = parentLocation.id;
              title = parentLocation.title;
              content = parentLocation.content;
              metadata = parentLocation.metadata;
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
          let alreadyParent = switch (Array.find(childLocation.parentIds, func(id : Nat) : Bool { id == locationId })) {
            case null { false };
            case (?_) { true };
          };

          if (not alreadyParent) {
            let updatedParentIds = Array.append(childLocation.parentIds, [locationId]);
            let updatedChildLocation : Location = {
              id = childLocation.id;
              title = childLocation.title;
              content = childLocation.content;
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

          if (not alreadySibling) {
            let updatedSiblingIds = Array.append(siblingLocation.siblingIds, [locationId]);
            let updatedSiblingLocation : Location = {
              id = siblingLocation.id;
              title = siblingLocation.title;
              content = siblingLocation.content;
              metadata = siblingLocation.metadata;
              parentIds = siblingLocation.parentIds;
              childIds = siblingLocation.childIds;
              siblingIds = updatedSiblingIds;
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
          approvedAnnotationIds = [];
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
    AccessControl.assignRole(accessControlState, caller, user, role);
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
          approvedAnnotationIds = [];
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
          approvedAnnotationIds = [];
          notebookColors = [];
          ownedAssetIds = [];
          purchaseHistory = [];
        };
        userProfiles := principalMap.put(userProfiles, caller, newProfile);
        newProfile;
      };
      case (?profile) {
        let updatedProfile : UserProfile = {
          name = newName;
          swarmIds = profile.swarmIds;
          createdAt = profile.createdAt;
          credits = profile.credits;
          approvedAnnotationIds = profile.approvedAnnotationIds;
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
      Debug.trap("Unauthorized: Only users can update notebook colors");
    };

    let swarmOpt = natMap.get(swarms, swarmId);
    switch (swarmOpt) {
      case null {
        Debug.trap("Swarm not found");
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

            let updatedColors = Array.append(filteredColors, [(swarmId, color)]);

            let updatedProfile : UserProfile = {
              name = profile.name;
              swarmIds = profile.swarmIds;
              createdAt = profile.createdAt;
              credits = profile.credits;
              approvedAnnotationIds = profile.approvedAnnotationIds;
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
      Debug.trap("Unauthorized: Only users can create swarms");
    };

    let swarm : Swarm = {
      id = nextSwarmId;
      title;
      description;
      creator = caller;
      members = [caller];
      jurisdiction;
      isPublic;
      tags;
      createdAt = Time.now();
      treasuryCredits = 0.0;
    };

    swarms := natMap.put(swarms, nextSwarmId, swarm);
    nextSwarmId += 1;
    swarm.id;
  };

  public shared ({ caller }) func updateSwarm(
    id : Nat,
    title : Text,
    description : Text,
    jurisdiction : Text,
    isPublic : Bool,
    tags : [Text],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update swarms");
    };

    let swarmOpt = natMap.get(swarms, id);
    switch (swarmOpt) {
      case null {
        Debug.trap("Swarm not found");
      };
      case (?swarm) {
        if (caller != swarm.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only swarm creator or admin can update swarm");
        };

        let updatedSwarm : Swarm = {
          id;
          title;
          description;
          creator = swarm.creator;
          members = swarm.members;
          jurisdiction;
          isPublic;
          tags;
          createdAt = swarm.createdAt;
          treasuryCredits = swarm.treasuryCredits;
        };

        swarms := natMap.put(swarms, id, updatedSwarm);
      };
    };
  };

  public shared ({ caller }) func deleteSwarm(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete swarms");
    };

    let swarmOpt = natMap.get(swarms, id);
    switch (swarmOpt) {
      case null {
        Debug.trap("Swarm not found");
      };
      case (?swarm) {
        if (caller != swarm.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only swarm creator or admin can delete swarm");
        };

        swarms := natMap.delete(swarms, id);
      };
    };
  };

  public shared ({ caller }) func joinSwarm(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can join swarms");
    };

    let swarmOpt = natMap.get(swarms, id);
    switch (swarmOpt) {
      case null {
        Debug.trap("Swarm not found");
      };
      case (?swarm) {
        if (not swarm.isPublic) {
          Debug.trap("Unauthorized: Cannot join private swarm");
        };

        if (isMember(swarm.members, caller)) {
          return;
        };

        let updatedMembers = Array.append(swarm.members, [caller]);
        let updatedSwarm : Swarm = {
          id = swarm.id;
          title = swarm.title;
          description = swarm.description;
          creator = swarm.creator;
          members = updatedMembers;
          jurisdiction = swarm.jurisdiction;
          isPublic = swarm.isPublic;
          tags = swarm.tags;
          createdAt = swarm.createdAt;
          treasuryCredits = swarm.treasuryCredits;
        };

        swarms := natMap.put(swarms, id, updatedSwarm);
      };
    };
  };

  public shared ({ caller }) func leaveSwarm(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can leave swarms");
    };

    let swarmOpt = natMap.get(swarms, id);
    switch (swarmOpt) {
      case null {
        Debug.trap("Swarm not found");
      };
      case (?swarm) {
        if (not isMember(swarm.members, caller)) {
          Debug.trap("Unauthorized: Not a member of this swarm");
        };

        if (caller == swarm.creator) {
          Debug.trap("Unauthorized: Swarm creator cannot leave their own swarm");
        };

        let updatedMembers = Array.filter(swarm.members, func(m : Principal) : Bool { m != caller });
        let updatedSwarm : Swarm = {
          id = swarm.id;
          title = swarm.title;
          description = swarm.description;
          creator = swarm.creator;
          members = updatedMembers;
          jurisdiction = swarm.jurisdiction;
          isPublic = swarm.isPublic;
          tags = swarm.tags;
          createdAt = swarm.createdAt;
          treasuryCredits = swarm.treasuryCredits;
        };

        swarms := natMap.put(swarms, id, updatedSwarm);
      };
    };
  };

  public query ({ caller }) func getSwarm(id : Nat) : async ?Swarm {
    let swarmOpt = natMap.get(swarms, id);
    switch (swarmOpt) {
      case null { null };
      case (?swarm) {
        if (swarm.isPublic or isMember(swarm.members, caller) or AccessControl.isAdmin(accessControlState, caller)) {
          ?swarm;
        } else {
          null;
        };
      };
    };
  };

  public query ({ caller }) func getSwarmDetail(id : Nat) : async ?SwarmDetail {
    let swarmOpt = natMap.get(swarms, id);
    switch (swarmOpt) {
      case null { null };
      case (?swarm) {
        if (not swarm.isPublic and not isMember(swarm.members, caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          return null;
        };

        let swarmAnnotations = Iter.toArray(
          Iter.filter(
            natMap.vals(annotations),
            func(a : Annotation) : Bool {
              if (a.swarmId != id) {
                return false;
              };
              if (swarm.isPublic) {
                return a.isPublic or isMember(swarm.members, caller) or AccessControl.isAdmin(accessControlState, caller);
              };
              true;
            },
          )
        );

        let detail : SwarmDetail = {
          swarm;
          annotations = swarmAnnotations;
          memberCount = swarm.members.size();
        };

        ?detail;
      };
    };
  };

  public query ({ caller }) func getCallerSwarms() : async [Swarm] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };

    let userSwarms = Iter.toArray(
      Iter.filter(
        natMap.vals(swarms),
        func(s : Swarm) : Bool {
          isMember(s.members, caller);
        },
      )
    );
    userSwarms;
  };

  public query func getPublicSwarms() : async [Swarm] {
    let publicSwarms = Iter.toArray(
      Iter.filter(
        natMap.vals(swarms),
        func(s : Swarm) : Bool {
          s.isPublic;
        },
      )
    );
    publicSwarms;
  };

  public query func getSwarmsByJurisdiction(jurisdiction : Text) : async [Swarm] {
    let filteredSwarms = Iter.toArray(
      Iter.filter(
        natMap.vals(swarms),
        func(s : Swarm) : Bool {
          s.isPublic and s.jurisdiction == jurisdiction;
        },
      )
    );
    filteredSwarms;
  };

  // Annotation Management
  public shared ({ caller }) func createAnnotation(
    content : Text,
    annotationType : AnnotationType,
    swarmId : Nat,
    isPublic : Bool,
    referenceIds : [Nat],
    properties : [(Text, Text)],
    linkedLocationIds : [Nat],
    extractedTokens : [Text],
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create annotations");
    };

    let swarmOpt = natMap.get(swarms, swarmId);
    switch (swarmOpt) {
      case null { Debug.trap("Swarm not found") };
      case (?swarm) {
        if (not isMember(swarm.members, caller)) {
          Debug.trap("Unauthorized: Only swarm members can create annotations");
        };

        let finalIsPublic = if (swarm.isPublic) { true } else { isPublic };

        let annotation : Annotation = {
          id = nextAnnotationId;
          content;
          annotationType;
          creator = caller;
          swarmId;
          isPublic = finalIsPublic;
          createdAt = Time.now();
          approvalScore = 0;
          referenceIds;
          properties;
          linkedLocationIds;
          extractedTokens;
        };

        annotations := natMap.put(annotations, nextAnnotationId, annotation);
        nextAnnotationId += 1;
        annotation.id;
      };
    };
  };

  public shared ({ caller }) func updateAnnotation(
    id : Nat,
    content : Text,
    annotationType : AnnotationType,
    properties : [(Text, Text)],
    linkedLocationIds : [Nat],
    extractedTokens : [Text],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update annotations");
    };

    let annotationOpt = natMap.get(annotations, id);
    switch (annotationOpt) {
      case null {
        Debug.trap("Annotation not found");
      };
      case (?annotation) {
        if (caller != annotation.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only annotation creator or admin can update annotation");
        };

        if (annotation.isPublic and hasApprovalsFromOthers(id, annotation.creator)) {
          Debug.trap("Unauthorized: Cannot edit public annotation with approvals from others");
        };

        let updatedAnnotation : Annotation = {
          id;
          content;
          annotationType;
          creator = annotation.creator;
          swarmId = annotation.swarmId;
          isPublic = annotation.isPublic;
          createdAt = annotation.createdAt;
          approvalScore = annotation.approvalScore;
          referenceIds = annotation.referenceIds;
          properties;
          linkedLocationIds;
          extractedTokens;
        };

        annotations := natMap.put(annotations, id, updatedAnnotation);
      };
    };
  };

  public shared ({ caller }) func deleteAnnotation(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete annotations");
    };

    let annotationOpt = natMap.get(annotations, id);
    switch (annotationOpt) {
      case null {
        Debug.trap("Annotation not found");
      };
      case (?annotation) {
        if (caller != annotation.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only annotation creator or admin can delete annotation");
        };

        if (annotation.isPublic and hasApprovalsFromOthers(id, annotation.creator)) {
          Debug.trap("Unauthorized: Cannot delete public annotation with approvals from others");
        };

        annotations := natMap.delete(annotations, id);
      };
    };
  };

  public shared ({ caller }) func forkAnnotation(id : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can fork annotations");
    };

    let annotationOpt = natMap.get(annotations, id);
    switch (annotationOpt) {
      case null {
        Debug.trap("Annotation not found");
      };
      case (?annotation) {
        let swarmOpt = natMap.get(swarms, annotation.swarmId);
        switch (swarmOpt) {
          case null {
            Debug.trap("Swarm not found");
          };
          case (?swarm) {
            if (not isMember(swarm.members, caller)) {
              Debug.trap("Unauthorized: Only swarm members can fork annotations");
            };

            let newAnnotation : Annotation = {
              id = nextAnnotationId;
              content = annotation.content;
              annotationType = annotation.annotationType;
              creator = caller;
              swarmId = annotation.swarmId;
              isPublic = annotation.isPublic;
              createdAt = Time.now();
              approvalScore = 0;
              referenceIds = annotation.referenceIds;
              properties = annotation.properties;
              linkedLocationIds = annotation.linkedLocationIds;
              extractedTokens = annotation.extractedTokens;
            };

            annotations := natMap.put(annotations, nextAnnotationId, newAnnotation);
            nextAnnotationId += 1;
            newAnnotation.id;
          };
        };
      };
    };
  };

  public shared ({ caller }) func toggleAnnotationVisibility(id : Nat, isPublic : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can toggle annotation visibility");
    };

    let annotationOpt = natMap.get(annotations, id);
    switch (annotationOpt) {
      case null {
        Debug.trap("Annotation not found");
      };
      case (?annotation) {
        if (caller != annotation.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only annotation creator or admin can toggle visibility");
        };

        if (not isPublic and annotation.isPublic and hasApprovalsFromOthers(id, annotation.creator)) {
          Debug.trap("Unauthorized: Cannot make public annotation private if it has approvals from others");
        };

        let updatedAnnotation : Annotation = {
          id = annotation.id;
          content = annotation.content;
          annotationType = annotation.annotationType;
          creator = annotation.creator;
          swarmId = annotation.swarmId;
          isPublic;
          createdAt = annotation.createdAt;
          approvalScore = annotation.approvalScore;
          referenceIds = annotation.referenceIds;
          properties = annotation.properties;
          linkedLocationIds = annotation.linkedLocationIds;
          extractedTokens = annotation.extractedTokens;
        };

        annotations := natMap.put(annotations, id, updatedAnnotation);
      };
    };
  };

  public shared ({ caller }) func approveAnnotation(annotationId : Nat, isApproval : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can approve annotations");
    };

    let annotationOpt = natMap.get(annotations, annotationId);
    switch (annotationOpt) {
      case null {
        Debug.trap("Annotation not found");
      };
      case (?annotation) {
        if (caller == annotation.creator) {
          Debug.trap("Unauthorized: Cannot approve your own annotation");
        };

        // Verify caller can view the annotation
        if (not canViewAnnotation(caller, annotation)) {
          Debug.trap("Unauthorized: Cannot approve annotation you don't have access to");
        };

        let existingApproval = Array.find<(Nat, Principal, Bool)>(
          approvals,
          func((aId, user, _) : (Nat, Principal, Bool)) : Bool {
            aId == annotationId and user == caller
          },
        );

        switch (existingApproval) {
          case (?_) {
            Debug.trap("Unauthorized: Already approved/disapproved this annotation");
          };
          case null {
            approvals := Array.append(approvals, [(annotationId, caller, isApproval)]);

            if (isApproval) {
              let updatedAnnotation : Annotation = {
                id = annotation.id;
                content = annotation.content;
                annotationType = annotation.annotationType;
                creator = annotation.creator;
                swarmId = annotation.swarmId;
                isPublic = annotation.isPublic;
                createdAt = annotation.createdAt;
                approvalScore = annotation.approvalScore + 1;
                referenceIds = annotation.referenceIds;
                properties = annotation.properties;
                linkedLocationIds = annotation.linkedLocationIds;
                extractedTokens = annotation.extractedTokens;
              };
              annotations := natMap.put(annotations, annotationId, updatedAnnotation);

              switch (principalMap.get(userProfiles, annotation.creator)) {
                case null {};
                case (?creatorProfile) {
                  let updatedCreatorProfile : UserProfile = {
                    name = creatorProfile.name;
                    swarmIds = creatorProfile.swarmIds;
                    createdAt = creatorProfile.createdAt;
                    credits = creatorProfile.credits + 0.5;
                    approvedAnnotationIds = creatorProfile.approvedAnnotationIds;
                    notebookColors = creatorProfile.notebookColors;
                    ownedAssetIds = creatorProfile.ownedAssetIds;
                    purchaseHistory = creatorProfile.purchaseHistory;
                  };
                  userProfiles := principalMap.put(userProfiles, annotation.creator, updatedCreatorProfile);
                };
              };

              switch (principalMap.get(userProfiles, caller)) {
                case null {};
                case (?approverProfile) {
                  let updatedApprovedIds = Array.append(approverProfile.approvedAnnotationIds, [annotationId]);
                  let updatedApproverProfile : UserProfile = {
                    name = approverProfile.name;
                    swarmIds = approverProfile.swarmIds;
                    createdAt = approverProfile.createdAt;
                    credits = approverProfile.credits;
                    approvedAnnotationIds = updatedApprovedIds;
                    notebookColors = approverProfile.notebookColors;
                    ownedAssetIds = approverProfile.ownedAssetIds;
                    purchaseHistory = approverProfile.purchaseHistory;
                  };
                  userProfiles := principalMap.put(userProfiles, caller, updatedApproverProfile);
                };
              };

              let swarmOpt = natMap.get(swarms, annotation.swarmId);
              switch (swarmOpt) {
                case null {};
                case (?swarm) {
                  let updatedSwarm : Swarm = {
                    id = swarm.id;
                    title = swarm.title;
                    description = swarm.description;
                    creator = swarm.creator;
                    members = swarm.members;
                    jurisdiction = swarm.jurisdiction;
                    isPublic = swarm.isPublic;
                    tags = swarm.tags;
                    createdAt = swarm.createdAt;
                    treasuryCredits = swarm.treasuryCredits + 0.5;
                  };
                  swarms := natMap.put(swarms, annotation.swarmId, updatedSwarm);
                };
              };
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getAnnotation(id : Nat) : async ?Annotation {
    let annotationOpt = natMap.get(annotations, id);
    switch (annotationOpt) {
      case null { null };
      case (?annotation) {
        if (canViewAnnotation(caller, annotation)) {
          ?annotation;
        } else {
          null;
        };
      };
    };
  };

  public query ({ caller }) func getCallerAnnotations() : async [Annotation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };

    let userAnnotations = Iter.toArray(
      Iter.filter(
        natMap.vals(annotations),
        func(a : Annotation) : Bool {
          a.creator == caller;
        },
      )
    );
    userAnnotations;
  };

  public query ({ caller }) func getAllTokens() : async [Text] {
    let visibleAnnotations = Iter.toArray(
      Iter.filter(
        natMap.vals(annotations),
        func(a : Annotation) : Bool {
          canViewAnnotation(caller, a);
        },
      )
    );

    var tokens : [Text] = [];
    for (annotation in visibleAnnotations.vals()) {
      tokens := Array.append(tokens, annotation.extractedTokens);
    };

    deduplicateNormalized(tokens);
  };

  public query func getAllJurisdictions() : async [Text] {
    let publicSwarms = Iter.toArray(
      Iter.filter(
        natMap.vals(swarms),
        func(s : Swarm) : Bool {
          s.isPublic;
        },
      )
    );

    var jurisdictions : [Text] = [];
    for (swarm in publicSwarms.vals()) {
      jurisdictions := Array.append(jurisdictions, [swarm.jurisdiction]);
    };

    deduplicateNormalized(jurisdictions);
  };

  public query ({ caller }) func getAllPropertiesKeys() : async [Text] {
    let visibleAnnotations = Iter.toArray(
      Iter.filter(
        natMap.vals(annotations),
        func(a : Annotation) : Bool {
          canViewAnnotation(caller, a);
        },
      )
    );

    var keys : [Text] = [];
    for (annotation in visibleAnnotations.vals()) {
      for ((key, _) in annotation.properties.vals()) {
        keys := Array.append(keys, [key]);
      };
    };

    deduplicateNormalized(keys);
  };

  public query ({ caller }) func getAllPropertiesValues() : async [Text] {
    let visibleAnnotations = Iter.toArray(
      Iter.filter(
        natMap.vals(annotations),
        func(a : Annotation) : Bool {
          canViewAnnotation(caller, a);
        },
      )
    );

    var values : [Text] = [];
    for (annotation in visibleAnnotations.vals()) {
      for ((_, value) in annotation.properties.vals()) {
        values := Array.append(values, [value]);
      };
    };

    deduplicateNormalized(values);
  };

  // Location Management
  public shared ({ caller }) func createLocation(
    title : Text,
    content : Text,
    metadata : [(Text, Text)],
    parentIds : [Nat],
    childIds : [Nat],
    siblingIds : [Nat],
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create locations");
    };

    // Validate that caller has permission to modify all related locations
    if (not validateRelationshipPermissions(caller, parentIds, childIds, siblingIds)) {
      Debug.trap("Unauthorized: Cannot establish relationships with locations you don't own");
    };

    let location : Location = {
      id = nextLocationId;
      title;
      content;
      metadata;
      parentIds;
      childIds;
      siblingIds;
      creator = caller;
      createdAt = Time.now();
    };

    locations := natMap.put(locations, nextLocationId, location);
    updateBidirectionalRelationships(nextLocationId, parentIds, childIds, siblingIds);
    nextLocationId += 1;
    location.id;
  };

  public shared ({ caller }) func updateLocation(
    id : Nat,
    title : Text,
    content : Text,
    metadata : [(Text, Text)],
    parentIds : [Nat],
    childIds : [Nat],
    siblingIds : [Nat],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update locations");
    };

    let locationOpt = natMap.get(locations, id);
    switch (locationOpt) {
      case null {
        Debug.trap("Location not found");
      };
      case (?location) {
        if (caller != location.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only location creator or admin can update location");
        };

        // Validate that caller has permission to modify all related locations
        if (not validateRelationshipPermissions(caller, parentIds, childIds, siblingIds)) {
          Debug.trap("Unauthorized: Cannot establish relationships with locations you don't own");
        };

        let updatedLocation : Location = {
          id;
          title;
          content;
          metadata;
          parentIds;
          childIds;
          siblingIds;
          creator = location.creator;
          createdAt = location.createdAt;
        };

        locations := natMap.put(locations, id, updatedLocation);
        updateBidirectionalRelationships(id, parentIds, childIds, siblingIds);
      };
    };
  };

  public shared ({ caller }) func deleteLocation(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete locations");
    };

    let locationOpt = natMap.get(locations, id);
    switch (locationOpt) {
      case null {
        Debug.trap("Location not found");
      };
      case (?location) {
        if (caller != location.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only location creator or admin can delete location");
        };

        locations := natMap.delete(locations, id);
      };
    };
  };

  public query ({ caller }) func getLocation(id : Nat) : async ?Location {
    let locationOpt = natMap.get(locations, id);
    switch (locationOpt) {
      case null { null };
      case (?location) {
        if (canViewLocation(caller, id)) {
          ?location;
        } else {
          null;
        };
      };
    };
  };

  public query ({ caller }) func getAllLocations() : async [Location] {
    let visibleLocations = Iter.toArray(
      Iter.filter(
        natMap.vals(locations),
        func(l : Location) : Bool {
          canViewLocation(caller, l.id);
        },
      )
    );
    visibleLocations;
  };

  public query ({ caller }) func getCallerLocations() : async [Location] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };

    let userLocations = Iter.toArray(
      Iter.filter(
        natMap.vals(locations),
        func(l : Location) : Bool {
          l.creator == caller;
        },
      )
    );
    userLocations;
  };

  // Digital Asset Management
  public shared ({ caller }) func createDigitalAsset(
    name : Text,
    assetType : Text,
    visibility : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create digital assets");
    };

    let asset : DigitalAsset = {
      id = nextAssetId;
      name;
      assetType;
      creator = caller;
      createdAt = Time.now();
      visibility;
      provenance = [];
    };

    digitalAssets := natMap.put(digitalAssets, nextAssetId, asset);
    nextAssetId += 1;
    asset.id;
  };

  public shared ({ caller }) func updateAssetVisibility(id : Nat, visibility : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update asset visibility");
    };

    let assetOpt = natMap.get(digitalAssets, id);
    switch (assetOpt) {
      case null {
        Debug.trap("Digital asset not found");
      };
      case (?asset) {
        if (caller != asset.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only asset creator or admin can update visibility");
        };

        let updatedAsset : DigitalAsset = {
          id = asset.id;
          name = asset.name;
          assetType = asset.assetType;
          creator = asset.creator;
          createdAt = asset.createdAt;
          visibility;
          provenance = asset.provenance;
        };

        digitalAssets := natMap.put(digitalAssets, id, updatedAsset);
      };
    };
  };

  public query func getDigitalAsset(id : Nat) : async ?DigitalAsset {
    natMap.get(digitalAssets, id);
  };

  public query func getAllDigitalAssets() : async [DigitalAsset] {
    Iter.toArray(natMap.vals(digitalAssets));
  };

  public query ({ caller }) func getCallerDigitalAssets() : async [DigitalAsset] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };

    let userAssets = Iter.toArray(
      Iter.filter(
        natMap.vals(digitalAssets),
        func(a : DigitalAsset) : Bool {
          a.creator == caller;
        },
      )
    );
    userAssets;
  };

  public query ({ caller }) func getAssetsByType(assetType : Text) : async [DigitalAsset] {
    let filteredAssets = Iter.toArray(
      Iter.filter(
        natMap.vals(digitalAssets),
        func(a : DigitalAsset) : Bool {
          a.assetType == assetType;
        },
      )
    );
    filteredAssets;
  };

  // Frame Management
  public shared ({ caller }) func createFrame(
    title : Text,
    description : Text,
    assetIds : [Nat],
    visibility : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create frames");
    };

    let frame : Frame = {
      id = nextFrameId;
      title;
      description;
      assetIds;
      creator = caller;
      createdAt = Time.now();
      visibility;
    };

    frames := natMap.put(frames, nextFrameId, frame);
    nextFrameId += 1;
    frame.id;
  };

  public shared ({ caller }) func updateFrame(
    id : Nat,
    title : Text,
    description : Text,
    assetIds : [Nat],
    visibility : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update frames");
    };

    let frameOpt = natMap.get(frames, id);
    switch (frameOpt) {
      case null {
        Debug.trap("Frame not found");
      };
      case (?frame) {
        if (caller != frame.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only frame creator or admin can update frame");
        };

        let updatedFrame : Frame = {
          id;
          title;
          description;
          assetIds;
          creator = frame.creator;
          createdAt = frame.createdAt;
          visibility;
        };

        frames := natMap.put(frames, id, updatedFrame);
      };
    };
  };

  public shared ({ caller }) func deleteFrame(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can delete frames");
    };

    let frameOpt = natMap.get(frames, id);
    switch (frameOpt) {
      case null {
        Debug.trap("Frame not found");
      };
      case (?frame) {
        if (caller != frame.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only frame creator or admin can delete frame");
        };

        frames := natMap.delete(frames, id);
      };
    };
  };

  public query func getFrame(id : Nat) : async ?Frame {
    natMap.get(frames, id);
  };

  public query func getAllFrames() : async [Frame] {
    Iter.toArray(natMap.vals(frames));
  };

  public query ({ caller }) func getCallerFrames() : async [Frame] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };

    let userFrames = Iter.toArray(
      Iter.filter(
        natMap.vals(frames),
        func(f : Frame) : Bool {
          f.creator == caller;
        },
      )
    );
    userFrames;
  };

  public query func getPublicFrames() : async [Frame] {
    let publicFrames = Iter.toArray(
      Iter.filter(
        natMap.vals(frames),
        func(f : Frame) : Bool {
          f.visibility == "public";
        },
      )
    );
    publicFrames;
  };

  // Admin Functions
  public shared ({ caller }) func resetAllData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can reset all data");
    };

    userProfiles := principalMap.empty<UserProfile>();
    swarms := natMap.empty<Swarm>();
    annotations := natMap.empty<Annotation>();
    locations := natMap.empty<Location>();
    digitalAssets := natMap.empty<DigitalAsset>();
    frames := natMap.empty<Frame>();
    approvals := [];
    nextSwarmId := 0;
    nextAnnotationId := 0;
    nextLocationId := 0;
    nextAssetId := 0;
    nextFrameId := 0;
    accessControlState := AccessControl.initState();
  };
};

