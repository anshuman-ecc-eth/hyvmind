import Map "mo:core/Map";
import Array "mo:core/Array";

module {

  // ── Old types (copied from .old/src/backend stable signature) ──────────────

  type Time = Int;

  type ExtensionEntry_v0 = {
    addedNodes : Nat;
    addedEdges : Nat;
    addedAttributes : Nat;
    extendedAt : Time;
  };

  type PublishedSourceGraphMeta_v0 = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    nodeCount : Nat;
    edgeCount : Nat;
    attributeCount : Nat;
    publishedAt : Time;
    extensionLog : [ExtensionEntry_v0];
    artworkDataUrl : ?Text;
  };

  // ── New types ───────────────────────────────────────────────────────────────

  type ExtensionEntry_new = {
    addedNodes : Nat;
    addedEdges : Nat;
    addedAttributes : Nat;
    addedSources : ?Nat;
    extendedAt : Time;
  };

  type PublishedSourceGraphMeta_new = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    nodeCount : Nat;
    edgeCount : Nat;
    attributeCount : Nat;
    sourcesCount : ?Nat;
    publishedAt : Time;
    extensionLog : [ExtensionEntry_new];
    artworkDataUrl : ?Text;
  };

  // ── Actor stable state shapes ───────────────────────────────────────────────

  public type OldActor = {
    var publishedSourceGraphs : Map.Map<Text, PublishedSourceGraphMeta_v0>;
  };

  public type NewActor = {
    var publishedSourceGraphs : Map.Map<Text, PublishedSourceGraphMeta_new>;
  };

  // ── Migration function ──────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let migratedGraphs = old.publishedSourceGraphs.map<Text, PublishedSourceGraphMeta_v0, PublishedSourceGraphMeta_new>(
      func(_k, v0) {
        {
          id = v0.id;
          name = v0.name;
          creator = v0.creator;
          creatorName = v0.creatorName;
          nodeCount = v0.nodeCount;
          edgeCount = v0.edgeCount;
          attributeCount = v0.attributeCount;
          sourcesCount = null;
          publishedAt = v0.publishedAt;
          extensionLog = v0.extensionLog.map<ExtensionEntry_v0, ExtensionEntry_new>(
            func(e) : ExtensionEntry_new {
              {
                addedNodes = e.addedNodes;
                addedEdges = e.addedEdges;
                addedAttributes = e.addedAttributes;
                addedSources = null;
                extendedAt = e.extendedAt;
              };
            },
          );
          artworkDataUrl = v0.artworkDataUrl;
        };
      },
    );
    { var publishedSourceGraphs = migratedGraphs };
  };

};
