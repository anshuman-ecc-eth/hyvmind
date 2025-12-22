import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import AccessControl "authorization/access-control";
import Migration "migration";

// specify the data migration function in with-clause
(with migration = Migration.run)
actor {
  public type NodeType = { #curation; #swarm; #annotation; #token };
  public type RelationType = { #retrieval; #reasoning };
  public type NodeId = Nat;
  public type RelationId = Nat;
  public type VoteType = { #upvote; #downvote };

  public type Node = {
    id : NodeId;
    nodeType : NodeType;
    title : Text;
    bracketedTokenSequence : Text;
    parentId : ?NodeId;
    createdAt : Time.Time;
    owner : Principal;
    swarmId : ?NodeId;
    immutable : Bool;
    attributes : [(Text, Text)];
    upvotes : Nat;
    downvotes : Nat;
    verified : Bool;
  };

  public type SwarmChatMessage = {
    sender : Principal;
    timestamp : Time.Time;
    content : Text;
  };

  public type Relation = {
    id : RelationId;
    sourceNodeId : NodeId;
    targetNodeId : NodeId;
    relationType : RelationType;
    relationStyle : RelationType;
    owner : Principal;
    createdAt : Time.Time;
  };

  public type GraphData = {
    nodes : [Node];
    relations : [Relation];
  };

  public type CreateNodeInput = {
    title : Text;
    bracketedTokenSequence : Text;
    nodeType : NodeType;
    parentId : ?NodeId;
  };

  public type CreateRelationInput = {
    sourceNodeId : NodeId;
    targetNodeId : NodeId;
    relationType : RelationType;
  };

  public type UserProfile = {
    name : Text;
    owner : Principal;
    createdAt : Time.Time;
    socialUrl : ?Text;
  };

  public type CommonPoolTransaction = {
    amount : Nat;
    timestamp : Time.Time;
    sender : Principal;
  };

  public type CommonPoolBalance = {
    balance : Nat;
    transactions : [CommonPoolTransaction];
  };

  var commonPoolState : CommonPoolBalance = {
    balance = 0;
    transactions = [];
  };

  let nodes = Map.empty<NodeId, Node>();
  let relations = Map.empty<RelationId, Relation>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let swarmMembers = Map.empty<NodeId, List.List<Principal>>();
  let swarmChatMessages = Map.empty<NodeId, List.List<SwarmChatMessage>>();

  module VoteTuple {
    public func compare(a : (Principal, NodeId), b : (Principal, NodeId)) : Order.Order {
      let principalOrder = Principal.compare(a.0, b.0);
      if (principalOrder != #equal) {
        return principalOrder;
      };
      Nat.compare(a.1, b.1);
    };
  };
  let userVotes = Map.empty<(Principal, NodeId), VoteType>();

  var nextNodeId = 1;
  var nextRelationId = 1;
  let maxTitleLength = 100;

  let accessControlState = AccessControl.initState();

  func compareNodesByTypeAndParent(a : Node, b : Node) : Order.Order {
    let typeOrder = Nat.compare(
      nodeTypeToOrderValue(a.nodeType),
      nodeTypeToOrderValue(b.nodeType),
    );
    if (typeOrder != #equal) {
      return typeOrder;
    };

    switch (a.parentId, b.parentId) {
      case (?aParent, ?bParent) {
        Nat.compare(aParent, bParent);
      };
      case (?_, null) { #greater };
      case (null, ?_) { #less };
      case (null, null) { #equal };
    };
  };

  func nodeTypeToOrderValue(nodeType : NodeType) : Nat {
    switch (nodeType) {
      case (#curation) { 0 };
      case (#swarm) { 1 };
      case (#annotation) { 2 };
      case (#token) { 3 };
    };
  };

  func getSyncStatus(caller : Principal) : Text {
    switch (userProfiles.get(caller)) {
      case (null) { "not registered" };
      case (?_) {
        if (caller.isAnonymous()) {
          "anonymous";
        } else {
          "active";
        };
      };
    };
  };

  func autoRegisterUser(caller : Principal) {
    if (caller.isAnonymous()) {
      return;
    };
    AccessControl.initialize(accessControlState, caller);
  };

  func isSwarmCreator(swarmId : NodeId, caller : Principal) : Bool {
    switch (nodes.get(swarmId)) {
      case (?swarmNode) {
        swarmNode.owner == caller;
      };
      case (null) { false };
    };
  };

  func isSwarmMember(swarmId : NodeId, caller : Principal) : Bool {
    switch (swarmMembers.get(swarmId)) {
      case (?members) {
        members.any(func(p) { p == caller });
      };
      case (null) { false };
    };
  };

  func hasSwarmAccess(swarmId : NodeId, caller : Principal) : Bool {
    isSwarmCreator(swarmId, caller) or isSwarmMember(swarmId, caller);
  };

  func curationNameExists(name : Text) : Bool {
    for (node in nodes.values()) {
      if (node.nodeType == #curation) {
        if (Text.equal(node.title, name)) {
          return true;
        };
      };
    };
    false;
  };

  func swarmNameExistsInCuration(name : Text, curationId : NodeId) : Bool {
    for (node in nodes.values()) {
      if (node.nodeType == #swarm and node.parentId == ?curationId) {
        if (Text.equal(node.title, name)) {
          return true;
        };
      };
    };
    false;
  };

  func annotationNameExistsInSwarm(name : Text, swarmId : NodeId) : Bool {
    for (node in nodes.values()) {
      if (node.nodeType == #annotation and node.swarmId == ?swarmId) {
        if (Text.equal(node.title, name)) {
          return true;
        };
      };
    };
    false;
  };

  func tokenExistsInSwarm(tokenTitle : Text, swarmId : NodeId) : Bool {
    for (node in nodes.values()) {
      if (node.nodeType == #token and node.swarmId == ?swarmId) {
        if (node.title == tokenTitle) {
          return true;
        };
      };
    };
    false;
  };

  func isNodeVisibleToCaller(node : Node, caller : Principal) : Bool {
    switch (node.nodeType) {
      case (#curation) { true };
      case (#swarm) { true };
      case (#annotation) {
        switch (node.swarmId) {
          case (?swarmId) {
            hasSwarmAccess(swarmId, caller);
          };
          case (null) { false };
        };
      };
      case (#token) {
        switch (node.swarmId) {
          case (?swarmId) {
            hasSwarmAccess(swarmId, caller);
          };
          case (null) { false };
        };
      };
    };
  };

  func isNodeIdVisibleToCaller(id : NodeId, caller : Principal) : Bool {
    switch (nodes.get(id)) {
      case (?node) {
        isNodeVisibleToCaller(node, caller);
      };
      case (null) { false };
    };
  };

  public type CreateNodeResult = {
    success : Bool;
    nodeId : ?NodeId;
  };

  func validateNodeInput(input : CreateNodeInput) : Bool {
    if (input.title.size() == 0 or input.title.size() > maxTitleLength) {
      return false;
    };

    if (input.nodeType == #curation and input.parentId != null) {
      return false;
    };

    if (input.nodeType != #curation) {
      switch (input.parentId) {
        case (null) { return false };
        case (?_) { return true };
      };
    };

    true;
  };

  func validateNodeTypeHierarchy(childType : NodeType, parentType : NodeType) : Bool {
    switch (parentType) {
      case (#curation) { childType == #swarm };
      case (#swarm) { childType == #annotation };
      case (#annotation) { childType == #token };
      case (#token) { false };
    };
  };

  public shared ({ caller }) func createNode(input : CreateNodeInput) : async CreateNodeResult {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot create nodes");
    };

    autoRegisterUser(caller);

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create nodes");
    };

    if (not validateNodeInput(input)) {
      Runtime.trap("Invalid node input: title must be non-empty and ≤ 100 characters");
    };

    switch (input.nodeType) {
      case (#curation) {
        if (curationNameExists(input.title)) {
          Runtime.trap("A curation with this name already exists globally (case-insensitive)");
        };
      };
      case (#swarm) {
        switch (input.parentId) {
          case (?parentId) {
            if (swarmNameExistsInCuration(input.title, parentId)) {
              Runtime.trap("A swarm with this name already exists in this curation (case-insensitive)");
            };
          };
          case (null) {};
        };
      };
      case (#annotation) {
        switch (input.parentId) {
          case (?parentId) {
            switch (nodes.get(parentId)) {
              case (?parentNode) {
                switch (parentNode.swarmId) {
                  case (?swarmId) {
                    if (annotationNameExistsInSwarm(input.title, swarmId)) {
                      Runtime.trap("An annotation with this name already exists in this swarm (case-insensitive)");
                    };
                  };
                  case (null) {};
                };
              };
              case (null) {};
            };
          };
          case (null) {};
        };
      };
      case (#token) {};
    };

    switch (input.nodeType) {
      case (#curation) { };
      case (#swarm) {
        switch (input.parentId) {
          case (?parentId) {
            switch (nodes.get(parentId)) {
              case (?parentNode) {
                if (parentNode.nodeType != #curation) {
                  Runtime.trap("Invalid hierarchy: Swarms can only be created under Curations");
                };
              };
              case (null) {
                Runtime.trap("Parent node does not exist");
              };
            };
          };
          case (null) {
            Runtime.trap("Swarms must have a parent Curation");
          };
        };
      };
      case (#annotation) {
        switch (input.parentId) {
          case (?parentId) {
            switch (nodes.get(parentId)) {
              case (?parentNode) {
                if (parentNode.nodeType != #swarm) {
                  Runtime.trap("Invalid hierarchy: Annotations can only be created under Swarms");
                };
                // AUTHORIZATION: Swarm membership required for annotation creation
                if (not hasSwarmAccess(parentId, caller)) {
                  Runtime.trap("Unauthorized: Join the swarm to contribute");
                };
              };
              case (null) {
                Runtime.trap("Parent node does not exist");
              };
            };
          };
          case (null) {
            Runtime.trap("Annotations must have a parent Swarm");
          };
        };
      };
      case (#token) {
        switch (input.parentId) {
          case (?parentId) {
            switch (nodes.get(parentId)) {
              case (?parentNode) {
                if (parentNode.nodeType != #annotation) {
                  Runtime.trap("Invalid hierarchy: Tokens can only be created under Annotations");
                };
                switch (parentNode.swarmId) {
                  case (?swarmId) {
                    // AUTHORIZATION: Swarm membership required for token creation
                    if (not hasSwarmAccess(swarmId, caller)) {
                      Runtime.trap("Unauthorized: Join the swarm to contribute");
                    };
                    if (tokenExistsInSwarm(input.title, swarmId)) {
                      Runtime.trap("Token already exists in this swarm: duplicate tokens are not allowed");
                    };
                  };
                  case (null) {
                    Runtime.trap("Parent annotation has no associated swarm");
                  };
                };
              };
              case (null) {
                Runtime.trap("Parent node does not exist");
              };
            };
          };
          case (null) {
            Runtime.trap("Tokens must have a parent Annotation");
          };
        };
      };
    };

    let swarmId = switch (input.nodeType) {
      case (#swarm) { ?nextNodeId };
      case (#curation) { null };
      case (_) {
        switch (input.parentId) {
          case (?parentId) {
            switch (nodes.get(parentId)) {
              case (?parentNode) {
                parentNode.swarmId;
              };
              case (null) { null };
            };
          };
          case (null) { null };
        };
      };
    };

    let node = {
      id = nextNodeId;
      nodeType = input.nodeType;
      title = input.title;
      bracketedTokenSequence = input.bracketedTokenSequence;
      parentId = input.parentId;
      createdAt = Time.now();
      owner = caller;
      swarmId = swarmId;
      immutable = if (input.nodeType == #token) { true } else { false };
      attributes = [];
      upvotes = 0;
      downvotes = 0;
      verified = false;
    };

    nodes.add(node.id, node);
    
    if (input.nodeType == #swarm) {
      let membersList = List.empty<Principal>();
      membersList.add(caller);
      swarmMembers.add(node.id, membersList);
    };

    if (input.nodeType == #annotation) {
      switch (swarmId) {
        case (?sid) {
          if (not isSwarmMember(sid, caller) and not isSwarmCreator(sid, caller)) {
            switch (swarmMembers.get(sid)) {
              case (?existingMembers) {
                let updatedMembers = existingMembers;
                updatedMembers.add(caller);
                swarmMembers.add(sid, updatedMembers);
              };
              case (null) {
                let newMembers = List.empty<Principal>();
                newMembers.add(caller);
                swarmMembers.add(sid, newMembers);
              };
            };
          };
        };
        case (null) {};
      };
    };
    
    switch (input.parentId) {
      case (?parentId) {
        let relation = {
          id = nextRelationId;
          sourceNodeId = parentId;
          targetNodeId = node.id;
          relationType = #retrieval;
          relationStyle = #retrieval;
          owner = caller;
          createdAt = Time.now();
        };
        relations.add(nextRelationId, relation);
        nextRelationId += 1;
      };
      case (null) {};
    };

    nextNodeId += 1;
    { success = true; nodeId = ?node.id };
  };

  public shared ({ caller }) func createRelation(input : CreateRelationInput) : async () {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot create relations");
    };

    autoRegisterUser(caller);

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can create relations");
    };

    switch (input.relationType) {
      case (#retrieval) {};
      case (#reasoning) {};
    };

    func verifyNodeExists(nodeId : NodeId) {
      switch (nodes.get(nodeId)) {
        case (null) {
          Runtime.trap("Node " # nodeId.toText() # " does not exist");
        };
        case (_) {};
      };
    };

    verifyNodeExists(input.sourceNodeId);
    verifyNodeExists(input.targetNodeId);

    // AUTHORIZATION: Verify caller has access to both nodes
    if (not isNodeIdVisibleToCaller(input.sourceNodeId, caller)) {
      Runtime.trap("Unauthorized: You do not have access to the source node");
    };

    if (not isNodeIdVisibleToCaller(input.targetNodeId, caller)) {
      Runtime.trap("Unauthorized: You do not have access to the target node");
    };

    let relation = {
      id = nextRelationId;
      sourceNodeId = input.sourceNodeId;
      targetNodeId = input.targetNodeId;
      relationType = input.relationType;
      relationStyle = input.relationType;
      owner = caller;
      createdAt = Time.now();
    };

    relations.add(nextRelationId, relation);
    nextRelationId += 1;
  };

  public query ({ caller }) func getGraphData() : async GraphData {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot access graph data");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access GraphData");
    };

    let visibleNodesList = List.empty<Node>();
    for ((id, node) in nodes.entries()) {
      // AUTHORIZATION: Filter nodes based on visibility rules
      if (isNodeVisibleToCaller(node, caller)) {
        visibleNodesList.add(node);
      };
    };

    let visibleNodes = visibleNodesList.toArray();
    let visibleNodeIds = Map.empty<NodeId, Bool>();
    for (node in visibleNodes.vals()) {
      visibleNodeIds.add(node.id, true);
    };

    let visibleRelationsList = List.empty<Relation>();
    for ((id, relation) in relations.entries()) {
      // AUTHORIZATION: Filter relations to only include those between visible nodes
      let sourceVisible = switch (visibleNodeIds.get(relation.sourceNodeId)) {
        case (?true) { true };
        case (_) { false };
      };
      let targetVisible = switch (visibleNodeIds.get(relation.targetNodeId)) {
        case (?true) { true };
        case (_) { false };
      };
      if (sourceVisible and targetVisible) {
        visibleRelationsList.add(relation);
      };
    };

    {
      nodes = visibleNodes;
      relations = visibleRelationsList.toArray();
    };
  };

  public shared ({ caller }) func joinSwarm(swarmId : NodeId) : async Bool {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot join swarms");
    };

    autoRegisterUser(caller);

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can join swarms");
    };

    switch (nodes.get(swarmId)) {
      case (?swarmNode) {
        if (swarmNode.nodeType != #swarm) {
          Runtime.trap("The provided NodeId is not a Swarm node");
        };

        if (isSwarmCreator(swarmId, caller)) {
          Runtime.trap("You are already the creator of this swarm");
        };

        if (isSwarmMember(swarmId, caller)) {
          Runtime.trap("You have already joined this swarm");
        };

        var joinedCount = 0;
        for ((sid, members) in swarmMembers.entries()) {
          if (members.any(func(p) { p == caller })) {
            joinedCount += 1;
          };
        };

        if (joinedCount >= 4) {
          Runtime.trap("You have reached the maximum limit of 4 joined swarms");
        };

        switch (swarmMembers.get(swarmId)) {
          case (?existingMembers) {
            let updatedMembers = existingMembers;
            updatedMembers.add(caller);
            swarmMembers.add(swarmId, updatedMembers);
          };
          case (null) {
            let newMembers = List.empty<Principal>();
            newMembers.add(caller);
            swarmMembers.add(swarmId, newMembers);
          };
        };

        true;
      };
      case (null) {
        Runtime.trap("Swarm with the provided Id does not exist");
      };
    };
  };

  public query ({ caller }) func getJoinedSwarms() : async [NodeId] {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot query joined swarms");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can query joined swarms");
    };

    let joinedSwarmsList = List.empty<NodeId>();
    for ((swarmId, members) in swarmMembers.entries()) {
      if (members.any(func(p) { p == caller })) {
        joinedSwarmsList.add(swarmId);
      };
    };

    joinedSwarmsList.toArray();
  };

  public shared ({ caller }) func voteOnAnnotation(annotationId : NodeId, voteType : VoteType) : async Bool {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot vote");
    };

    autoRegisterUser(caller);

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can vote");
    };

    switch (nodes.get(annotationId)) {
      case (?annotationNode) {
        if (annotationNode.nodeType != #annotation) {
          Runtime.trap("The provided NodeId is not an Annotation node");
        };

        // AUTHORIZATION: Prevent self-voting
        if (annotationNode.owner == caller) {
          Runtime.trap("Unauthorized: You cannot vote on your own annotations");
        };

        switch (annotationNode.swarmId) {
          case (?swarmId) {
            // AUTHORIZATION: Only swarm members can vote
            if (not hasSwarmAccess(swarmId, caller)) {
              Runtime.trap("Unauthorized: Only swarm members can vote on annotations");
            };
          };
          case (null) {
            Runtime.trap("Annotation has no associated swarm");
          };
        };

        let voteKey = (caller, annotationId);
        switch (userVotes.get(voteKey)) {
          case (?existingVote) {
            Runtime.trap("You have already voted on this annotation");
          };
          case (null) {
            userVotes.add(voteKey, voteType);

            let updatedNode = switch (voteType) {
              case (#upvote) {
                {
                  annotationNode with
                  upvotes = annotationNode.upvotes + 1;
                  verified = (annotationNode.upvotes + 1) > annotationNode.downvotes;
                };
              };
              case (#downvote) {
                {
                  annotationNode with
                  downvotes = annotationNode.downvotes + 1;
                  verified = annotationNode.upvotes > (annotationNode.downvotes + 1);
                };
              };
            };

            nodes.add(annotationId, updatedNode);
            true;
          };
        };
      };
      case (null) {
        Runtime.trap("Annotation with the provided Id does not exist");
      };
    };
  };

  public query ({ caller }) func getAnnotationVotes(annotationId : NodeId) : async { upvotes : Nat; downvotes : Nat; verified : Bool } {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot query votes");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can query votes");
    };

    switch (nodes.get(annotationId)) {
      case (?annotationNode) {
        if (annotationNode.nodeType != #annotation) {
          Runtime.trap("The provided NodeId is not an Annotation node");
        };

        // AUTHORIZATION: Verify caller has access to the annotation
        if (not isNodeVisibleToCaller(annotationNode, caller)) {
          Runtime.trap("Unauthorized: You do not have access to this annotation");
        };

        {
          upvotes = annotationNode.upvotes;
          downvotes = annotationNode.downvotes;
          verified = annotationNode.verified;
        };
      };
      case (null) {
        Runtime.trap("Annotation with the provided Id does not exist");
      };
    };
  };

  public shared ({ caller }) func sendSwarmMessage(swarmId : NodeId, content : Text) : async Bool {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot send messages");
    };

    autoRegisterUser(caller);

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can send messages");
    };

    switch (nodes.get(swarmId)) {
      case (?swarmNode) {
        if (swarmNode.nodeType != #swarm) {
          Runtime.trap("The provided NodeId is not a Swarm node");
        };

        // AUTHORIZATION: Only swarm members can send messages
        if (not hasSwarmAccess(swarmId, caller)) {
          Runtime.trap("Unauthorized: Only swarm members can send messages");
        };

        let message = {
          sender = caller;
          timestamp = Time.now();
          content = content;
        };

        switch (swarmChatMessages.get(swarmId)) {
          case (?existingMessages) {
            let updatedMessages = existingMessages;
            updatedMessages.add(message);
            swarmChatMessages.add(swarmId, updatedMessages);
          };
          case (null) {
            let newMessages = List.empty<SwarmChatMessage>();
            newMessages.add(message);
            swarmChatMessages.add(swarmId, newMessages);
          };
        };

        true;
      };
      case (null) {
        Runtime.trap("Swarm with the provided Id does not exist");
      };
    };
  };

  public query ({ caller }) func getSwarmMessages(swarmId : NodeId) : async [SwarmChatMessage] {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot query messages");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can query messages");
    };

    switch (nodes.get(swarmId)) {
      case (?swarmNode) {
        if (swarmNode.nodeType != #swarm) {
          Runtime.trap("The provided NodeId is not a Swarm node");
        };

        // AUTHORIZATION: Only swarm members can view messages
        if (not hasSwarmAccess(swarmId, caller)) {
          Runtime.trap("Unauthorized: Only swarm members can view messages");
        };

        switch (swarmChatMessages.get(swarmId)) {
          case (?messages) {
            messages.toArray();
          };
          case (null) {
            [];
          };
        };
      };
      case (null) {
        Runtime.trap("Swarm with the provided Id does not exist");
      };
    };
  };

  public query ({ caller }) func getVerifiedAnnotationsByAttribute(attributeKey : Text, attributeValue : Text) : async [Node] {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot query verified annotations");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can query verified annotations");
    };

    let filteredAnnotationsList = List.empty<Node>();

    for ((id, node) in nodes.entries()) {
      // Only process annotation nodes
      if (node.nodeType == #annotation) {
        // AUTHORIZATION: Only include verified annotations
        if (node.verified) {
          // AUTHORIZATION: Check swarm membership - only include annotations from swarms the caller has access to
          switch (node.swarmId) {
            case (?swarmId) {
              if (hasSwarmAccess(swarmId, caller)) {
                // Filter by attribute key-value pair
                var hasMatchingAttribute = false;
                for ((key, value) in node.attributes.vals()) {
                  if (key == attributeKey and value == attributeValue) {
                    hasMatchingAttribute := true;
                  };
                };
                if (hasMatchingAttribute) {
                  filteredAnnotationsList.add(node);
                };
              };
            };
            case (null) {
              // Skip annotations without swarm association
            };
          };
        };
      };
    };

    filteredAnnotationsList.toArray();
  };

  public query ({ caller }) func getAnnotationAttributeKeys() : async [Text] {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot query attribute keys");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can query attribute keys");
    };

    let uniqueKeys = Map.empty<Text, Bool>();

    for ((id, node) in nodes.entries()) {
      // Only process annotation nodes
      if (node.nodeType == #annotation) {
        // AUTHORIZATION: Only include verified annotations
        if (node.verified) {
          // AUTHORIZATION: Check swarm membership - only include annotations from swarms the caller has access to
          switch (node.swarmId) {
            case (?swarmId) {
              if (hasSwarmAccess(swarmId, caller)) {
                for ((key, value) in node.attributes.vals()) {
                  uniqueKeys.add(key, true);
                };
              };
            };
            case (null) {
              // Skip annotations without swarm association
            };
          };
        };
      };
    };

    let keysList = List.empty<Text>();
    for ((key, _) in uniqueKeys.entries()) {
      keysList.add(key);
    };

    keysList.toArray();
  };

  public query ({ caller }) func getAnnotationAttributeValues(attributeKey : Text) : async [Text] {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot query attribute values");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can query attribute values");
    };

    let uniqueValues = Map.empty<Text, Bool>();

    for ((id, node) in nodes.entries()) {
      // Only process annotation nodes
      if (node.nodeType == #annotation) {
        // AUTHORIZATION: Only include verified annotations
        if (node.verified) {
          // AUTHORIZATION: Check swarm membership - only include annotations from swarms the caller has access to
          switch (node.swarmId) {
            case (?swarmId) {
              if (hasSwarmAccess(swarmId, caller)) {
                for ((key, value) in node.attributes.vals()) {
                  if (key == attributeKey) {
                    uniqueValues.add(value, true);
                  };
                };
              };
            };
            case (null) {
              // Skip annotations without swarm association
            };
          };
        };
      };
    };

    let valuesList = List.empty<Text>();
    for ((value, _) in uniqueValues.entries()) {
      valuesList.add(value);
    };

    valuesList.toArray();
  };

  public shared ({ caller }) func resetAllData() : async Bool {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot reset data");
    };

    autoRegisterUser(caller);

    // AUTHORIZATION: Only "anshuman" (main admin) can reset all data
    let anshumanPrincipal : Principal = Principal.fromText("44ydh-a3gdr-rw7ab-hpt6l-zk2c4-lkwsk-qper6-7fw2w-3ljfb-mg4t6-6ae");

    if (caller != anshumanPrincipal) {
      Runtime.trap("Unauthorized: Only 'anshuman' can reset all data");
    };

    for ((key, _) in nodes.entries()) {
      nodes.remove(key);
    };

    for ((key, _) in relations.entries()) {
      relations.remove(key);
    };

    for ((key, _) in userVotes.entries()) {
      userVotes.remove(key);
    };

    for ((key, _) in swarmMembers.entries()) {
      swarmMembers.remove(key);
    };

    for ((key, _) in swarmChatMessages.entries()) {
      swarmChatMessages.remove(key);
    };

    for ((key, _) in userProfiles.entries()) {
      userProfiles.remove(key);
    };

    nextNodeId := 1;
    nextRelationId := 1;

    commonPoolState := {
      balance = 0;
      transactions = [];
    };

    true;
  };

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // AUTHORIZATION: Admin-only (checked inside AccessControl.assignRole)
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot access profiles");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access profiles");
    };

    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot access profiles");
    };

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access profiles");
    };

    // AUTHORIZATION: Users can only view their own profile unless they are admin
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };

    userProfiles.get(user);
  };

  public query ({ caller }) func getAllUserProfiles() : async [UserProfile] {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot access profiles");
    };

    // AUTHORIZATION: Admin-only operation
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can access all user profiles");
    };

    let profilesList = List.empty<UserProfile>();

    for ((principal, profile) in userProfiles.entries()) {
      profilesList.add(profile);
    };

    profilesList.toArray();
  };

  public shared ({ caller }) func saveCallerUserProfile(name : Text, socialUrl : ?Text) : async Bool {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot save profiles");
    };

    autoRegisterUser(caller);

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save profiles");
    };

    if (name.size() == 0) {
      Runtime.trap("Profile name cannot be empty");
    };

    if (name.size() > maxTitleLength) {
      Runtime.trap("Profile name cannot exceed 100 characters");
    };

    userProfiles.add(
      caller,
      {
        name;
        owner = caller;
        createdAt = Time.now();
        socialUrl;
      },
    );

    true;
  };

  public shared ({ caller }) func updateCallerUserProfile(name : Text, socialUrl : ?Text) : async Bool {
    // AUTHORIZATION: Authenticated users only
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Anonymous principals cannot update profiles");
    };

    autoRegisterUser(caller);

    // AUTHORIZATION: User-level permission required
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update profiles");
    };

    switch (userProfiles.get(caller)) {
      case (null) {
        Runtime.trap("Profile does not exist. Please create a profile first.");
      };
      case (?existingProfile) {
        if (name.size() == 0) {
          Runtime.trap("Profile name cannot be empty");
        };

        if (name.size() > maxTitleLength) {
          Runtime.trap("Profile name cannot exceed 100 characters");
        };

        userProfiles.add(
          caller,
          {
            name;
            owner = caller;
            createdAt = existingProfile.createdAt;
            socialUrl = socialUrl;
          },
        );

        true;
      };
    };
  };
};
