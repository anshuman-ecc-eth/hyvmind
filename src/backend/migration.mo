import Map "mo:core/Map";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  // ── Old types (copied from .old/src/backend/main.mo) ─────────────────────────
  type Time = Int;

  type OldExtensionEntry = {
    extendedAt : Time;
    addedNodes : Nat;
    addedEdges : Nat;
    addedAttributes : Nat;
  };

  type OldPublishedSourceGraphMeta = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    publishedAt : Time;
    nodeCount : Nat;
    edgeCount : Nat;
    attributeCount : Nat;
    extensionLog : [OldExtensionEntry];
  };

  // ── New types (matching new main.mo) ─────────────────────────────────────────
  type NewExtensionEntry = {
    extendedAt : Time;
    addedNodes : Nat;
    addedEdges : Nat;
    addedAttributes : Nat;
  };

  type NewPublishedSourceGraphMeta = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    publishedAt : Time;
    nodeCount : Nat;
    edgeCount : Nat;
    attributeCount : Nat;
    extensionLog : [NewExtensionEntry];
    artworkDataUrl : ?Text;
  };

  type OldActor = {
    var publishedSourceGraphs : Map.Map<Text, OldPublishedSourceGraphMeta>;
  };

  type NewActor = {
    var publishedSourceGraphs : Map.Map<Text, NewPublishedSourceGraphMeta>;
  };

  public func run(old : OldActor) : NewActor {
    let newGraphs = old.publishedSourceGraphs.map<Text, OldPublishedSourceGraphMeta, NewPublishedSourceGraphMeta>(
      func(_id, meta) {
        { meta with artworkDataUrl = null }
      }
    );
    { var publishedSourceGraphs = newGraphs };
  };
};
