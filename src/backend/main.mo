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
import Set "mo:core/Set";

import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import UserApproval "mo:caffeineai-user-approval/approval";
import Runtime "mo:core/Runtime";



// Apply any data migration necessary after code changes


actor {
  // Type Aliases
  type NodeId = Text;
  type Directionality = { #none; #unidirectional; #bidirectional };
  type Tag = Text;
  type BuzzScore = Int;

  // Weighted types for deduplication
  type WeightedValue = {
    value : Text;
    weight : Nat;
  };

  type WeightedAttribute = {
    key : Text;
    weightedValues : [WeightedValue];
  };

  type ContentVersion = {
    content : Text;
    contributor : Principal;
    timestamp : Time.Time;
  };

  // Node Types
  type Timestamps = {
    createdAt : Time.Time;
  };

  type Curation = {
    id : NodeId;
    name : Text;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    timestamps : Timestamps;
  };

  type Swarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    timestamps : Timestamps;
    forkSource : ?NodeId;
    forkPrincipal : ?Principal;
  };

  type Location = {
    id : NodeId;
    title : Text;
    customAttributes : [WeightedAttribute];
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
    timestamps : Timestamps;
  };

  type InterpretationToken = {
    id : NodeId;
    title : Text;
    contentVersions : [ContentVersion];
    parentLawTokenId : NodeId;
    customAttributes : [WeightedAttribute];
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

  // Graph Types for visualization
  type GraphNode = {
    id : NodeId;
    nodeType : Text;
    tokenLabel : Text;
    jurisdiction : ?Text;
    parentId : ?NodeId;
    children : [GraphNode];
    customAttributes : [WeightedAttribute];
  };

  type GraphEdge = {
    source : NodeId;
    target : NodeId;
    edgeLabel : Text;
    directionality : Directionality;
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
    edges : [GraphEdge];
  };

  type ExtensionEntry = {
    extendedAt : Time.Time;
    addedNodes : Nat;
    addedEdges : Nat;
    addedAttributes : Nat;
  };

  type PublishedSourceGraphMeta = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    publishedAt : Time.Time;
    nodeCount : Nat;
    edgeCount : Nat;
    attributeCount : Nat;
    extensionLog : [ExtensionEntry];
  };

  // Source graph edge with weighted labels
  type SourceGraphEdge = {
    source : NodeId;
    target : NodeId;
    weightedLabels : [WeightedValue];
    directionality : Directionality;
  };

  // Input types for publishing
  type SourceGraphNodeInput = {
    id : ?Text;
    name : Text;
    nodeType : Text;
    jurisdiction : ?Text;
    tags : [Text];
    content : ?Text;
    parentName : ?Text;
    attributes : [(Text, [Text])];
  };

  type SourceGraphEdgeInput = {
    sourceName : Text;
    targetName : Text;
    edgeLabel : Text;
    bidirectional : Bool;
  };

  type PublishSourceGraphInput = {
    nodes : [SourceGraphNodeInput];
    edges : [SourceGraphEdgeInput];
  };

  type PublishResult = {
    #success : { message : Text };
    #noChanges;
    #error : Text;
  };

  // Preview and commit types
  type AttributeChange = {
    key : Text;
    oldValues : [WeightedValue];
    newValues : [Text];
    newWeightedValues : [WeightedValue];
  };

  type NodeOperation = {
    nodeType : Text;
    localName : Text;
    backendId : ?NodeId;
    parentName : ?Text;
    action : { #create; #update : [AttributeChange] };
    attributes : [(Text, [Text])];
  };

  type EdgeOperation = {
    sourceName : Text;
    targetName : Text;
    sourceId : ?NodeId;
    targetId : ?NodeId;
    action : { #create; #update : { newLabels : [Text] } };
    labels : [Text];
    bidirectional : Bool;
  };

  type PublishPreviewResult = {
    nodeOperations : [NodeOperation];
    edgeOperations : [EdgeOperation];
    summary : {
      nodesToCreate : Nat;
      nodesToUpdate : Nat;
      edgesToCreate : Nat;
      edgesToUpdate : Nat;
    };
  };

  type PublishCommitResult = {
    #success : {
      nodeMappings : [(Text, NodeId)];
      message : Text;
      publishedSourceGraphId : ?Text;
    };
    #error : {
      message : Text;
      failedAt : ?{ nodeType : Text; name : Text };
    };
  };

  // Backend State
  let voteData = Map.empty<Text, VoteData>();
  let userVoteTracking = Map.empty<Principal, UserVoteTracking>();

  var curationMap = Map.empty<NodeId, Curation>();
  var swarmMap = Map.empty<NodeId, Swarm>();
  var forkedSwarmMap = Map.empty<NodeId, ForkedSwarm>();
  var locationMap = Map.empty<NodeId, Location>();
  var lawTokenMap = Map.empty<NodeId, LawToken>();
  var interpretationTokenMap = Map.empty<NodeId, InterpretationToken>();
  var membershipRequests = Map.empty<NodeId, List.List<SwarmMembership>>();
  var swarmMembers = Map.empty<NodeId, List.List<Principal>>();
  var userProfiles = Map.empty<Principal, UserProfile>();
  var swarmUpdates = Map.empty<Principal, List.List<SwarmUpdate>>();
  var voteDataMap = Map.empty<Text, VoteData>();
  var buzzScores = Map.empty<Principal, BuzzScore>();
  let accessControlState = AccessControl.initState();
  let approvalState = UserApproval.initState(accessControlState);
  include MixinAuthorization(accessControlState);
  var existingAdmins : [Principal] = [];
  var archivedNodes = Map.empty<NodeId, ()>();
  var forkPulledSourceNodes = Map.empty<NodeId, List.List<NodeId>>();

  // Store SwarmType (including which swarms are "question-of-law")
  var swarmTypeMap = Map.empty<NodeId, SwarmType>();

  // New explicit edge storage for source graph edges (weighted labels)
  var sourceEdges = Map.empty<NodeId, List.List<SourceGraphEdge>>();

  // Published source graph metadata
  var publishedSourceGraphs = Map.empty<Text, PublishedSourceGraphMeta>();

  // Maps curationId → publishedSourceGraphId (avoids stable type change on Curation)
  var curationToPublishedGraphId = Map.empty<NodeId, Text>();

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
      customAttributes = [];
      timestamps = { createdAt = Time.now(); };
    };
    curationMap.add(id, newCuration);
    id;
  };

  // Deep copy helper function for swarm forking/duplicating.
  // Copies all locations, law tokens, and interpretation tokens.
  func deepCopySwarmContent(sourceSwarmId : NodeId, targetSwarmId : NodeId, caller : Principal) {
    // Step 1: Copy locations and build old->new location ID mapping
    var locationIdMap = Map.empty<NodeId, NodeId>();
    for ((locId, loc) in locationMap.entries()) {
      if (loc.parentSwarmId == sourceSwarmId) {
        let newLocId = generateId("location", loc.title, caller);
        let newLoc = {
          id = newLocId;
          title = loc.title;
          customAttributes = loc.customAttributes;
          parentSwarmId = targetSwarmId;
          creator = caller;
          timestamps = { createdAt = Time.now(); };
        };
        locationMap.add(newLocId, newLoc);
        locationIdMap.add(locId, newLocId);
      };
    };

    // Step 2: Copy law tokens — for each copied location, copy its law tokens
    var lawTokenIdMap = Map.empty<NodeId, NodeId>();
    for ((_lawTokenId, token) in lawTokenMap.entries()) {
      switch (locationIdMap.get(token.parentLocationId)) {
        case (null) {};
        case (?newLocId) {
          let newTokenId = generateId("lawToken", token.tokenLabel, caller);
          let newToken = {
            id = newTokenId;
            tokenLabel = token.tokenLabel;
            parentLocationId = newLocId;
            creator = caller;
            customAttributes = token.customAttributes;
            timestamps = { createdAt = Time.now(); };
          };
          lawTokenMap.add(newTokenId, newToken);
          lawTokenIdMap.add(token.id, newTokenId);
        };
      };
    };

    // Step 3: Copy interpretation tokens that reference copied law tokens
    for ((_itId, it) in interpretationTokenMap.entries()) {
      switch (lawTokenIdMap.get(it.parentLawTokenId)) {
        case (null) {};
        case (?newParentLawTokenId) {
          let newItId = generateId("interpretationToken", it.title, caller);
          let newIt = {
            id = newItId;
            title = it.title;
            contentVersions = it.contentVersions;
            parentLawTokenId = newParentLawTokenId;
            customAttributes = it.customAttributes;
            creator = caller;
            timestamps = { createdAt = Time.now(); };
          };
          interpretationTokenMap.add(newItId, newIt);
          // Copy any sourceEdges that referenced the old IT's parent
          switch (sourceEdges.get(it.id)) {
            case (null) {};
            case (?edges) {
              let newEdges = List.empty<SourceGraphEdge>();
              for (edge in edges.values()) {
                let newTarget = switch (lawTokenIdMap.get(edge.target)) {
                  case (?nid) { nid };
                  case (null) { edge.target };
                };
                newEdges.add({ source = newItId; target = newTarget; weightedLabels = edge.weightedLabels; directionality = edge.directionality });
              };
              sourceEdges.add(newItId, newEdges);
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func createCuration(name : Text, customAttributes : [WeightedAttribute]) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create curations");
    };

    let id = generateId("curation", name, caller);
    let newCuration = {
      id;
      name;
      creator = caller;
      customAttributes;
      timestamps = {
        createdAt = Time.now();
      };
    };
    curationMap.add(id, newCuration);

    id;
  };

  public shared ({ caller }) func createSwarm(name : Text, tags : [Tag], parentCurationId : NodeId, customAttributes : [WeightedAttribute]) : async NodeId {
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
    let isQuestionOfLaw = tags.any(func(tag : Text) : Bool { tag == "question-of-law" });

    let id = generateId("swarm", name, caller);
    let newSwarm : Swarm = {
      id;
      name;
      tags;
      parentCurationId;
      creator = caller;
      customAttributes;
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
    customAttributes : [WeightedAttribute],
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

    let id = generateId("location", finalTitle, caller);

    let newLocation = {
      id;
      title = finalTitle;
      customAttributes;
      parentSwarmId;
      creator = caller;
      timestamps = {
        createdAt = Time.now();
      };
    };
    locationMap.add(id, newLocation);

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

  public shared ({ caller }) func createInterpretationToken(
    title : Text,
    content : Text,
    parentLawTokenId : NodeId,
    customAttributes : [WeightedAttribute]
  ) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create interpretation tokens");
    };

    if (not lawTokenMap.containsKey(parentLawTokenId)) {
      Runtime.trap("Parent law token does not exist");
    };

    let id = generateId("interpretationToken", title, caller);
    let newInterpretationToken = {
      id;
      title;
      contentVersions = [{ content; contributor = caller; timestamp = Time.now() }];
      parentLawTokenId;
      customAttributes;
      creator = caller;
      timestamps = {
        createdAt = Time.now();
      };
    };
    interpretationTokenMap.add(id, newInterpretationToken);

    autoUpvoteNode(id, caller);

    let swarmId = getNodeSwarmId(parentLawTokenId);
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
        return getNodeSwarmId(interpretationToken.parentLawTokenId);
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

  // Traces forkSource chain to find the root QoL swarm ID (returns null if not QoL-related)
  func getRootQolSwarmId(swarmId : NodeId) : ?NodeId {
    switch (swarmMap.get(swarmId)) {
      case (null) { null };
      case (?s) {
        switch (s.forkSource) {
          case (null) {
            if (isQuestionOfLawSwarm(swarmId)) { ?swarmId } else { null };
          };
          case (?src) {
            getRootQolSwarmId(src);
          };
        };
      };
    };
  };

  public query func getSwarmMembers(swarmId : NodeId) : async [Principal] {
    switch (swarmMembers.get(swarmId)) {
      case (null) { [] };
      case (?members) { members.toArray() };
    };
  };

  public shared ({ caller }) func joinSwarm(swarmId : NodeId) : async () {
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
    // Add caller to swarmMembers
    let existing = switch (swarmMembers.get(swarmId)) {
      case (null) { List.empty<Principal>() };
      case (?l) { l };
    };
    existing.add(caller);
    swarmMembers.add(swarmId, existing);
  };

  public shared ({ caller }) func createSwarmFork(swarmId : NodeId) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can fork swarms");
    };
    // Allow forking any QoL swarm or fork of a QoL swarm; trace back to root for membership check
    let rootQolId = switch (getRootQolSwarmId(swarmId)) {
      case (null) { Runtime.trap("Only question-of-law swarms can be forked") };
      case (?id) { id };
    };
    let rootSwarm = switch (swarmMap.get(rootQolId)) {
      case (null) { Runtime.trap("Root swarm not found") };
      case (?s) { s };
    };
    // Must be creator of root OR member of root to fork any swarm in the lineage
    if (rootSwarm.creator != caller and not isSwarmMember(caller, rootQolId)) {
      Runtime.trap("You must be a member of the swarm to fork it");
    };
    // Check for existing active fork of this specific swarm
    for ((_sid, s) in swarmMap.entries()) {
      switch (s.forkSource) {
        case (?src) {
          if (src == swarmId and s.creator == caller and not archivedNodes.containsKey(s.id)) {
            Runtime.trap("You already have an active fork of this swarm");
          };
        };
        case (null) {};
      };
    };
    let swarm = switch (swarmMap.get(swarmId)) {
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
      customAttributes = swarm.customAttributes;
      timestamps = { createdAt = Time.now(); };
      forkSource = ?swarmId;
      forkPrincipal = ?caller;
    };
    swarmMap.add(forkId, forkSwarm);
    swarmTypeMap.add(forkId, #questionOfLaw);
    deepCopySwarmContent(swarmId, forkId, caller);

    // Record all source node IDs that were copied so pull knows what is new
    let pulledIds = List.empty<NodeId>();
    for ((_locId, loc) in locationMap.entries()) {
      if (loc.parentSwarmId == swarmId) {
        pulledIds.add(loc.id);
        for ((_ltId, lt) in lawTokenMap.entries()) {
          if (lt.parentLocationId == loc.id) {
            pulledIds.add(lt.id);
          };
        };
      };
    };
    // Track interpretation tokens from source swarm
    for ((_itId, it) in interpretationTokenMap.entries()) {
      switch (lawTokenMap.get(it.parentLawTokenId)) {
        case (null) {};
        case (?lt) {
          switch (locationMap.get(lt.parentLocationId)) {
            case (null) {};
            case (?loc) {
              if (loc.parentSwarmId == swarmId) {
                pulledIds.add(it.id);
              };
            };
          };
        };
      };
    };
    forkPulledSourceNodes.add(forkId, pulledIds);

    forkId;
  };

  public shared ({ caller }) func leaveSwarm(swarmId : NodeId) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can leave swarms");
    };
    if (not isSwarmMember(caller, swarmId)) {
      Runtime.trap("You are not a member of this swarm");
    };
    switch (swarmMembers.get(swarmId)) {
      case (null) {};
      case (?members) {
        let newMembers = List.empty<Principal>();
        for (m in members.values()) {
          if (m != caller) {
            newMembers.add(m);
          };
        };
        swarmMembers.add(swarmId, newMembers);
      };
    };
  };

  public query ({ caller }) func hasUserFork(swarmId : NodeId) : async Bool {
    for ((_sid, s) in swarmMap.entries()) {
      switch (s.forkSource) {
        case (?src) {
          if (src == swarmId and s.creator == caller and not archivedNodes.containsKey(s.id)) {
            return true;
          };
        };
        case (null) {};
      };
    };
    false;
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
        swarm.creator == caller;
      };
    };
  };

  public shared ({ caller }) func pullFromSwarm(sourceSwarmId : NodeId) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can pull from swarms");
    };
    // Find existing active fork by caller where forkSource == sourceSwarmId
    var maybeForkId : ?NodeId = null;
    for ((sid, s) in swarmMap.entries()) {
      switch (s.forkSource) {
        case (?src) {
          if (src == sourceSwarmId and s.creator == caller and not archivedNodes.containsKey(sid)) {
            maybeForkId := ?sid;
          };
        };
        case (null) {};
      };
    };
    let activeForkId = switch (maybeForkId) {
      case (null) { Runtime.trap("No active fork found. Create a fork first.") };
      case (?id) { id };
    };

    // Build set of already-pulled source node IDs
    let alreadyPulled = switch (forkPulledSourceNodes.get(activeForkId)) {
      case (null) { List.empty<NodeId>() };
      case (?l) { l };
    };
    let pulledSet = Map.empty<NodeId, ()>();
    for (nodeId in alreadyPulled.values()) {
      pulledSet.add(nodeId, ());
    };

    // Copy new locations from source not yet pulled
    var newLawTokenIdMap = Map.empty<NodeId, NodeId>();
    var newLocationIdMap = Map.empty<NodeId, NodeId>();
    for ((_lid, loc) in locationMap.entries()) {
      if (loc.parentSwarmId == sourceSwarmId and not pulledSet.containsKey(loc.id)) {
        let newLocId = generateId("location", loc.title, caller);
        let newLoc = {
          id = newLocId;
          title = loc.title;
          customAttributes = loc.customAttributes;
          parentSwarmId = activeForkId;
          creator = caller;
          timestamps = { createdAt = Time.now(); };
        };
        locationMap.add(newLocId, newLoc);
        newLocationIdMap.add(loc.id, newLocId);
        alreadyPulled.add(loc.id);
      };
    };

    // Copy law tokens for newly copied locations
    for ((_ltId, token) in lawTokenMap.entries()) {
      switch (newLocationIdMap.get(token.parentLocationId)) {
        case (null) {};
        case (?newLocId) {
          if (not pulledSet.containsKey(token.id)) {
            let newTokenId = generateId("lawToken", token.tokenLabel, caller);
            let newToken = {
              id = newTokenId;
              tokenLabel = token.tokenLabel;
              parentLocationId = newLocId;
              creator = caller;
              customAttributes = token.customAttributes;
              timestamps = { createdAt = Time.now(); };
            };
            lawTokenMap.add(newTokenId, newToken);
            newLawTokenIdMap.add(token.id, newTokenId);
            alreadyPulled.add(token.id);
          };
        };
      };
    };

    // Copy interpretation tokens referencing newly copied law tokens
    for ((_itId, it) in interpretationTokenMap.entries()) {
      if (not pulledSet.containsKey(it.id)) {
        switch (newLawTokenIdMap.get(it.parentLawTokenId)) {
          case (null) {};
          case (?newParentLawTokenId) {
            let newItId = generateId("interpretationToken", it.title, caller);
            let newIt = {
              id = newItId;
              title = it.title;
              contentVersions = it.contentVersions;
              parentLawTokenId = newParentLawTokenId;
              customAttributes = it.customAttributes;
              creator = caller;
              timestamps = { createdAt = Time.now(); };
            };
            interpretationTokenMap.add(newItId, newIt);
            alreadyPulled.add(it.id);
            // Copy sourceEdges referencing old IT, remapping targets
            switch (sourceEdges.get(it.id)) {
              case (null) {};
              case (?edges) {
                let newEdges = List.empty<SourceGraphEdge>();
                for (edge in edges.values()) {
                  let newTarget = switch (newLawTokenIdMap.get(edge.target)) {
                    case (?nid) { nid };
                    case (null) { edge.target };
                  };
                  newEdges.add({ source = newItId; target = newTarget; weightedLabels = edge.weightedLabels; directionality = edge.directionality });
                };
                sourceEdges.add(newItId, newEdges);
              };
            };
          };
        };
      };
    };

    // Update tracking map
    forkPulledSourceNodes.add(activeForkId, alreadyPulled);
    activeForkId;
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

  func createSwarmTokenUpdate(swarmId : ?NodeId, tokenId : NodeId, title : Text, creator : Principal) {
    // Implementation needed
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

  func updateBuzzScore(user : Principal, delta : BuzzScore) {
    // Implementation needed
  };

  func generateId(nodeType : Text, name : Text, creator : Principal) : NodeId {
    nodeType # "-" # name # "-" # creator.toText() # "-" # Time.now().toText()
  };

  // ─── Helper: aggregate weightedLabels into single edgeLabel for display ───────
  func aggregateWeightedLabels(weightedLabels : [WeightedValue]) : Text {
    if (weightedLabels.size() == 0) { return "" };
    // Return the label with the highest weight; on tie return first
    var bestLabel = weightedLabels[0].value;
    var bestWeight = weightedLabels[0].weight;
    for (wv in weightedLabels.values()) {
      if (wv.weight > bestWeight) {
        bestLabel := wv.value;
        bestWeight := wv.weight;
      };
    };
    bestLabel;
  };

  // ─── Helper: mergeWeightedAttributes ─────────────────────────────────────────
  func mergeWeightedAttributes(existing : [WeightedAttribute], newAttributes : [(Text, [Text])]) : [WeightedAttribute] {
    // Build mutable map: key -> (value -> weight)
    let keyMap = Map.empty<Text, Map.Map<Text, Nat>>();
    for (wa in existing.values()) {
      let valueMap = Map.empty<Text, Nat>();
      for (wv in wa.weightedValues.values()) {
        valueMap.add(wv.value, wv.weight);
      };
      keyMap.add(wa.key, valueMap);
    };

    for ((key, values) in newAttributes.values()) {
      switch (keyMap.get(key)) {
        case (?valueMap) {
          // Key exists — increment weights or add new values
          for (v in values.values()) {
            switch (valueMap.get(v)) {
              case (?w) { valueMap.add(v, w + 1) };
              case (null) { valueMap.add(v, 1) };
            };
          };
        };
        case (null) {
          // New key
          let valueMap = Map.empty<Text, Nat>();
          for (v in values.values()) {
            valueMap.add(v, 1);
          };
          keyMap.add(key, valueMap);
        };
      };
    };

    // Convert back to [WeightedAttribute]
    let result = List.empty<WeightedAttribute>();
    for ((key, valueMap) in keyMap.entries()) {
      let wvList = List.empty<WeightedValue>();
      for ((v, w) in valueMap.entries()) {
        wvList.add({ value = v; weight = w });
      };
      result.add({ key; weightedValues = wvList.toArray() });
    };
    result.toArray();
  };

  // ─── Helper: mergeEdgeLabels ──────────────────────────────────────────────────
  func mergeEdgeLabels(existing : [WeightedValue], newLabels : [Text]) : [WeightedValue] {
    let labelMap = Map.empty<Text, Nat>();
    for (wv in existing.values()) {
      labelMap.add(wv.value, wv.weight);
    };
    for (lbl in newLabels.values()) {
      switch (labelMap.get(lbl)) {
        case (?w) { labelMap.add(lbl, w + 1) };
        case (null) { labelMap.add(lbl, 1) };
      };
    };
    let result = List.empty<WeightedValue>();
    for ((v, w) in labelMap.entries()) {
      result.add({ value = v; weight = w });
    };
    result.toArray();
  };

  // ─── Helper: appendContentVersion ────────────────────────────────────────────
  func appendContentVersion(existing : [ContentVersion], newContent : Text, contributor : Principal) : [ContentVersion] {
    let newVersion : ContentVersion = {
      content = newContent;
      contributor;
      timestamp = Time.now();
    };
    existing.concat([newVersion]);
  };

  // ─── Helper: convert [(Text,[Text])] attributes to [WeightedAttribute] at weight=1
  func attributesToWeighted(attributes : [(Text, [Text])]) : [WeightedAttribute] {
    let result = List.empty<WeightedAttribute>();
    for ((key, values) in attributes.values()) {
      let wvList = List.empty<WeightedValue>();
      for (v in values.values()) {
        wvList.add({ value = v; weight = 1 });
      };
      result.add({ key; weightedValues = wvList.toArray() });
    };
    result.toArray();
  };

  // ─── Helper: compute final weighted values for a single key after merge ──────
  func computeNewWeightedValuesForKey(existing : [WeightedAttribute], key : Text, newValues : [Text]) : [WeightedValue] {
    // Find existing weighted values for this key
    var existingWvs : [WeightedValue] = [];
    for (wa in existing.values()) {
      if (wa.key == key) { existingWvs := wa.weightedValues };
    };
    // Simulate the merge for this key
    let resultMap = Map.empty<Text, Nat>();
    for (wv in existingWvs.values()) {
      resultMap.add(wv.value, wv.weight);
    };
    for (v in newValues.values()) {
      let currentWeight = switch (resultMap.get(v)) {
        case (?w) { w };
        case (null) { 0 };
      };
      resultMap.add(v, currentWeight + 1);
    };
    let result = List.empty<WeightedValue>();
    for ((value, weight) in resultMap.entries()) {
      result.add({ value; weight });
    };
    result.toArray();
  };

  // ─── Helper: compute attribute changes for preview ───────────────────────────
  func computeAttributeChanges(existing : [WeightedAttribute], newAttributes : [(Text, [Text])]) : [AttributeChange] {
    let changes = List.empty<AttributeChange>();
    let existingKeyMap = Map.empty<Text, [WeightedValue]>();
    for (wa in existing.values()) {
      existingKeyMap.add(wa.key, wa.weightedValues);
    };
    for ((key, values) in newAttributes.values()) {
      let oldValues = switch (existingKeyMap.get(key)) {
        case (?wvs) { wvs };
        case (null) { [] };
      };
      let newWeightedValues = computeNewWeightedValuesForKey(existing, key, values);
      changes.add({ key; oldValues; newValues = values; newWeightedValues });
    };
    changes.toArray();
  };

  // ─── Helper: build full hierarchical path ────────────────────────────────────
  func buildFullPath(parentPath : ?Text, name : Text) : Text {
    switch (parentPath) {
      case (null) { name };
      case (?p) { p # "@" # name };
    };
  };

  // Derives parent full path by stripping the last @-segment from node.id.
  // Primary lookup — avoids bare-name map collisions when siblings share names.
  func parentPathFromId(nodeId : ?Text) : ?Text {
    switch (nodeId) {
      case (null) { null };
      case (?id) {
        let segIter = id.split(#char '@');
        let segments = List.empty<Text>();
        for (seg in segIter) { segments.add(seg) };
        let allSegs = segments.toArray();
        if (allSegs.size() <= 1) { return null };
        var path = allSegs[0];
        var i = 1;
        while (i < allSegs.size() - 1) {
          path := path # "@" # allSegs[i];
          i += 1;
        };
        ?path
      };
    };
  };

  // ─── Helper: scope-aware edge target resolution ───────────────────────────────
  // Tries: hierarchical scope walk first → simple name fallback
  func resolveEdgeTarget(targetName : Text, sourceFullPath : Text, nameToId : Map.Map<Text, NodeId>) : ?NodeId {
    // 1. Split source path into segments and walk up hierarchy first
    let segIter = sourceFullPath.split(#char '@');
    let segments = List.empty<Text>();
    for (seg in segIter) {
      segments.add(seg);
    };
    let allSegs = segments.toArray();
    // Try from parent (n-1 segments) up to root (1 segment)
    var level = allSegs.size();
    // level represents how many leading segments to join as the scope prefix
    // We want to try from the direct parent scope down to the root
    while (level > 0) {
      level -= 1;
      var path = allSegs[0];
      var i = 1;
      while (i < level) {
        path := path # "@" # allSegs[i];
        i += 1;
      };
      let candidateKey = if (level == 0) { targetName } else { path # "@" # targetName };
      if (candidateKey != targetName) {
        switch (nameToId.get(candidateKey)) {
          case (?id) { return ?id };
          case (null) {};
        };
      };
    };
    // 2. Simple name fallback
    switch (nameToId.get(targetName)) {
      case (?id) { return ?id };
      case (null) {};
    };
    null
  };
  func previewLogic(
    caller : Principal,
    input : PublishSourceGraphInput,
    existingMappings : [(Text, NodeId)]
  ) : PublishPreviewResult {
    let nodeOps = List.empty<NodeOperation>();
    let edgeOps = List.empty<EdgeOperation>();
    var nodesToCreate : Nat = 0;
    var nodesToUpdate : Nat = 0;
    var edgesToCreate : Nat = 0;
    var edgesToUpdate : Nat = 0;

    // Build name -> NodeId from existingMappings
    let nameToId = Map.empty<Text, NodeId>();
    for ((name, id) in existingMappings.values()) {
      nameToId.add(name, id);
    };

    // Track simple name -> full path for scope-aware edge resolution
    let simpleToFullPath = Map.empty<Text, Text>();

    // Build node input lookup for hierarchy checks
    let nodeInputMap = Map.empty<Text, SourceGraphNodeInput>();
    for (node in input.nodes.values()) {
      let mapKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
      nodeInputMap.add(mapKey, node);
      nodeInputMap.add(node.name, node);
    };

    // Separate nodes by type
    let curationNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "curation" });
    let swarmNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "swarm" });
    let locationNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "location" });
    let lawEntityNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "lawEntity" });
    let interpEntityNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "interpEntity" });

    // Process curations
    for (node in curationNodes.values()) {
      let fullPath = buildFullPath(null, node.name);
      var foundId : ?NodeId = null;
      var foundCuration : ?Curation = null;
      for ((id, curation) in curationMap.entries()) {
        if (curation.name == node.name) {
          foundId := ?id;
          foundCuration := ?curation;
        };
      };
      switch (foundId) {
        case (?existingId) {
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          let changes = switch (foundCuration) {
            case (?c) { computeAttributeChanges(c.customAttributes, node.attributes) };
            case (null) { [] };
          };
          nodeOps.add({
            nodeType = "curation";
            localName = node.name;
            backendId = ?existingId;
            parentName = null;
            action = #update(changes);
            attributes = node.attributes;
          });
          nodesToUpdate += 1;
        };
        case (null) {
          let placeholderId = "preview-" # node.name;
          nameToId.add(node.name, placeholderId);
          nameToId.add(fullPath, placeholderId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, placeholderId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeOps.add({
            nodeType = "curation";
            localName = node.name;
            backendId = null;
            parentName = null;
            action = #create;
            attributes = node.attributes;
          });
          nodesToCreate += 1;
        };
      };
    };

    // Process swarms
    for (node in swarmNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) { "" };
        case (?pn) { pn };
      };
      let parentFullPath = switch (simpleToFullPath.get(parentName)) {
        case (?fp) { fp };
        case (null) { parentName };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentId = switch (nameToId.get(parentFullPath)) {
        case (null) { "" };
        case (?pid) { pid };
      };
      var foundId : ?NodeId = null;
      var foundSwarm : ?Swarm = null;
      for ((id, swarm) in swarmMap.entries()) {
        if (swarm.name == node.name and swarm.parentCurationId == parentId) {
          foundId := ?id;
          foundSwarm := ?swarm;
        };
      };
      switch (foundId) {
        case (?existingId) {
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let changes = switch (foundSwarm) {
            case (?s) { computeAttributeChanges(s.customAttributes, node.attributes) };
            case (null) { [] };
          };
          nodeOps.add({
            nodeType = "swarm";
            localName = node.name;
            backendId = ?existingId;
            parentName = node.parentName;
            action = #update(changes);
            attributes = node.attributes;
          });
          nodesToUpdate += 1;
        };
        case (null) {
          let placeholderId = "preview-" # node.name;
          nameToId.add(node.name, placeholderId);
          nameToId.add(fullPath, placeholderId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, placeholderId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          nodeOps.add({
            nodeType = "swarm";
            localName = node.name;
            backendId = null;
            parentName = node.parentName;
            action = #create;
            attributes = node.attributes;
          });
          nodesToCreate += 1;
        };
      };
    };

    // Process locations
    for (node in locationNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) { "" };
        case (?pn) { pn };
      };
      let parentFullPath = switch (simpleToFullPath.get(parentName)) {
        case (?fp) { fp };
        case (null) { parentName };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentId = switch (nameToId.get(parentFullPath)) {
        case (null) { "" };
        case (?pid) { pid };
      };
      var foundId : ?NodeId = null;
      var foundLocation : ?Location = null;
      for ((id, location) in locationMap.entries()) {
        if (location.title == node.name and location.parentSwarmId == parentId) {
          foundId := ?id;
          foundLocation := ?location;
        };
      };
      switch (foundId) {
        case (?existingId) {
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let changes = switch (foundLocation) {
            case (?l) { computeAttributeChanges(l.customAttributes, node.attributes) };
            case (null) { [] };
          };
          nodeOps.add({
            nodeType = "location";
            localName = node.name;
            backendId = ?existingId;
            parentName = node.parentName;
            action = #update(changes);
            attributes = node.attributes;
          });
          nodesToUpdate += 1;
        };
        case (null) {
          let placeholderId = "preview-" # node.name;
          nameToId.add(node.name, placeholderId);
          nameToId.add(fullPath, placeholderId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, placeholderId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          nodeOps.add({
            nodeType = "location";
            localName = node.name;
            backendId = null;
            parentName = node.parentName;
            action = #create;
            attributes = node.attributes;
          });
          nodesToCreate += 1;
        };
      };
    };

    // Process law entities
    for (node in lawEntityNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) { "" };
        case (?pn) { pn };
      };
      let parentFullPath = switch (simpleToFullPath.get(parentName)) {
        case (?fp) { fp };
        case (null) { parentName };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentId = switch (nameToId.get(parentFullPath)) {
        case (null) { "" };
        case (?pid) { pid };
      };
      var foundId : ?NodeId = null;
      var foundLawToken : ?LawToken = null;
      for ((id, lt) in lawTokenMap.entries()) {
        if (lt.tokenLabel == node.name and lt.parentLocationId == parentId) {
          foundId := ?id;
          foundLawToken := ?lt;
        };
      };
      switch (foundId) {
        case (?existingId) {
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let changes = switch (foundLawToken) {
            case (?lt) { computeAttributeChanges(lt.customAttributes, node.attributes) };
            case (null) { [] };
          };
          nodeOps.add({
            nodeType = "lawEntity";
            localName = node.name;
            backendId = ?existingId;
            parentName = node.parentName;
            action = #update(changes);
            attributes = node.attributes;
          });
          nodesToUpdate += 1;
        };
        case (null) {
          let placeholderId = "preview-" # node.name;
          nameToId.add(node.name, placeholderId);
          nameToId.add(fullPath, placeholderId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, placeholderId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          nodeOps.add({
            nodeType = "lawEntity";
            localName = node.name;
            backendId = null;
            parentName = node.parentName;
            action = #create;
            attributes = node.attributes;
          });
          nodesToCreate += 1;
        };
      };
    };

    // Process interpretation entities
    for (node in interpEntityNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) { "" };
        case (?pn) { pn };
      };
      let parentFullPath = switch (simpleToFullPath.get(parentName)) {
        case (?fp) { fp };
        case (null) { parentName };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentId = switch (nameToId.get(parentFullPath)) {
        case (null) { "" };
        case (?pid) { pid };
      };
      var foundId : ?NodeId = null;
      var foundIt : ?InterpretationToken = null;
      for ((id, it) in interpretationTokenMap.entries()) {
        if (it.title == node.name and it.parentLawTokenId == parentId) {
          foundId := ?id;
          foundIt := ?it;
        };
      };
      switch (foundId) {
        case (?existingId) {
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let changes = switch (foundIt) {
            case (?it) { computeAttributeChanges(it.customAttributes, node.attributes) };
            case (null) { [] };
          };
          nodeOps.add({
            nodeType = "interpEntity";
            localName = node.name;
            backendId = ?existingId;
            parentName = node.parentName;
            action = #update(changes);
            attributes = node.attributes;
          });
          nodesToUpdate += 1;
        };
        case (null) {
          let placeholderId = "preview-" # node.name;
          nameToId.add(node.name, placeholderId);
          nameToId.add(fullPath, placeholderId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, placeholderId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          nodeOps.add({
            nodeType = "interpEntity";
            localName = node.name;
            backendId = null;
            parentName = node.parentName;
            action = #create;
            attributes = node.attributes;
          });
          nodesToCreate += 1;
        };
      };
    };

    // Process edges with scope-aware target resolution
    for (edge in input.edges.values()) {
      let sourceId = switch (nameToId.get(edge.sourceName)) {
        case (null) { "" };
        case (?id) { id };
      };
      // Scope-aware target resolution
      let sourceFullPath = switch (simpleToFullPath.get(edge.sourceName)) {
        case (?fp) { fp };
        case (null) { edge.sourceName };
      };
      let targetId = switch (resolveEdgeTarget(edge.targetName, sourceFullPath, nameToId)) {
        case (null) { "" };
        case (?id) { id };
      };
      if (sourceId != "" and targetId != "") {
        let isHierarchyEdge = switch (nodeInputMap.get(edge.targetName)) {
          case (null) { false };
          case (?targetNode) {
            switch (targetNode.parentName) {
              case (null) { false };
              case (?pn) {
                let parentFullPath = switch (simpleToFullPath.get(pn)) {
                  case (?fp) { fp };
                  case (null) { pn };
                };
                parentFullPath == edge.sourceName
              };
            };
          };
        };
        if (not isHierarchyEdge) {
          // Check if edge already exists
          var existingEdge : ?SourceGraphEdge = null;
          switch (sourceEdges.get(sourceId)) {
            case (null) {};
            case (?edgeList) {
              existingEdge := edgeList.find(func(e : SourceGraphEdge) : Bool { e.target == targetId });
            };
          };
          switch (existingEdge) {
            case (?_existing) {
              edgeOps.add({
                sourceName = edge.sourceName;
                targetName = edge.targetName;
                sourceId = ?sourceId;
                targetId = ?targetId;
                action = #update({ newLabels = [edge.edgeLabel] });
                labels = [edge.edgeLabel];
                bidirectional = edge.bidirectional;
              });
              edgesToUpdate += 1;
            };
            case (null) {
              edgeOps.add({
                sourceName = edge.sourceName;
                targetName = edge.targetName;
                sourceId = ?sourceId;
                targetId = ?targetId;
                action = #create;
                labels = [edge.edgeLabel];
                bidirectional = edge.bidirectional;
              });
              edgesToCreate += 1;
            };
          };
        };
      };
    };

    {
      nodeOperations = nodeOps.toArray();
      edgeOperations = edgeOps.toArray();
      summary = {
        nodesToCreate;
        nodesToUpdate;
        edgesToCreate;
        edgesToUpdate;
      };
    };
  };

  // ─── previewPublishSourceGraph: Read-only preview ────────────────────────────

  public shared ({ caller }) func previewPublishSourceGraph(
    input : PublishSourceGraphInput,
    existingMappings : [(Text, NodeId)]
  ) : async PublishPreviewResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can preview publish");
    };
    previewLogic(caller, input, existingMappings);
  };

  // ─── commitPublishSourceGraph: Atomic commit with rollback ───────────────────

  public shared ({ caller }) func commitPublishSourceGraph(
    input : PublishSourceGraphInput,
    existingMappings : [(Text, NodeId)]
  ) : async PublishCommitResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #error({ message = "Not authorized"; failedAt = null });
    };
    if (input.nodes.size() == 0) {
      return #error({ message = "Empty graph"; failedAt = null });
    };

    // Validate node types
    for (node in input.nodes.values()) {
      if (node.nodeType != "curation" and node.nodeType != "swarm" and
          node.nodeType != "location" and node.nodeType != "lawEntity" and
          node.nodeType != "interpEntity") {
        return #error({ message = "Invalid node type: " # node.nodeType; failedAt = null });
      };
    };

    // Staging buffers
    let stagingCurations = Map.empty<NodeId, Curation>();
    let stagingSwarms = Map.empty<NodeId, Swarm>();
    let stagingLocations = Map.empty<NodeId, Location>();
    let stagingLawTokens = Map.empty<NodeId, LawToken>();
    let stagingInterpTokens = Map.empty<NodeId, InterpretationToken>();
    let stagingEdges = Map.empty<NodeId, List.List<SourceGraphEdge>>();

    // Track node mappings for result
    let nodeMappings = List.empty<(Text, NodeId)>();

    // Build name -> NodeId from existingMappings + build as we go
    let nameToId = Map.empty<Text, NodeId>();
    for ((name, id) in existingMappings.values()) {
      nameToId.add(name, id);
    };

    // Track simple name -> full path for scope-aware edge resolution
    let simpleToFullPath = Map.empty<Text, Text>();

    // Build node input lookup
    let nodeInputMap = Map.empty<Text, SourceGraphNodeInput>();
    for (node in input.nodes.values()) {
      let mapKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
      nodeInputMap.add(mapKey, node);
      nodeInputMap.add(node.name, node);
    };

    let curationNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "curation" });
    let swarmNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "swarm" });
    let locationNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "location" });
    let lawEntityNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "lawEntity" });
    let interpEntityNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "interpEntity" });

    // Process curations
    for (node in curationNodes.values()) {
      let fullPath = buildFullPath(null, node.name);
      var foundId : ?NodeId = null;
      var foundCuration : ?Curation = null;
      for ((id, curation) in curationMap.entries()) {
        if (curation.name == node.name) {
          foundId := ?id;
          foundCuration := ?curation;
        };
      };
      switch (foundId) {
        case (?existingId) {
          // Update existing: merge attributes
          let mergedAttrs = switch (foundCuration) {
            case (?c) { mergeWeightedAttributes(c.customAttributes, node.attributes) };
            case (null) { attributesToWeighted(node.attributes) };
          };
          let updatedCuration = switch (foundCuration) {
            case (?c) { { c with customAttributes = mergedAttrs } };
            case (null) {
              return #error({ message = "Curation disappeared during staging"; failedAt = ?{ nodeType = "curation"; name = node.name } });
            };
          };
          stagingCurations.add(existingId, updatedCuration);
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, existingId));
        };
        case (null) {
          // Create new
          let newId = generateId("curation", node.name, caller);
          let newCuration : Curation = {
            id = newId;
            name = node.name;
            creator = caller;
            customAttributes = attributesToWeighted(node.attributes);
            timestamps = { createdAt = Time.now(); };
          };
          stagingCurations.add(newId, newCuration);
          nameToId.add(node.name, newId);
          nameToId.add(fullPath, newId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, newId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, newId));
        };
      };
    };

    // Process swarms
    for (node in swarmNodes.values()) {
       let parentName = switch (node.parentName) {
        case (null) {
          return #error({ message = "Missing parent for swarm: " # node.name; failedAt = ?{ nodeType = "swarm"; name = node.name } });
        };
        case (?pn) { pn };
      };
      let parentFullPath = switch (parentPathFromId(node.id)) {
        case (?pp) { pp };
        case (null) {
          switch (simpleToFullPath.get(parentName)) {
            case (?fp) { fp };
            case (null) { parentName };
          };
        };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentCurationId = switch (nameToId.get(parentFullPath)) {
        case (null) {
          return #error({ message = "Cannot resolve parent for swarm: " # node.name; failedAt = ?{ nodeType = "swarm"; name = node.name } });
        };
        case (?pid) { pid };
      };

      // Look in both real map and staging
      var foundId : ?NodeId = null;
      var foundSwarm : ?Swarm = null;
      for ((id, swarm) in swarmMap.entries()) {
        if (swarm.name == node.name and swarm.parentCurationId == parentCurationId) {
          foundId := ?id;
          foundSwarm := ?swarm;
        };
      };
      if (foundId == null) {
        for ((id, swarm) in stagingSwarms.entries()) {
          if (swarm.name == node.name and swarm.parentCurationId == parentCurationId) {
            foundId := ?id;
            foundSwarm := ?swarm;
          };
        };
      };

      switch (foundId) {
        case (?existingId) {
          let mergedAttrs = switch (foundSwarm) {
            case (?s) { mergeWeightedAttributes(s.customAttributes, node.attributes) };
            case (null) { attributesToWeighted(node.attributes) };
          };
          let updatedSwarm = switch (foundSwarm) {
            case (?s) { { s with customAttributes = mergedAttrs } };
            case (null) {
              return #error({ message = "Swarm disappeared during staging"; failedAt = ?{ nodeType = "swarm"; name = node.name } });
            };
          };
          stagingSwarms.add(existingId, updatedSwarm);
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, existingId));
        };
        case (null) {
          let newId = generateId("swarm", node.name, caller);
          let newSwarm : Swarm = {
            id = newId;
            name = node.name;
            tags = node.tags;
            parentCurationId;
            creator = caller;
            customAttributes = attributesToWeighted(node.attributes);
            timestamps = { createdAt = Time.now(); };
            forkSource = null;
            forkPrincipal = null;
          };
          stagingSwarms.add(newId, newSwarm);
          nameToId.add(node.name, newId);
          nameToId.add(fullPath, newId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, newId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, newId));
        };
      };
    };

    // Process locations
    for (node in locationNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) {
          return #error({ message = "Missing parent for location: " # node.name; failedAt = ?{ nodeType = "location"; name = node.name } });
        };
        case (?pn) { pn };
      };
      let parentFullPath = switch (parentPathFromId(node.id)) {
        case (?pp) { pp };
        case (null) {
          switch (simpleToFullPath.get(parentName)) {
            case (?fp) { fp };
            case (null) { parentName };
          };
        };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentSwarmId = switch (nameToId.get(parentFullPath)) {
        case (null) {
          return #error({ message = "Cannot resolve parent for location: " # node.name; failedAt = ?{ nodeType = "location"; name = node.name } });
        };
        case (?pid) { pid };
      };

      var foundId : ?NodeId = null;
      var foundLocation : ?Location = null;
      for ((id, location) in locationMap.entries()) {
        if (location.title == node.name and location.parentSwarmId == parentSwarmId) {
          foundId := ?id;
          foundLocation := ?location;
        };
      };

      switch (foundId) {
        case (?existingId) {
          let mergedAttrs = switch (foundLocation) {
            case (?l) { mergeWeightedAttributes(l.customAttributes, node.attributes) };
            case (null) { attributesToWeighted(node.attributes) };
          };
          let updatedLocation = switch (foundLocation) {
            case (?l) { { l with customAttributes = mergedAttrs } };
            case (null) {
              return #error({ message = "Location disappeared during staging"; failedAt = ?{ nodeType = "location"; name = node.name } });
            };
          };
          stagingLocations.add(existingId, updatedLocation);
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, existingId));
        };
        case (null) {
          let newId = generateId("location", node.name, caller);
          let newLocation : Location = {
            id = newId;
            title = node.name;
            customAttributes = attributesToWeighted(node.attributes);
            parentSwarmId;
            creator = caller;
            timestamps = { createdAt = Time.now(); };
          };
          stagingLocations.add(newId, newLocation);
          nameToId.add(node.name, newId);
          nameToId.add(fullPath, newId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, newId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, newId));
        };
      };
    };

    // Process law entities
    for (node in lawEntityNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) {
          return #error({ message = "Missing parent for lawEntity: " # node.name; failedAt = ?{ nodeType = "lawEntity"; name = node.name } });
        };
        case (?pn) { pn };
      };
      let parentFullPath = switch (parentPathFromId(node.id)) {
        case (?pp) { pp };
        case (null) {
          switch (simpleToFullPath.get(parentName)) {
            case (?fp) { fp };
            case (null) { parentName };
          };
        };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentLocationId = switch (nameToId.get(parentFullPath)) {
        case (null) {
          return #error({ message = "Cannot resolve parent for lawEntity: " # node.name; failedAt = ?{ nodeType = "lawEntity"; name = node.name } });
        };
        case (?pid) { pid };
      };

      var foundId : ?NodeId = null;
      var foundLawToken : ?LawToken = null;
      for ((id, lt) in lawTokenMap.entries()) {
        if (lt.tokenLabel == node.name and lt.parentLocationId == parentLocationId) {
          foundId := ?id;
          foundLawToken := ?lt;
        };
      };

      switch (foundId) {
        case (?existingId) {
          let mergedAttrs = switch (foundLawToken) {
            case (?lt) { mergeWeightedAttributes(lt.customAttributes, node.attributes) };
            case (null) { attributesToWeighted(node.attributes) };
          };
          let updatedLt = switch (foundLawToken) {
            case (?lt) { { lt with customAttributes = mergedAttrs } };
            case (null) {
              return #error({ message = "LawToken disappeared during staging"; failedAt = ?{ nodeType = "lawEntity"; name = node.name } });
            };
          };
          stagingLawTokens.add(existingId, updatedLt);
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, existingId));
        };
        case (null) {
          let newId = generateId("lawToken", node.name, caller);
          let newLawToken : LawToken = {
            id = newId;
            tokenLabel = node.name;
            parentLocationId;
            creator = caller;
            customAttributes = attributesToWeighted(node.attributes);
            timestamps = { createdAt = Time.now(); };
          };
          stagingLawTokens.add(newId, newLawToken);
          nameToId.add(node.name, newId);
          nameToId.add(fullPath, newId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, newId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, newId));
        };
      };
    };

    // Process interpretation entities
    for (node in interpEntityNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) {
          return #error({ message = "Missing parent for interpEntity: " # node.name; failedAt = ?{ nodeType = "interpEntity"; name = node.name } });
        };
        case (?pn) { pn };
      };
      let parentFullPath = switch (parentPathFromId(node.id)) {
        case (?pp) { pp };
        case (null) {
          switch (simpleToFullPath.get(parentName)) {
            case (?fp) { fp };
            case (null) { parentName };
          };
        };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentLawTokenId = switch (nameToId.get(parentFullPath)) {
        case (null) {
          return #error({ message = "Cannot resolve parent for interpEntity: " # node.name; failedAt = ?{ nodeType = "interpEntity"; name = node.name } });
        };
        case (?pid) { pid };
      };
      let newContent = switch (node.content) { case (?c) { c }; case (null) { "" } };

      var foundId : ?NodeId = null;
      var foundIt : ?InterpretationToken = null;
      for ((id, it) in interpretationTokenMap.entries()) {
        if (it.title == node.name and it.parentLawTokenId == parentLawTokenId) {
          foundId := ?id;
          foundIt := ?it;
        };
      };

      switch (foundId) {
        case (?existingId) {
          let mergedAttrs = switch (foundIt) {
            case (?it) { mergeWeightedAttributes(it.customAttributes, node.attributes) };
            case (null) { attributesToWeighted(node.attributes) };
          };
          let newVersions = switch (foundIt) {
            case (?it) { appendContentVersion(it.contentVersions, newContent, caller) };
            case (null) { [{ content = newContent; contributor = caller; timestamp = Time.now() }] };
          };
          let updatedIt = switch (foundIt) {
            case (?it) { { it with customAttributes = mergedAttrs; contentVersions = newVersions } };
            case (null) {
              return #error({ message = "InterpToken disappeared during staging"; failedAt = ?{ nodeType = "interpEntity"; name = node.name } });
            };
          };
          stagingInterpTokens.add(existingId, updatedIt);
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, existingId));
        };
        case (null) {
          let newId = generateId("interpretationToken", node.name, caller);
          let newIt : InterpretationToken = {
            id = newId;
            title = node.name;
            contentVersions = [{ content = newContent; contributor = caller; timestamp = Time.now() }];
            parentLawTokenId;
            customAttributes = attributesToWeighted(node.attributes);
            creator = caller;
            timestamps = { createdAt = Time.now(); };
          };
          stagingInterpTokens.add(newId, newIt);
          nameToId.add(node.name, newId);
          nameToId.add(fullPath, newId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, newId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
          let mappingKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
          nodeMappings.add((mappingKey, newId));
        };
      };
    };

    // Process source graph edges with scope-aware target resolution
    for (edge in input.edges.values()) {
      let sourceId = switch (nameToId.get(edge.sourceName)) {
        case (null) { "" };
        case (?id) { id };
      };
      // Scope-aware target resolution
      let sourceFullPath = switch (simpleToFullPath.get(edge.sourceName)) {
        case (?fp) { fp };
        case (null) { edge.sourceName };
      };
      let targetId = switch (resolveEdgeTarget(edge.targetName, sourceFullPath, nameToId)) {
        case (null) { "" };
        case (?id) { id };
      };
      if (sourceId != "" and targetId != "") {
        let isHierarchyEdge = switch (nodeInputMap.get(edge.targetName)) {
          case (null) { false };
          case (?targetNode) {
            switch (targetNode.parentName) {
              case (null) { false };
              case (?pn) {
                let parentFullPath = switch (parentPathFromId(targetNode.id)) {
                  case (?pp) { pp };
                  case (null) { pn };
                };
                parentFullPath == edge.sourceName
              };
            };
          };
        };
        if (not isHierarchyEdge) {
          let directionality : Directionality = if (edge.bidirectional) { #bidirectional } else { #unidirectional };
          // Check if edge already exists
          var existingEdge : ?SourceGraphEdge = null;
          switch (sourceEdges.get(sourceId)) {
            case (null) {};
            case (?edgeList) {
              existingEdge := edgeList.find(func(e : SourceGraphEdge) : Bool { e.target == targetId });
            };
          };
          switch (existingEdge) {
            case (?existing) {
              // Merge labels
              let mergedLabels = mergeEdgeLabels(existing.weightedLabels, [edge.edgeLabel]);
              let updatedEdge : SourceGraphEdge = { existing with weightedLabels = mergedLabels };
              // Remove old, add updated to staging
              let edgeList = switch (stagingEdges.get(sourceId)) {
                case (null) {
                  // Copy from real map
                  switch (sourceEdges.get(sourceId)) {
                    case (null) { List.empty<SourceGraphEdge>() };
                    case (?l) { l.clone() };
                  };
                };
                case (?l) { l };
              };
              // Update the matching edge in place
              edgeList.mapInPlace(func(e : SourceGraphEdge) : SourceGraphEdge {
                if (e.target == targetId) { updatedEdge } else { e }
              });
              stagingEdges.add(sourceId, edgeList);
            };
            case (null) {
              // New edge
              let newEdge : SourceGraphEdge = {
                source = sourceId;
                target = targetId;
                weightedLabels = [{ value = edge.edgeLabel; weight = 1 }];
                directionality;
              };
              let edgeList = switch (stagingEdges.get(sourceId)) {
                case (null) {
                  switch (sourceEdges.get(sourceId)) {
                    case (null) { List.empty<SourceGraphEdge>() };
                    case (?l) { l.clone() };
                  };
                };
                case (?l) { l };
              };
              edgeList.add(newEdge);
              stagingEdges.add(sourceId, edgeList);
            };
          };
        };
      };
    };

    // ── Compute PublishedSourceGraphMeta before committing ──────────────────────

    // Find root curation name (first curation in input)
    let rootCurationName = switch (input.nodes.find(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "curation" })) {
      case (?n) { n.name };
      case (null) { "Unknown" };
    };

    // Count nodes and edges in this input
    let addedNodes = input.nodes.size();
    let addedEdges = input.edges.size();
    let addedAttributes = input.nodes.foldLeft(0, func(acc : Nat, n : SourceGraphNodeInput) : Nat { acc + n.attributes.size() });

    // Check if any staging curation already has a publishedSourceGraphId (extension scenario)
    var existingPublishedId : ?Text = null;
    for ((id, curation) in stagingCurations.entries()) {
      switch (curationToPublishedGraphId.get(id)) {
        case (?pid) { existingPublishedId := ?pid };
        case (null) {
          // Check if the matching curation in curationMap already has one
          for ((cid, existingCuration) in curationMap.entries()) {
            if (existingCuration.name == curation.name) {
              switch (curationToPublishedGraphId.get(cid)) {
                case (?pid) { existingPublishedId := ?pid };
                case (null) {};
              };
            };
          };
        };
      };
    };

    let thePublishedId = switch (existingPublishedId) {
      case (?pid) {
        // Extension: update existing metadata
        switch (publishedSourceGraphs.get(pid)) {
          case (?existingMeta) {
            let newEntry : ExtensionEntry = {
              extendedAt = Time.now();
              addedNodes;
              addedEdges;
              addedAttributes;
            };
            let updatedMeta : PublishedSourceGraphMeta = {
              id = existingMeta.id;
              name = existingMeta.name;
              creator = existingMeta.creator;
              creatorName = existingMeta.creatorName;
              publishedAt = existingMeta.publishedAt;
              nodeCount = existingMeta.nodeCount + addedNodes;
              edgeCount = existingMeta.edgeCount + addedEdges;
              attributeCount = existingMeta.attributeCount + addedAttributes;
              extensionLog = existingMeta.extensionLog.concat([newEntry]);
            };
            publishedSourceGraphs.add(pid, updatedMeta);
          };
          case (null) {};
        };
        pid
      };
      case (null) {
        // First publish: create new metadata
        let newPid = generatePublishedSourceGraphId(caller);
        let creatorName = switch (userProfiles.get(caller)) {
          case (?profile) { profile.name };
          case (null) { caller.toText() };
        };
        let newMeta : PublishedSourceGraphMeta = {
          id = newPid;
          name = rootCurationName;
          creator = caller;
          creatorName;
          publishedAt = Time.now();
          nodeCount = addedNodes;
          edgeCount = addedEdges;
          attributeCount = addedAttributes;
          extensionLog = [];
        };
        publishedSourceGraphs.add(newPid, newMeta);
        newPid
      };
    };

    // Tag all staging curations with the publishedSourceGraphId before commit
    for ((id, _curation) in stagingCurations.entries()) {
      curationToPublishedGraphId.add(id, thePublishedId);
    };

    // ── All staging succeeded — commit to real maps ──────────────────────────
    for ((id, curation) in stagingCurations.entries()) {
      curationMap.add(id, curation);
    };
    for ((id, swarm) in stagingSwarms.entries()) {
      swarmMap.add(id, swarm);
      // Update swarm type for new swarms
      if (not swarmMap.containsKey(id)) {
        let isQoL = swarm.tags.any(func(tag : Text) : Bool { tag == "question-of-law" });
        swarmTypeMap.add(id, if (isQoL) { #questionOfLaw } else { #regular });
      };
    };
    for ((id, location) in stagingLocations.entries()) {
      locationMap.add(id, location);
    };
    for ((id, lt) in stagingLawTokens.entries()) {
      lawTokenMap.add(id, lt);
    };
    for ((id, it) in stagingInterpTokens.entries()) {
      interpretationTokenMap.add(id, it);
    };
    for ((id, edgeList) in stagingEdges.entries()) {
      sourceEdges.add(id, edgeList);
    };

    // Auto-upvote new nodes (all new swarms in staging not in original map)
    for ((id, swarm) in stagingSwarms.entries()) {
      autoUpvoteNode(id, caller);
    };

    #success({
      nodeMappings = nodeMappings.toArray();
      message = "Published successfully";
      publishedSourceGraphId = ?thePublishedId;
    });
  };

  // ─── publishSourceGraph: Delegates to commitPublishSourceGraph ────────────────
  // @deprecated: Use previewPublishSourceGraph + commitPublishSourceGraph instead

  public shared ({ caller }) func publishSourceGraph(input : PublishSourceGraphInput) : async PublishResult {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #error("Not authorized");
    };
    if (input.nodes.size() == 0) {
      return #error("Empty graph");
    };

    // Validate node types
    for (node in input.nodes.values()) {
      if (node.nodeType != "curation" and node.nodeType != "swarm" and
          node.nodeType != "location" and node.nodeType != "lawEntity" and
          node.nodeType != "interpEntity") {
        return #error("Invalid node type: " # node.nodeType);
      };
    };

    // Build name -> SourceGraphNodeInput lookup
    let nodeInputMap = Map.empty<Text, SourceGraphNodeInput>();
    for (node in input.nodes.values()) {
      let mapKey = switch (node.id) { case (?id) { id }; case (null) { node.name } };
      nodeInputMap.add(mapKey, node);
      nodeInputMap.add(node.name, node);
    };

    // Mutable name -> NodeId mapping built as we process nodes
    let nameToId = Map.empty<Text, NodeId>();

    // Track simple name -> full path for hierarchy edge detection
    let simpleToFullPath = Map.empty<Text, Text>();

    // Separate nodes by type
    let curationNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "curation" });
    let swarmNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "swarm" });
    let locationNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "location" });
    let lawEntityNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "lawEntity" });
    let interpEntityNodes = input.nodes.filter(func(n : SourceGraphNodeInput) : Bool { n.nodeType == "interpEntity" });

    // Process curations
    for (node in curationNodes.values()) {
      let fullPath = buildFullPath(null, node.name);
      var found : ?NodeId = null;
      for ((id, curation) in curationMap.entries()) {
        if (curation.name == node.name and curation.creator == caller) {
          found := ?id;
        };
      };
      switch (found) {
        case (?existingId) {
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
        };
        case (null) {
          let newId = generateId("curation", node.name, caller);
          let newCuration = {
            id = newId;
            name = node.name;
            creator = caller;
            customAttributes = attributesToWeighted(node.attributes);
            timestamps = { createdAt = Time.now(); };
          };
          curationMap.add(newId, newCuration);
          nameToId.add(node.name, newId);
          nameToId.add(fullPath, newId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, newId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
        };
      };
    };

    // Process swarms
    for (node in swarmNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) { return #error("Missing parent for swarm: " # node.name) };
        case (?pn) { pn };
      };
      let parentFullPath = switch (simpleToFullPath.get(parentName)) {
        case (?fp) { fp };
        case (null) { parentName };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentCurationId = switch (nameToId.get(parentFullPath)) {
        case (null) { return #error("Missing parent for swarm: " # node.name) };
        case (?pid) { pid };
      };
      var found : ?NodeId = null;
      for ((id, swarm) in swarmMap.entries()) {
        if (swarm.name == node.name and swarm.creator == caller and swarm.parentCurationId == parentCurationId) {
          found := ?id;
        };
      };
      switch (found) {
        case (?existingId) {
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
        };
        case (null) {
          let isQuestionOfLaw = node.tags.any(func(tag : Text) : Bool { tag == "question-of-law" });
          let newId = generateId("swarm", node.name, caller);
          let newSwarm : Swarm = {
            id = newId;
            name = node.name;
            tags = node.tags;
            parentCurationId;
            creator = caller;
            customAttributes = attributesToWeighted(node.attributes);
            timestamps = { createdAt = Time.now(); };
            forkSource = null;
            forkPrincipal = null;
          };
          swarmMap.add(newId, newSwarm);
          let swarmType = if (isQuestionOfLaw) { #questionOfLaw } else { #regular };
          swarmTypeMap.add(newId, swarmType);
          autoUpvoteNode(newId, caller);
          nameToId.add(node.name, newId);
          nameToId.add(fullPath, newId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, newId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
        };
      };
    };

    // Process locations
    for (node in locationNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) { return #error("Missing parent for location: " # node.name) };
        case (?pn) { pn };
      };
      let parentFullPath = switch (simpleToFullPath.get(parentName)) {
        case (?fp) { fp };
        case (null) { parentName };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentSwarmId = switch (nameToId.get(parentFullPath)) {
        case (null) { return #error("Missing parent for location: " # node.name) };
        case (?pid) { pid };
      };
      var found : ?NodeId = null;
      for ((id, location) in locationMap.entries()) {
        if (location.title == node.name and location.creator == caller and location.parentSwarmId == parentSwarmId) {
          found := ?id;
        };
      };
      switch (found) {
        case (?existingId) {
          nameToId.add(node.name, existingId);
          nameToId.add(fullPath, existingId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, existingId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
        };
        case (null) {
          let newId = generateId("location", node.name, caller);
          let newLocation = {
            id = newId;
            title = node.name;
            customAttributes = attributesToWeighted(node.attributes);
            parentSwarmId;
            creator = caller;
            timestamps = { createdAt = Time.now(); };
          };
          locationMap.add(newId, newLocation);
          autoUpvoteNode(newId, caller);
          nameToId.add(node.name, newId);
          nameToId.add(fullPath, newId);
          simpleToFullPath.add(node.name, fullPath);
          switch (node.id) {
            case (?id) {
              nameToId.add(id, newId);
              simpleToFullPath.add(id, fullPath);
            };
            case (null) {};
          };
          nodeInputMap.add(fullPath, node);
        };
      };
    };

    // Process law entities
    for (node in lawEntityNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) { return #error("Missing parent for lawEntity: " # node.name) };
        case (?pn) { pn };
      };
      let parentFullPath = switch (simpleToFullPath.get(parentName)) {
        case (?fp) { fp };
        case (null) { parentName };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentLocationId = switch (nameToId.get(parentFullPath)) {
        case (null) { return #error("Missing parent for lawEntity: " # node.name) };
        case (?pid) { pid };
      };
      let newId = generateId("lawToken", node.name, caller);
      let newLawToken = {
        id = newId;
        tokenLabel = node.name;
        parentLocationId;
        creator = caller;
        customAttributes = attributesToWeighted(node.attributes);
        timestamps = { createdAt = Time.now(); };
      };
      lawTokenMap.add(newId, newLawToken);
      autoUpvoteNode(newId, caller);
      nameToId.add(node.name, newId);
      nameToId.add(fullPath, newId);
      simpleToFullPath.add(node.name, fullPath);
      switch (node.id) {
        case (?id) {
          nameToId.add(id, newId);
          simpleToFullPath.add(id, fullPath);
        };
        case (null) {};
      };
      nodeInputMap.add(fullPath, node);
    };

    // Process interpretation entities
    for (node in interpEntityNodes.values()) {
      let parentName = switch (node.parentName) {
        case (null) { return #error("Missing parent for interpEntity: " # node.name) };
        case (?pn) { pn };
      };
      let parentFullPath = switch (simpleToFullPath.get(parentName)) {
        case (?fp) { fp };
        case (null) { parentName };
      };
      let fullPath = buildFullPath(?parentFullPath, node.name);
      let parentLawTokenId = switch (nameToId.get(parentFullPath)) {
        case (null) { return #error("Missing parent for interpEntity: " # node.name) };
        case (?pid) { pid };
      };
      let newId = generateId("interpretationToken", node.name, caller);
      let contentText = switch (node.content) { case (?c) { c }; case (null) { "" } };
      let newIt = {
        id = newId;
        title = node.name;
        contentVersions = [{ content = contentText; contributor = caller; timestamp = Time.now() }];
        parentLawTokenId;
        customAttributes = attributesToWeighted(node.attributes);
        creator = caller;
        timestamps = { createdAt = Time.now(); };
      };
      interpretationTokenMap.add(newId, newIt);
      autoUpvoteNode(newId, caller);
      nameToId.add(node.name, newId);
      nameToId.add(fullPath, newId);
      simpleToFullPath.add(node.name, fullPath);
      switch (node.id) {
        case (?id) {
          nameToId.add(id, newId);
          simpleToFullPath.add(id, fullPath);
        };
        case (null) {};
      };
      nodeInputMap.add(fullPath, node);
    };

    // Process source graph edges
    for (edge in input.edges.values()) {
      let sourceId = switch (nameToId.get(edge.sourceName)) {
        case (null) { "" };
        case (?id) { id };
      };
      let targetId = switch (nameToId.get(edge.targetName)) {
        case (null) { "" };
        case (?id) { id };
      };
      if (sourceId != "" and targetId != "") {
        // Skip hierarchy edges — check if target's parentName resolves to sourceName via full path
        let isHierarchyEdge = switch (nodeInputMap.get(edge.targetName)) {
          case (null) { false };
          case (?targetNode) {
            switch (targetNode.parentName) {
              case (null) { false };
              case (?pn) {
                let parentFullPath = switch (simpleToFullPath.get(pn)) {
                  case (?fp) { fp };
                  case (null) { pn };
                };
                parentFullPath == edge.sourceName
              };
            };
          };
        };
        if (not isHierarchyEdge) {
          let directionality : Directionality = if (edge.bidirectional) { #bidirectional } else { #unidirectional };
          let newEdge : SourceGraphEdge = {
            source = sourceId;
            target = targetId;
            weightedLabels = [{ value = edge.edgeLabel; weight = 1 }];
            directionality;
          };
          let existingList = switch (sourceEdges.get(sourceId)) {
            case (null) { List.empty<SourceGraphEdge>() };
            case (?l) { l };
          };
          existingList.add(newEdge);
          sourceEdges.add(sourceId, existingList);
        };
      };
    };

    #success({ message = "Published successfully" });
  };

  // ─── Graph Helper Functions ─────────────────────────────────────────────────

  func createInterpretationTokenNodes(parentTokenId : NodeId) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (interpretationToken in interpretationTokenMap.values()) {
      if (interpretationToken.parentLawTokenId == parentTokenId
          and not archivedNodes.containsKey(interpretationToken.id)) {
        let node : GraphNode = {
          id = interpretationToken.id;
          nodeType = "interpretationToken";
          tokenLabel = interpretationToken.title;
          jurisdiction = null;
          parentId = ?parentTokenId;
          children = [];
          customAttributes = interpretationToken.customAttributes;
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
          customAttributes = lawToken.customAttributes;
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
          customAttributes = location.customAttributes;
        };
        nodes.add(node);
      };
    };
    nodes.toArray();
  };

  func createSwarmNodes(parentCurationId : NodeId) : [GraphNode] {
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
          customAttributes = swarm.customAttributes;
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
        let childNodes = createSwarmNodes(curation.id);
        let node : GraphNode = {
          id = curation.id;
          nodeType = "curation";
          tokenLabel = curation.name;
          jurisdiction = null;
          parentId = null;
          children = childNodes;
          customAttributes = curation.customAttributes;
        };
        nodes.add(node);
      };
    };
    nodes.toArray();
  };

  // ─── generatePublishedSourceGraphId: unique ID for a published source graph ───
  func generatePublishedSourceGraphId(creator : Principal) : Text {
    "published-" # Time.now().toText() # "-" # creator.hash().toText()
  };

  // ─── getAllPublishedSourceGraphs: Return all published source graph metadata ──
  public query func getAllPublishedSourceGraphs() : async [PublishedSourceGraphMeta] {
    publishedSourceGraphs.values().toArray()
  };

  // ─── getPublishedSourceGraph: Return full GraphData for a published graph ─────
  public query func getPublishedSourceGraph(publishedId : Text) : async ?GraphData {
    // Collect all curations belonging to this published graph
    let matchingCurations = List.empty<Curation>();
    for ((cid, curation) in curationMap.entries()) {
      switch (curationToPublishedGraphId.get(cid)) {
        case (?pid) {
          if (pid == publishedId) { matchingCurations.add(curation) };
        };
        case (null) {};
      };
    };

    if (matchingCurations.isEmpty()) { return null };

    // Build a Set of all node IDs belonging to this published graph
    let publishedNodeIds = Set.empty<NodeId>();
    let collectedSwarms = List.empty<Swarm>();
    let collectedLocations = List.empty<Location>();
    let collectedLawTokens = List.empty<LawToken>();
    let collectedInterpTokens = List.empty<InterpretationToken>();

    // Add curation IDs
    for (curation in matchingCurations.values()) {
      publishedNodeIds.add(curation.id);
    };

    // Collect swarms whose parentCurationId is in the set
    for (swarm in swarmMap.values()) {
      if (publishedNodeIds.contains(swarm.parentCurationId)) {
        collectedSwarms.add(swarm);
        publishedNodeIds.add(swarm.id);
      };
    };

    // Collect locations whose parentSwarmId is in the set
    for (location in locationMap.values()) {
      if (publishedNodeIds.contains(location.parentSwarmId)) {
        collectedLocations.add(location);
        publishedNodeIds.add(location.id);
      };
    };

    // Collect law tokens whose parentLocationId is in the set
    for (lt in lawTokenMap.values()) {
      if (publishedNodeIds.contains(lt.parentLocationId)) {
        collectedLawTokens.add(lt);
        publishedNodeIds.add(lt.id);
      };
    };

    // Collect interpretation tokens whose parentLawTokenId is in the set
    for (it in interpretationTokenMap.values()) {
      if (publishedNodeIds.contains(it.parentLawTokenId)) {
        collectedInterpTokens.add(it);
        publishedNodeIds.add(it.id);
      };
    };

    // Filter sourceEdges: only keep edges where both source and target are in the set
    let collectedEdges = List.empty<GraphEdge>();
    for ((sourceId, edgeList) in sourceEdges.entries()) {
      if (publishedNodeIds.contains(sourceId)) {
        for (edge in edgeList.values()) {
          if (publishedNodeIds.contains(edge.target)) {
            collectedEdges.add({
              source = edge.source;
              target = edge.target;
              edgeLabel = aggregateWeightedLabels(edge.weightedLabels);
              directionality = edge.directionality;
            });
          };
        };
      };
    };

    // Build root GraphNodes from matchingCurations
    let rootNodes = List.empty<GraphNode>();
    for (curation in matchingCurations.values()) {
      let childNodes = createSwarmNodes(curation.id);
      rootNodes.add({
        id = curation.id;
        nodeType = "curation";
        tokenLabel = curation.name;
        jurisdiction = null;
        parentId = null;
        children = childNodes;
        customAttributes = curation.customAttributes;
      });
    };

    ?{
      curations = matchingCurations.toArray();
      swarms = collectedSwarms.toArray();
      locations = collectedLocations.toArray();
      lawTokens = collectedLawTokens.toArray();
      interpretationTokens = collectedInterpTokens.toArray();
      rootNodes = rootNodes.toArray();
      edges = collectedEdges.toArray();
    };
  };

  // ─── getAllData: Public query for all non-archived graph data ────────────────
  // DEPRECATED: GraphView page removed. Use getPublishedSourceGraph() for published graphs.

  public query func getAllData() : async GraphData {
    // DEPRECATED: GraphView page removed. Use getPublishedSourceGraph() for published graphs.
    {
      curations = [];
      swarms = [];
      locations = [];
      lawTokens = [];
      interpretationTokens = [];
      rootNodes = [];
      edges = [];
    };
  };

  // ─── getOwnedData: Caller-owned graph data ───────────────────────────────────
  // DEPRECATED: Use getPublishedSourceGraph() for published graphs.

  public query ({ caller }) func getOwnedData() : async OwnedGraphData {
    // DEPRECATED: GraphView page removed. Use getPublishedSourceGraph() for published graphs.
    {
      curations = [];
      swarms = [];
      locations = [];
      lawTokens = [];
      interpretationTokens = [];
      edges = [];
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
    interpretationTokenMap := Map.empty<NodeId, InterpretationToken>();
    membershipRequests := Map.empty<NodeId, List.List<SwarmMembership>>();
    swarmMembers := Map.empty<NodeId, List.List<Principal>>();
    swarmTypeMap := Map.empty<NodeId, SwarmType>();
    archivedNodes := Map.empty<NodeId, ()>();
    forkPulledSourceNodes := Map.empty<NodeId, List.List<NodeId>>();
    sourceEdges := Map.empty<NodeId, List.List<SourceGraphEdge>>();
    publishedSourceGraphs := Map.empty<Text, PublishedSourceGraphMeta>();
    curationToPublishedGraphId := Map.empty<NodeId, Text>();
  };
};
