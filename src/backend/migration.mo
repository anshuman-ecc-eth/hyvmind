// Migration: CustomAttribute → WeightedAttribute, content → contentVersions, edgeLabel → weightedLabels
// All incompatible maps are reset to empty. The admin will call resetAllData after deploy.

import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";

module {
  // ── Old types (inline, copied from .old/src/backend/main.mo) ─────────────────

  type OldNodeId = Text;
  type OldTimestamps = { createdAt : Time.Time };
  type OldCustomAttribute = { key : Text; value : Text };
  type OldDirectionality = { #none; #unidirectional; #bidirectional };

  type OldCuration = {
    id : OldNodeId;
    name : Text;
    creator : Principal;
    customAttributes : [OldCustomAttribute];
    timestamps : OldTimestamps;
  };

  type OldSwarm = {
    id : OldNodeId;
    name : Text;
    tags : [Text];
    parentCurationId : OldNodeId;
    creator : Principal;
    customAttributes : [OldCustomAttribute];
    timestamps : OldTimestamps;
    forkSource : ?OldNodeId;
    forkPrincipal : ?Principal;
  };

  type OldLocation = {
    id : OldNodeId;
    title : Text;
    customAttributes : [OldCustomAttribute];
    parentSwarmId : OldNodeId;
    creator : Principal;
    timestamps : OldTimestamps;
  };

  type OldLawToken = {
    id : OldNodeId;
    tokenLabel : Text;
    parentLocationId : OldNodeId;
    creator : Principal;
    customAttributes : [OldCustomAttribute];
    timestamps : OldTimestamps;
  };

  type OldInterpretationToken = {
    id : OldNodeId;
    title : Text;
    content : Text;
    parentLawTokenId : OldNodeId;
    customAttributes : [OldCustomAttribute];
    creator : Principal;
    timestamps : OldTimestamps;
  };

  type OldSourceGraphEdge = {
    source : OldNodeId;
    target : OldNodeId;
    edgeLabel : Text;
    directionality : OldDirectionality;
  };

  // ── New types (matching current main.mo) ─────────────────────────────────────

  type NewNodeId = Text;
  type NewTimestamps = { createdAt : Time.Time };

  type NewWeightedValue = { value : Text; weight : Nat };
  type NewWeightedAttribute = { key : Text; weightedValues : [NewWeightedValue] };
  type NewContentVersion = { content : Text; contributor : Principal; timestamp : Time.Time };
  type NewDirectionality = { #none; #unidirectional; #bidirectional };

  type NewCuration = {
    id : NewNodeId;
    name : Text;
    creator : Principal;
    customAttributes : [NewWeightedAttribute];
    timestamps : NewTimestamps;
  };

  type NewSwarm = {
    id : NewNodeId;
    name : Text;
    tags : [Text];
    parentCurationId : NewNodeId;
    creator : Principal;
    customAttributes : [NewWeightedAttribute];
    timestamps : NewTimestamps;
    forkSource : ?NewNodeId;
    forkPrincipal : ?Principal;
  };

  type NewLocation = {
    id : NewNodeId;
    title : Text;
    customAttributes : [NewWeightedAttribute];
    parentSwarmId : NewNodeId;
    creator : Principal;
    timestamps : NewTimestamps;
  };

  type NewLawToken = {
    id : NewNodeId;
    tokenLabel : Text;
    parentLocationId : NewNodeId;
    creator : Principal;
    customAttributes : [NewWeightedAttribute];
    timestamps : NewTimestamps;
  };

  type NewInterpretationToken = {
    id : NewNodeId;
    title : Text;
    contentVersions : [NewContentVersion];
    parentLawTokenId : NewNodeId;
    customAttributes : [NewWeightedAttribute];
    creator : Principal;
    timestamps : NewTimestamps;
  };

  type NewSourceGraphEdge = {
    source : NewNodeId;
    target : NewNodeId;
    weightedLabels : [NewWeightedValue];
    directionality : NewDirectionality;
  };

  // ── Migration record types ────────────────────────────────────────────────────

  type OldActor = {
    var curationMap : Map.Map<OldNodeId, OldCuration>;
    var swarmMap : Map.Map<OldNodeId, OldSwarm>;
    var locationMap : Map.Map<OldNodeId, OldLocation>;
    var lawTokenMap : Map.Map<OldNodeId, OldLawToken>;
    var interpretationTokenMap : Map.Map<OldNodeId, OldInterpretationToken>;
    var sourceEdges : Map.Map<OldNodeId, List.List<OldSourceGraphEdge>>;
  };

  type NewActor = {
    var curationMap : Map.Map<NewNodeId, NewCuration>;
    var swarmMap : Map.Map<NewNodeId, NewSwarm>;
    var locationMap : Map.Map<NewNodeId, NewLocation>;
    var lawTokenMap : Map.Map<NewNodeId, NewLawToken>;
    var interpretationTokenMap : Map.Map<NewNodeId, NewInterpretationToken>;
    var sourceEdges : Map.Map<NewNodeId, List.List<NewSourceGraphEdge>>;
  };

  // ── Migration: convert old CustomAttribute to WeightedAttribute ──────────────

  func migrateCustomAttr(old : [OldCustomAttribute]) : [NewWeightedAttribute] {
    old.map<OldCustomAttribute, NewWeightedAttribute>(func(ca) {
      { key = ca.key; weightedValues = [{ value = ca.value; weight = 1 }] }
    })
  };

  func migrateDirectionality(old : OldDirectionality) : NewDirectionality {
    switch old {
      case (#none) { #none };
      case (#unidirectional) { #unidirectional };
      case (#bidirectional) { #bidirectional };
    }
  };

  // ── run ───────────────────────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    // Migrate curationMap
    let newCurationMap = old.curationMap.map<OldNodeId, OldCuration, NewCuration>(
      func(_id, c) {
        {
          c with
          customAttributes = migrateCustomAttr(c.customAttributes)
        }
      }
    );

    // Migrate swarmMap
    let newSwarmMap = old.swarmMap.map<OldNodeId, OldSwarm, NewSwarm>(
      func(_id, s) {
        {
          s with
          customAttributes = migrateCustomAttr(s.customAttributes)
        }
      }
    );

    // Migrate locationMap
    let newLocationMap = old.locationMap.map<OldNodeId, OldLocation, NewLocation>(
      func(_id, l) {
        {
          l with
          customAttributes = migrateCustomAttr(l.customAttributes)
        }
      }
    );

    // Migrate lawTokenMap
    let newLawTokenMap = old.lawTokenMap.map<OldNodeId, OldLawToken, NewLawToken>(
      func(_id, lt) {
        {
          lt with
          customAttributes = migrateCustomAttr(lt.customAttributes)
        }
      }
    );

    // Migrate interpretationTokenMap: content → contentVersions
    let newInterpTokenMap = old.interpretationTokenMap.map<OldNodeId, OldInterpretationToken, NewInterpretationToken>(
      func(_id, it) {
        {
          id = it.id;
          title = it.title;
          contentVersions = [{ content = it.content; contributor = it.creator; timestamp = it.timestamps.createdAt }];
          parentLawTokenId = it.parentLawTokenId;
          customAttributes = migrateCustomAttr(it.customAttributes);
          creator = it.creator;
          timestamps = it.timestamps;
        }
      }
    );

    // Migrate sourceEdges: edgeLabel → weightedLabels
    let newSourceEdges = old.sourceEdges.map<OldNodeId, List.List<OldSourceGraphEdge>, List.List<NewSourceGraphEdge>>(
      func(_id, edgeList) {
        edgeList.map<OldSourceGraphEdge, NewSourceGraphEdge>(func(edge) {
          {
            source = edge.source;
            target = edge.target;
            weightedLabels = [{ value = edge.edgeLabel; weight = 1 }];
            directionality = migrateDirectionality(edge.directionality);
          }
        })
      }
    );

    {
      var curationMap = newCurationMap;
      var swarmMap = newSwarmMap;
      var locationMap = newLocationMap;
      var lawTokenMap = newLawTokenMap;
      var interpretationTokenMap = newInterpTokenMap;
      var sourceEdges = newSourceEdges;
    }
  };
};
