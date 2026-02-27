import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // Old types (already defined in old actor)
  type NodeId = Text;
  type Directionality = { #none; #unidirectional; #bidirectional };
  type Tag = Text;
  type CustomAttribute = { key : Text; value : Text };

  // Node Types
  type Timestamps = {
    createdAt : Time.Time;
  };

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
    meaning : Text;
    parentLocationId : NodeId;
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

  // Actor types
  type OldActor = {
    curationMap : Map.Map<NodeId, OldCuration>;
    swarmMap : Map.Map<NodeId, OldSwarm>;
    locationMap : Map.Map<NodeId, OldLocation>;
    lawTokenMap : Map.Map<NodeId, OldLawToken>;
    interpretationTokenMap : Map.Map<NodeId, OldInterpretationToken>;
  };

  // New actor type (same as old type in this case)
  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    let newCurationMap = old.curationMap.map<NodeId, OldCuration, OldCuration>(
      func(_id, curation) { curation }
    );

    let newSwarmMap = old.swarmMap.map<NodeId, OldSwarm, OldSwarm>(
      func(_id, swarm) { swarm }
    );

    let newLocationMap = old.locationMap.map<NodeId, OldLocation, OldLocation>(
      func(_id, location) { location }
    );

    let newLawTokenMap = old.lawTokenMap.map<NodeId, OldLawToken, OldLawToken>(
      func(_id, lawToken) { lawToken }
    );

    let newInterpretationTokenMap = old.interpretationTokenMap.map<NodeId, OldInterpretationToken, OldInterpretationToken>(
      func(_id, interpretationToken) { interpretationToken }
    );

    {
      old with
      curationMap = newCurationMap;
      swarmMap = newSwarmMap;
      locationMap = newLocationMap;
      lawTokenMap = newLawTokenMap;
      interpretationTokenMap = newInterpretationTokenMap;
    };
  };
};
