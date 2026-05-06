import Map "mo:core/Map";

module {

  // ── Old types (copied from pre-upgrade stable shape) ─────────────────────────

  type OldExtensionEntry = {
    extendedAt : Int;
    addedNodes : Nat;
    addedEdges : Nat;
    addedAttributes : Nat;
    addedSources : ?Nat;
  };

  type OldPublishedSourceGraphMeta = {
    id : Text;
    name : Text;
    creator : Principal;
    creatorName : Text;
    publishedAt : Int;
    nodeCount : Nat;
    edgeCount : Nat;
    attributeCount : Nat;
    sourcesCount : ?Nat;
    extensionLog : [OldExtensionEntry];
    artworkDataUrl : ?Text;
  };

  // ── New types (must match actor field types exactly) ─────────────────────────

  type NewExtensionEntry = {
    extendedAt : Int;
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
    publishedAt : Int;
    nodeCount : Nat;
    edgeCount : Nat;
    hierarchyEdgeCount : Nat;
    attributeCount : Nat;
    sourcesCount : ?Nat;
    extensionLog : [NewExtensionEntry];
    artworkDataUrl : ?Text;
  };

  // ── Migration input / output ─────────────────────────────────────────────────

  type OldActor = {
    var publishedSourceGraphs : Map.Map<Text, OldPublishedSourceGraphMeta>;
  };

  type NewActor = {
    var publishedSourceGraphs : Map.Map<Text, NewPublishedSourceGraphMeta>;
  };

  // ── Migration logic ──────────────────────────────────────────────────────────

  func migrateEntry(e : OldExtensionEntry) : NewExtensionEntry {
    { e with addedHierarchyEdges = 0 }
  };

  func migrateMeta(m : OldPublishedSourceGraphMeta) : NewPublishedSourceGraphMeta {
    // Estimate hierarchy edges: every non-curation node contributes one hierarchy edge.
    // With nodeCount - 1 as a safe lower bound (1 curation in every valid tree).
    let hierarchyEdgeCount = if (m.nodeCount > 0) { m.nodeCount - 1 } else { 0 };
    let newLog = m.extensionLog.map(migrateEntry);
    {
      m with
      edgeCount = m.edgeCount + hierarchyEdgeCount;
      hierarchyEdgeCount;
      extensionLog = newLog;
    }
  };

  public func run(old : OldActor) : NewActor {
    let newGraphs = old.publishedSourceGraphs.map<Text, OldPublishedSourceGraphMeta, NewPublishedSourceGraphMeta>(
      func(_, meta) { migrateMeta(meta) }
    );
    { var publishedSourceGraphs = newGraphs };
  };

};
