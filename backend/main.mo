import Text "mo:core/Text";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Principal "mo:core/Principal";

import UserApproval "user-approval/approval";
import AccessControl "authorization/access-control";

actor {
  type NodeId = Text;
  type Tag = Text;
  type CustomAttribute = { key : Text; value : Text };

  public type BuzzScore = Int;

  public type BuzzLeaderboardEntry = {
    principal : Principal;
    profileName : ?Text;
    score : BuzzScore;
  };

  public type Curation = {
    id : NodeId;
    name : Text;
    creator : Principal;
    jurisdiction : Text;
  };

  public type Swarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    creator : Principal;
  };

  public type Location = {
    id : NodeId;
    title : Text;
    content : Text;
    originalTokenSequence : Text;
    customAttributes : [CustomAttribute];
    parentSwarmId : NodeId;
    creator : Principal;
    version : Nat;
  };

  public type LawToken = {
    id : NodeId;
    tokenLabel : Text;
    meaning : Text;
    parentLocationId : NodeId;
    creator : Principal;
  };

  public type InterpretationToken = {
    id : NodeId;
    title : Text;
    context : Text;
    fromLawTokenId : NodeId;
    fromRelationshipType : Text;
    toNodeId : NodeId;
    toRelationshipType : Text;
    customAttributes : [CustomAttribute];
    creator : Principal;
  };

  public type UserProfile = {
    name : Text;
    socialUrl : ?Text;
  };

  public type SearchResult = {
    id : NodeId;
    nodeType : Text;
    name : Text;
    parentContext : ?Text;
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

  module LawToken {
    public func compareByTokenLabel(t1 : LawToken, t2 : LawToken) : Order.Order {
      Text.compare(t1.tokenLabel, t2.tokenLabel);
    };
  };

  public type MembershipStatus = { #pending; #approved };

  public type MembershipInfo = {
    principal : Principal;
    profileName : ?Text;
    status : MembershipStatus;
  };

  public type SwarmMembership = {
    swarmId : NodeId;
    member : Principal;
    status : MembershipStatus;
  };

  module SwarmMembership {
    public func compareByMember(a : SwarmMembership, b : SwarmMembership) : Order.Order {
      Principal.compare(a.member, b.member);
    };
  };

  public type VoteData = {
    upvotes : Nat;
    downvotes : Nat;
  };

  public type UserVoteTracking = {
    votedNodes : Map.Map<Text, Bool>;
  };

  let voteData = Map.empty<Text, VoteData>();

  let userVoteTracking = Map.empty<Principal, UserVoteTracking>();

  public type GraphNode = {
    id : NodeId;
    nodeType : Text;
    tokenLabel : Text;
    jurisdiction : ?Text;
    parentId : ?NodeId;
    children : [GraphNode];
  };

  public type GraphEdge = {
    source : NodeId;
    target : NodeId;
  };

  public type GraphData = {
    curations : [Curation];
    swarms : [Swarm];
    locations : [Location];
    lawTokens : [LawToken];
    interpretationTokens : [InterpretationToken];
    rootNodes : [GraphNode];
    edges : [GraphEdge];
  };

  var curationMap = Map.empty<NodeId, Curation>();
  var swarmMap = Map.empty<NodeId, Swarm>();
  var locationMap = Map.empty<NodeId, Location>();
  var lawTokenMap = Map.empty<NodeId, LawToken>();
  var interpretationTokenMap = Map.empty<NodeId, InterpretationToken>();
  var membershipRequests = Map.empty<NodeId, List.List<SwarmMembership>>();
  var userProfiles = Map.empty<Principal, UserProfile>();
  var locationLawTokenRelations = Map.empty<NodeId, List.List<NodeId>>();
  var voteDataMap = Map.empty<Text, VoteData>();
  var buzzScores = Map.empty<Principal, BuzzScore>();
  var interpretationTokenFromEdges = Map.empty<NodeId, List.List<GraphEdge>>();
  var interpretationTokenToEdges = Map.empty<NodeId, List.List<GraphEdge>>();

  let accessControlState = AccessControl.initState();
  let approvalState = UserApproval.initState(accessControlState);

  var existingAdmins : [Principal] = [];

  public shared ({ caller }) func initializeAccessControl() : async () {
    if (existingAdmins.size() >= 2) {
      AccessControl.initialize(accessControlState, caller);
      return;
    };

    AccessControl.initialize(accessControlState, caller);

    let callerExists = existingAdmins.find(func(p) { Principal.equal(p, caller) });
    if (callerExists == null) {
      existingAdmins := existingAdmins.concat([caller]);
    };
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    if (role == #admin) {
      let numCurrentAdmins = countAdmins();
      if (numCurrentAdmins >= 2) {
        Runtime.trap("Admin limit reached—no additional admins can be added.");
      };
    };

    AccessControl.assignRole(accessControlState, caller, user, role);

    if (role == #admin) {
      let userExists = existingAdmins.find(func(p) { Principal.equal(p, user) });
      if (userExists == null) {
        existingAdmins := existingAdmins.concat([user]);
      };
    };
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func isCallerApproved() : async Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
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

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getAllCustomAttributeKeys() : async [Text] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access attribute keys");
    };

    let keys = Map.empty<Text, Bool>();

    for (location in locationMap.values()) {
      for (attr in location.customAttributes.values()) {
        keys.add(attr.key, true);
      };
    };

    for (interpretationToken in interpretationTokenMap.values()) {
      for (attr in interpretationToken.customAttributes.values()) {
        keys.add(attr.key, true);
      };
    };

    let keyList = List.empty<Text>();
    for ((key, _) in keys.entries()) {
      keyList.add(key);
    };

    keyList.toArray();
  };

  public query ({ caller }) func getAttributeValuesForKey(key : Text) : async [Text] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can access attribute values");
    };

    let values = Map.empty<Text, Bool>();

    for (location in locationMap.values()) {
      for (attr in location.customAttributes.values()) {
        if (Text.equal(attr.key, key)) {
          values.add(attr.value, true);
        };
      };
    };

    for (interpretationToken in interpretationTokenMap.values()) {
      for (attr in interpretationToken.customAttributes.values()) {
        if (Text.equal(attr.key, key)) {
          values.add(attr.value, true);
        };
      };
    };

    let valueList = List.empty<Text>();
    for ((value, _) in values.entries()) {
      valueList.add(value);
    };

    valueList.toArray();
  };

  public query ({ caller }) func searchNodesByAttribute(key : Text, value : Text) : async [SearchResult] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can search nodes");
    };

    let results = List.empty<SearchResult>();

    for (location in locationMap.values()) {
      let hasMatch = location.customAttributes.any(
        func(attr : CustomAttribute) : Bool {
          Text.equal(attr.key, key) and Text.equal(attr.value, value)
        }
      );

      if (hasMatch) {
        let swarmName = switch (swarmMap.get(location.parentSwarmId)) {
          case (null) { "Unknown Swarm" };
          case (?swarm) { swarm.name };
        };

        results.add({
          id = location.id;
          nodeType = "Location";
          name = location.title;
          parentContext = ?swarmName;
        });
      };
    };

    for (interpretationToken in interpretationTokenMap.values()) {
      let hasMatch = interpretationToken.customAttributes.any(
        func(attr : CustomAttribute) : Bool {
          Text.equal(attr.key, key) and Text.equal(attr.value, value)
        }
      );

      if (hasMatch) {
        let lawToken = switch (lawTokenMap.get(interpretationToken.fromLawTokenId)) {
          case (null) { null };
          case (?lt) { ?lt };
        };

        let parentContext = switch (lawToken) {
          case (null) { "Unknown Law Token" };
          case (?lt) { lt.tokenLabel };
        };

        results.add({
          id = interpretationToken.id;
          nodeType = "Interpretation Token";
          name = interpretationToken.title;
          parentContext = ?parentContext;
        });
      };
    };

    results.toArray();
  };

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

    let id = generateId("curation", name, caller);
    let newCuration = {
      id;
      name;
      creator = caller;
      jurisdiction;
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

    let uniqueName = generateGlobalUniqueSwarmName(name);

    let id = generateId("swarm", uniqueName, caller);
    let newSwarm = {
      id;
      name = uniqueName;
      tags;
      parentCurationId;
      creator = caller;
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
      allNames.any(func(existing) { Text.equal(existing, name) });
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

  public shared ({ caller }) func createLocation(title : Text, content : Text, originalTokenSequence : Text, customAttributes : [CustomAttribute], parentSwarmId : NodeId) : async NodeId {
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

    let (finalTitle, finalVersion) = getNextAvailableLocationVersion(title, parentSwarmId, customAttributes);
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
    };
    locationMap.add(id, newLocation);

    let lawTokensCreated = createLawTokensForLocation(newLocation, caller);
    updateBuzzScoreOnLawTokenCreation(caller, lawTokensCreated);

    autoUpvoteNode(id, caller);

    id;
  };

  public shared ({ caller }) func createInterpretationToken(
    title : Text,
    context : Text,
    fromLawTokenId : NodeId,
    fromRelationshipType : Text,
    toNodeId : NodeId,
    toRelationshipType : Text,
    customAttributes : [CustomAttribute]
  ) : async NodeId {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can create interpretation tokens");
    };

    let lawToken = switch (lawTokenMap.get(fromLawTokenId)) {
      case (null) { Runtime.trap("From law token does not exist") };
      case (?l) { l };
    };

    if (not isValidLawToken(fromLawTokenId)) {
      Runtime.trap("Invalid from law token specified");
    };

    if (not hasSwarmAccess(caller, fromLawTokenId)) {
      Runtime.trap("Unauthorized: Only swarm creator or approved members can create interpretation tokens");
    };

    let toNodeSwarmId = getNodeSwarmId(toNodeId);
    switch (toNodeSwarmId) {
      case (null) {
        Runtime.trap("To node does not exist or is invalid");
      };
      case (?swarmId) {
        if (not isSwarmCreatorOrMember(caller, swarmId)) {
          Runtime.trap("Unauthorized: You can only link to nodes from swarms where you are a creator or approved member");
        };
      };
    };

    let id = generateId("interpretationToken", title, caller);
    let newInterpretationToken = {
      id;
      title;
      context;
      fromLawTokenId;
      fromRelationshipType;
      toNodeId;
      toRelationshipType;
      customAttributes;
      creator = caller;
    };
    interpretationTokenMap.add(id, newInterpretationToken);

    let fromEdge = { source = fromLawTokenId; target = id };
    let toEdge = { source = id; target = toNodeId };

    let currentFromEdges = switch (interpretationTokenFromEdges.get(fromLawTokenId)) {
      case (null) { List.empty<GraphEdge>() };
      case (?edges) { edges };
    };
    currentFromEdges.add(fromEdge);
    interpretationTokenFromEdges.add(fromLawTokenId, currentFromEdges);

    let currentToEdges = switch (interpretationTokenToEdges.get(id)) {
      case (null) { List.empty<GraphEdge>() };
      case (?edges) { edges };
    };
    currentToEdges.add(toEdge);
    interpretationTokenToEdges.add(id, currentToEdges);

    updateBuzzScoreOnInterpretationTokenCreation(caller);
    autoUpvoteNode(id, caller);

    id;
  };

  func isValidLawToken(lawTokenId : NodeId) : Bool {
    switch (lawTokenMap.get(lawTokenId)) {
      case (null) { false };
      case (?_token) { true };
    };
  };

  func hasSwarmAccess(caller : Principal, lawTokenId : NodeId) : Bool {
    if (not isValidLawToken(lawTokenId)) { return false };
    let lawToken = switch (lawTokenMap.get(lawTokenId)) {
      case (null) { return false };
      case (?token) { token };
    };
    let location = switch (locationMap.get(lawToken.parentLocationId)) {
      case (null) { return false };
      case (?loc) { loc };
    };
    isSwarmCreatorOrMember(caller, location.parentSwarmId);
  };

  func getNodeSwarmId(nodeId : NodeId) : ?NodeId {
    switch (curationMap.get(nodeId)) {
      case (?_curation) { return null };
      case (null) {};
    };

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
        switch (lawTokenMap.get(interpretationToken.fromLawTokenId)) {
          case (?lawToken) {
            switch (locationMap.get(lawToken.parentLocationId)) {
              case (?location) { return ?location.parentSwarmId };
              case (null) { return null };
            };
          };
          case (null) { return null };
        };
      };
      case (null) {};
    };

    null;
  };

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
          func(request) { request.member == caller }
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
          func(request) { request.member == member and request.status == #pending }
        );

        if (not found) {
          Runtime.trap("No pending request found for member in this swarm");
        };

        let updatedRequests = requests.map<SwarmMembership, SwarmMembership>(
          func(request) {
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
              func(request) { request.status == #approved }
            );
            let members = approved.map(
              func(request) { request.member }
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
              func(request) {
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
    userVoteTracking.clear();
  };

  public shared ({ caller }) func upvoteNode(nodeId : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can upvote nodes");
    };

    switch (curationMap.get(nodeId)) {
      case (?_curation) {
        Runtime.trap("Unauthorized: Curation nodes cannot be voted on");
      };
      case (null) {};
    };

    validateVotingPermission(caller, nodeId);

    let userVoteData = switch (userVoteTracking.get(caller)) {
      case (null) {
        let newTracking : UserVoteTracking = { votedNodes = Map.empty<Text, Bool>() };
        userVoteTracking.add(caller, newTracking);
        newTracking;
      };
      case (?tracking) { tracking };
    };

    switch (userVoteData.votedNodes.get(nodeId)) {
      case (?true) { Runtime.trap("You have already voted on this node") };
      case (?false) { Runtime.trap("You have already voted on this node") };
      case (null) {};
    };

    let nodeCreator = getNodeCreator(nodeId);

    switch (voteDataMap.get(nodeId)) {
      case (null) {
        voteDataMap.add(nodeId, { upvotes = 1; downvotes = 0 });
      };
      case (?data) {
        voteDataMap.add(nodeId, { data with upvotes = data.upvotes + 1 });
      };
    };
    userVoteData.votedNodes.add(nodeId, true);

    switch (nodeCreator) {
      case (?creator) {
        updateBuzzScoreOnUpvote(creator, nodeId);
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func downvoteNode(nodeId : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can downvote nodes");
    };

    switch (curationMap.get(nodeId)) {
      case (?_curation) {
        Runtime.trap("Unauthorized: Curation nodes cannot be voted on");
      };
      case (null) {};
    };

    validateVotingPermission(caller, nodeId);

    let userVoteData = switch (userVoteTracking.get(caller)) {
      case (null) {
        let newTracking : UserVoteTracking = { votedNodes = Map.empty<Text, Bool>() };
        userVoteTracking.add(caller, newTracking);
        newTracking;
      };
      case (?tracking) { tracking };
    };

    switch (userVoteData.votedNodes.get(nodeId)) {
      case (?true) { Runtime.trap("You have already voted on this node") };
      case (?false) { Runtime.trap("You have already voted on this node") };
      case (null) {};
    };

    let nodeCreator = getNodeCreator(nodeId);

    switch (voteDataMap.get(nodeId)) {
      case (null) {
        voteDataMap.add(nodeId, { upvotes = 0; downvotes = 1 });
      };
      case (?data) {
        voteDataMap.add(nodeId, { data with downvotes = data.downvotes + 1 });
      };
    };
    userVoteData.votedNodes.add(nodeId, false);

    switch (nodeCreator) {
      case (?creator) {
        updateBuzzScoreOnDownvote(creator, nodeId);
      };
      case (null) {};
    };
  };

  public query ({ }) func getVoteData(nodeId : Text) : async VoteData {
    switch (voteDataMap.get(nodeId)) {
      case (null) { { upvotes = 0; downvotes = 0 } };
      case (?data) { data };
    };
  };

  public query ({ caller }) func hasUserVoted(nodeId : Text) : async ?Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can check vote status");
    };
    switch (userVoteTracking.get(caller)) {
      case (null) { null };
      case (?tracking) {
        tracking.votedNodes.get(nodeId);
      };
    };
  };

  func validateVotingPermission(caller : Principal, nodeId : Text) {
    switch (curationMap.get(nodeId)) {
      case (?_curation) {
        Runtime.trap("Unauthorized: Curation nodes cannot be voted on");
      };
      case (null) {};
    };

    switch (swarmMap.get(nodeId)) {
      case (?_swarm) {
        return;
      };
      case (null) {};
    };

    switch (locationMap.get(nodeId)) {
      case (?location) {
        if (not isSwarmCreatorOrMember(caller, location.parentSwarmId)) {
          Runtime.trap("Unauthorized: Only swarm creator or approved members can vote on locations");
        };
        return;
      };
      case (null) {};
    };

    switch (lawTokenMap.get(nodeId)) {
      case (?lawToken) {
        let location = switch (locationMap.get(lawToken.parentLocationId)) {
          case (null) { Runtime.trap("Parent location not found for law token") };
          case (?loc) { loc };
        };
        if (not isSwarmCreatorOrMember(caller, location.parentSwarmId)) {
          Runtime.trap("Unauthorized: Only swarm creator or approved members can vote on law tokens");
        };
        return;
      };
      case (null) {};
    };

    switch (interpretationTokenMap.get(nodeId)) {
      case (?interpretationToken) {
        let lawToken = switch (lawTokenMap.get(interpretationToken.fromLawTokenId)) {
          case (null) { Runtime.trap("Parent law token not found for interpretation token") };
          case (?lt) { lt };
        };
        let location = switch (locationMap.get(lawToken.parentLocationId)) {
          case (null) { Runtime.trap("Parent location not found for law token") };
          case (?loc) { loc };
        };
        if (not isSwarmCreatorOrMember(caller, location.parentSwarmId)) {
          Runtime.trap("Unauthorized: Only swarm creator or approved members can vote on interpretation tokens");
        };
        return;
      };
      case (null) {};
    };

    Runtime.trap("Node not found");
  };

  func isSwarmCreatorOrMember(caller : Principal, swarmId : NodeId) : Bool {
    switch (swarmMap.get(swarmId)) {
      case (null) { return false };
      case (?swarm) {
        if (swarm.creator == caller) { return true };

        switch (membershipRequests.get(swarmId)) {
          case (null) { false };
          case (?members) {
            let found = members.any(
              func(request) { request.member == caller and request.status == #approved }
            );
            found;
          };
        };
      };
    };
  };

  func createInterpretationTokenNodes(parentLawTokenId : NodeId) : [GraphNode] {
    let nodes = List.empty<GraphNode>();
    for (interpretationToken in interpretationTokenMap.values()) {
      if (interpretationToken.fromLawTokenId == parentLawTokenId) {
        let interpretationTokenNode : GraphNode = {
          id = interpretationToken.id;
          nodeType = "interpretationToken";
          tokenLabel = interpretationToken.title;
          jurisdiction = null;
          parentId = ?parentLawTokenId;
          children = [];
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

  public query ({ }) func getGraphData() : async GraphData {
    let edges = List.empty<GraphEdge>();

    for ((locationId, lawTokenIds) in locationLawTokenRelations.entries()) {
      for (lawTokenId in lawTokenIds.values()) {
        edges.add({
          source = locationId;
          target = lawTokenId;
        });
      };
    };

    for ((lawTokenId, fromEdgesList) in interpretationTokenFromEdges.entries()) {
      for (edge in fromEdgesList.values()) {
        edges.add(edge);
      };
    };

    for ((interpretationTokenId, toEdgesList) in interpretationTokenToEdges.entries()) {
      for (edge in toEdgesList.values()) {
        edges.add(edge);
      };
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

  public shared ({ caller }) func exportTreeData() : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can export tree data");
    };
    let graphData = await getGraphData();
    "{\"curations\":[],\"swarms\":[],\"locations\":[],\"lawTokens\":[],\"interpretationTokens\":[]}";
  };

  public shared ({ caller }) func importTreeData(jsonData : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can import tree data");
    };
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
    let delta = if (tokensCreated > 0) { tokensCreated * 3 } else { 0 };
    updateBuzzScore(creator, delta.toInt());
  };

  func updateBuzzScoreOnInterpretationTokenCreation(creator : Principal) {
    updateBuzzScore(creator, 5);
  };

  func updateBuzzScoreOnUpvote(creator : Principal, nodeId : Text) {
    switch (lawTokenMap.get(nodeId)) {
      case (?_lawToken) {
        updateBuzzScore(creator, 1);
        return;
      };
      case (null) {};
    };
    switch (interpretationTokenMap.get(nodeId)) {
      case (?_interpretationToken) {
        updateBuzzScore(creator, 2);
        return;
      };
      case (null) {};
    };
  };

  func updateBuzzScoreOnDownvote(creator : Principal, nodeId : Text) {
    switch (lawTokenMap.get(nodeId)) {
      case (?_lawToken) {
        updateBuzzScore(creator, -1);
        return;
      };
      case (null) {};
    };
    switch (interpretationTokenMap.get(nodeId)) {
      case (?_interpretationToken) {
        updateBuzzScore(creator, -2);
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
    prefix # input # creatorPrincipal.toText();
  };

  func getNextAvailableLocationVersion(name : Text, parentSwarmId : NodeId, customAttributes : [CustomAttribute]) : (Text, Nat) {
    var newVersion = 1;

    for (existing in locationMap.values()) {
      if (existing.parentSwarmId == parentSwarmId and Text.equal(existing.title, name)) {
        newVersion += 1;
      };
    };

    let finalName = if (newVersion > 1) {
      name # " (v" # newVersion.toText() # ")";
    } else {
      name;
    };

    (finalName, newVersion);
  };

  func sortLeaderboardEntries(entries : [BuzzLeaderboardEntry]) : [BuzzLeaderboardEntry] {
    if (entries.size() == 0 or entries.size() == 1) {
      return entries;
    };

    entries.sort(
      func(a, b) {
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
      return Array.tabulate<BuzzLeaderboardEntry>(maxEntries, func(i) { sortedEntries[i] });
    };

    sortedEntries;
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
};

