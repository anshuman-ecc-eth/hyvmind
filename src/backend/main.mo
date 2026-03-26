import Text "mo:core/Text";
import List "mo:core/List";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";

import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import Runtime "mo:core/Runtime";

// Apply any data migration necessary after code changes

actor {
  // Type Aliases
  type NodeId = Text;
  type Directionality = { #none; #unidirectional; #bidirectional };
  type Tag = Text;
  type CustomAttribute = { key : Text; value : Text };
  type BuzzScore = Int;

  // Node Types
  type Timestamps = {
    createdAt : Time.Time;
  };

  type Curation = {
    id : NodeId;
    name : Text;
    creator : Principal;
    jurisdiction : Text;
    timestamps : Timestamps;
  };

  type Swarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    creator : Principal;
    timestamps : Timestamps;
    forkSource : ?NodeId;
    forkPrincipal : ?Principal;
  };

  type Location = {
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

  type LawToken = {
    id : NodeId;
    tokenLabel : Text;
    parentLocationId : NodeId;
    creator : Principal;
    timestamps : Timestamps;
  };

  type Sublocation = {
    id : NodeId;
    title : Text;
    content : Text;
    originalTokenSequence : Text;
    creator : Principal;
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
    creator : Principal;
    timestamps : Timestamps;
  };

  // User and Voting Types
  type UserProfile = {
    name : Text;
    socialUrl : ?Text;
  };

  type SearchResult = {
    id : NodeId;
    nodeType : Text;
    name : Text;
    parentContext : ?Text;
  };

  type MembershipStatus = { #pending; #approved };
  type MembershipInfo = {
    principal : Principal;
    profileName : ?Text;
    status : MembershipStatus;
  };

  type SwarmMembership = {
    swarmId : NodeId;
    member : Principal;
    status : MembershipStatus;
  };

  type VoteData = {
    upvotes : Nat;
    downvotes : Nat;
  };

  type UserVoteTracking = { votedNodes : Map.Map<Text, Bool> };

  type BuzzLeaderboardEntry = {
    principal : Principal;
    profileName : ?Text;
    score : BuzzScore;
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

  type TokenType = {
    #lawToken : LawToken;
    #interpretationToken : InterpretationToken;
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

  // Mint Settings
  type MintSettings = { numCopies : Nat };
  let mintSettingsMap = Map.empty<Principal, MintSettings>();

  // Collectibles
  type CollectibleEdition = {
    tokenId : NodeId;
    tokenType : { #lawToken; #interpretationToken };
    editionNumber : Nat;
    owner : Principal;
    mintedAt : Time.Time;
  };

  let collectibleEditionsMap = Map.empty<NodeId, List.List<CollectibleEdition>>();
  let collectibleSupplyMap = Map.empty<NodeId, Nat>();

  // Backend State
  let voteData = Map.empty<Text, VoteData>();
  let userVoteTracking = Map.empty<Principal, UserVoteTracking>();

  var curationMap = Map.empty<NodeId, Curation>();
  var swarmMap = Map.empty<NodeId, Swarm>();
  var forkedSwarmMap = Map.empty<NodeId, ForkedSwarm>();
  var locationMap = Map.empty<NodeId, Location>();
  var lawTokenMap = Map.empty<NodeId, LawToken>();
  var sublocationMap = Map.empty<NodeId, Sublocation>();
  var sublocationLawTokenRelations = Map.empty<NodeId, List.List<NodeId>>();
  var interpretationTokenMap = Map.empty<NodeId, InterpretationToken>();
  var membershipRequests = Map.empty<NodeId, List.List<SwarmMembership>>();
  var swarmMembers = Map.empty<NodeId, List.List<Principal>>();
  var userProfiles = Map.empty<Principal, UserProfile>();
  var swarmUpdates = Map.empty<Principal, List.List<SwarmUpdate>>();
  var locationLawTokenRelations = Map.empty<NodeId, List.List<NodeId>>();
  var voteDataMap = Map.empty<Text, VoteData>();
  var buzzScores = Map.empty<Principal, BuzzScore>();
  var interpretationTokenFromEdges = Map.empty<NodeId, List.List<GraphEdge>>();
  var interpretationTokenToEdges = Map.empty<NodeId, List.List<GraphEdge>>();
  let accessControlState = AccessControl.initState();
  let approvalState = UserApproval.initState(accessControlState);
  var existingAdmins : [Principal] = [];
  var archivedNodes = Map.empty<NodeId, ()>();

  // Store SwarmType (including which swarms are "question-of-law")
  var swarmTypeMap = Map.empty<NodeId, SwarmType>();

  type SwarmType = {
    #regular;
    #questionOfLaw;
  };

  module LawToken {
    public func compareByTokenLabel(t1 : LawToken, t2 : LawToken) : Order.Order {
      Text.compare(t1.tokenLabel, t2.tokenLabel);
    };
  };

  module Curation {
    public func compareByName(c1 : Curation, c2 : Curation) : Order.Order {
      Text.compare(c1.name, c2.name);
    };
  };

  module Swarm {
    public func compareByName(s1 : Swarm, s2 : Swarm) : Order.Order {
      Text.compare(s1.name, s2.name);
    };
  };

  module ForkedSwarm {
    public func compareByName(s1 : ForkedSwarm, s2 : ForkedSwarm) : Order.Order {
      Text.compare(s1.name, s2.name);
    };
  };

  module Location {
    public func compareByTitle(a1 : Location, a2 : Location) : Order.Order {
      Text.compare(a1.title, a2.title);
    };
  };

  module SwarmMembership {
    public func compareByMember(a : SwarmMembership, b : SwarmMembership) : Order.Order {
      Principal.compare(a.member, b.member);
    };
  };

  module SwarmUpdate {
    public func compareByTimestamp(a : SwarmUpdate, b : SwarmUpdate) : Order.Order {
      if (a.timestamp < b.timestamp) { #less }
      else if (a.timestamp > b.timestamp) { #greater }
      else { #equal };
    };
  };

  // Graph Types for visualization
  type GraphNode = {
    id : NodeId;
    nodeType : Text;
    tokenLabel : Text;
    jurisdiction : ?Text;
    parentId : ?NodeId;
    children : [GraphNode];
  };

  type GraphEdge = {
    source : NodeId;
    target : NodeId;
  };

  type GraphData = {
    curations : [Curation];
    swarms : [Swarm];
    locations : [Location];
    lawTokens : [LawToken];
    sublocations : [Sublocation];
    interpretationTokens : [InterpretationToken];
    rootNodes : [GraphNode];
    edges : [GraphEdge];
  };

  // OwnedGraphData type for only caller-owned nodes
  type OwnedGraphData = {
    curations : [Curation];
    swarms : [Swarm];
    locations : [Location];
    lawTokens : [LawToken];
    sublocations : [Sublocation];
    interpretationTokens : [InterpretationToken];
    edges : [GraphEdge];
  };

  // Addition: Get archived node IDs
  public query ({ caller }) func getArchivedNodeIds() : async [NodeId] {
    archivedNodes.keys().toArray();
  };

  // Allow any authenticated user to archive their own nodes.
  public shared ({ caller }) func archiveNode(nodeId : NodeId) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Only authenticated users can archive nodes");
    };

    archivedNodes.add(nodeId, ());
  };

  public query ({ caller }) func isNodeArchived(nodeId : NodeId) : async Bool {
    archivedNodes.containsKey(nodeId);
  };

  // MINT SETTINGS FUNCTIONS
  // Only authenticated users (not guests) may read or write their own mint settings.
  public query ({ caller }) func getMintSettings() : async MintSettings {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access mint settings");
    };
    switch (mintSettingsMap.get(caller)) {
      case (null) { { numCopies = 1 } };
      case (?settings) { settings };
    };
  };

  public shared ({ caller }) func setMintSettings(settings : MintSettings) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update mint settings");
    };
    if (settings.numCopies < 1) {
      Runtime.trap("Number of copies must be 1 or more");
    };
    mintSettingsMap.add(caller, settings);
  };

  // COLLECTIBLES FUNCTIONALITY
  func calculatePrice(tokenType : { #lawToken; #interpretationToken }, numCopies : Nat) : Int {
    let basePrice = switch (tokenType) {
      case (#lawToken) { 30_000_000 };
      case (#interpretationToken) { 50_000_000 };
    };
    if (numCopies == 0) { return basePrice };
    basePrice / numCopies;
  };

  type MintCollectibleResult = {
    #success : CollectibleEdition;
    #alreadyOwned;
    #tokenNotFound;
    #editionLimitReached;
    #insufficientFunds;
  };

  public type MintCollectibleRequest = {
    tokenId : NodeId;
    tokenType : { #lawToken; #interpretationToken };
  };

  public shared ({ caller }) func mintCollectible(request : MintCollectibleRequest) : async MintCollectibleResult {
    // Only authenticated users (not guests) can mint collectibles
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can mint collectibles");
    };

    let mintSettings = switch (mintSettingsMap.get(caller)) {
      case (null) { { numCopies = 1 } };
      case (?settings) { settings };
    };

    let editions = switch (collectibleEditionsMap.get(request.tokenId)) {
      case (null) { List.empty<CollectibleEdition>() };
      case (?existing) { existing };
    };

    // Double mint check: prevent minting if caller already owns an edition
    let currentlyOwned = editions.any(
      func(edition : CollectibleEdition) : Bool { edition.owner == caller }
    );

    if (currentlyOwned) { return #alreadyOwned };

    switch (getToken(request.tokenId, request.tokenType)) {
      case (null) { return #tokenNotFound };
      case (?_token) {
        let _price = calculatePrice(request.tokenType, mintSettings.numCopies);
        // Price deduction from BUZZ wallet
        let callerBalance = switch (buzzScores.get(caller)) {
          case (null) { 0 };
          case (?balance) { balance };
        };

        if (callerBalance < _price) {
          return #insufficientFunds;
        };

        let editionNumber = editions.size() + 1;
        if (editionNumber > mintSettings.numCopies) {
          return #editionLimitReached;
        };

        // Deduct price after all checks pass
        updateBuzzScore(caller, -_price);

        let newEdition : CollectibleEdition = {
          tokenId = request.tokenId;
          tokenType = request.tokenType;
          editionNumber;
          owner = caller;
          mintedAt = Time.now();
        };

        editions.add(newEdition);
        collectibleEditionsMap.add(request.tokenId, editions);
        collectibleSupplyMap.add(request.tokenId, editionNumber);

        return #success(newEdition);
      };
    };
  };

  public query ({ }) func getCollectibleEditions(tokenId : NodeId) : async [CollectibleEdition] {
    switch (collectibleEditionsMap.get(tokenId)) {
      case (null) { [] };
      case (?editions) { editions.toArray() };
    };
  };

  func getToken(tokenId : NodeId, tokenType : { #lawToken; #interpretationToken }) : ?{ #lawToken; #interpretationToken } {
    switch (tokenType) {
      case (#lawToken) {
        if (lawTokenMap.containsKey(tokenId)) { ?tokenType } else { null };
      };
      case (#interpretationToken) {
        if (interpretationTokenMap.containsKey(tokenId)) { ?tokenType } else { null };
      };
    };
  };

  public query ({ caller }) func getMyBuzzBalance() : async BuzzScore {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view their BUZZ balance");
    };
    switch (buzzScores.get(caller)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
  };

  // AUTHENTICATION AND AUTHORIZATION
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);

    if (existingAdmins.size() < 2) {
      let callerExists = existingAdmins.find(func(p : Principal) : Bool { Principal.equal(p, caller) });
      if (callerExists == null and AccessControl.isAdmin(accessControlState, caller)) {
        existingAdmins := existingAdmins.concat([caller]);
      };
    };
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };

    if (role == #admin) {
      let numCurrentAdmins = countAdmins();
      if (numCurrentAdmins >= 2) {
        Runtime.trap("Admin limit reached—no additional admins can be added.");
      };
    };

    AccessControl.assignRole(accessControlState, caller, user, role);

    if (role == #admin) {
      let userExists = existingAdmins.find(func(p : Principal) : Bool { Principal.equal(p, user) });
      if (userExists == null) {
        existingAdmins := existingAdmins.concat([user]);
      };
    };
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // APPROVAL SYSTEM
  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can request approval");
    };
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  // USER PROFILES
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile unless you are an admin");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // CREATION & UPDATE OPERATIONS
  func autoUpvoteNode(nodeId : Text, creator : Principal) {
    voteDataMap.add(nodeId, { upvotes = 1; downvotes = 0 });

    let userVoteData = switch (userVoteTracking.get(creator)) {
      case (null) {
        let newTracking : UserVoteTracking = { votedNodes = Map.empty<Text, Bool>() };
        userVoteTracking.add(creator, newTracking);
        newTracking;
      };
      case (?tracking) { tracking };
    };

    userVoteData.votedNodes.add(nodeId, true);
  };

  func ensureMyForksCuration(caller : Principal) : NodeId {
    // Search for existing "My Forks" curation owned by caller
    for ((id, curation) in curationMap.entries()) {
      if (curation.creator == caller and curation.name == "My Forks") {
        return id;
      };
    };
    // Not found — create it
    let id = generateId("curation", "My Forks", caller);
    let newCuration = {
      id;
      name = "My Forks";
      creator = caller;
      jurisdiction = "";
      timestamps = { createdAt = Time.now(); };
    };
    curationMap.add(id, newCuration);
    id;
  };

  // Deep copy helper function for swarm forking/duplicating.
  // Copies all locations, law tokens, sublocations and interpretation tokens.
  func deepCopySwarmContent(sourceSwarmId : NodeId, targetSwarmId : NodeId, caller : Principal) {
    // Step 1: Copy locations and build old->new location ID mapping
    var locationIdMap = Map.empty<NodeId, NodeId>();
    for ((locId, loc) in locationMap.entries()) {
      if (loc.parentSwarmId == sourceSwarmId) {
        let newLocId = generateId("location", loc.title, caller);
        let newLoc = {
          id = newLocId;
          title = loc.title;
          content = loc.content;
          originalTokenSequence = loc.originalTokenSequence;
          customAttributes = loc.customAttributes;
          parentSwarmId = targetSwarmId;
          creator = caller;
          version = loc.version;
          timestamps = { createdAt = Time.now(); };
        };
        locationMap.add(newLocId, newLoc);
        locationIdMap.add(locId, newLocId);
      };
    };

    // Step 2: Copy law tokens — for each copied location, copy its law tokens
    var lawTokenIdMap = Map.empty<NodeId, NodeId>();
    for ((oldLocId, newLocId) in locationIdMap.entries()) {
      switch (locationLawTokenRelations.get(oldLocId)) {
        case (null) {};
        case (?tokenIds) {
          for (oldTokenId in tokenIds.values()) {
            switch (lawTokenMap.get(oldTokenId)) {
              case (null) {};
              case (?token) {
                let newTokenId = generateId("lawToken", token.tokenLabel, caller);
                let newToken = {
                  id = newTokenId;
                  tokenLabel = token.tokenLabel;
                  parentLocationId = newLocId;
                  creator = caller;
                  timestamps = { createdAt = Time.now(); };
                };
                lawTokenMap.add(newTokenId, newToken);
                lawTokenIdMap.add(oldTokenId, newTokenId);

                // Link to new location
                let existing = switch (locationLawTokenRelations.get(newLocId)) {
                  case (null) { List.empty<NodeId>() };
                  case (?l) { l };
                };
                existing.add(newTokenId);
                locationLawTokenRelations.add(newLocId, existing);
              };
            };
          };
        };
      };
    };

    // Step 3: Copy sublocations linked to copied law tokens
    var sublocationIdMap = Map.empty<NodeId, NodeId>();
    for ((slId, sl) in sublocationMap.entries()) {
      // Check if this sublocation is linked to any of the source swarm's law tokens
      var linkedToSourceSwarm = false;
      switch (sublocationLawTokenRelations.get(slId)) {
        case (null) {};
        case (?linkedTokenIds) {
          for (tid in linkedTokenIds.values()) {
            if (lawTokenIdMap.containsKey(tid)) {
              linkedToSourceSwarm := true;
            };
          };
        };
      };
      if (linkedToSourceSwarm) {
        let newSlId = generateId("sublocation", sl.title, caller);
        let newSl = {
          id = newSlId;
          title = sl.title;
          content = sl.content;
          originalTokenSequence = sl.originalTokenSequence;
          creator = caller;
          timestamps = { createdAt = Time.now(); };
        };
        sublocationMap.add(newSlId, newSl);
        sublocationIdMap.add(slId, newSlId);
        // Re-wire sublocation<->law token relations using new IDs
        switch (sublocationLawTokenRelations.get(slId)) {
          case (null) {};
          case (?linkedTokenIds) {
            for (oldTid in linkedTokenIds.values()) {
              switch (lawTokenIdMap.get(oldTid)) {
                case (null) {};
                case (?newTid) {
                  // sublocationLawTokenRelations: sublocation -> [lawToken]
                  let slRelations = switch (sublocationLawTokenRelations.get(newSlId)) {
                    case (null) { List.empty<NodeId>() };
                    case (?l) { l };
                  };
                  slRelations.add(newTid);
                  sublocationLawTokenRelations.add(newSlId, slRelations);
                  // locationLawTokenRelations used for sublocation backlinks: lawToken -> [sublocation]
                  let ltRelations = switch (locationLawTokenRelations.get(newTid)) {
                    case (null) { List.empty<NodeId>() };
                    case (?l) { l };
                  };
                  ltRelations.add(newSlId);
                  locationLawTokenRelations.add(newTid, ltRelations);
                };
              };
            };
          };
        };
      };
    };

    // Step 4: Copy interpretation tokens that reference copied law tokens
    for ((_itId, it) in interpretationTokenMap.entries()) {
      let newFromTokenId = switch (lawTokenIdMap.get(it.fromTokenId)) {
        case (?nid) { nid };
        case (null) { it.fromTokenId }; // not in this swarm, keep reference
      };
      let newToNodeId = switch (lawTokenIdMap.get(it.toNodeId)) {
        case (?nid) { nid };
        case (null) {
          switch (locationIdMap.get(it.toNodeId)) {
            case (?nid) { nid };
            case (null) { it.toNodeId };
          };
        };
      };
      // Only copy interpretation tokens where fromTokenId is in this swarm
      if (lawTokenIdMap.containsKey(it.fromTokenId)) {
        let newItId = generateId("interpretationToken", it.title, caller);
        let newIt = {
          id = newItId;
          title = it.title;
          context = it.context;
          fromTokenId = newFromTokenId;
          fromRelationshipType = it.fromRelationshipType;
          fromDirectionality = it.fromDirectionality;
          toNodeId = newToNodeId;
          toRelationshipType = it.toRelationshipType;
          toDirectionality = it.toDirectionality;
          customAttributes = it.customAttributes;
          creator = caller;
          timestamps = { createdAt = Time.now(); };
        };
        interpretationTokenMap.add(newItId, newIt);
        // Register edges
        let fromEdges = switch (interpretationTokenFromEdges.get(newFromTokenId)) {
          case (null) { List.empty<GraphEdge>() };
          case (?l) { l };
        };
        fromEdges.add({
          source = newFromTokenId;
          target = newItId;
        });
        interpretationTokenFromEdges.add(newFromTokenId, fromEdges);
        let toEdges = switch (interpretationTokenToEdges.get(newToNodeId)) {
          case (null) { List.empty<GraphEdge>() };
          case (?l) { l };
        };
        toEdges.add({
          source = newItId;
          target = newToNodeId;
        });
        interpretationTokenToEdges.add(newToNodeId, toEdges);
      };
    };
  };

  public shared ({ caller }) func createCuration(name : Text, jurisdiction : Text) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create curations");
    };

    let id = generateId("curation", name, caller);
    let newCuration = {
      id;
      name;
      creator = caller;
      jurisdiction;
      timestamps = {
        createdAt = Time.now();
      };
    };
    curationMap.add(id, newCuration);

    id;
  };

  public shared ({ caller }) func createSwarm(name : Text, tags : [Tag], parentCurationId : NodeId) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create swarms");
    };

    switch (curationMap.get(parentCurationId)) {
      case (null) {
        Runtime.trap("Parent curation does not exist");
      };
      case (_) {};
    };

    // Determine if this swarm is "question-of-law"
    let isQuestionOfLaw = tags.any(func(tag) { tag == "question-of-law" });

    let id = generateId("swarm", name, caller);
    let newSwarm : Swarm = {
      id;
      name;
      tags;
      parentCurationId;
      creator = caller;
      timestamps = {
        createdAt = Time.now();
      };
      forkSource = null;
      forkPrincipal = null;
    };
    swarmMap.add(id, newSwarm);

    // Save the swarm type
    let swarmType = if (isQuestionOfLaw) { #questionOfLaw } else { #regular };
    swarmTypeMap.add(id, swarmType);

    autoUpvoteNode(id, caller);

    id;
  };

  public shared ({ caller }) func createLocation(
    title : Text,
    content : Text,
    originalTokenSequence : Text,
    customAttributes : [CustomAttribute],
    parentSwarmId : NodeId
  ) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create locations");
    };

    switch (swarmMap.get(parentSwarmId)) {
      case (null) { Runtime.trap("Parent swarm does not exist") };
      case (_) {};
    };

    if (not isSwarmCreatorOrMember(caller, parentSwarmId)) {
      Runtime.trap("Unauthorized: Only swarm creator or approved members can create locations");
    };

    let finalTitle = title.trim(#char ' ');
    let version = 1;

    let id = generateId("location", finalTitle, caller);

    let newLocation = {
      id;
      title = finalTitle;
      content;
      originalTokenSequence;
      customAttributes;
      parentSwarmId;
      creator = caller;
      version;
      timestamps = {
        createdAt = Time.now();
      };
    };
    locationMap.add(id, newLocation);

    let lawTokensCreated = createLawTokensForLocation(newLocation, caller);
    updateBuzzScoreOnLawTokenCreation(caller, lawTokensCreated);

    autoUpvoteNode(id, caller);

    createSwarmTokenUpdate(?parentSwarmId, id, finalTitle, caller);

    let locationUpdate : SwarmUpdate = {
      swarmId = parentSwarmId;
      tokenId = id;
      tokenTitle = finalTitle;
      creatorPrincipal = caller;
      timestamp = Time.now();
      status = #unread;
      userId = caller;
    };
    addSwarmUpdateForContributors(locationUpdate, ?parentSwarmId);

    id;
  };

  public shared ({ caller }) func createSublocation(
    title : Text,
    content : Text,
    originalTokenSequence : Text,
    parentLawTokenIds : [NodeId]
  ) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create sublocations");
    };

    for (parentLawTokenId in parentLawTokenIds.values()) {
      if (not lawTokenMap.containsKey(parentLawTokenId)) {
        Runtime.trap("Parent law token does not exist");
      };

      let swarmId = getNodeSwarmId(parentLawTokenId);
      switch (swarmId) {
        case (null) { Runtime.trap("Cannot determine swarm for parent law token") };
        case (?sid) {
          if (not isSwarmCreatorOrMember(caller, sid)) {
            Runtime.trap("Unauthorized: Only swarm creator or approved members can create sublocations attached to this law token");
          };
        };
      };
    };

    let id = generateId("sublocation", title, caller);
    let newSublocation = {
      id;
      title;
      content;
      originalTokenSequence;
      creator = caller;
      timestamps = {
        createdAt = Time.now();
      };
    };
    sublocationMap.add(id, newSublocation);

    for (parentLawTokenId in parentLawTokenIds.values()) {
      let existingRelations = switch (sublocationLawTokenRelations.get(id)) {
        case (null) { List.empty<NodeId>() };
        case (?relations) { relations };
      };
      existingRelations.add(parentLawTokenId);
      sublocationLawTokenRelations.add(id, existingRelations);

      let existingLawTokenRelations = switch (locationLawTokenRelations.get(parentLawTokenId)) {
        case (null) { List.empty<NodeId>() };
        case (?relations) { relations };
      };
      existingLawTokenRelations.add(id);
      locationLawTokenRelations.add(parentLawTokenId, existingLawTokenRelations);
    };

    let lawTokensCreated = createLawTokensForSublocation(newSublocation, caller);
    updateBuzzScoreOnLawTokenCreation(caller, lawTokensCreated);

    autoUpvoteNode(id, caller);
    id;
  };

  public shared ({ caller }) func createInterpretationToken(
    title : Text,
    context : Text,
    fromTokenId : NodeId,
    fromRelationshipType : Text,
    fromDirectionality : Directionality,
    toNodeId : NodeId,
    toRelationshipType : Text,
    toDirectionality : Directionality,
    customAttributes : [CustomAttribute]
  ) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create interpretation tokens");
    };

    if (not isValidFromNode(fromTokenId)) {
      Runtime.trap("Invalid from node: must be a Location, Law Token, or Interpretation Token");
    };

    if (not isValidToNode(toNodeId)) {
      Runtime.trap("Invalid to node: cannot be a Curation");
    };

    if (fromTokenId == toNodeId) {
      Runtime.trap("From and To nodes must be different");
    };

    let fromSwarmId = getNodeSwarmId(fromTokenId);
    let toSwarmId = getNodeSwarmId(toNodeId);

    switch (fromSwarmId) {
      case (null) { Runtime.trap("Cannot determine swarm for from node") };
      case (?fromSwarm) {
        if (not isSwarmCreatorOrMember(caller, fromSwarm)) {
          Runtime.trap("Unauthorized: Must be creator or approved member of the from node's swarm");
        };
      };
    };

    switch (toSwarmId) {
      case (null) { Runtime.trap("Cannot determine swarm for to node") };
      case (?toSwarm) {
        if (not isSwarmCreatorOrMember(caller, toSwarm)) {
          Runtime.trap("Unauthorized: Must be creator or approved member of the to node's swarm");
        };
      };
    };

    let id = generateId("interpretationToken", title, caller);
    let newInterpretationToken = {
      id;
      title;
      context;
      fromTokenId;
      fromRelationshipType;
      fromDirectionality;
      toNodeId;
      toRelationshipType;
      toDirectionality;
      customAttributes;
      creator = caller;
      timestamps = {
        createdAt = Time.now();
      };
    };
    interpretationTokenMap.add(id, newInterpretationToken);

    let fromEdge = { source = fromTokenId; target = id };
    let toEdge = { source = id; target = toNodeId };

    let currentFromEdges = switch (interpretationTokenFromEdges.get(fromTokenId)) {
      case (null) { List.empty<GraphEdge>() };
      case (?edges) { edges };
    };
    currentFromEdges.add(fromEdge);
    interpretationTokenFromEdges.add(fromTokenId, currentFromEdges);

    let currentToEdges = switch (interpretationTokenToEdges.get(id)) {
      case (null) { List.empty<GraphEdge>() };
      case (?edges) { edges };
    };
    currentToEdges.add(toEdge);
    interpretationTokenToEdges.add(id, currentToEdges);

    updateBuzzScoreOnInterpretationTokenCreation(caller);
    autoUpvoteNode(id, caller);

    let swarmId = getNodeSwarmId(fromTokenId);
    switch (swarmId) {
      case (?sid) {
        createSwarmTokenUpdate(?sid, id, title, caller);
        let interpretationTokenUpdate : SwarmUpdate = {
          swarmId = sid;
          tokenId = id;
          tokenTitle = title;
          creatorPrincipal = caller;
          timestamp = Time.now();
          status = #unread;
          userId = caller;
        };
        addSwarmUpdateForContributors(interpretationTokenUpdate, ?sid);
      };
      case (null) {};
    };

    id;
  };

  // Validates "From" nodes: Locations, Law Tokens, and Interpretation Tokens allowed
  func isValidFromNode(nodeId : NodeId) : Bool {
    locationMap.containsKey(nodeId) or
    lawTokenMap.containsKey(nodeId) or
    sublocationMap.containsKey(nodeId) or
    interpretationTokenMap.containsKey(nodeId)
  };

  // Validates "To" nodes: Locations, Law Tokens, and Interpretation Tokens allowed (not Curations)
  func isValidToNode(nodeId : NodeId) : Bool {
    locationMap.containsKey(nodeId) or
    lawTokenMap.containsKey(nodeId) or
    sublocationMap.containsKey(nodeId) or
    interpretationTokenMap.containsKey(nodeId)
  };

  // Check access for Location, LawToken and InterpretationToken nodes
  func hasNodeAccess(caller : Principal, nodeId : NodeId) : Bool {
    let swarmId = getNodeSwarmId(nodeId);
    switch (swarmId) {
      case (?swarm) { isSwarmCreatorOrMember(caller, swarm) };
      case (null) { false };
    };
  };

  func getNodeSwarmId(nodeId : NodeId) : ?NodeId {
    switch (swarmMap.get(nodeId)) {
      case (?swarm) { return ?swarm.id };
      case (null) {};
    };

    switch (locationMap.get(nodeId)) {
      case (?location) { return ?location.parentSwarmId };
      case (null) {};
    };

    switch (lawTokenMap.get(nodeId)) {
      case (?lawToken) {
        switch (locationMap.get(lawToken.parentLocationId)) {
          case (?location) { return ?location.parentSwarmId };
          case (null) { return null };
        };
      };
      case (null) {};
    };

    switch (sublocationMap.get(nodeId)) {
      case (?_sublocation) {
        switch (sublocationLawTokenRelations.get(nodeId)) {
          case (null) { return null };
          case (?lawTokenIds) {
            switch (lawTokenIds.first()) {
              case (null) { return null };
              case (?lawTokenId) {
                switch (lawTokenMap.get(lawTokenId)) {
                  case (?lawToken) {
                    switch (locationMap.get(lawToken.parentLocationId)) {
                      case (?location) { return ?location.parentSwarmId };
                      case (null) { return null };
                    };
                  };
                  case (null) { return null };
                };
              };
            };
          };
        };
      };
      case (null) {};
    };

    switch (interpretationTokenMap.get(nodeId)) {
      case (?interpretationToken) {
        if (locationMap.containsKey(interpretationToken.fromTokenId)) {
          return getNodeSwarmId(interpretationToken.fromTokenId);
        };
        if (lawTokenMap.containsKey(interpretationToken.fromTokenId)) {
          return getNodeSwarmId(interpretationToken.fromTokenId);
        };
        if (sublocationMap.containsKey(interpretationToken.fromTokenId)) {
          return getNodeSwarmId(interpretationToken.fromTokenId);
        };
        if (interpretationTokenMap.containsKey(interpretationToken.fromTokenId)) {
          return getNodeSwarmId(interpretationToken.fromTokenId);
        };
      };
      case (null) {};
    };

    null;
  };

  func createLawTokensForSublocation(sublocation : Sublocation, creator : Principal) : Nat {
    let tokens = splitByCurlyBrackets(sublocation.content);

    var tokensCreated : Nat = 0;

    for (token in tokens.values()) {
      let cleanToken = token.trim(#char ' ');

      if (cleanToken.size() != 0) {
        let newId = generateId("lawToken", cleanToken, creator);

        let newLawToken = {
          id = newId;
          tokenLabel = cleanToken;
          parentLocationId = sublocation.id;
          creator;
          timestamps = {
            createdAt = Time.now();
          };
        };

        lawTokenMap.add(newId, newLawToken);
        autoUpvoteNode(newId, creator);
        tokensCreated += 1;

        let lawTokenId = newId;

        let currentRelations = switch (sublocationLawTokenRelations.get(sublocation.id)) {
          case (null) { List.empty<NodeId>() };
          case (?relations) { relations };
        };

        currentRelations.add(lawTokenId);
        sublocationLawTokenRelations.add(sublocation.id, currentRelations);
      };
    };

    tokensCreated;
  };

  // VOTING OPERATIONS
  public shared ({ caller }) func upvoteNode(nodeId : NodeId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can vote");
    };

    // Curations cannot be voted on
    if (curationMap.containsKey(nodeId)) {
      Runtime.trap("Curations cannot be voted on");
    };

    // Check if node exists
    if (not nodeExists(nodeId)) {
      Runtime.trap("Node not found");
    };

    // Check if user has already voted on this node
    if (hasUserVoted(caller, nodeId)) {
      Runtime.trap("You have already voted on this node");
    };

    // For non-swarm nodes, check swarm membership
    if (not swarmMap.containsKey(nodeId)) {
      let swarmId = getNodeSwarmId(nodeId);
      switch (swarmId) {
        case (null) { Runtime.trap("Cannot determine swarm for node") };
        case (?sid) {
          if (not isSwarmCreatorOrMember(caller, sid)) {
            Runtime.trap("Unauthorized: Only swarm creator or approved members can vote on this node");
          };
        };
      };
    };

    // Update vote data
    let currentVotes = switch (voteDataMap.get(nodeId)) {
      case (null) { { upvotes = 0; downvotes = 0 } };
      case (?votes) { votes };
    };

    voteDataMap.add(nodeId, {
      upvotes = currentVotes.upvotes + 1;
      downvotes = currentVotes.downvotes;
    });

    // Track user vote
    markUserVoted(caller, nodeId);

    // Update BUZZ score for node creator
    switch (getNodeCreator(nodeId)) {
      case (?creator) { updateBuzzScoreOnUpvote(creator, nodeId) };
      case (null) {};
    };
  };

  public shared ({ caller }) func downvoteNode(nodeId : NodeId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can vote");
    };

    // Curations cannot be voted on
    if (curationMap.containsKey(nodeId)) {
      Runtime.trap("Curations cannot be voted on");
    };

    // Check if node exists
    if (not nodeExists(nodeId)) {
      Runtime.trap("Node not found");
    };

    // Check if user has already voted on this node
    if (hasUserVoted(caller, nodeId)) {
      Runtime.trap("You have already voted on this node");
    };

    // For non-swarm nodes, check swarm membership
    if (not swarmMap.containsKey(nodeId)) {
      let swarmId = getNodeSwarmId(nodeId);
      switch (swarmId) {
        case (null) { Runtime.trap("Cannot determine swarm for node") };
        case (?sid) {
          if (not isSwarmCreatorOrMember(caller, sid)) {
            Runtime.trap("Unauthorized: Only swarm creator or approved members can vote on this node");
          };
        };
      };
    };

    // Update vote data
    let currentVotes = switch (voteDataMap.get(nodeId)) {
      case (null) { { upvotes = 0; downvotes = 0 } };
      case (?votes) { votes };
    };

    voteDataMap.add(nodeId, {
      upvotes = currentVotes.upvotes;
      downvotes = currentVotes.downvotes + 1;
    });

    // Track user vote
    markUserVoted(caller, nodeId);

    // Update BUZZ score for node creator
    switch (getNodeCreator(nodeId)) {
      case (?creator) { updateBuzzScoreOnDownvote(creator, nodeId) };
      case (null) {};
    };
  };

  public query ({ caller }) func getVoteData(nodeId : NodeId) : async VoteData {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view vote data");
    };

    switch (voteDataMap.get(nodeId)) {
      case (null) { { upvotes = 0; downvotes = 0 } };
      case (?votes) { votes };
    };
  };

  func nodeExists(nodeId : NodeId) : Bool {
    curationMap.containsKey(nodeId) or
    swarmMap.containsKey(nodeId) or
    locationMap.containsKey(nodeId) or
    lawTokenMap.containsKey(nodeId) or
    sublocationMap.containsKey(nodeId) or
    interpretationTokenMap.containsKey(nodeId)
  };

  func hasUserVoted(user : Principal, nodeId : NodeId) : Bool {
    switch (userVoteTracking.get(user)) {
      case (null) { false };
      case (?tracking) {
        switch (tracking.votedNodes.get(nodeId)) {
          case (null) { false };
          case (?_) { true };
        };
      };
    };
  };

  func markUserVoted(user : Principal, nodeId : NodeId) {
    let tracking = switch (userVoteTracking.get(user)) {
      case (null) {
        let newTracking : UserVoteTracking = { votedNodes = Map.empty<Text, Bool>() };
        userVoteTracking.add(user, newTracking);
        newTracking;
      };
      case (?existing) { existing };
    };

    tracking.votedNodes.add(nodeId, true);
  };

  // MEMBERSHIP OPERATIONS
  func isQuestionOfLawSwarm(swarmId : NodeId) : Bool {
    switch (swarmTypeMap.get(swarmId)) {
      case (null) { false };
      case (?t) { t == #questionOfLaw };
    };
  };

  func isSwarmMember(caller : Principal, swarmId : NodeId) : Bool {
    switch (swarmMembers.get(swarmId)) {
      case (null) { false };
      case (?members) { members.any(func(m : Principal) : Bool { m == caller }) };
    };
  };

  public shared ({ caller }) func joinSwarm(swarmId : NodeId) : async NodeId {
    if (not isQuestionOfLawSwarm(swarmId)) {
      Runtime.trap("Only question-of-law swarms support membership");
    };
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can join swarms");
    };
    let swarm = switch (swarmMap.get(swarmId)) {
      case (null) { Runtime.trap("Swarm not found") };
      case (?s) { s };
    };
    if (swarm.creator == caller) {
      Runtime.trap("Swarm creator cannot join their own swarm");
    };
    if (isSwarmMember(caller, swarmId)) {
      Runtime.trap("Already a member");
    };
    // Create a personal fork
    let myForksCurationId = ensureMyForksCuration(caller);
    let forkId = generateId("swarm", swarm.name, caller);
    let forkSwarm = {
      id = forkId;
      name = swarm.name;
      tags = swarm.tags;
      parentCurationId = myForksCurationId;
      creator = caller;
      timestamps = { createdAt = Time.now(); };
      forkSource = ?swarmId;
      forkPrincipal = ?caller;
    };
    swarmMap.add(forkId, forkSwarm);
    swarmTypeMap.add(forkId, #questionOfLaw);

    deepCopySwarmContent(swarmId, forkId, caller);

    forkId;
  };

  func countAdmins() : Nat {
    var count : Nat = 0;
    for (principal in existingAdmins.values()) {
      if (AccessControl.isAdmin(accessControlState, principal)) {
        count += 1;
      };
    };
    count;
  };

  func isSwarmCreatorOrMember(caller : Principal, swarmId : NodeId) : Bool {
    switch (swarmMap.get(swarmId)) {
      case (null) { false };
      case (?swarm) {
        // For forks: only the fork's creator has write access
        switch (swarm.forkSource) {
          case (?_) {
            return swarm.creator == caller;
          };
          case (null) {};
        };
        // For original swarms: creator or QoL member
        if (swarm.creator == caller) {
          return true;
        };
        if (not isQuestionOfLawSwarm(swarmId)) {
          return false;
        };
        isSwarmMember(caller, swarmId);
      };
    };
  };

  public shared ({ caller }) func pullFromSwarm(targetSwarmId : NodeId) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can pull from swarms");
    };
    if (not isQuestionOfLawSwarm(targetSwarmId)) {
      Runtime.trap("Only question-of-law swarms can be pulled");
    };
    if (not isSwarmMember(caller, targetSwarmId)) {
      Runtime.trap("You must be a member to pull from this swarm");
    };

    // Find and archive existing fork
    for ((sid, s) in swarmMap.entries()) {
      switch (s.forkSource) {
        case (?src) {
          if (src == targetSwarmId and s.creator == caller) {
            // Archive all nodes in this fork
            for ((locId, loc) in locationMap.entries()) {
              if (loc.parentSwarmId == sid) {
                archivedNodes.add(locId, ());
                switch (locationLawTokenRelations.get(locId)) {
                  case (null) {};
                  case (?tids) {
                    for (tid in tids.values()) {
                      archivedNodes.add(tid, ());
                    };
                  };
                };
              };
            };
            archivedNodes.add(sid, ());
          };
        };
        case (null) {};
      };
    };

    // Create fresh fork
    let swarm = switch (swarmMap.get(targetSwarmId)) {
      case (null) { Runtime.trap("Swarm not found") };
      case (?s) { s };
    };
    let myForksCurationId = ensureMyForksCuration(caller);
    let forkId = generateId("swarm", swarm.name, caller);
    let forkSwarm = {
      id = forkId;
      name = swarm.name;
      tags = swarm.tags;
      parentCurationId = myForksCurationId;
      creator = caller;
      timestamps = { createdAt = Time.now(); };
      forkSource = ?targetSwarmId;
      forkPrincipal = ?caller;
    };
    swarmMap.add(forkId, forkSwarm);
    swarmTypeMap.add(forkId, #questionOfLaw);
    deepCopySwarmContent(targetSwarmId, forkId, caller);
    forkId;
  };

  public query ({ caller }) func getSwarmForks(swarmId : NodeId) : async [Swarm] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view swarm forks");
    };
    var result = List.empty<Swarm>();
    for ((_sid, s) in swarmMap.entries()) {
      switch (s.forkSource) {
        case (?src) {
          if (src == swarmId) {
            result.add(s);
          };
        };
        case (null) {};
      };
    };
    result.toArray();
  };

  func addSwarmUpdateForContributors(update : SwarmUpdate, swarmId : ?NodeId) {
    switch (swarmId) {
      case (null) {};
      case (?sid) {
        switch (swarmMap.get(sid)) {
          case (null) {};
          case (?swarm) {
            switch (swarmMembers.get(sid)) {
              case (null) {};
              case (?members) {
                for (member in members.values()) {
                  if (member != update.creatorPrincipal) {
                    let memberUpdates = switch (swarmUpdates.get(member)) {
                      case (null) { List.empty<SwarmUpdate>() };
                      case (?existing) { existing };
                    };
                    memberUpdates.add(update);
                    swarmUpdates.add(member, memberUpdates);
                  };
                };
              };
            };
            if (swarm.creator != update.creatorPrincipal) {
              let creatorUpdates = switch (swarmUpdates.get(swarm.creator)) {
                case (null) { List.empty<SwarmUpdate>() };
                case (?existing) { existing };
              };
              creatorUpdates.add(update);
              swarmUpdates.add(swarm.creator, creatorUpdates);
            };
          };
        };
      };
    };
  };

  func createLawTokensForLocation(location : Location, creator : Principal) : Nat {
    let tokens = splitByCurlyBrackets(location.content);
    var tokensCreated : Nat = 0;
    for (token in tokens.values()) {
      let cleanToken = token.trim(#char ' ');
      if (cleanToken.size() != 0) {
        let newId = generateId("lawToken", cleanToken, creator);
        let newLawToken = {
          id = newId;
          tokenLabel = cleanToken;
          parentLocationId = location.id;
          creator;
          timestamps = {
            createdAt = Time.now();
          };
        };
        lawTokenMap.add(newId, newLawToken);
        autoUpvoteNode(newId, creator);
        tokensCreated += 1;
        let lawTokenId = newId;
        let currentRelations = switch (locationLawTokenRelations.get(location.id)) {
          case (null) { List.empty<NodeId>() };
          case (?relations) { relations };
        };
        currentRelations.add(lawTokenId);
        locationLawTokenRelations.add(location.id, currentRelations);
      };
    };
    tokensCreated;
  };

  func updateBuzzScoreOnLawTokenCreation(creator : Principal, count : Nat) {
    // Implementation needed
  };

  func createSwarmTokenUpdate(swarmId : ?NodeId, tokenId : NodeId, title : Text, creator : Principal) {
    // Implementation needed
  };

  func splitByCurlyBrackets(content : Text) : [Text] {
    var resultList = List.empty<Text>();
    var collecting = false;
    var current = "";
    for (c in content.chars()) {
      if (c == '{') {
        collecting := true;
        current := "";
      } else if (c == '}') {
        if (collecting) {
          resultList.add(current);
          collecting := false;
          current := "";
        };
      } else if (collecting) {
        current := current # Text.fromChar(c);
      };
    };
    resultList.toArray();
  };

  func getNodeCreator(nodeId : NodeId) : ?Principal {
    // Implementation needed
    null
  };

  func updateBuzzScoreOnUpvote(creator : Principal, nodeId : NodeId) {
    // Implementation needed
  };

  func updateBuzzScoreOnDownvote(creator : Principal, nodeId : NodeId) {
    // Implementation needed
  };

  func updateBuzzScoreOnInterpretationTokenCreation(creator : Principal) {
    // Implementation needed
  };

  func updateBuzzScore(user : Principal, delta : BuzzScore) {
    // Implementation needed
  };

  func generateId(nodeType : Text, name : Text, creator : Principal) : NodeId {
    nodeType # "-" # name # "-" # creator.toText() # "-" # Time.now().toText()
  };


  // ─── Graph Helper Functions ─────────────────────────────────────────────────

  func createInterpretationTokenNodes(parentTokenId : NodeId) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (interpretationToken in interpretationTokenMap.values()) {
      if (interpretationToken.fromTokenId == parentTokenId
          and not archivedNodes.containsKey(interpretationToken.id)) {
        let childNodes = createInterpretationTokenNodes(interpretationToken.id);
        let node : GraphNode = {
          id = interpretationToken.id;
          nodeType = "interpretationToken";
          tokenLabel = interpretationToken.title;
          jurisdiction = null;
          parentId = ?parentTokenId;
          children = childNodes;
        };
        nodes.add(node);
      };
    };
    nodes.toArray();
  };

  func createLawTokenNodes(parentLocationId : NodeId) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (lawToken in lawTokenMap.values()) {
      if (lawToken.parentLocationId == parentLocationId
          and not archivedNodes.containsKey(lawToken.id)) {
        let childNodes = createInterpretationTokenNodes(lawToken.id);
        let node : GraphNode = {
          id = lawToken.id;
          nodeType = "lawToken";
          tokenLabel = lawToken.tokenLabel;
          jurisdiction = null;
          parentId = ?parentLocationId;
          children = childNodes;
        };
        nodes.add(node);
      };
    };
    nodes.toArray();
  };

  func createLocationNodes(parentSwarmId : NodeId) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (location in locationMap.values()) {
      if (location.parentSwarmId == parentSwarmId
          and not archivedNodes.containsKey(location.id)) {
        let childNodes = createLawTokenNodes(location.id);
        let node : GraphNode = {
          id = location.id;
          nodeType = "location";
          tokenLabel = location.title;
          jurisdiction = null;
          parentId = ?parentSwarmId;
          children = childNodes;
        };
        nodes.add(node);
      };
    };
    nodes.toArray();
  };

  func createSwarmNodes(parentCurationId : NodeId, _jurisdiction : Text) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (swarm in swarmMap.values()) {
      if (swarm.parentCurationId == parentCurationId
          and not archivedNodes.containsKey(swarm.id)) {
        let childNodes = createLocationNodes(swarm.id);
        let node : GraphNode = {
          id = swarm.id;
          nodeType = "swarm";
          tokenLabel = swarm.name;
          jurisdiction = null;
          parentId = ?parentCurationId;
          children = childNodes;
        };
        nodes.add(node);
      };
    };
    nodes.toArray();
  };

  func createGraphNodes() : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (curation in curationMap.values()) {
      if (not archivedNodes.containsKey(curation.id)) {
        let childNodes = createSwarmNodes(curation.id, curation.jurisdiction);
        let node : GraphNode = {
          id = curation.id;
          nodeType = "curation";
          tokenLabel = curation.name;
          jurisdiction = ?curation.jurisdiction;
          parentId = null;
          children = childNodes;
        };
        nodes.add(node);
      };
    };
    nodes.toArray();
  };

  func createSwarmLinksFromLocationEdges() : [GraphEdge] {
    let edges = List.empty<GraphEdge>();
    for ((locationId, _lawTokenIds) in locationLawTokenRelations.entries()) {
      if (not archivedNodes.containsKey(locationId)) {
        switch (locationMap.get(locationId)) {
          case (?location) {
            if (not archivedNodes.containsKey(location.parentSwarmId)) {
              edges.add({
                source = location.parentSwarmId;
                target = locationId;
              });
            };
          };
          case (null) {};
        };
      };
    };
    edges.toArray();
  };

  func createCurationLinksFromSwarmLinks() : [GraphEdge] {
    let locationEdges = createSwarmLinksFromLocationEdges();
    let edges = List.empty<GraphEdge>();
    for (edge in locationEdges.vals()) {
      let locationId = edge.target;
      switch (locationMap.get(locationId)) {
        case (?location) {
          let swarmId = location.parentSwarmId;
          if (not archivedNodes.containsKey(swarmId)) {
            switch (swarmMap.get(swarmId)) {
              case (?swarm) {
                if (not archivedNodes.containsKey(swarm.parentCurationId)) {
                  edges.add({
                    source = swarm.parentCurationId;
                    target = swarmId;
                  });
                };
              };
              case (null) {};
            };
          };
        };
        case (null) {};
      };
    };
    edges.toArray();
  };

  // ─── getAllData: Public query for all non-archived graph data ────────────────

  public query func getAllData() : async GraphData {
    let filteredCurations = List.empty<Curation>();
    for (curation in curationMap.values()) {
      if (not archivedNodes.containsKey(curation.id)) {
        filteredCurations.add(curation);
      };
    };
    let filteredSwarms = List.empty<Swarm>();
    for (swarm in swarmMap.values()) {
      if (not archivedNodes.containsKey(swarm.id)) {
        filteredSwarms.add(swarm);
      };
    };
    let filteredLocations = List.empty<Location>();
    for (location in locationMap.values()) {
      if (not archivedNodes.containsKey(location.id)) {
        filteredLocations.add(location);
      };
    };
    let filteredLawTokens = List.empty<LawToken>();
    for (lawToken in lawTokenMap.values()) {
      if (not archivedNodes.containsKey(lawToken.id)) {
        filteredLawTokens.add(lawToken);
      };
    };
    let filteredSublocations = List.empty<Sublocation>();
    for (sublocation in sublocationMap.values()) {
      if (not archivedNodes.containsKey(sublocation.id)) {
        filteredSublocations.add(sublocation);
      };
    };
    let filteredInterpretationTokens = List.empty<InterpretationToken>();
    for (interpretationToken in interpretationTokenMap.values()) {
      if (not archivedNodes.containsKey(interpretationToken.id)) {
        filteredInterpretationTokens.add(interpretationToken);
      };
    };
    let rootNodes = createGraphNodes();
    let edges = List.empty<GraphEdge>();
    for ((locationId, lawTokenIds) in locationLawTokenRelations.entries()) {
      if (not archivedNodes.containsKey(locationId)) {
        for (lawTokenId in lawTokenIds.values()) {
          if (not archivedNodes.containsKey(lawTokenId)) {
            edges.add({ source = locationId; target = lawTokenId });
          };
        };
      };
    };
    for ((sublocationId, lawTokenIds) in sublocationLawTokenRelations.entries()) {
      if (not archivedNodes.containsKey(sublocationId)) {
        for (lawTokenId in lawTokenIds.values()) {
          if (not archivedNodes.containsKey(lawTokenId)) {
            edges.add({ source = sublocationId; target = lawTokenId });
          };
        };
      };
    };
    for ((fromTokenId, fromEdgesList) in interpretationTokenFromEdges.entries()) {
      if (not archivedNodes.containsKey(fromTokenId)) {
        for (edge in fromEdgesList.values()) {
          if (not (archivedNodes.containsKey(edge.source) or archivedNodes.containsKey(edge.target))) {
            edges.add(edge);
          };
        };
      };
    };
    for ((interpretationTokenId, toEdgesList) in interpretationTokenToEdges.entries()) {
      if (not archivedNodes.containsKey(interpretationTokenId)) {
        for (edge in toEdgesList.values()) {
          if (not (archivedNodes.containsKey(edge.source) or archivedNodes.containsKey(edge.target))) {
            edges.add(edge);
          };
        };
      };
    };
    for (edge in createSwarmLinksFromLocationEdges().vals()) {
      edges.add(edge);
    };
    for (edge in createCurationLinksFromSwarmLinks().vals()) {
      edges.add(edge);
    };
    {
      curations = filteredCurations.toArray();
      swarms = filteredSwarms.toArray();
      locations = filteredLocations.toArray();
      lawTokens = filteredLawTokens.toArray();
      sublocations = filteredSublocations.toArray();
      interpretationTokens = filteredInterpretationTokens.toArray();
      rootNodes;
      edges = edges.toArray();
    };
  };

  // ─── getOwnedData: Caller-owned graph data ───────────────────────────────────

  public query ({ caller }) func getOwnedData() : async OwnedGraphData {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access their owned graph data");
    };
    let ownedCurations = List.empty<Curation>();
    for (curation in curationMap.values()) {
      if (curation.creator == caller and not archivedNodes.containsKey(curation.id)) {
        ownedCurations.add(curation);
      };
    };
    let ownedSwarms = List.empty<Swarm>();
    for (swarm in swarmMap.values()) {
      if (swarm.creator == caller and not archivedNodes.containsKey(swarm.id)) {
        ownedSwarms.add(swarm);
      };
    };
    let ownedLocations = List.empty<Location>();
    for (location in locationMap.values()) {
      if (location.creator == caller and not archivedNodes.containsKey(location.id)) {
        ownedLocations.add(location);
      };
    };
    let ownedLawTokens = List.empty<LawToken>();
    for (lawToken in lawTokenMap.values()) {
      if (lawToken.creator == caller and not archivedNodes.containsKey(lawToken.id)) {
        ownedLawTokens.add(lawToken);
      };
    };
    let ownedSublocations = List.empty<Sublocation>();
    for (sublocation in sublocationMap.values()) {
      if (sublocation.creator == caller and not archivedNodes.containsKey(sublocation.id)) {
        ownedSublocations.add(sublocation);
      };
    };
    let ownedInterpretationTokens = List.empty<InterpretationToken>();
    for (interpretationToken in interpretationTokenMap.values()) {
      if (interpretationToken.creator == caller and not archivedNodes.containsKey(interpretationToken.id)) {
        ownedInterpretationTokens.add(interpretationToken);
      };
    };
    let ownedLocationsArr = ownedLocations.toArray();
    let ownedLawTokensArr = ownedLawTokens.toArray();
    let ownedSublocationsArr = ownedSublocations.toArray();
    let ownedEdges = List.empty<GraphEdge>();
    for ((locationId, lawTokenIds) in locationLawTokenRelations.entries()) {
      let locationOwned = ownedLocationsArr.find(func(loc : Location) : Bool { loc.id == locationId });
      switch (locationOwned) {
        case (?_) {
          if (not archivedNodes.containsKey(locationId)) {
            for (lawTokenId in lawTokenIds.values()) {
              let tokenOwned = ownedLawTokensArr.find(func(lt : LawToken) : Bool { lt.id == lawTokenId });
              switch (tokenOwned) {
                case (?_) {
                  if (not archivedNodes.containsKey(lawTokenId)) {
                    ownedEdges.add({ source = locationId; target = lawTokenId });
                  };
                };
                case (null) {};
              };
            };
          };
        };
        case (null) {};
      };
    };
    for ((sublocationId, lawTokenIds) in sublocationLawTokenRelations.entries()) {
      let sublocationOwned = ownedSublocationsArr.find(func(sl : Sublocation) : Bool { sl.id == sublocationId });
      switch (sublocationOwned) {
        case (?_) {
          if (not archivedNodes.containsKey(sublocationId)) {
            for (lawTokenId in lawTokenIds.values()) {
              let tokenOwned = ownedLawTokensArr.find(func(lt : LawToken) : Bool { lt.id == lawTokenId });
              switch (tokenOwned) {
                case (?_) {
                  if (not archivedNodes.containsKey(lawTokenId)) {
                    ownedEdges.add({ source = sublocationId; target = lawTokenId });
                  };
                };
                case (null) {};
              };
            };
          };
        };
        case (null) {};
      };
    };
    {
      curations = ownedCurations.toArray();
      swarms = ownedSwarms.toArray();
      locations = ownedLocations.toArray();
      lawTokens = ownedLawTokens.toArray();
      sublocations = ownedSublocations.toArray();
      interpretationTokens = ownedInterpretationTokens.toArray();
      edges = ownedEdges.toArray();
    };
  };

  public shared ({ caller }) func resetAllData() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can reset data");
    };
    curationMap := Map.empty<NodeId, Curation>();
    swarmMap := Map.empty<NodeId, Swarm>();
    locationMap := Map.empty<NodeId, Location>();
    lawTokenMap := Map.empty<NodeId, LawToken>();
    sublocationMap := Map.empty<NodeId, Sublocation>();
    interpretationTokenMap := Map.empty<NodeId, InterpretationToken>();
    membershipRequests := Map.empty<NodeId, List.List<SwarmMembership>>();
    swarmMembers := Map.empty<NodeId, List.List<Principal>>();
    swarmTypeMap := Map.empty<NodeId, SwarmType>();
    archivedNodes := Map.empty<NodeId, ()>();
  };
};
