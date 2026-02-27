import Text "mo:core/Text";
import List "mo:core/List";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import Migration "migration";

(with migration = Migration.run)
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
    meaning : Text;
    parentLocationId : NodeId;
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

  // Persistent maps for collectible editions and supplies
  let collectibleEditionsMap = Map.empty<NodeId, List.List<CollectibleEdition>>();
  let collectibleSupplyMap = Map.empty<NodeId, Nat>();

  // Backend State
  let voteData = Map.empty<Text, VoteData>();
  let userVoteTracking = Map.empty<Principal, UserVoteTracking>();
  var curationMap = Map.empty<NodeId, Curation>();
  var swarmMap = Map.empty<NodeId, Swarm>();
  var locationMap = Map.empty<NodeId, Location>();
  var lawTokenMap = Map.empty<NodeId, LawToken>();
  var interpretationTokenMap = Map.empty<NodeId, InterpretationToken>();
  var membershipRequests = Map.empty<NodeId, List.List<SwarmMembership>>();
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
    interpretationTokens : [InterpretationToken];
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
  /// Calculates the price for a collectible based on its type and available copies.
  func calculatePrice(tokenType : { #lawToken; #interpretationToken }, numCopies : Nat) : Int {
    let basePrice = switch (tokenType) {
      case (#lawToken) { 30_000_000 };
      case (#interpretationToken) { 50_000_000 };
    };
    if (numCopies == 0) {
      return basePrice;
    };
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

    // Double-mint guard: prevent minting if caller already owns an edition
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

  // getCollectibleEditions is intentionally public (no auth check) so anyone can view edition info
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
        if (interpretationTokenMap.containsKey(tokenId)) { ?tokenType } else {
          null;
        };
      };
    };
  };

  // WALLET BALANCE CHECK FUNCTION
  // Only authenticated users can query their own BUZZ balance.
  // Guests (anonymous principals) have no balance and are not permitted.
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

  public shared ({ caller }) func createCuration(name : Text, jurisdiction : Text) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create curations");
    };

    let uniqueName = getNextAvailableCurationName(name);
    let id = generateId("curation", uniqueName, caller);
    let newCuration = {
      id;
      name = uniqueName;
      creator = caller;
      jurisdiction;
      timestamps = {
        createdAt = Time.now();
      };
    };
    curationMap.add(id, newCuration);

    id;
  };

  func getNextAvailableCurationName(baseName : Text) : Text {
    var version : Nat = 1;
    var currentName = baseName;

    let nameExists = func(name : Text) : Bool {
      curationMap.values().any(func(curation : Curation) : Bool { curation.name == name });
    };

    func nameWithVersion(name : Text, ver : Nat) : Text {
      name # " (v" # ver.toText() # ")";
    };

    while (nameExists(currentName)) {
      version += 1;
      currentName := nameWithVersion(baseName, version);
    };

    currentName;
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

    let uniqueName = generateGlobalUniqueSwarmName(name);

    let id = generateId("swarm", uniqueName, caller);
    let newSwarm = {
      id;
      name = uniqueName;
      tags;
      parentCurationId;
      creator = caller;
      timestamps = {
        createdAt = Time.now();
      };
    };
    swarmMap.add(id, newSwarm);

    autoUpvoteNode(id, caller);

    id;
  };

  func generateGlobalUniqueSwarmName(baseName : Text) : Text {
    var suffix : Nat = 1;
    let allNames = List.empty<Text>();
    for (swarm in swarmMap.values()) {
      allNames.add(swarm.name);
    };

    func nameExists(name : Text) : Bool {
      allNames.any(func(existing : Text) : Bool { Text.equal(existing, name) });
    };

    func nameWithSuffix(name : Text, num : Nat) : Text {
      name # "_" # num.toText();
    };

    var candidate = baseName;
    while (nameExists(candidate)) {
      candidate := nameWithSuffix(baseName, suffix);
      suffix += 1;
    };
    candidate;
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
    let finalVersion = getNextAvailableLocationVersion(parentSwarmId, finalTitle);

    let id = generateId("location", finalTitle, caller);

    let newLocation = {
      id;
      title = finalTitle;
      content;
      originalTokenSequence;
      customAttributes;
      parentSwarmId;
      creator = caller;
      version = finalVersion;
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

  func getNextAvailableLocationVersion(parentSwarmId : NodeId, title : Text) : Nat {
    var maxVersion : Nat = 0;
    for (location in locationMap.values()) {
      if (location.parentSwarmId == parentSwarmId and location.title == title) {
        if (location.version > maxVersion) {
          maxVersion := location.version;
        };
      };
    };
    maxVersion + 1;
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

    // Validate "From" node: must be Location, Law Token, or Interpretation Token (not Curation)
    if (not isValidFromNode(fromTokenId)) {
      Runtime.trap("Invalid from node: must be a Location, Law Token, or Interpretation Token");
    };

    // Validate "To" node: can be Location, Law Token, or Interpretation Token (not Curation)
    if (not isValidToNode(toNodeId)) {
      Runtime.trap("Invalid to node: cannot be a Curation");
    };

    // Self-reference check
    if (fromTokenId == toNodeId) {
      Runtime.trap("From and To nodes must be different");
    };

    // Authorization: Check swarm access for both nodes
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
    interpretationTokenMap.containsKey(nodeId)
  };

  // Validates "To" nodes: Locations, Law Tokens, and Interpretation Tokens allowed (not Curations)
  func isValidToNode(nodeId : NodeId) : Bool {
    locationMap.containsKey(nodeId) or
    lawTokenMap.containsKey(nodeId) or
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

    switch (interpretationTokenMap.get(nodeId)) {
      case (?interpretationToken) {
        if (locationMap.containsKey(interpretationToken.fromTokenId)) {
          return getNodeSwarmId(interpretationToken.fromTokenId);
        };
        if (lawTokenMap.containsKey(interpretationToken.fromTokenId)) {
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

  // MEMBERSHIP OPERATIONS START
  public shared ({ caller }) func requestToJoinSwarm(swarmId : NodeId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can request to join swarms");
    };

    let swarm = switch (swarmMap.get(swarmId)) {
      case (null) { Runtime.trap("Swarm not found") };
      case (?s) { s };
    };

    if (swarm.creator == caller) {
      Runtime.trap("Swarm creator cannot request to join their own swarm");
    };

    switch (membershipRequests.get(swarmId)) {
      case (?existing) {
        let alreadyExists = existing.any(
          func(request : SwarmMembership) : Bool { request.member == caller }
        );
        if (alreadyExists) {
          Runtime.trap("Membership request already exists");
        };
      };
      case (null) {};
    };

    let newRequest : SwarmMembership = {
      swarmId;
      member = caller;
      status = #pending;
    };

    let requests = switch (membershipRequests.get(swarmId)) {
      case (null) { List.empty<SwarmMembership>() };
      case (?existing) { existing };
    };

    requests.add(newRequest);
    membershipRequests.add(swarmId, requests);
  };

  public shared ({ caller }) func approveJoinRequest(swarmId : NodeId, member : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can approve join requests");
    };

    let swarm = switch (swarmMap.get(swarmId)) {
      case (null) { Runtime.trap("Swarm not found") };
      case (?s) { s };
    };

    if (swarm.creator != caller) {
      Runtime.trap("Unauthorized: Only the swarm creator can approve join requests");
    };

    switch (membershipRequests.get(swarmId)) {
      case (null) { Runtime.trap("No join requests found for this swarm") };
      case (?requests) {
        let found = requests.any(
          func(request : SwarmMembership) : Bool { request.member == member and request.status == #pending }
        );

        if (not found) {
          Runtime.trap("No pending request found for member in this swarm");
        };

        let updatedRequests = requests.map<SwarmMembership, SwarmMembership>(
          func(request : SwarmMembership) : SwarmMembership {
            if (request.member == member and request.status == #pending) {
              { request with status = #approved };
            } else { request };
          }
        );
        membershipRequests.add(swarmId, updatedRequests);
      };
    };
  };

  public query ({ caller }) func getSwarmMembers(swarmId : NodeId) : async [Principal] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view swarm members");
    };

    switch (swarmMap.get(swarmId)) {
      case (null) { Runtime.trap("Swarm not found") };
      case (?_swarm) {
        switch (membershipRequests.get(swarmId)) {
          case (null) { [] };
          case (?requests) {
            let approved = requests.filter(
              func(request : SwarmMembership) : Bool { request.status == #approved }
            );
            let members = approved.map(
              func(request : SwarmMembership) : Principal { request.member }
            );
            members.toArray();
          };
        };
      };
    };
  };

  public query ({ caller }) func getSwarmMembershipRequests(swarmId : NodeId) : async [MembershipInfo] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view membership requests");
    };

    switch (swarmMap.get(swarmId)) {
      case (null) { Runtime.trap("Swarm not found") };
      case (?swarm) {
        if (swarm.creator != caller) {
          Runtime.trap("Unauthorized: Only the swarm creator can view membership requests");
        };

        switch (membershipRequests.get(swarmId)) {
          case (null) { [] };
          case (?requests) {
            let mapped = requests.map<SwarmMembership, MembershipInfo>(
              func(request : SwarmMembership) : MembershipInfo {
                let profileName = switch (userProfiles.get(request.member)) {
                  case (null) { null };
                  case (?profile) { ?profile.name };
                };
                {
                  principal = request.member;
                  profileName;
                  status = request.status;
                };
              }
            );
            mapped.toArray();
          };
        };
      };
    };
  };

  public query ({ caller }) func getSwarmsByCreator() : async [Swarm] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access this functionality");
    };

    let swarms = List.empty<Swarm>();
    for (swarm in swarmMap.values()) {
      if (swarm.creator == caller) { swarms.add(swarm) };
    };

    swarms.toArray();
  };

  public shared ({ caller }) func resetAllData() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can reset all data");
    };

    curationMap := Map.empty<NodeId, Curation>();
    swarmMap := Map.empty<NodeId, Swarm>();
    locationMap := Map.empty<NodeId, Location>();
    lawTokenMap := Map.empty<NodeId, LawToken>();
    interpretationTokenMap := Map.empty<NodeId, InterpretationToken>();
    membershipRequests := Map.empty<NodeId, List.List<SwarmMembership>>();
    locationLawTokenRelations := Map.empty<NodeId, List.List<NodeId>>();
    voteDataMap := Map.empty<Text, VoteData>();
    buzzScores := Map.empty<Principal, BuzzScore>();
    interpretationTokenFromEdges := Map.empty<NodeId, List.List<GraphEdge>>();
    interpretationTokenToEdges := Map.empty<NodeId, List.List<GraphEdge>>();
    swarmUpdates := Map.empty<Principal, List.List<SwarmUpdate>>();
    userVoteTracking.clear();
  };

  func splitByCurlyBrackets(text : Text) : [Text] {
    let tokens = List.empty<Text>();
    var inBrackets = false;
    var buffer = "";

    for (ch in text.chars()) {
      switch (ch) {
        case ('{') {
          if (inBrackets) {
            let trimmed = buffer.trim(#char ' ');
            if (trimmed.size() > 0) {
              tokens.add(trimmed);
            };
            buffer := "";
          };
          inBrackets := true;
          buffer := "";
        };
        case ('}') {
          if (inBrackets) {
            let trimmed = buffer.trim(#char ' ');
            if (trimmed.size() > 0) {
              tokens.add(trimmed);
            };
            inBrackets := false;
            buffer := "";
          };
        };
        case (_) {
          if (inBrackets) {
            buffer #= ch.toText();
          };
        };
      };
    };

    if (inBrackets and (buffer.trim(#char ' ').size() > 0)) {
      let trimmed = buffer.trim(#char ' ');
      tokens.add(trimmed);
    };

    tokens.toArray();
  };

  func updateBuzzScore(principal : Principal, delta : Int) {
    let currentScore = switch (buzzScores.get(principal)) {
      case (null) { 0 };
      case (?score) { score };
    };
    let newScore = currentScore + delta;
    buzzScores.add(principal, newScore);
  };

  func updateBuzzScoreOnLawTokenCreation(creator : Principal, tokensCreated : Nat) {
    let delta = if (tokensCreated > 0) { tokensCreated * 30_000_000 } else { 0 };
    updateBuzzScore(creator, delta.toInt());
  };

  func updateBuzzScoreOnInterpretationTokenCreation(creator : Principal) {
    updateBuzzScore(creator, 50_000_000);
  };

  func updateBuzzScoreOnUpvote(creator : Principal, nodeId : Text) {
    switch (lawTokenMap.get(nodeId)) {
      case (?_lawToken) {
        updateBuzzScore(creator, 10_000_000);
        return;
      };
      case (null) {};
    };
    switch (interpretationTokenMap.get(nodeId)) {
      case (?_interpretationToken) {
        updateBuzzScore(creator, 20_000_000);
        return;
      };
      case (null) {};
    };
  };

  func updateBuzzScoreOnDownvote(creator : Principal, nodeId : Text) {
    switch (lawTokenMap.get(nodeId)) {
      case (?_lawToken) {
        updateBuzzScore(creator, -10_000_000);
        return;
      };
      case (null) {};
    };
    switch (interpretationTokenMap.get(nodeId)) {
      case (?_interpretationToken) {
        updateBuzzScore(creator, -20_000_000);
        return;
      };
      case (null) {};
    };
  };

  func getNodeCreator(nodeId : Text) : ?Principal {
    switch (swarmMap.get(nodeId)) {
      case (?swarm) { return ?swarm.creator };
      case (null) {};
    };
    switch (locationMap.get(nodeId)) {
      case (?location) { return ?location.creator };
      case (null) {};
    };
    switch (lawTokenMap.get(nodeId)) {
      case (?lawToken) { return ?lawToken.creator };
      case (null) {};
    };
    switch (interpretationTokenMap.get(nodeId)) {
      case (?interpretationToken) { return ?interpretationToken.creator };
      case (null) {};
    };
    null;
  };

  func createLawTokensForLocation(location : Location, creator : Principal) : Nat {
    let tokens = splitByCurlyBrackets(location.content);

    var tokensCreated : Nat = 0;

    for (token in tokens.values()) {
      let cleanToken = token.trim(#char ' ');

      if (cleanToken.size() != 0) {
        let existingToken = findExistingLawToken(cleanToken, ?location.parentSwarmId);

        let lawTokenId = switch (existingToken) {
          case (?existing) { existing.id };
          case (null) {
            let newId = generateId("lawToken", cleanToken, creator);
            let newLawToken = {
              id = newId;
              tokenLabel = cleanToken;
              meaning = "Law token extracted from content";
              parentLocationId = location.id;
              creator;
              timestamps = {
                createdAt = Time.now();
              };
            };
            lawTokenMap.add(newId, newLawToken);
            autoUpvoteNode(newId, creator);
            tokensCreated += 1;
            newId;
          };
        };

        let currentRelations = switch (locationLawTokenRelations.get(location.id)) {
          case (null) { List.empty<NodeId>() };
          case (?relations) { relations };
        };

        let relationExists = currentRelations.any(func(id : NodeId) : Bool { id == lawTokenId });

        if (not relationExists) {
          currentRelations.add(lawTokenId);
          locationLawTokenRelations.add(location.id, currentRelations);
        };
      };
    };

    tokensCreated;
  };

  func findExistingLawToken(tokenLabel : Text, requiredSwarmId : ?NodeId) : ?LawToken {
    for (lawToken in lawTokenMap.values()) {
      if (Text.equal(lawToken.tokenLabel, tokenLabel)) {
        switch (requiredSwarmId) {
          case (?swarmId) {
            switch (locationMap.get(lawToken.parentLocationId)) {
              case (?location) {
                if (location.parentSwarmId == swarmId) {
                  return ?lawToken;
                };
              };
              case (null) {};
            };
          };
          case (null) { return ?lawToken };
        };
      };
    };
    null;
  };

  func lawTokenExistsInSwarm(tokenLabel : Text, requiredSwarmId : NodeId) : Bool {
    for (lawToken in lawTokenMap.values()) {
      if (Text.equal(lawToken.tokenLabel, tokenLabel)) {
        switch (locationMap.get(lawToken.parentLocationId)) {
          case (?location) {
            if (location.parentSwarmId == requiredSwarmId) { return true };
          };
          case (null) {};
        };
      };
    };
    false;
  };

  func generateId(prefix : Text, input : Text, creatorPrincipal : Principal) : NodeId {
    let timestamp = Time.now() / 1_000_000_000;
    prefix # "_" # input # "_" # creatorPrincipal.toText() # "_" # timestamp.toText();
  };

  func sortLeaderboardEntries(entries : [BuzzLeaderboardEntry]) : [BuzzLeaderboardEntry] {
    if (entries.size() == 0 or entries.size() == 1) {
      return entries;
    };

    entries.sort(
      func(a : BuzzLeaderboardEntry, b : BuzzLeaderboardEntry) : Order.Order {
        Int.compare(b.score, a.score);
      }
    );
  };

  public query ({ caller }) func getBuzzLeaderboard() : async [BuzzLeaderboardEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view the BUZZ leaderboard");
    };

    let entries = List.empty<BuzzLeaderboardEntry>();
    for ((principal, score) in buzzScores.entries()) {
      let profile = switch (userProfiles.get(principal)) {
        case (null) { null };
        case (?p) { ?p.name };
      };
      if (score > 0) {
        entries.add({
          principal;
          profileName = switch (profile) {
            case (null) { null };
            case (?name) { ?name };
          };
          score;
        });
      };
    };

    let sortedEntries = sortLeaderboardEntries(entries.toArray());
    let maxEntries = 1000;
    if (sortedEntries.size() > maxEntries) {
      return Array.tabulate<BuzzLeaderboardEntry>(maxEntries, func(i : Nat) : BuzzLeaderboardEntry { sortedEntries[i] });
    };

    sortedEntries;
  };

  public query ({ caller }) func getSwarmUpdatesForUser(swarmId : NodeId) : async [SwarmUpdate] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can view swarm updates");
    };

    switch (swarmMap.get(swarmId)) {
      case (null) { Runtime.trap("Swarm not found") };
      case (?_swarm) {};
    };

    if (not isSwarmCreatorOrMember(caller, swarmId)) {
      Runtime.trap("Unauthorized: Only swarm creator or approved members can view swarm updates");
    };

    switch (swarmUpdates.get(caller)) {
      case (null) { [] };
      case (?updates) {
        let filtered = updates.filter(
          func(update) { update.swarmId == swarmId }
        );
        filtered.toArray();
      };
    };
  };

  func createSwarmTokenUpdate(swarmId : ?NodeId, tokenId : NodeId, tokenTitle : Text, creator : Principal) {
    switch (swarmId) {
      case (null) {};
      case (?sid) {
        let update : SwarmUpdate = {
          swarmId = sid;
          tokenId;
          tokenTitle;
          creatorPrincipal = creator;
          timestamp = Time.now();
          status = #unread;
          userId = creator;
        };
        addSwarmUpdateForContributors(update, ?sid);
      };
    };
  };

  func addSwarmUpdateForContributors(update : SwarmUpdate, swarmId : ?NodeId) {
    switch (swarmId) {
      case (null) {};
      case (?sid) {
        switch (swarmMap.get(sid)) {
          case (null) {};
          case (?swarm) {
            switch (membershipRequests.get(sid)) {
              case (null) {};
              case (?requests) {
                for (request in requests.values()) {
                  if (request.status == #approved and request.member != update.creatorPrincipal) {
                    let memberUpdates = switch (swarmUpdates.get(request.member)) {
                      case (null) { List.empty<SwarmUpdate>() };
                      case (?existing) { existing };
                    };
                    memberUpdates.add(update);
                    swarmUpdates.add(request.member, memberUpdates);
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
        if (swarm.creator == caller) {
          return true;
        };

        switch (membershipRequests.get(swarmId)) {
          case (null) { false };
          case (?requests) {
            requests.any(
              func(request : SwarmMembership) : Bool {
                request.member == caller and request.status == #approved
              }
            );
          };
        };
      };
    };
  };

  // GRAPH DATA REPRESENTATION
  func createInterpretationTokenNodes(parentTokenId : NodeId) : [GraphNode] {
    let nodes = List.empty<GraphNode>();

    for (interpretationToken in interpretationTokenMap.values()) {
      if (interpretationToken.fromTokenId == parentTokenId) {
        let childNodes = createInterpretationTokenNodes(interpretationToken.id);
        let interpretationTokenNode : GraphNode = {
          id = interpretationToken.id;
          nodeType = "interpretationToken";
          tokenLabel = interpretationToken.title;
          jurisdiction = null;
          parentId = ?parentTokenId;
          children = childNodes;
        };
        nodes.add(interpretationTokenNode);
      };
    };

    nodes.toArray();
  };

  func createLawTokenNodes(parentLocationId : NodeId) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (lawToken in lawTokenMap.values()) {
      if (lawToken.parentLocationId == parentLocationId) {
        let childNodes = createInterpretationTokenNodes(lawToken.id);
        let lawTokenNode : GraphNode = {
          id = lawToken.id;
          nodeType = "lawToken";
          tokenLabel = lawToken.tokenLabel;
          jurisdiction = null;
          parentId = ?parentLocationId;
          children = childNodes;
        };
        nodes.add(lawTokenNode);
      };
    };
    nodes.toArray();
  };

  func createLocationNodes(parentSwarmId : NodeId) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (location in locationMap.values()) {
      if (location.parentSwarmId == parentSwarmId) {
        let childNodes = createLawTokenNodes(location.id);
        let locationNode : GraphNode = {
          id = location.id;
          nodeType = "location";
          tokenLabel = location.title;
          jurisdiction = null;
          parentId = ?parentSwarmId;
          children = childNodes;
        };
        nodes.add(locationNode);
      };
    };
    nodes.toArray();
  };

  func createSwarmNodes(parentCurationId : NodeId, jurisdiction : Text) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (swarm in swarmMap.values()) {
      if (swarm.parentCurationId == parentCurationId) {
        let childNodes = createLocationNodes(swarm.id);
        let swarmNode : GraphNode = {
          id = swarm.id;
          nodeType = "swarm";
          tokenLabel = swarm.name;
          jurisdiction = null;
          parentId = ?parentCurationId;
          children = childNodes;
        };
        nodes.add(swarmNode);
      };
    };
    nodes.toArray();
  };

  func createGraphNodes() : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (curation in curationMap.values()) {
      let childNodes = createSwarmNodes(curation.id, curation.jurisdiction);
      let curationNode : GraphNode = {
        id = curation.id;
        nodeType = "curation";
        tokenLabel = curation.name;
        jurisdiction = ?curation.jurisdiction;
        parentId = null;
        children = childNodes;
      };
      nodes.add(curationNode);
    };
    nodes.toArray();
  };

  func getParentSwarmIdByLocationId(locationId : NodeId) : ?NodeId {
    switch (locationMap.get(locationId)) {
      case (?location) { ?location.parentSwarmId };
      case (null) { null };
    };
  };

  func getParentCurationBySwarmId(swarmId : NodeId) : ?NodeId {
    switch (swarmMap.get(swarmId)) {
      case (?swarm) { ?swarm.parentCurationId };
      case (null) { null };
    };
  };

  func createSwarmLinksFromLocationEdges() : [GraphEdge] {
    let edges = List.empty<GraphEdge>();

    for ((locationId, _) in locationLawTokenRelations.entries()) {
      switch (getParentSwarmIdByLocationId(locationId)) {
        case (?parentSwarmId) {
          edges.add({
            source = parentSwarmId;
            target = locationId;
          });
        };
        case (null) {};
      };
    };

    edges.toArray();
  };

  func createCurationLinksFromSwarmLinks() : [GraphEdge] {
    let locationEdges = createSwarmLinksFromLocationEdges();
    let edges = List.empty<GraphEdge>();

    for (edge in locationEdges.values()) {
      let locationId = edge.target;
      switch (getParentSwarmIdByLocationId(locationId)) {
        case (?swarmId) {
          switch (getParentCurationBySwarmId(swarmId)) {
            case (?curationId) {
              edges.add({
                source = curationId;
                target = swarmId;
              });
            };
            case (null) {};
          };
        };
        case (null) {};
      };
    };

    edges.toArray();
  };

  // Returns all graph data. Requires authenticated user access.
  public query ({ caller }) func getGraphData() : async GraphData {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access graph data");
    };

    let edges = List.empty<GraphEdge>();

    for ((locationId, lawTokenIds) in locationLawTokenRelations.entries()) {
      for (lawTokenId in lawTokenIds.values()) {
        edges.add({
          source = locationId;
          target = lawTokenId;
        });
      };
    };

    for ((fromTokenId, fromEdgesList) in interpretationTokenFromEdges.entries()) {
      for (edge in fromEdgesList.values()) {
        edges.add(edge);
      };
    };

    for ((interpretationTokenId, toEdgesList) in interpretationTokenToEdges.entries()) {
      for (edge in toEdgesList.values()) {
        edges.add(edge);
      };
    };

    for (edge in createSwarmLinksFromLocationEdges().values()) {
      edges.add(edge);
    };

    for (edge in createCurationLinksFromSwarmLinks().values()) {
      edges.add(edge);
    };

    let allCurations = List.empty<Curation>();
    let allSwarms = List.empty<Swarm>();
    let allLocations = List.empty<Location>();
    let allLawTokens = List.empty<LawToken>();
    let allInterpretationTokens = List.empty<InterpretationToken>();

    for (curation in curationMap.values()) {
      allCurations.add(curation);
    };

    for (swarm in swarmMap.values()) {
      allSwarms.add(swarm);
    };

    for (location in locationMap.values()) {
      allLocations.add(location);
    };

    for (lawToken in lawTokenMap.values()) {
      allLawTokens.add(lawToken);
    };

    for (interpretationToken in interpretationTokenMap.values()) {
      allInterpretationTokens.add(interpretationToken);
    };

    let rootNodes = createGraphNodes();

    {
      curations = allCurations.toArray();
      swarms = allSwarms.toArray();
      locations = allLocations.toArray();
      lawTokens = allLawTokens.toArray();
      interpretationTokens = allInterpretationTokens.toArray();
      rootNodes;
      edges = edges.toArray();
    };
  };

  // Returns only the nodes owned by the caller. Requires authenticated user access.
  public query ({ caller }) func getMyOwnedGraphData() : async OwnedGraphData {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access their owned graph data");
    };

    let ownedCurations = List.empty<Curation>();
    for (curation in curationMap.values()) {
      if (curation.creator == caller) {
        ownedCurations.add(curation);
      };
    };

    let ownedSwarms = List.empty<Swarm>();
    for (swarm in swarmMap.values()) {
      if (swarm.creator == caller) {
        ownedSwarms.add(swarm);
      };
    };

    let ownedLocations = List.empty<Location>();
    for (location in locationMap.values()) {
      if (location.creator == caller) {
        ownedLocations.add(location);
      };
    };

    let ownedLawTokens = List.empty<LawToken>();
    for (lawToken in lawTokenMap.values()) {
      if (lawToken.creator == caller) {
        ownedLawTokens.add(lawToken);
      };
    };

    let ownedInterpretationTokens = List.empty<InterpretationToken>();
    for (interpretationToken in interpretationTokenMap.values()) {
      if (interpretationToken.creator == caller) {
        ownedInterpretationTokens.add(interpretationToken);
      };
    };

    {
      curations = ownedCurations.toArray();
      swarms = ownedSwarms.toArray();
      locations = ownedLocations.toArray();
      lawTokens = ownedLawTokens.toArray();
      interpretationTokens = ownedInterpretationTokens.toArray();
    };
  };
};
