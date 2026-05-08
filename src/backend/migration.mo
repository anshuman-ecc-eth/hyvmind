import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";

module {
  // ── Old types (from the previously deployed stable interface) ────────────────
  type OldExtensionEntry = {
    extendedAt : Time.Time;
    extendedBy : Principal;
    extendedByName : Text;
    addedNodes : Nat;
    addedEdges : Nat;
    addedHierarchyEdges : Nat;
    addedAttributes : Nat;
    addedSources : ?Nat;
  };

  type OldPublishedSourceGraphMeta = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    publishedAt : Time.Time;
    nodeCount : Nat;
    edgeCount : Nat;
    hierarchyEdgeCount : Nat;
    attributeCount : Nat;
    sourcesCount : ?Nat;
    extensionLog : [OldExtensionEntry];
    artworkDataUrl : ?Text;
    // NOTE: terrainParams is absent from the old type
  };

  // ── New types (matching the new PublishedSourceGraphMeta in main.mo) ─────────
  type NewExtensionEntry = {
    extendedAt : Time.Time;
    extendedBy : Principal;
    extendedByName : Text;
    addedNodes : Nat;
    addedEdges : Nat;
    addedHierarchyEdges : Nat;
    addedAttributes : Nat;
    addedSources : ?Nat;
  };

  type NewPublishedSourceGraphMeta = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    publishedAt : Time.Time;
    nodeCount : Nat;
    edgeCount : Nat;
    hierarchyEdgeCount : Nat;
    attributeCount : Nat;
    sourcesCount : ?Nat;
    extensionLog : [NewExtensionEntry];
    artworkDataUrl : ?Text;
    terrainParams : ?Text;
  };

  // ── State shapes ─────────────────────────────────────────────────────────────
  type OldActor = {
    var publishedSourceGraphs : Map.Map<Text, OldPublishedSourceGraphMeta>;
  };

  type NewActor = {
    var publishedSourceGraphs : Map.Map<Text, NewPublishedSourceGraphMeta>;
  };

  // ── Migration function ───────────────────────────────────────────────────────
  public func run(old : OldActor) : NewActor {
    let newGraphs = old.publishedSourceGraphs.map<Text, OldPublishedSourceGraphMeta, NewPublishedSourceGraphMeta>(
      func(_id, meta) {
        { meta with terrainParams = null }
      }
    );
    { var publishedSourceGraphs = newGraphs }
  };
};
