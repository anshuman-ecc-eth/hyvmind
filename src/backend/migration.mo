import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // ── Old types (as deployed) ──────────────────────────────────────────────────

  type OldExtensionEntry = {
    extendedAt : Time.Time;
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
  };

  type OldActor = {
    var publishedSourceGraphs : Map.Map<Text, OldPublishedSourceGraphMeta>;
  };

  // ── New types (current version) ──────────────────────────────────────────────

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
  };

  type NewActor = {
    var publishedSourceGraphs : Map.Map<Text, NewPublishedSourceGraphMeta>;
  };

  // ── Migration function ────────────────────────────────────────────────────────

  public func run(old : OldActor) : NewActor {
    let newGraphs = old.publishedSourceGraphs.map<Text, OldPublishedSourceGraphMeta, NewPublishedSourceGraphMeta>(
      func(_, meta) {
        let newLog = meta.extensionLog.map(
          func(entry) {
            {
              extendedAt = entry.extendedAt;
              extendedBy = meta.creator;
              extendedByName = meta.creatorName;
              addedNodes = entry.addedNodes;
              addedEdges = entry.addedEdges;
              addedHierarchyEdges = entry.addedHierarchyEdges;
              addedAttributes = entry.addedAttributes;
              addedSources = entry.addedSources;
            }
          }
        );
        {
          meta with
          extensionLog = newLog;
        }
      }
    );
    { var publishedSourceGraphs = newGraphs }
  };
};
