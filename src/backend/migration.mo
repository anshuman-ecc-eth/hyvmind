import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  // ─── Old types (from previous version — no sources field) ──────────────────

  type NodeId = Text;
  type Tag = Text;

  type WeightedValue = { value : Text; weight : Nat };
  type WeightedAttribute = { key : Text; weightedValues : [WeightedValue] };

  type Timestamps = { createdAt : Time.Time };
  type ContentVersion = { content : Text; contributor : Principal; timestamp : Time.Time };

  type OldCuration = {
    id : NodeId;
    name : Text;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    timestamps : Timestamps;
  };

  type OldSwarm = {
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

  type OldLocation = {
    id : NodeId;
    title : Text;
    customAttributes : [WeightedAttribute];
    parentSwarmId : NodeId;
    creator : Principal;
    timestamps : Timestamps;
  };

  type OldLawToken = {
    id : NodeId;
    tokenLabel : Text;
    parentLocationId : NodeId;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    timestamps : Timestamps;
  };

  type OldInterpretationToken = {
    id : NodeId;
    title : Text;
    contentVersions : [ContentVersion];
    parentLawTokenId : NodeId;
    customAttributes : [WeightedAttribute];
    creator : Principal;
    timestamps : Timestamps;
  };

  // ─── New types (with sources field) ───────────────────────────────────────

  type SourceRef = { name : Text; url : Text };

  type NewCuration = {
    id : NodeId;
    name : Text;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    timestamps : Timestamps;
  };

  type NewSwarm = {
    id : NodeId;
    name : Text;
    tags : [Tag];
    parentCurationId : NodeId;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    timestamps : Timestamps;
    forkSource : ?NodeId;
    forkPrincipal : ?Principal;
  };

  type NewLocation = {
    id : NodeId;
    title : Text;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    parentSwarmId : NodeId;
    creator : Principal;
    timestamps : Timestamps;
  };

  type NewLawToken = {
    id : NodeId;
    tokenLabel : Text;
    parentLocationId : NodeId;
    creator : Principal;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    timestamps : Timestamps;
  };

  type NewInterpretationToken = {
    id : NodeId;
    title : Text;
    contentVersions : [ContentVersion];
    parentLawTokenId : NodeId;
    customAttributes : [WeightedAttribute];
    sources : [SourceRef];
    creator : Principal;
    timestamps : Timestamps;
  };

  // ─── Actor state shapes ───────────────────────────────────────────────────

  type OldActor = {
    var curationMap : Map.Map<NodeId, OldCuration>;
    var swarmMap : Map.Map<NodeId, OldSwarm>;
    var locationMap : Map.Map<NodeId, OldLocation>;
    var lawTokenMap : Map.Map<NodeId, OldLawToken>;
    var interpretationTokenMap : Map.Map<NodeId, OldInterpretationToken>;
  };

  type NewActor = {
    var curationMap : Map.Map<NodeId, NewCuration>;
    var swarmMap : Map.Map<NodeId, NewSwarm>;
    var locationMap : Map.Map<NodeId, NewLocation>;
    var lawTokenMap : Map.Map<NodeId, NewLawToken>;
    var interpretationTokenMap : Map.Map<NodeId, NewInterpretationToken>;
  };

  // ─── Migration function: add sources = [] to every node ───────────────────

  public func run(old : OldActor) : NewActor {
    let curationMap = old.curationMap.map<NodeId, OldCuration, NewCuration>(
      func(_, c) { { c with sources = [] } }
    );
    let swarmMap = old.swarmMap.map<NodeId, OldSwarm, NewSwarm>(
      func(_, s) { { s with sources = [] } }
    );
    let locationMap = old.locationMap.map<NodeId, OldLocation, NewLocation>(
      func(_, l) { { l with sources = [] } }
    );
    let lawTokenMap = old.lawTokenMap.map<NodeId, OldLawToken, NewLawToken>(
      func(_, lt) { { lt with sources = [] } }
    );
    let interpretationTokenMap = old.interpretationTokenMap.map<NodeId, OldInterpretationToken, NewInterpretationToken>(
      func(_, it) { { it with sources = [] } }
    );
    {
      var curationMap;
      var swarmMap;
      var locationMap;
      var lawTokenMap;
      var interpretationTokenMap;
    }
  };
};
